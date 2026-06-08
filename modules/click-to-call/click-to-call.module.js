// modules/click-to-call/click-to-call.module.js
// Click-to-Call module: calls a phone number via Infobip WebRTC

import { loadSettings } from "../../js/core/settings.js";

export default function initClickToCall(container) {
  container.innerHTML = "";

  const localStreams = {};

  const style = document.createElement("style");
  style.textContent = `
    .video-call-container {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: #000;
        z-index: 10000;
        display: none;
        flex-direction: column;
    }
    .video-call-container.active {
        display: flex;
    }
    .local-video {
        position: absolute;
        bottom: 20px;
        right: 20px;
        width: 120px;
        height: 180px;
        border: 2px solid #fff;
        border-radius: 8px;
        background: #333;
        z-index: 10002;
    }
    .remote-video {
        width: 100%;
        height: 100%;
        object-fit: cover;
        background: #1a1a2e;
    }
    .call-controls {
        position: absolute;
        bottom: 30px;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        gap: 20px;
        z-index: 10002;
    }
    .call-controls button {
        width: 60px;
        height: 60px;
        border-radius: 50%;
        border: none;
        font-size: 1.5rem;
        cursor: pointer;
        transition: transform 0.2s;
    }
    .call-controls button:hover {
        transform: scale(1.05);
    }
    .hangup-btn {
        background: #cc0000;
        color: white;
    }
    .mute-btn {
        background: #0047cc;
        color: white;
    }
    .video-toggle-btn {
        background: #0047cc;
        color: white;
    }

    /* Click-to-Call dashboard contacts */
    .ctc-content {
        display: flex;
        flex-direction: column;
    }
    .ctc-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }
    .ctc-contact-row {
        display: flex;
        align-items: center;
        gap: 14px;
        padding: 16px;
        background: #ffffff;
        border: 2px solid #e2e8f0;
        border-radius: 16px;
    }
    .ctc-contact-row:hover {
        background: #f8fafc;
        border-color: #0047cc;
    }
    .ctc-avatar {
        width: 60px;
        height: 60px;
        border-radius: 50%;
        overflow: hidden;
        background: #e2e8f0;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 28px;
        color: #64748b;
    }
    .ctc-avatar img {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }
    .ctc-info {
        flex: 1;
        min-width: 0;
    }
    .ctc-name {
        font-weight: 700;
        font-size: 1.1rem;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
    .ctc-number {
        font-size: 0.9rem;
        color: #64748b;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
    .ctc-phone-trigger {
        cursor: pointer;
    }
    .ctc-phone-btn,
    .ctc-video-btn {
        width: 54px;
        height: 54px;
        border-radius: 50%;
        border: 2px solid;
        cursor: pointer;
        font-size: 1.3rem;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        transition: transform 0.15s;
    }
    .ctc-phone-btn:hover,
    .ctc-video-btn:hover {
        transform: scale(1.08);
    }
    .ctc-phone-btn {
        background: #008000;
        border-color: #008000;
        color: white;
    }
    .ctc-phone-btn:hover {
        background: #006400;
        border-color: #006400;
    }
    .ctc-video-btn {
        background: #3B82F6;
        border-color: #3B82F6;
        color: white;
    }
    .ctc-video-btn:hover {
        background: #2563EB;
        border-color: #2563EB;
    }
  `;
  document.head.appendChild(style);

  // Create video call overlay
  const videoContainer = document.createElement("div");
  videoContainer.id = "videoCallContainer";
  videoContainer.className = "video-call-container";
  videoContainer.innerHTML = `
    <video id="remoteVideo" class="remote-video" autoplay playsinline></video>
    <video id="localVideo" class="local-video" autoplay playsinline muted></video>
    <div class="call-controls">
        <button id="toggleMuteBtn" class="mute-btn" title="Mute microphone">
            <i class="fa-solid fa-microphone"></i>
        </button>
        <button id="toggleVideoBtn" class="video-toggle-btn" title="Toggle video">
            <i class="fa-solid fa-video"></i>
        </button>
        <button id="hangupBtn" class="hangup-btn" title="Hang up">
            <i class="fa-solid fa-phone-slash"></i>
        </button>
    </div>
  `;
  document.body.appendChild(videoContainer);

  const remoteVideo = document.getElementById("remoteVideo");
  const localVideo = document.getElementById("localVideo");
  const toggleMuteBtn = document.getElementById("toggleMuteBtn");
  const toggleVideoBtn = document.getElementById("toggleVideoBtn");
  const hangupBtn = document.getElementById("hangupBtn");

  let infobipRTC = null;
  let currentCall = null;
  let isMicMuted = false;
  let isVideoEnabled = true;

  function showCallStatus(message) {
    let statusDiv = document.getElementById("call-status");
    if (!statusDiv) {
      statusDiv = document.createElement("div");
      statusDiv.id = "call-status";
      statusDiv.style.cssText = `
        position: fixed;
        bottom: 100px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0,0,0,0.8);
        color: white;
        padding: 10px 20px;
        border-radius: 20px;
        z-index: 10001;
        font-size: 14px;
      `;
      document.body.appendChild(statusDiv);
    }
    statusDiv.textContent = message;
    statusDiv.style.display = "block";
  }

  function hideCallStatus() {
    const statusDiv = document.getElementById("call-status");
    if (statusDiv) statusDiv.style.display = "none";
  }

  function showVideoCallUI() {
    videoContainer.classList.add("active");
    hideCallStatus();
  }

  function updateMuteButtonUI() {
    if (isMicMuted) {
      toggleMuteBtn.innerHTML = '<i class="fa-solid fa-microphone-slash"></i>';
      toggleMuteBtn.style.background = "#cc0000";
    } else {
      toggleMuteBtn.innerHTML = '<i class="fa-solid fa-microphone"></i>';
      toggleMuteBtn.style.background = "#0047cc";
    }
  }

  function updateVideoButtonUI() {
    if (!isVideoEnabled) {
      toggleVideoBtn.innerHTML = '<i class="fa-solid fa-video-slash"></i>';
      toggleVideoBtn.style.background = "#cc0000";
    } else {
      toggleVideoBtn.innerHTML = '<i class="fa-solid fa-video"></i>';
      toggleVideoBtn.style.background = "#0047cc";
    }
  }

  async function makeAudioCall(phoneNumber) {
    try {
      showCallStatus("Calling...");

      // Audio-only — request mic only
      let localStream = null;
      try {
        localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (err) {
        console.warn("Could not access mic:", err);
      }

      const response = await fetch("/api/webrtc/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identity: "handi_user_" + Date.now(),
          enableVideo: false,
        }),
      });
      const { token } = await response.json();
      if (!token) throw new Error("Failed to obtain token");

      infobipRTC = createInfobipRtc(token, { debug: true });

      infobipRTC.on("connected", () => {
        console.log("Connected to Infobip WebRTC platform");
        currentCall = infobipRTC.callPhone(phoneNumber, {
          video: false,
          audio: true,
        });
        currentCall.on("ringing", () => {
          console.log("Ringing...");
          showCallStatus("Ringing...");
        });
        currentCall.on("established", () => {
          console.log("Audio call connected!");
          showCallStatus("Call connected");
          setTimeout(() => hideCallStatus(), 2000);
        });
        currentCall.on("hangup", () => endCall());
        currentCall.localStream = localStream;
      });

      infobipRTC.on("disconnected", () => endCall());
      infobipRTC.connect();
    } catch (error) {
      console.error("Call error:", error);
      showCallStatus("Call failed.");
      setTimeout(() => hideCallStatus(), 2000);
    }
  }

  async function makeVideoCall(phoneNumber) {
    try {
      showCallStatus("Initiating video call...");

      // Request camera + mic permission immediately (user gesture context)
      let localStream = null;
      try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localVideo.srcObject = localStream;
      } catch (err) {
        console.warn("Could not access camera/mic:", err);
      }

      const response = await fetch("/api/webrtc/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identity: "handi_user_" + Date.now(),
          enableVideo: true,
        }),
      });
      const { token } = await response.json();
      if (!token) throw new Error("Failed to obtain token");

      infobipRTC = createInfobipRtc(token, { debug: true });

      infobipRTC.on("connected", () => {
        console.log("Connected to Infobip WebRTC platform");
        currentCall = infobipRTC.callPhone(phoneNumber, {
          video: true,
          audio: true,
        });
        currentCall.on("ringing", () => {
          console.log("Ringing...");
          showCallStatus("Ringing...");
        });
        currentCall.on("established", (stream) => {
          console.log("Video call connected!");
          showVideoCallUI();
          if (stream) {
            remoteVideo.srcObject = stream;
          }
        });
        currentCall.on("hangup", () => endCall());
        currentCall.localStream = localStream;
      });

      infobipRTC.on("disconnected", () => endCall());
      infobipRTC.connect();
    } catch (error) {
      console.error("Video call error:", error);
      showCallStatus("Video call failed.");
      setTimeout(() => hideCallStatus(), 2000);
    }
  }

  function endCall() {
    // Stop local media tracks
    if (currentCall && currentCall.localStream) {
      currentCall.localStream.getTracks().forEach((track) => track.stop());
    }
    if (currentCall) {
      currentCall.hangup();
      currentCall = null;
    }
    if (infobipRTC) {
      infobipRTC.disconnect();
      infobipRTC = null;
    }
    // Reset video UI elements
    if (remoteVideo.srcObject) {
      remoteVideo.srcObject.getTracks().forEach((track) => track.stop());
      remoteVideo.srcObject = null;
    }
    if (localVideo.srcObject) {
      localVideo.srcObject.getTracks().forEach((track) => track.stop());
      localVideo.srcObject = null;
    }
    videoContainer.classList.remove("active");
    isMicMuted = false;
    isVideoEnabled = true;
    updateMuteButtonUI();
    updateVideoButtonUI();
  }

  async function createVideoRoom(roomName, participantIdentity) {
    try {
      const response = await fetch("/api/webrtc/room", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomName: roomName,
          identity: participantIdentity,
        }),
      });
      const { token, roomName: createdRoom } = await response.json();

      infobipRTC = createInfobipRtc(token, { debug: true });

      infobipRTC.on("connected", () => {
        console.log("Connected to room");
        const room = infobipRTC.joinRoom(createdRoom);

        room.on("streamAdded", (participant, stream) => {
          if (participant.id !== infobipRTC.identity()) {
            remoteVideo.srcObject = stream;
          }
        });

        showVideoCallUI();
      });

      infobipRTC.connect();
    } catch (error) {
      console.error("Room creation error:", error);
    }
  }

  // Event listeners
  toggleMuteBtn.addEventListener("click", () => {
    if (currentCall && currentCall.localStream) {
      const audioTracks = currentCall.localStream.getAudioTracks();
      audioTracks.forEach((track) => {
        track.enabled = isMicMuted;
      });
      isMicMuted = !isMicMuted;
      updateMuteButtonUI();
    }
  });

  toggleVideoBtn.addEventListener("click", () => {
    if (currentCall && currentCall.localStream) {
      const videoTracks = currentCall.localStream.getVideoTracks();
      videoTracks.forEach((track) => {
        track.enabled = isVideoEnabled;
      });
      isVideoEnabled = !isVideoEnabled;
      updateVideoButtonUI();
    }
  });

  hangupBtn.addEventListener("click", endCall);

  // Load contacts from settings
  const settings = loadSettings();
  const contacts = settings.click_to_call?.contacts || [];

  // Build header (matching all other module headers)
  const pinBtn = container.querySelector(".pin-btn");
  container.innerHTML = "";
  if (pinBtn) container.prepend(pinBtn);

  const title = document.createElement("div");
  title.className = "panel-title";
  title.innerHTML = '<i class="fa-solid fa-phone"></i> CLICK-TO-CALL';
  container.appendChild(title);

  const content = document.createElement("div");
  content.className = "ctc-content";
  container.appendChild(content);

  if (contacts.length === 0) {
    content.innerHTML = `
      <div class="module-empty">
        <i class="fa-solid fa-phone"></i>
        <p>No contacts saved yet.</p>
        <button class="ctc-settings-btn settings-link-btn">
          <i class="fa-solid fa-gear"></i> Add Contacts in Settings
        </button>
      </div>`;
  } else {
    content.innerHTML = `
      <div class="ctc-list">
        ${contacts.map((c) => `
          <div class="ctc-contact-row">
            <div class="ctc-avatar ctc-phone-trigger" data-number="${escapeHtml(c.number)}">
              ${c.photo
                ? `<img src="${c.photo}" alt="">`
                : `<i class="fa-solid fa-user"></i>`
              }
            </div>
            <div class="ctc-info ctc-phone-trigger" data-number="${escapeHtml(c.number)}">
              <div class="ctc-name">${escapeHtml(c.name)}</div>
              <div class="ctc-number">${escapeHtml(c.number)}</div>
            </div>
            <button class="ctc-phone-btn" data-number="${escapeHtml(c.number)}" title="Call">
              <i class="fa-solid fa-phone"></i>
            </button>
            <button class="ctc-video-btn" data-number="${escapeHtml(c.number)}" title="Video call">
              <i class="fa-solid fa-video"></i>
            </button>
          </div>
        `).join("")}
      </div>`;
  }

  // Settings button (empty state) — links to settings page
  const settingsBtn = content.querySelector(".ctc-settings-btn");
  if (settingsBtn) {
    settingsBtn.addEventListener("click", () => {
      location.href = "settings.html?args=click_to_call";
    });
  }

  // Avatar, name, number — starts audio-only call
  content.querySelectorAll(".ctc-phone-trigger").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      const number = el.dataset.number;
      makeAudioCall(number);
    });
  });

  // Phone button — starts audio-only call
  content.querySelectorAll(".ctc-phone-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const number = btn.dataset.number;
      makeAudioCall(number);
    });
  });

  // Video button — starts video call
  content.querySelectorAll(".ctc-video-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const number = btn.dataset.number;
      makeVideoCall(number);
    });
  });

  // Expose functions globally for external access
  window.makeAudioCall = makeAudioCall;
  window.makeVideoCall = makeVideoCall;
  window.createVideoRoom = createVideoRoom;

  function escapeHtml(str) {
    if (!str) return "";
    return str.replace(/[&<>]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[m]);
  }
}
