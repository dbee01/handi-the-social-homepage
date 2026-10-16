/*
 * Copyright (c) 2026 Handi Homepage
 * This file is part of HandiHomepage and is released under the GNU General Public License v3.0.
 * See the LICENSE file in the repository root for full details.
 */
// modules/handi-phone/handi-phone.module.js
// Handi Phone — free browser-to-browser (Infobip WebRTC "callWebrtc") calling.
//
// Contacts carry a WebRTC identity (`webrtcId`) that identifies the other
// person's Infobip WebRTC endpoint (NOT a PSTN/SIP phone number). Calls are
// placed with `infobipRTC.callWebrtc(identity)` and answered via the
// `incoming-webrtc-call` event — so no phone number or SIP trunk is involved.
// This is intentionally separate from the paid SIM Phone module, which uses
// `callPhone(number)` to reach real phone numbers over the Infobip SIP trunk.
import { loadSettings } from "../../js/core/settings.js";

export default async function initPhone(container) {
  var t =
    window.t ||
    function (k, e) {
      return e || k;
    };

  const pinBtn = container.querySelector(".pin-btn");
  container.innerHTML = "";
  if (pinBtn) container.prepend(pinBtn);

  const title = document.createElement("div");
  title.className = "panel-title";
  var name =
    window.LANG && window.LANG.modules && window.LANG.modules["handi-phone"]
      ? window.LANG.modules["handi-phone"].name
      : "Handi Phone";
  title.innerHTML = '<i class="fa-solid fa-phone"></i> ' + name;
  container.appendChild(title);

  const content = document.createElement("div");
  content.className = "phone-content";
  container.appendChild(content);

  const parentItem = container.closest(".dashboard-item");
  if (parentItem) parentItem.dataset.module = "handi-phone";

  const settings = loadSettings();
  const contacts = settings.phone?.contacts || [];

  // Restore photos from separate storage
  try {
    const photos = JSON.parse(
      window.handiNs.get("handiContactPhotos") || "{}",
    );
    contacts.forEach((c, i) => {
      if (photos[i]) c.photo = photos[i];
    });
  } catch (e) {}

  function escapeHtml(str) {
    if (!str) return "";
    return str.replace(/[&<>]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[m]);
  }

  if (!contacts.length) {
    content.innerHTML =
      '<div class="module-empty">' +
      '<i class="fa-solid fa-address-book"></i>' +
      "<p>" + escapeHtml(t("d_noContacts", "No contacts saved.")) + "</p>" +
      '<button class="settings-link-btn" id="phoneSettingsBtn">' +
      '<i class="fa-solid fa-gear"></i> ' + escapeHtml(t("d_addContacts", "Add Contacts in Settings")) +
      "</button></div>";
    content.querySelector("#phoneSettingsBtn").onclick = () => {
      window.location.href = "settings.html?args=handi-phone";
    };
    return;
  }

  // ── Infobip WebRTC state ───────────────────────────────────────────────
  let infobipRTC = null;
  let currentCall = null;
  let isConnected = false;
  let userIdentity = null;
  let pendingIncomingCall = null;
  let callingBtn = null;
  let incomingModal = null;
  let presenceTimer = null;
  let presencePollTimer = null;

  // ── Stable identity + display name (anonymous, no login) ──────────────
  function ensureIdentity() {
    let userId = localStorage.getItem("webrtc_user_id");
    if (!userId) {
      userId = "handi_user_" + (window.crypto && crypto.randomUUID
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2) + Date.now().toString(36));
      localStorage.setItem("webrtc_user_id", userId);
    }
    return userId;
  }

  function getHandle() {
    return localStorage.getItem("webrtc_handle") || "";
  }

  function setHandle(handle) {
    localStorage.setItem("webrtc_handle", handle);
  }

  function getDisplayName() {
    return getHandle() || localStorage.getItem("webrtc_display_name") || "Anonymous";
  }

  const myUserId = ensureIdentity();
  // The Infobip identity is the handle when one is claimed, otherwise the
  // machine UUID. Friends dial you by this string.
  function myIdentity() {
    return getHandle() || myUserId;
  }

  // ── Handle claiming (option 3: human-friendly unique name) ────────────
  async function claimHandle(handle) {
    const h = String(handle || "").trim().toLowerCase();
    if (!h) return { ok: false, error: "Handle cannot be empty" };
    try {
      const r = await fetch("/api/webrtc/handle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: myUserId, handle: h }),
      });
      const data = await r.json();
      if (r.ok && data.success) {
        setHandle(data.handle);
        return { ok: true, handle: data.handle };
      }
      return { ok: false, error: (data && data.error) || "Could not claim handle" };
    } catch (e) {
      return { ok: false, error: "Network error" };
    }
  }

  function renderHandleBar() {
    const handle = getHandle();
    const bar = document.createElement("div");
    bar.className = "fp-handle-bar";
    if (handle) {
      bar.innerHTML =
        '<span class="fp-handle-label">' + escapeHtml(t("d_yourHandle", "Your ID")) + ":</span> " +
        '<strong>' + escapeHtml(handle) + "</strong>";
    } else {
      bar.innerHTML =
        '<span>' + escapeHtml(t("d_pickHandle", "Pick a name friends can call you by")) + ":</span> " +
        '<input class="fp-handle-input" placeholder="e.g. daz" maxlength="32" /> ' +
        '<button class="fp-handle-btn" type="button">' + escapeHtml(t("d_claim", "Claim")) + "</button>";
    }
    return bar;
  }

  // ── Presence (server-side roster) ──────────────────────────────────────
  async function registerPresence(online) {
    try {
      await fetch("/api/webrtc/presence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: myUserId,
          handle: getHandle(),
          displayName: getDisplayName(),
          online,
        }),
        keepalive: true,
      });
    } catch (e) {
      console.warn("[handi-phone] presence register failed:", e);
    }
  }

  async function markPresenceOffline() {
    try {
      await fetch("/api/webrtc/presence/offline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: myUserId }),
        keepalive: true,
      });
    } catch (e) {
      /* best effort */
    }
  }

  async function fetchRoster() {
    try {
      const r = await fetch("/api/webrtc/presence");
      const data = await r.json();
      return (data && data.roster) || [];
    } catch (e) {
      return [];
    }
  }

  function startPresenceHeartbeat() {
    if (presenceTimer) clearInterval(presenceTimer);
    presenceTimer = setInterval(() => {
      if (isConnected) registerPresence(true);
    }, 15000);
  }

  async function ensureInfobipSdk() {
    if (typeof window.createInfobipRtc === "function") return true;
    if (document.querySelector('script[src*="infobip.rtc.js"]')) {
      // Script is in flight — wait for it to finish.
      for (let i = 0; i < 50; i++) {
        if (typeof window.createInfobipRtc === "function") return true;
        await new Promise((r) => setTimeout(r, 100));
      }
      return typeof window.createInfobipRtc === "function";
    }
    await new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "/js/vendor/infobip.rtc.js";
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
    return typeof window.createInfobipRtc === "function";
  }

  async function authenticateAndConnect() {
    try {
      const sdkReady = await ensureInfobipSdk();
      if (!sdkReady) throw new Error("Infobip SDK failed to load");

      const response = await fetch("/api/webrtc/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identity: myIdentity(),
          enableVideo: true,
        }),
      });
      const data = await response.json();
      if (!data.token) throw new Error("No token");
      userIdentity = data.identity || myUserId;

      infobipRTC = createInfobipRtc(data.token, { debug: false });

      infobipRTC.on("connected", (event) => {
        isConnected = true;
        if (event && event.identity) userIdentity = event.identity;
        console.log("[handi-phone] connected as", userIdentity);
        registerPresence(true);
        startPresenceHeartbeat();
        refreshPresence();
      });

      infobipRTC.on("disconnected", () => {
        isConnected = false;
        markPresenceOffline();
      });

      infobipRTC.on("incoming-webrtc-call", (event) => {
        handleIncomingCall(event.incomingCall);
      });

      infobipRTC.connect();
    } catch (e) {
      console.warn("[handi-phone] Infobip connect failed:", e);
    }
  }

  function handleIncomingCall(incomingCall) {
    const callerIdentity = incomingCall && incomingCall.source
      ? incomingCall.source().identifier
      : "Unknown";
    // Trigger the red flashing + audible ring (standalone ring-alert).
    try { window.dispatchEvent(new Event("handiRingingStart")); } catch (e) {}
    showIncomingCallUI(callerIdentity, incomingCall);
  }

  function showIncomingCallUI(callerIdentity, incomingCall) {
    if (incomingModal) incomingModal.remove();

    incomingModal = document.createElement("div");
    incomingModal.className = "fp-incoming-modal";
    incomingModal.innerHTML =
      '<div class="fp-incoming">' +
      '<div class="fp-incoming-head">' + escapeHtml(t("d_incomingCall", "Incoming call")) + "</div>" +
      '<div class="fp-incoming-caller"><i class="fa-solid fa-user"></i> <strong>' + escapeHtml(callerIdentity) + "</strong></div>" +
      '<div class="fp-incoming-actions">' +
      '<button class="fp-accept" id="fpAccept"><i class="fa-solid fa-phone"></i> ' + escapeHtml(t("d_accept", "Accept")) + "</button>" +
      '<button class="fp-decline" id="fpDecline"><i class="fa-solid fa-phone-slash"></i> ' + escapeHtml(t("d_decline", "Decline")) + "</button>" +
      "</div></div>";
    document.body.appendChild(incomingModal);

    incomingModal.querySelector("#fpAccept").onclick = () => {
      pendingIncomingCall = incomingCall;
      currentCall = incomingCall;
      // Stop the ringing alert.
      try { window.dispatchEvent(new Event("handiRingingStop")); } catch (e) {}

      // The Infobip SDK delivers audio and video through separate events:
      // "established" carries the remote AUDIO stream, while the remote VIDEO
      // stream arrives via "remote-camera-video-added".
      incomingCall.on("established", (event) => {
        if (event && event.stream) attachRemoteAudioStream(event.stream);
      });
      incomingCall.on("remote-camera-video-added", (event) => {
        if (event && event.stream) attachRemoteVideoStream(event.stream);
      });
      incomingCall.on("remote-camera-video-removed", () => {
        const v = document.getElementById("fpRemoteVideo");
        if (v) { v.srcObject = null; v.remove(); }
      });
      incomingCall.on("hangup", () => {
        cleanupCall(null);
      });
      incomingCall.on("error", () => {
        cleanupCall(null);
      });

      incomingCall.accept();
      hideIncomingCallUI();
      showCallPanel(callerIdentity);
    };
    incomingModal.querySelector("#fpDecline").onclick = () => {
      try { incomingCall.decline(); } catch (e) {}
      try { window.dispatchEvent(new Event("handiRingingStop")); } catch (e) {}
      hideIncomingCallUI();
    };

    // Attach inline styles once
    if (!document.getElementById("fp-incoming-style")) {
      const s = document.createElement("style");
      s.id = "fp-incoming-style";
      s.textContent =
        ".fp-incoming-modal{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:10000;font-family:inherit}" +
        ".fp-incoming{background:#fff;border-radius:16px;box-shadow:0 10px 40px rgba(0,0,0,.25);padding:16px;width:280px}" +
        ".fp-incoming-head{font-weight:700;margin-bottom:8px}" +
        ".fp-incoming-caller{display:flex;align-items:center;gap:8px;margin-bottom:12px}" +
        ".fp-incoming-actions{display:flex;gap:8px}" +
        ".fp-accept,.fp-decline{flex:1;border:none;border-radius:40px;padding:10px;color:#fff;cursor:pointer;font-weight:600}" +
        ".fp-accept{background:#16a34a}.fp-decline{background:#dc2626}";
      document.head.appendChild(s);
    }
  }

  function hideIncomingCallUI() {
    if (incomingModal) {
      incomingModal.remove();
      incomingModal = null;
    }
  }

  // ── In-call phone panel (hangup, mute, volume) ─────────────────────────
  let callPanel = null;
  let callPanelMuted = false;

  function showCallPanel(caller) {
    hideCallPanel();

    callPanel = document.createElement("div");
    callPanel.className = "fp-call-panel";
    callPanel.innerHTML =
      '<div class="fp-call-panel-inner">' +
      '<div class="fp-call-panel-caller"><i class="fa-solid fa-user"></i> <strong>' + escapeHtml(caller) + "</strong></div>" +
      '<div class="fp-call-panel-status">' + escapeHtml(t("d_inCall", "In call")) + "</div>" +
      '<div class="fp-call-panel-actions">' +
      '<button class="fp-ctl" id="fpMuteBtn" title="' + escapeHtml(t("d_mute", "Mute")) + '"><i class="fa-solid fa-microphone"></i></button>' +
      '<button class="fp-ctl" id="fpVolumeBtn" title="' + escapeHtml(t("d_volume", "Volume")) + '"><i class="fa-solid fa-volume-high"></i></button>' +
      '<button class="fp-ctl fp-ctl-danger" id="fpHangupBtn" title="' + escapeHtml(t("d_hangup", "Hang up")) + '"><i class="fa-solid fa-phone-slash"></i></button>' +
      "</div></div>";
    document.body.appendChild(callPanel);

    // Inject panel styles once.
    if (!document.getElementById("fp-call-panel-style")) {
      const s = document.createElement("style");
      s.id = "fp-call-panel-style";
      s.textContent =
        ".fp-call-panel{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:10001;font-family:inherit}" +
        ".fp-call-panel-inner{background:#fff;border-radius:18px;box-shadow:0 10px 40px rgba(0,0,0,.3);padding:20px;width:300px;text-align:center}" +
        ".fp-call-panel-caller{font-size:1.1rem;margin-bottom:4px}" +
        ".fp-call-panel-status{color:#64748b;font-size:.85rem;margin-bottom:16px}" +
        ".fp-call-panel-actions{display:flex;justify-content:center;gap:14px}" +
        ".fp-ctl{width:52px;height:52px;border-radius:50%;border:none;cursor:pointer;font-size:1.15rem;color:#fff;background:#334155}" +
        ".fp-ctl:active{opacity:.8}" +
        ".fp-ctl-danger{background:#dc2626}" +
        ".fp-ctl.muted{background:#d97706}";
      document.head.appendChild(s);
    }

    callPanel.querySelector("#fpMuteBtn").onclick = function () {
      callPanelMuted = !callPanelMuted;
      try {
        if (currentCall && typeof currentCall.mute === "function") {
          currentCall.mute(callPanelMuted);
        }
      } catch (e) {}
      callPanel.querySelector("#fpMuteBtn").classList.toggle("muted", callPanelMuted);
      callPanel.querySelector("#fpMuteBtn").querySelector("i").className =
        callPanelMuted ? "fa-solid fa-microphone-slash" : "fa-solid fa-microphone";
    };

    callPanel.querySelector("#fpVolumeBtn").onclick = function () {
      // Toggle the remote audio output mute (volume on/off is the simplest
      // reliable control across browsers without a full volume UI).
      const a = document.getElementById("fpRemoteAudio");
      if (a) a.muted = !a.muted;
      const btn = callPanel.querySelector("#fpVolumeBtn");
      const isMuted = a && a.muted;
      btn.querySelector("i").className = isMuted
        ? "fa-solid fa-volume-xmark"
        : "fa-solid fa-volume-high";
    };

    callPanel.querySelector("#fpHangupBtn").onclick = function () {
      hangup();
      hideCallPanel();
    };
  }

  function hideCallPanel() {
    if (callPanel) {
      callPanel.remove();
      callPanel = null;
      callPanelMuted = false;
    }
  }

  async function ensureConnected() {
    if (isConnected && infobipRTC) return true;
    await authenticateAndConnect();
    // Wait briefly for the connection to establish.
    for (let i = 0; i < 30; i++) {
      if (isConnected) return true;
      await new Promise((r) => setTimeout(r, 100));
    }
    return false;
  }

  function setCalling(btn, active) {
    if (callingBtn && callingBtn !== btn) setCalling(callingBtn, false);
    if (!btn) return;
    if (active) {
      btn.classList.add("calling");
      btn.style.background = "#cc0000";
      btn.style.borderColor = "#cc0000";
      btn.innerHTML = '<i class="fa-solid fa-phone-slash"></i>';
      callingBtn = btn;
    } else {
      btn.classList.remove("calling");
      btn.style.background = "";
      btn.style.borderColor = "";
      btn.innerHTML = '<i class="fa-solid fa-phone"></i>';
      callingBtn = null;
    }
  }

  function makeCall(webrtcId, video, label) {
    if (!webrtcId) {
      console.warn("[handi-phone] contact has no WebRTC identity");
      return;
    }
    const callerLabel = label || webrtcId;
    let localStream = null;
    navigator.mediaDevices
      .getUserMedia({ video: !!video, audio: true })
      .then((stream) => {
        localStream = stream;
      })
      .catch((err) => console.warn("Could not access media:", err))
      .finally(() => {
        try {
          const opts = (window.WebrtcCallOptions
            ? window.WebrtcCallOptions.builder()
            : null);
          let callOptions;
          if (opts) {
            callOptions = opts.setVideo(!!video).build();
          } else {
            callOptions = { video: !!video };
          }
          currentCall = infobipRTC.callWebrtc(webrtcId, callOptions);
          // Pop up the same in-call menu for the outgoing caller as for an
          // incoming one, so mute / volume / hangup are always available.
          showCallPanel(callerLabel);
          currentCall.on("established", (event) => {
            if (event && event.stream) attachRemoteAudioStream(event.stream);
            if (callingBtn) setCalling(callingBtn, false);
          });
          currentCall.on("remote-camera-video-added", (event) => {
            if (event && event.stream) attachRemoteVideoStream(event.stream);
          });
          currentCall.on("remote-camera-video-removed", () => {
            const v = document.getElementById("fpRemoteVideo");
            if (v) { v.srcObject = null; v.remove(); }
          });
          currentCall.on("hangup", () => {
            cleanupCall(localStream);
            if (callingBtn) setCalling(callingBtn, false);
          });
          currentCall.on("error", () => {
            cleanupCall(localStream);
            if (callingBtn) setCalling(callingBtn, false);
          });
          if (localStream) {
            try { currentCall.localStream = localStream; } catch (e) {}
          }
        } catch (err) {
          console.error("[handi-phone] call failed:", err);
          if (localStream) localStream.getTracks().forEach((tr) => tr.stop());
          if (callingBtn) setCalling(callingBtn, false);
        }
      });
  }

  function attachRemoteAudioStream(stream) {
    let a = document.getElementById("fpRemoteAudio");
    if (!a) {
      a = document.createElement("audio");
      a.id = "fpRemoteAudio";
      a.autoplay = true;
      document.body.appendChild(a);
    }
    a.srcObject = stream;
  }

  function attachRemoteVideoStream(stream) {
    let v = document.getElementById("fpRemoteVideo");
    if (!v) {
      v = document.createElement("video");
      v.id = "fpRemoteVideo";
      v.autoplay = true;
      v.playsInline = true;
      v.style.cssText = "position:fixed;right:16px;bottom:120px;width:240px;border-radius:12px;z-index:100010;background:#000;";
      document.body.appendChild(v);
    }
    v.srcObject = stream;
  }

  function cleanupCall(localStream) {
    if (localStream) localStream.getTracks().forEach((tr) => tr.stop());
    const v = document.getElementById("fpRemoteVideo");
    if (v) { v.srcObject = null; v.remove(); }
    const a = document.getElementById("fpRemoteAudio");
    if (a) { a.srcObject = null; a.remove(); }
    hideCallPanel();
    try { window.dispatchEvent(new Event("handiRingingStop")); } catch (e) {}
    try { window.dispatchEvent(new Event("handiCallEnded")); } catch (e) {}
  }

  function hangup() {
    if (currentCall) {
      try { currentCall.hangup(); } catch (e) {}
      currentCall = null;
    }
    if (callingBtn) setCalling(callingBtn, false);
    hideCallPanel();
    try { window.dispatchEvent(new Event("handiRingingStop")); } catch (e) {}
  }

  // ── Presence → contact list rendering ─────────────────────────────────
  function renderContacts(roster) {
    roster = roster || [];
    // Build a lookup by both the machine userId and the human handle.
    const statusById = {};
    roster.forEach((p) => {
      statusById[p.userId] = p;
      if (p.handle) statusById[p.handle] = p;
    });

    content.innerHTML =
      renderHandleBar().outerHTML +
      '<div class="phone-list">' +
      contacts
        .map(function (c) {
          const webrtcId = c.webrtcId || c.number || "";
          const p = statusById[webrtcId];
          const online = p ? !!p.online : false;
          const dot =
            '<span class="fp-presence fp-' + (online ? "online" : "offline") + '" ' +
            'title="' + escapeHtml(online ? t("d_online", "Online") : t("d_offline", "Offline")) + '"></span>';
          const disabled = online ? "" : " disabled";
          return (
            '<div class="phone-card">' +
            '<div class="phone-card-left">' +
            (c.photo
              ? '<img class="phone-avatar" src="' + escapeHtml(c.photo) + '" alt="">'
              : '<div class="phone-avatar placeholder"><i class="fa-solid fa-user"></i></div>') +
            '<div class="phone-name">' +
            escapeHtml(c.name) + dot +
            (c.caregiver
              ? '<span class="elderlyShow" style="font-size:0.6rem;background:#f59e0b;color:white;padding:1px 5px;border-radius:6px;margin-left:4px;">' + t("d_caregiver", "Caregiver") + "</span>"
              : "") +
            "</div></div>" +
            '<div class="phone-actions">' +
            '<button class="phone-call video-call" data-webrtc-id="' + escapeHtml(webrtcId) + '" data-name="' + escapeHtml(c.name) + '" title="' + escapeHtml(t("d_videoCall", "Video call")) + '"' + disabled + '><i class="fa-solid fa-video"></i></button>' +
            '<button class="phone-call webrtc-call" data-webrtc-id="' + escapeHtml(webrtcId) + '" data-name="' + escapeHtml(c.name) + '" title="' + escapeHtml(t("d_freeCall", "Free call")) + '"' + disabled + '><i class="fa-solid fa-phone"></i></button>' +
            "</div></div>"
          );
        })
        .join("") +
      "</div>";

    // Wire the handle-claim form if present.
    bindHandleClaim();
    // Re-wire the call buttons after re-render.
    bindCallButtons();
  }

  async function bindHandleClaim() {
    const btn = content.querySelector(".fp-handle-btn");
    const input = content.querySelector(".fp-handle-input");
    if (!btn || !input) return;
    btn.onclick = async function () {
      const result = await claimHandle(input.value);
      if (result.ok) {
        // Reconnect Infobip with the new identity and refresh.
        if (infobipRTC) {
          try { infobipRTC.disconnect(); } catch (e) {}
          infobipRTC = null;
          isConnected = false;
        }
        if (callingBtn) setCalling(callingBtn, false);
        authenticateAndConnect();
        renderContacts([]);
        refreshPresence();
      } else {
        alert(result.error);
      }
    };
  }

  function bindCallButtons() {
    content.querySelectorAll(".webrtc-call").forEach(function (btn) {
      btn.onclick = async function (e) {
        e.preventDefault();
        if (btn.disabled) return;
        if (btn.classList.contains("calling")) {
          hangup();
          return;
        }
        const ok = await ensureConnected();
        if (!ok) {
          console.warn("[handi-phone] not connected");
          return;
        }
        setCalling(btn, true);
        makeCall(btn.dataset.webrtcId, false, btn.dataset.name);
      };
    });

    content.querySelectorAll(".video-call").forEach(function (btn) {
      btn.onclick = async function (e) {
        e.preventDefault();
        if (btn.disabled) return;
        if (btn.classList.contains("calling")) {
          hangup();
          return;
        }
        const ok = await ensureConnected();
        if (!ok) {
          console.warn("[handi-phone] not connected");
          return;
        }
        setCalling(btn, true);
        makeCall(btn.dataset.webrtcId, true, btn.dataset.name);
      };
    });
  }

  async function refreshPresence() {
    const roster = await fetchRoster();
    renderContacts(roster);
  }

  function startPresencePolling() {
    if (presencePollTimer) clearInterval(presencePollTimer);
    presencePollTimer = setInterval(function () {
      refreshPresence();
    }, 15000);
  }

  // Attach presence styles once.
  if (!document.getElementById("fp-presence-style")) {
    const s = document.createElement("style");
    s.id = "fp-presence-style";
    s.textContent =
      ".fp-presence{display:inline-block;width:10px;height:10px;border-radius:50%;margin-left:6px;vertical-align:middle}" +
      ".fp-online{background:#16a34a}" +
      ".fp-offline{background:#9ca3af}" +
      ".phone-call[disabled]{opacity:.4;cursor:not-allowed}" +
      ".fp-handle-bar{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:8px 12px;border-radius:10px;border:1px solid rgba(128,128,128,.25);margin-bottom:10px;font-size:.9rem}" +
      ".fp-handle-input{flex:1;min-width:120px;padding:6px 10px;border:1px solid #cbd5e1;border-radius:8px;font-size:.95rem}" +
      ".fp-handle-btn{border:none;background:var(--topbar-accent,#0047cc);color:#fff;padding:6px 14px;border-radius:8px;cursor:pointer;font-weight:600}" +
      ".fp-handle-label{opacity:.7}";
    document.head.appendChild(s);
  }

  // Initial render (offline until roster loads), then poll.
  renderContacts([]);
  startPresencePolling();
  refreshPresence();

  window.addEventListener("handiCallEnded", () => {
    if (callingBtn) setCalling(callingBtn, false);
  });

  window.addEventListener("beforeunload", () => {
    markPresenceOffline();
  });

  // Establish the Infobip connection in the background so incoming calls work.
  authenticateAndConnect();
}
