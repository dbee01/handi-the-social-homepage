// modules/click-to-call/click-to-call.module.js
import { createInfobipRtc } from "/node_modules/infobip-rtc/dist/index.js";
import { loadSettings } from "../../js/core/settings.js";

export default async function initClickToCall(container) {
  const pinBtn = container.querySelector(".pin-btn");
  container.innerHTML = "";
  if (pinBtn) container.prepend(pinBtn);

  const title = document.createElement("div");
  title.className = "panel-title";
  title.innerHTML = '<i class="fa-solid fa-phone"></i> CLICK TO CALL';
  container.appendChild(title);

  const content = document.createElement("div");
  content.className = "click-to-call-content";
  content.style.cssText = "padding: 10px;";
  container.appendChild(content);

  // State
  let infobipRTC = null;
  let currentCall = null;
  let localStream = null;
  let isMicMuted = false;
  let isVideoEnabled = true;
  let activeCallButton = null;

  function buildContacts() {
    const settings = loadSettings();
    const savedContacts = settings.click_to_call?.contacts || [];
    const emojis = ["👵", "👴", "👩‍⚕️", "👨", "👩", "🧑", "👱", "🧓"];
    return savedContacts.map((c, i) => ({
      label: (emojis[i % emojis.length] || "📞") + " " + c.name,
      number: c.number,
      photo: c.photo || null,
    }));
  }

  function buildUI() {
    const contacts = buildContacts();

    if (contacts.length === 0) {
      content.innerHTML = `
        <div class="module-empty" style="text-align:center;padding:20px;">
          <i class="fa-solid fa-phone" style="font-size:3rem;color:#cbd5e1;margin-bottom:12px;"></i>
          <p style="color:#64748b;margin-bottom:16px;">No contacts saved yet.</p>
          <button id="ctcSettingsBtn" class="settings-link-btn" style="background:#eaf2ff;border:none;padding:12px 24px;border-radius:48px;font-size:1rem;font-weight:600;color:#0047cc;cursor:pointer;">
            <i class="fa-solid fa-gear"></i> Add Contacts in Settings
          </button>
        </div>
      `;
      const settingsBtn = content.querySelector("#ctcSettingsBtn");
      if (settingsBtn)
        settingsBtn.onclick = () =>
          (location.href = "settings.html?args=click_to_call");
      return;
    }

    let buttonsHtml = "";
    for (const c of contacts) {
      const avatarHtml = c.photo
        ? `<img src="${c.photo}" style="width:44px;height:44px;border-radius:50%;object-fit:cover;flex-shrink:0;" />`
        : `<span style="background:#10B981;color:white;width:44px;height:44px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;"><i class="fa-solid fa-user"></i></span>`;
      buttonsHtml += `
        <div class="ctc-contact-row" style="width:100%;margin-bottom:8px;border-radius:16px;border:2px solid #cbd5e1;background:white;padding:10px 14px;display:flex;align-items:center;gap:10px;">
          ${avatarHtml}
          <span style="flex:1;font-size:1.1rem;font-weight:600;">${c.label}</span>
          <button class="ctc-call-btn" data-number="${c.number}" data-video="false" style="background:#10B981;color:white;border:none;width:48px;height:48px;border-radius:50%;font-size:1.3rem;cursor:pointer;flex-shrink:0;transition:all 0.2s;" title="Voice call">
            <i class="fa-solid fa-phone"></i>
          </button>
          <button class="ctc-call-btn" data-number="${c.number}" data-video="true" style="background:#0047cc;color:white;border:none;width:48px;height:48px;border-radius:50%;font-size:1.3rem;cursor:pointer;flex-shrink:0;transition:all 0.2s;" title="Video call">
            <i class="fa-solid fa-video"></i>
          </button>
        </div>`;
    }

    content.innerHTML = `
      <div style="margin-bottom:8px;font-size:0.85rem;color:#64748b;text-align:center;">Tap a contact to start a video call</div>
      <div id="ctcContactList">${buttonsHtml}</div>
      <div id="ctcStatus" style="margin-top:10px;font-size:0.85rem;color:#64748b;text-align:center;"></div>
      <div id="ctcControls" style="display:none;margin-top:10px;text-align:center;">
        <button id="ctcMuteBtn" style="background:#0047cc;color:white;border:none;width:50px;height:50px;border-radius:50%;font-size:1.3rem;cursor:pointer;margin:0 8px;">
          <i class="fa-solid fa-microphone"></i>
        </button>
        <button id="ctcHangupBtn" style="background:#cc0000;color:white;border:none;width:50px;height:50px;border-radius:50%;font-size:1.3rem;cursor:pointer;margin:0 8px;">
          <i class="fa-solid fa-phone-slash"></i>
        </button>
      </div>
      <div id="ctcVideoContainer" style="display:none;margin-top:10px;position:relative;background:#000;border-radius:12px;overflow:hidden;">
        <video id="ctcRemoteVideo" autoplay playsinline style="width:100%;height:200px;object-fit:cover;background:#1a1a2e;"></video>
        <video id="ctcLocalVideo" autoplay playsinline muted style="position:absolute;bottom:10px;right:10px;width:80px;height:120px;border:2px solid #fff;border-radius:8px;background:#333;"></video>
      </div>
    `;

    // Wire up contact buttons
    content.querySelectorAll(".ctc-call-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const number = btn.dataset.number;
        const video = btn.dataset.video === "true";
        makePhoneCall(number, video, btn);
      });
    });

    // Wire up controls
    const hangupBtn = document.getElementById("ctcHangupBtn");
    const muteBtn = document.getElementById("ctcMuteBtn");
    if (hangupBtn) hangupBtn.onclick = hangupCall;
    if (muteBtn) muteBtn.onclick = toggleMute;
  }

  function setStatus(msg, isError = false) {
    const statusEl = document.getElementById("ctcStatus");
    if (statusEl) {
      statusEl.innerHTML = msg;
      statusEl.style.color = isError ? "#cc0000" : "#64748b";
    }
  }

  function showCallUI(show) {
    const controls = document.getElementById("ctcControls");
    const video = document.getElementById("ctcVideoContainer");
    if (controls) controls.style.display = show ? "block" : "none";
    if (video) video.style.display = show ? "block" : "none";
  }

  // Highlight the active button and disable others
  function setActiveButton(btn) {
    if (activeCallButton) {
      activeCallButton.style.opacity = "1";
      activeCallButton.style.pointerEvents = "";
    }
    activeCallButton = btn;
    if (btn) {
      btn.style.opacity = "0.6";
      btn.style.pointerEvents = "none";
    }
    content.querySelectorAll(".ctc-call-btn").forEach((b) => {
      if (b !== btn) b.disabled = !!btn;
    });
  }

  // ─── makePhoneCall('+353...', video, btn) ──────────────────────────────
  async function makePhoneCall(phoneNumber, enableVideo, btn) {
    if (btn) setActiveButton(btn);
    setStatus(enableVideo ? "Starting video call..." : "Starting voice call...");
    showCallUI(false);

    try {
      const tokenRes = await fetch("/api/webrtc/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identity: "handi_user_" + Date.now(),
          enableVideo: enableVideo,
        }),
      });
      const tokenData = await tokenRes.json();
      if (!tokenData.token) throw new Error("Failed to obtain token");

      infobipRTC = createInfobipRtc(tokenData.token, { debug: true });

      infobipRTC.on("connected", () => {
        setStatus("Ringing...");
        currentCall = infobipRTC.callPhone(phoneNumber, {
          video: enableVideo,
          audio: true,
        });

        currentCall.on("ringing", () => setStatus("Ringing..."));
        currentCall.on("established", (stream) => {
          setStatus("Call connected");
          showCallUI(true);
          const remoteVideo = document.getElementById("ctcRemoteVideo");
          if (remoteVideo && stream) remoteVideo.srcObject = stream;
        });
        currentCall.on("hangup", () => { setStatus("Call ended"); cleanupCall(); });
        currentCall.on("error", (err) => {
          console.error("[ClickToCall] Call error:", err);
          setStatus("Call failed", true);
          cleanupCall();
        });
      });

      infobipRTC.on("disconnected", () => cleanupCall());
      infobipRTC.on("error", (err) => {
        console.error("[ClickToCall] Connection error:", err);
        setStatus("Connection error", true);
        cleanupCall();
      });

      try {
        localStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        const localVideo = document.getElementById("ctcLocalVideo");
        if (localVideo) localVideo.srcObject = localStream;
      } catch (err) {
        console.warn("[ClickToCall] Could not get local media:", err);
      }

      infobipRTC.connect();
    } catch (err) {
      console.error("[ClickToCall] Error:", err);
      setStatus("Failed: " + err.message, true);
      cleanupCall();
    }
  }

  // ─── createVideoRoom('family-checkin', 'grandparent_1') ──────────────
  async function createVideoRoom(roomName, participantIdentity, btn) {
    if (btn) setActiveButton(btn);
    setStatus("Joining room...");
    showCallUI(false);

    try {
      const roomRes = await fetch("/api/webrtc/room", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomName: roomName,
          identity: participantIdentity,
        }),
      });
      const roomData = await roomRes.json();
      if (!roomData.token) throw new Error("Failed to join room");

      infobipRTC = createInfobipRtc(roomData.token, { debug: true });

      infobipRTC.on("connected", () => {
        setStatus("Connected to room...");
        const room = infobipRTC.joinRoom(roomData.roomName);

        room.on("streamAdded", (participant, stream) => {
          if (participant.id !== infobipRTC.identity()) {
            setStatus("In room");
            showCallUI(true);
            const remoteVideo = document.getElementById("ctcRemoteVideo");
            if (remoteVideo) remoteVideo.srcObject = stream;
          }
        });
      });

      infobipRTC.on("disconnected", () => cleanupCall());
      infobipRTC.on("error", (err) => {
        console.error("[ClickToCall] Room error:", err);
        setStatus("Room error", true);
        cleanupCall();
      });

      try {
        localStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        const localVideo = document.getElementById("ctcLocalVideo");
        if (localVideo) localVideo.srcObject = localStream;
      } catch (err) {
        console.warn("[ClickToCall] Could not get local media:", err);
      }

      infobipRTC.connect();
    } catch (err) {
      console.error("[ClickToCall] Room error:", err);
      setStatus("Failed: " + err.message, true);
      cleanupCall();
    }
  }

  function hangupCall() {
    setStatus("Ending call...");
    cleanupCall();
  }

  function cleanupCall() {
    if (localStream) {
      localStream.getTracks().forEach((t) => t.stop());
      localStream = null;
    }
    if (currentCall) {
      try { currentCall.hangup(); } catch (e) {}
      currentCall = null;
    }
    if (infobipRTC) {
      try { infobipRTC.disconnect(); } catch (e) {}
      infobipRTC = null;
    }
    const remoteVideo = document.getElementById("ctcRemoteVideo");
    const localVideo = document.getElementById("ctcLocalVideo");
    if (remoteVideo && remoteVideo.srcObject) remoteVideo.srcObject = null;
    if (localVideo && localVideo.srcObject) localVideo.srcObject = null;

    showCallUI(false);
    setActiveButton(null);
    isMicMuted = false;
    isVideoEnabled = true;
  }

  function toggleMute() {
    if (localStream) {
      const audioTracks = localStream.getAudioTracks();
      audioTracks.forEach((track) => { track.enabled = isMicMuted; });
      isMicMuted = !isMicMuted;
      const muteBtn = document.getElementById("ctcMuteBtn");
      if (muteBtn) {
        muteBtn.innerHTML = isMicMuted
          ? '<i class="fa-solid fa-microphone-slash"></i>'
          : '<i class="fa-solid fa-microphone"></i>';
        muteBtn.style.background = isMicMuted ? "#cc0000" : "#0047cc";
      }
    }
  }

  buildUI();

  // Re-render when settings change
  window.addEventListener("storage", (e) => {
    if (e.key === "handiSettings") buildUI();
  });
  window.addEventListener("handiSettingsSaved", () => buildUI());
}
