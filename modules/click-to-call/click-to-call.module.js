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

  function endVideoCall() {
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

  async function makePhoneCall(phoneNumber) {
    try {
      showCallStatus("Initiating call...");

      const response = await fetch("/api/webrtc/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identity: "handi_user_" + Date.now(),
          enableVideo: true,
        }),
      });
      const { token, capabilities } = await response.json();
      if (!token) throw new Error("Failed to obtain token");

      infobipRTC = createInfobipRtc(token, { debug: true });

      infobipRTC.on("connected", () => {
        console.log("Connected to Infobip WebRTC platform");
        initiatePhoneCall(phoneNumber);
      });

      infobipRTC.on("disconnected", () => endVideoCall());

      infobipRTC.on("error", (error) => {
        console.error("WebRTC error:", error);
        showCallStatus("Connection error. Please try again.");
        setTimeout(() => hideCallStatus(), 3000);
      });

      infobipRTC.connect();
    } catch (error) {
      console.error("Call initiation error:", error);
      alert(
        "Failed to start call. Please check your microphone and camera permissions.",
      );
    }
  }

  function initiatePhoneCall(phoneNumber) {
    currentCall = infobipRTC.callPhone(phoneNumber, {
      video: true,
      audio: true,
    });

    currentCall.on("ringing", () => {
      console.log("Ringing...");
      showCallStatus("Ringing...");
    });

    currentCall.on("established", (stream) => {
      console.log("Call connected!");
      showVideoCallUI();
      if (stream) {
        remoteVideo.srcObject = stream;
      }
    });

    currentCall.on("hangup", () => endVideoCall());

    currentCall.on("error", (error) => {
      console.error("Call error:", error);
      endVideoCall();
      alert("Call failed. Please try again.");
    });

    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((localStream) => {
        localVideo.srcObject = localStream;
        currentCall.localStream = localStream;
      })
      .catch((err) => {
        console.warn("Could not access local camera/mic:", err);
      });
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

  hangupBtn.addEventListener("click", endVideoCall);

  // Load contacts from settings
  const settings = loadSettings();
  const contacts = settings.click_to_call?.contacts || [];

  // Render module UI — each contact is a row: photo + name + video btn + phone btn
  const contactsHtml = contacts.length === 0
    ? `<div style="padding: 20px; text-align: center; color: #64748b; font-size: 14px;">No contacts saved. Add contacts in Settings.</div>`
    : contacts.map((c, i) => `
      <div style="display: flex; align-items: center; gap: 12px; padding: 12px 16px; background: #F8FAFE; border-radius: 16px; margin-bottom: 8px;">
        <div style="width: 44px; height: 44px; border-radius: 50%; overflow: hidden; background: #e2e8f0; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 20px; color: #64748b;">
          ${c.photo ? `<img src="${c.photo}" style="width: 100%; height: 100%; object-fit: cover;" alt="">` : `<i class="fa-solid fa-user"></i>`}
        </div>
        <div style="flex: 1; min-width: 0;">
          <div style="font-weight: 600; font-size: 15px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(c.name)}</div>
          <div style="font-size: 12px; color: #64748b; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(c.number)}</div>
        </div>
        <button class="ctc-video-btn" data-number="${escapeHtml(c.number)}" style="background: #3B82F6; color: white; border: none; width: 40px; height: 40px; border-radius: 50%; cursor: pointer; font-size: 16px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
          <i class="fa-solid fa-video"></i>
        </button>
        <button class="ctc-phone-btn" data-number="${escapeHtml(c.number)}" style="background: #10B981; color: white; border: none; width: 40px; height: 40px; border-radius: 50%; cursor: pointer; font-size: 16px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
          <i class="fa-solid fa-phone"></i>
        </button>
      </div>
    `).join("");

  container.innerHTML = `
    <div style="background: white; border-radius: 24px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
        <div style="background: linear-gradient(135deg, #1F2B3C, #2C3E50); color: white; padding: 16px 20px;">
            <div style="display: flex; align-items: center; gap: 10px;">
                <i class="fa-solid fa-phone" style="font-size: 22px;"></i>
                <div>
                    <h3 style="margin: 0; font-size: 18px; font-weight: 600;">Click to Call</h3>
                    <p style="margin: 2px 0 0; font-size: 12px; opacity: 0.8;">${contacts.length} contact${contacts.length !== 1 ? "s" : ""}</p>
                </div>
            </div>
        </div>
        <div style="padding: 16px;">
          ${contactsHtml}
        </div>
    </div>
  `;

  // Wire up video call buttons
  container.querySelectorAll(".ctc-video-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const number = btn.dataset.number;
      makePhoneCall(number);
    });
  });

  // Wire up audio-only call buttons
  container.querySelectorAll(".ctc-phone-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const number = btn.dataset.number;
      makePhoneCall(number);
    });
  });

  // Expose functions globally for external access
  window.makePhoneCall = makePhoneCall;
  window.createVideoRoom = createVideoRoom;

  function escapeHtml(str) {
    if (!str) return "";
    return str.replace(/[&<>]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[m]);
  }
}
