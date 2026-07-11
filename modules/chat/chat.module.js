/*
 * Copyright (c) 2026 Handi Homepage
 * Matrix Chat Module — uses matrix-js-sdk with password login
 */
import { loadSettings } from "../../js/core/settings.js";

export default async function initChat(container) {
  if (!window.matrixcs) {
    await new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "/js/vendor/matrix-js-sdk.bundle.js";
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }
  if (!window.InfobipRTC) {
    await new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "/js/vendor/infobip.rtc.js";
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

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
    window.LANG && window.LANG.modules && window.LANG.modules.chat
      ? window.LANG.modules.chat.name
      : "CHAT";
  title.innerHTML = '<i class="fa-solid fa-comments"></i> ' + name;
  container.appendChild(title);

  const content = document.createElement("div");
  content.className = "chat-content";
  container.appendChild(content);

  let settings = loadSettings();

  let roomUrls =
    settings.chat?.rooms && settings.chat.rooms.length
      ? settings.chat.rooms
      : [
          "#the-ple-room-ireland:matrix.org",
          "#ple-random-ireland:matrix.org",
          "",
        ];
  let refreshSeconds = settings.chat?.refreshInterval || 30;
  let homeserver = settings.chat?.homeserver || "https://matrix.org";
  let username = settings.chat?.username || "@bigboyfoolish:matrix.org";
  let password =
    settings.chat?.password ||
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_MATRIX_PASS) ||
    "";
  // Also support legacy accessToken if provided
  let legacyToken = settings.chat?.accessToken || "";

  let matrixClient = null;
  let refreshIntervalId = null;
  let isActive = true;
  let lastEventIds = {};
  let roomNameCache = {};
  const processedEvents = new Set();
  let roomOpenState = {};

  // =====================================================
  // SDK LOGIN
  // =====================================================

  async function initMatrixClient() {
    if (!username || !password) {
      if (legacyToken && settings.chat?.userId) {
        try {
          matrixClient = window.matrixcs.createClient({
            baseUrl: homeserver,
            accessToken: legacyToken,
            userId: settings.chat.userId,
          });
          await matrixClient.getUserId();
          return true;
        } catch {
          matrixClient = null;
        }
      }
      return false;
    }

    try {
      matrixClient = window.matrixcs.createClient({ baseUrl: homeserver });
      const resp = await matrixClient.loginWithPassword(username, password);
      settings.chat = settings.chat || {};
      settings.chat.accessToken = resp.access_token;
      settings.chat.userId = resp.user_id;
      localStorage.setItem("handiSettings", JSON.stringify(settings));
      return true;
    } catch (err) {
      console.error("Matrix login failed:", err);
      matrixClient = null;
      window.logEvent(1, "matrix_login_failed", { username: username, homeserver: homeserver, error: err.message });
      return false;
    }
  }

  // =====================================================
  // ROOM ID RESOLUTION
  // =====================================================

  async function resolveRoomId(roomInput) {
    if (!isActive || !roomInput?.trim()) return null;
    let identifier = roomInput.trim();

    const elementMatch = identifier.match(/\/#\/room\/(![^:]+:[^\s?&]+)/);
    if (elementMatch) identifier = elementMatch[1];
    if (identifier.startsWith("!")) return identifier;

    if (identifier.startsWith("#")) {
      try {
        const resp = await fetch(
          `${homeserver}/_matrix/client/v3/directory/room/${encodeURIComponent(identifier)}`,
          {
            headers: {
              Authorization: `Bearer ${matrixClient.getAccessToken()}`,
            },
          },
        );
        if (!resp.ok) return null;
        const data = await resp.json();
        return data.room_id;
      } catch {
        return null;
      }
    }
    return null;
  }

  // =====================================================
  // FETCH MESSAGES
  // =====================================================

  async function fetchRoomMessages(roomId) {
    if (!isActive) return [];
    try {
      const resp = await fetch(
        `${homeserver}/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/messages?dir=b&limit=50`,
        {
          headers: { Authorization: `Bearer ${matrixClient.getAccessToken()}` },
        },
      );
      if (!resp.ok) return [];
      const data = await resp.json();
      return (data.chunk || [])
        .filter(
          (m) => m.type === "m.room.message" || m.type === "m.room.encrypted",
        )
        .map((m) => ({
          event_id: m.event_id,
          sender: m.sender,
          origin_server_ts: m.origin_server_ts,
          body:
            m.type === "m.room.encrypted"
              ? t("d_encryptedMessage", "🔒 Encrypted message")
              : m.content?.body || "",
        }))
        .filter((m) => m.body);
    } catch {
      return [];
    }
  }

  async function getRoomName(roomId) {
    if (roomNameCache[roomId]) return roomNameCache[roomId];
    try {
      const resp = await fetch(
        `${homeserver}/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/state/m.room.name`,
        {
          headers: { Authorization: `Bearer ${matrixClient.getAccessToken()}` },
        },
      );
      if (resp.ok) {
        const data = await resp.json();
        if (data.name) {
          roomNameCache[roomId] = data.name;
          return data.name;
        }
      }
    } catch {}
    const shortId = roomId.substring(1, 13);
    roomNameCache[roomId] = shortId;
    return shortId;
  }

  async function joinRoom(roomId) {
    try {
      await fetch(
        `${homeserver}/_matrix/client/v3/join/${encodeURIComponent(roomId)}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${matrixClient.getAccessToken()}`,
            "Content-Type": "application/json",
          },
        },
      );
    } catch {}
  }

  // =====================================================
  // UI
  // =====================================================

  function escapeHtml(str) {
    if (!str) return "";
    return str.replace(
      /[&<>]/g,
      (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[m],
    );
  }

  function formatTime(ts) {
    if (!ts) return "";
    return new Date(ts).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function getSenderName(event) {
    const match = (event.sender || "").match(/@([^:]+):/);
    return match ? match[1] : event.sender || "";
  }

  function checkNewActivity(idx, messages) {
    if (!messages?.length) return false;
    const latestId = messages[0]?.event_id;
    if (!latestId) return false;
    if (lastEventIds[idx] && lastEventIds[idx] !== latestId) {
      lastEventIds[idx] = latestId;
      return true;
    }
    if (!lastEventIds[idx]) lastEventIds[idx] = latestId;
    return false;
  }

  function toggleRoom(idx) {
    roomOpenState[idx] = !roomOpenState[idx];
    const div = document.getElementById(`chat-msgs-${idx}`);
    const btn = document.querySelector(`.chat-toggle-msgs[data-room="${idx}"]`);
    if (div) div.style.display = roomOpenState[idx] ? "block" : "none";
    if (btn) btn.textContent = roomOpenState[idx] ? "▲" : "▼";
  }

  function renderChat(results) {
    let html = '<div class="chat-rooms-wrapper"><div class="chat-rooms-list">';
    for (const room of results) {
      const isOpen = roomOpenState[room.index] !== false;
      html += `
        <div class="chat-room-card ${room.hasNew ? "has-new" : ""}">
          <div class="chat-room-header" data-room="${room.index}" style="cursor:pointer;min-height:60px;">
            <div class="chat-room-name">
              <i class="fa-regular fa-comment"></i> ${escapeHtml(room.roomName)}
              ${room.hasNew ? '<span class="new-badge">' + t("d_new", "New!") + "</span>" : ""}
              ${room.error ? '<span class="error-badge">' + t("d_errorLabel", "Error") + "</span>" : ""}
            </div>
            <button class="chat-toggle-msgs" data-room="${room.index}" style="min-width:48px;min-height:48px;font-size:1.2rem;cursor:pointer;border-radius:12px;background:#f1f5f9;border:1px solid #cbd5e1;">${isOpen ? "▲" : "▼"}</button>
          </div>
          <div class="chat-room-messages" id="chat-msgs-${room.index}" style="display:${isOpen ? "block" : "none"};">`;

      if (room.error) {
        html += `<div class="chat-error">⚠️ ${escapeHtml(room.error)}</div>`;
      } else if (!room.messages.length) {
        html +=
          '<div class="chat-empty">💬 ' +
          t("d_noMessages", "No messages yet") +
          "</div>";
      } else {
        for (const msg of room.messages.slice(0, 20)) {
          html += `
            <div class="chat-message" style="padding:8px 0;border-bottom:1px solid #e2e8f0;">
              <div class="chat-message-header" style="margin-bottom:4px;">
                <span class="chat-sender"><strong>${escapeHtml(getSenderName(msg))}</strong></span>
                <span class="chat-time" style="margin-left:12px;font-size:0.75rem;color:#94a3b8;">${escapeHtml(formatTime(msg.origin_server_ts))}</span>
              </div>
              <div class="chat-body" style="font-size:0.85rem;">${escapeHtml(msg.body.substring(0, 500))}</div>
            </div>`;
        }
      }
      html += "</div></div>";
    }
    html +=
      '</div></div><div style="display:flex;gap:12px;margin-top:16px;">' +
      '<button id="chatRefreshBtn" class="chat-refresh-btn" style="flex:1;padding:14px;font-size:1rem;font-weight:bold;">⟳ ' +
      t("d_refresh", "Refresh") +
      "</button>";

    content.innerHTML = html;

    document.querySelectorAll(".chat-room-header").forEach((h) => {
      h.addEventListener("click", (e) => {
        if (!e.target.classList.contains("chat-toggle-msgs"))
          toggleRoom(parseInt(h.dataset.room));
      });
    });
    document.querySelectorAll(".chat-toggle-msgs").forEach((b) => {
      b.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleRoom(parseInt(b.dataset.room));
      });
    });
    document
      .getElementById("chatRefreshBtn")
      ?.addEventListener("click", fetchAllRooms);
    if (window.refreshDashboardLayout) window.refreshDashboardLayout();
  }

  // =====================================================
  // FETCH ALL
  // =====================================================

  async function fetchAllRooms() {
    if (!isActive || !matrixClient) return;

    const validRooms = roomUrls.filter((r) => r?.trim());
    if (!validRooms.length) {
      content.innerHTML = `
        <div class="module-empty">
          <i class="fa-solid fa-comments"></i>
          <p>${t("d_noChatRooms", "No chat rooms configured.")}</p>
          <button id="chatSettingsBtn" class="settings-link-btn" style="margin-top:12px;">
            <i class="fa-solid fa-gear"></i> ${t("d_configureSettings", "Configure in Settings")}
          </button>
        </div>`;
      content.querySelector("#chatSettingsBtn").onclick = () =>
        (location.href = "settings.html?args=chat");
      return;
    }

    content.innerHTML =
      '<div class="chat-loading"><i class="fa-solid fa-spinner fa-spin"></i> ' +
      t("d_loadingMatrix", "Loading Matrix rooms...") +
      "</div>";

    const results = [];
    for (let i = 0; i < validRooms.length; i++) {
      const roomId = await resolveRoomId(validRooms[i]);
      if (!roomId) {
        results.push({
          index: i,
          messages: [],
          roomName: t("d_invalidRoom", "Invalid Room"),
          error: t("d_couldNotResolveRoom", "Could not resolve room"),
          hasNew: false,
        });
        continue;
      }
      await joinRoom(roomId);
      const roomName = await getRoomName(roomId);
      const messages = await fetchRoomMessages(roomId);
      const hasNew = checkNewActivity(i, messages);
      results.push({
        index: i,
        url: validRooms[i],
        messages,
        roomName,
        hasNew,
        error: null,
      });
    }
    renderChat(results);
  }

  // =====================================================
  // START
  // =====================================================

  async function start() {
    const loggedIn = await initMatrixClient();
    if (!loggedIn) {
      content.innerHTML = `
        <div class="module-empty">
          <i class="fa-solid fa-comments"></i>
          <p>${t("d_matrixNotConfigured", "Matrix chat not configured.")}</p>
          <button id="chatSettingsBtn" class="settings-link-btn" style="margin-top:12px;">
            <i class="fa-solid fa-gear"></i> ${t("d_configureSettings", "Configure in Settings")}
          </button>
        </div>`;
      content.querySelector("#chatSettingsBtn").onclick = () =>
        (location.href = "settings.html?args=chat");
      return;
    }

    // Start polling
    fetchAllRooms();
    if (refreshIntervalId) clearInterval(refreshIntervalId);
    refreshIntervalId = setInterval(() => {
      if (processedEvents.size > 5000) processedEvents.clear();
      fetchAllRooms();
    }, refreshSeconds * 1000);
  }

  start();

  return () => {
    isActive = false;
    if (refreshIntervalId) clearInterval(refreshIntervalId);
  };
}
