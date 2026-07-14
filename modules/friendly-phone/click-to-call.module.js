// modules/click-to-call/click-to-call.module.js
// Click-to-Call module: calls a phone number via Infobip WebRTC
// corresponding to the WEBRTC infobip JS SDK WEBRTC
// https://github.com/infobip/infobip-rtc-js

import { loadSettings } from "../../js/core/settings.js";

export default function initClickToCall(container) {
  var t =
    window.t ||
    function (k, e) {
      return e || k;
    };
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
    .device-btn {
        background: #333;
        color: white;
    }

    /* Audio-call floating bar */
    .audio-call-bar {
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #1a1a2e;
        color: white;
        border-radius: 40px;
        padding: 10px 24px;
        display: none;
        align-items: center;
        gap: 16px;
        z-index: 10001;
        box-shadow: 0 4px 20px rgba(0,0,0,0.4);
        font-size: 14px;
    }
    .audio-call-bar.active {
        display: flex;
    }
    .audio-call-bar .call-label {
        white-space: nowrap;
    }
    .audio-call-bar button {
        width: 44px;
        height: 44px;
        border-radius: 50%;
        border: none;
        cursor: pointer;
        font-size: 1.1rem;
    }
    .audio-call-bar .acb-mute {
        background: #0047cc;
        color: white;
    }
    .audio-call-bar .acb-mute.muted {
        background: #cc0000;
    }
    .audio-call-bar .acb-device {
        background: #333;
        color: white;
    }
    .audio-call-bar .acb-hangup {
        background: #cc0000;
        color: white;
    }

    /* Device selector popup */
    .device-selector {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: #fff;
        color: #1e293b;
        border-radius: 16px;
        padding: 24px;
        z-index: 10003;
        display: none;
        flex-direction: column;
        gap: 16px;
        min-width: 300px;
        box-shadow: 0 10px 40px rgba(0,0,0,0.5);
    }
    .device-selector.active {
        display: flex;
    }
    .device-selector h3 {
        margin: 0 0 4px;
        font-size: 1.1rem;
    }
    .device-selector select {
        width: 100%;
        padding: 10px;
        border-radius: 8px;
        border: 1px solid #cbd5e1;
        font-size: 14px;
        background: #f8fafc;
    }
    .device-selector button {
        padding: 10px 20px;
        border-radius: 8px;
        border: none;
        cursor: pointer;
        font-size: 14px;
    }
    .device-selector .ds-close {
        background: #e2e8f0;
        color: #1e293b;
    }
    .device-selector .ds-apply {
        background: #0047cc;
        color: white;
    }
    .device-selector .ds-row {
        display: flex;
        gap: 10px;
        justify-content: flex-end;
    }

    /* Mute notification toast */
    .mute-toast {
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #cc0000;
        color: white;
        padding: 10px 24px;
        border-radius: 30px;
        z-index: 10004;
        font-size: 14px;
        display: none;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    }
    .mute-toast.active {
        display: block;
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

  // ── Video call overlay ──────────────────────────────────────────────────
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
        <button id="deviceSelectBtn" class="device-btn" title="Choose devices">
            <i class="fa-solid fa-gear"></i>
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
  const deviceSelectBtn = document.getElementById("deviceSelectBtn");
  const hangupBtn = document.getElementById("hangupBtn");

  // ── Audio-call floating bar ─────────────────────────────────────────────
  const audioCallBar = document.createElement("div");
  audioCallBar.id = "audioCallBar";
  audioCallBar.className = "audio-call-bar";
  audioCallBar.innerHTML = `
    <span class="call-label">📞 On call</span>
    <button class="acb-mute" id="acbMuteBtn" title="Mute">
      <i class="fa-solid fa-microphone"></i>
    </button>
    <button class="acb-device" id="acbDeviceBtn" title="Choose devices">
      <i class="fa-solid fa-gear"></i>
    </button>
    <button class="acb-hangup" id="acbHangupBtn" title="Hang up">
      <i class="fa-solid fa-phone-slash"></i>
    </button>
  `;
  document.body.appendChild(audioCallBar);

  const acbMuteBtn = document.getElementById("acbMuteBtn");
  const acbDeviceBtn = document.getElementById("acbDeviceBtn");
  const acbHangupBtn = document.getElementById("acbHangupBtn");

  // ── Device selector popup ───────────────────────────────────────────────
  const deviceSelector = document.createElement("div");
  deviceSelector.id = "deviceSelector";
  deviceSelector.className = "device-selector";
  deviceSelector.innerHTML = `
    <h3>${t("d_selectDevices", "Select Devices")}</h3>
    <div>
      <label>${t("d_microphone", "Microphone")}</label>
      <select id="dsMicSelect"></select>
    </div>
    <div>
      <label>${t("d_speaker", "Speaker")}</label>
      <select id="dsSpeakerSelect"></select>
    </div>
    <div id="dsCameraRow">
      <label>${t("d_camera", "Camera")}</label>
      <select id="dsCameraSelect"></select>
    </div>
    <div class="ds-row">
      <button class="ds-close" id="dsCloseBtn">${t("d_cancel", "Cancel")}</button>
      <button class="ds-apply" id="dsApplyBtn">${t("d_apply", "Apply")}</button>
    </div>
  `;
  document.body.appendChild(deviceSelector);

  const dsMicSelect = document.getElementById("dsMicSelect");
  const dsSpeakerSelect = document.getElementById("dsSpeakerSelect");
  const dsCameraSelect = document.getElementById("dsCameraSelect");
  const dsCameraRow = document.getElementById("dsCameraRow");
  const dsCloseBtn = document.getElementById("dsCloseBtn");
  const dsApplyBtn = document.getElementById("dsApplyBtn");

  // ── Mute notification toast ─────────────────────────────────────────────
  const muteToast = document.createElement("div");
  muteToast.id = "muteToast";
  muteToast.className = "mute-toast";
  muteToast.textContent = "⚠️ " + t("d_micMuted", "Your microphone is muted");
  document.body.appendChild(muteToast);

  // ── State ───────────────────────────────────────────────────────────────
  let infobipRTC = null;
  let currentCall = null;
  let isMicMuted = false;
  let isVideoEnabled = true;
  let activeCallingBtn = null;
  let isAudioCall = false; // true = audio-only call (floating bar), false = video (full overlay)
  let muteCheckInterval = null;

  // ── Device helpers ──────────────────────────────────────────────────────
  async function populateDeviceSelects(showCamera) {
    dsCameraRow.style.display = showCamera ? "block" : "none";

    // Microphones
    dsMicSelect.innerHTML =
      '<option value="">' + t("d_default", "Default") + "</option>";
    try {
      const mics = await navigator.mediaDevices.enumerateDevices();
      mics
        .filter((d) => d.kind === "audioinput")
        .forEach((d) => {
          const opt = document.createElement("option");
          opt.value = d.deviceId;
          opt.textContent = d.label || `Mic (${d.deviceId.slice(0, 8)}...)`;
          dsMicSelect.appendChild(opt);
        });
    } catch (e) {
      /* ignore */
    }

    // Speakers
    dsSpeakerSelect.innerHTML =
      '<option value="">' + t("d_default", "Default") + "</option>";
    try {
      const devs = await navigator.mediaDevices.enumerateDevices();
      devs
        .filter((d) => d.kind === "audiooutput")
        .forEach((d) => {
          const opt = document.createElement("option");
          opt.value = d.deviceId;
          opt.textContent = d.label || `Speaker (${d.deviceId.slice(0, 8)}...)`;
          dsSpeakerSelect.appendChild(opt);
        });
    } catch (e) {
      /* ignore */
    }

    // Cameras
    dsCameraSelect.innerHTML = '<option value="">Default</option>';
    if (showCamera) {
      try {
        const cams = await navigator.mediaDevices.enumerateDevices();
        cams
          .filter((d) => d.kind === "videoinput")
          .forEach((d) => {
            const opt = document.createElement("option");
            opt.value = d.deviceId;
            opt.textContent =
              d.label || `Camera (${d.deviceId.slice(0, 8)}...)`;
            dsCameraSelect.appendChild(opt);
          });
      } catch (e) {
        /* ignore */
      }
    }
  }

  async function applyDeviceSelection() {
    showCallStatus(t("d_applyingDevices", "Applying devices..."));
    try {
      const micId = dsMicSelect.value;
      const speakerId = dsSpeakerSelect.value;
      const cameraId = dsCameraSelect.value;
      const constraints = {};

      if (micId) constraints.audio = { deviceId: { exact: micId } };
      else constraints.audio = true;

      if (cameraId) constraints.video = { deviceId: { exact: cameraId } };
      else if (isVideoEnabled && !isAudioCall) constraints.video = true;

      // Stop old local stream
      if (currentCall && currentCall.localStream) {
        currentCall.localStream.getTracks().forEach((t) => t.stop());
      }

      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      if (currentCall) {
        currentCall.localStream = newStream;
      }
      if (!isAudioCall && newStream.getVideoTracks().length > 0) {
        localVideo.srcObject = newStream;
      }

      // Route remote audio to selected speaker
      const remoteAudio = document.getElementById("remoteAudio");
      if (remoteAudio && remoteAudio.setSinkId && speakerId) {
        try {
          await remoteAudio.setSinkId(speakerId);
        } catch (e) {
          console.warn("Speaker switch failed:", e);
        }
      }

      showCallStatus(t("d_devicesUpdated", "Devices updated"));
      setTimeout(() => hideCallStatus(), 1500);
    } catch (err) {
      console.error("Device switch error:", err);
      showCallStatus(t("d_deviceSwitchFailed", "Device switch failed"));
      setTimeout(() => hideCallStatus(), 2000);
    }
    deviceSelector.classList.remove("active");
  }

  function showDeviceSelector(showCamera) {
    populateDeviceSelects(showCamera);
    deviceSelector.classList.add("active");
  }

  // ── Status helpers ──────────────────────────────────────────────────────
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

  // ── Mute check (poll currentCall.muted()) ───────────────────────────────
  function startMuteCheck() {
    stopMuteCheck();
    muteCheckInterval = setInterval(() => {
      if (!currentCall || typeof currentCall.muted !== "function") return;
      try {
        const remoteMuted = currentCall.muted();
        if (remoteMuted) {
          muteToast.classList.add("active");
        } else {
          muteToast.classList.remove("active");
        }
      } catch (e) {
        /* SDK may not support */
      }
    }, 2000);
  }

  function stopMuteCheck() {
    if (muteCheckInterval) {
      clearInterval(muteCheckInterval);
      muteCheckInterval = null;
    }
    muteToast.classList.remove("active");
  }

  // ── Button icon toggles ─────────────────────────────────────────────────
  function setCallingButton(btn) {
    if (activeCallingBtn && activeCallingBtn !== btn) resetCallingButton();
    if (!btn) return;
    btn.classList.add("calling");
    btn.style.background = "#cc0000";
    btn.style.borderColor = "#cc0000";
    btn.title = "Hang up";
    btn.innerHTML = '<i class="fa-solid fa-phone-slash"></i>';
    activeCallingBtn = btn;
  }

  function resetCallingButton() {
    if (!activeCallingBtn) return;
    activeCallingBtn.classList.remove("calling");
    activeCallingBtn.style.background = "#008000";
    activeCallingBtn.style.borderColor = "#008000";
    activeCallingBtn.title = "Call";
    activeCallingBtn.innerHTML = '<i class="fa-solid fa-phone"></i>';
    activeCallingBtn = null;
  }

  function showVideoCallUI() {
    videoContainer.classList.add("active");
    hideCallStatus();
  }

  function updateMuteButtonUI() {
    if (isMicMuted) {
      toggleMuteBtn.innerHTML = '<i class="fa-solid fa-microphone-slash"></i>';
      toggleMuteBtn.style.background = "#cc0000";
      acbMuteBtn.innerHTML = '<i class="fa-solid fa-microphone-slash"></i>';
      acbMuteBtn.classList.add("muted");
    } else {
      toggleMuteBtn.innerHTML = '<i class="fa-solid fa-microphone"></i>';
      toggleMuteBtn.style.background = "#0047cc";
      acbMuteBtn.innerHTML = '<i class="fa-solid fa-microphone"></i>';
      acbMuteBtn.classList.remove("muted");
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

  // ── Audio call ──────────────────────────────────────────────────────────
  async function makeAudioCall(phoneNumber) {
    try {
      showCallStatus("Calling...");

      const btn = document.querySelector(
        `.ctc-phone-btn[data-number="${phoneNumber}"]`,
      );
      if (btn) setCallingButton(btn);

      let localStream = null;
      try {
        localStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
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
          showCallStatus(t("d_ringing", "Ringing..."));
        });

        currentCall.on("established", (event) => {
          console.log("Audio call connected!");
          isAudioCall = true;
          showAudioCallUI();
          startMuteCheck();
          if (event && event.stream && event.stream instanceof MediaStream) {
            let remoteAudio = document.getElementById("remoteAudio");
            if (!remoteAudio) {
              remoteAudio = document.createElement("audio");
              remoteAudio.id = "remoteAudio";
              remoteAudio.autoplay = true;
              document.body.appendChild(remoteAudio);
            }
            remoteAudio.srcObject = event.stream;
            console.log("Remote audio stream attached");
          }
        });

        currentCall.on("hangup", () => endCall());
        if (localStream) currentCall.localStream = localStream;
      });

      infobipRTC.on("disconnected", () => endCall());
      infobipRTC.connect();
    } catch (error) {
      console.error("Call error:", error);
      showCallStatus("Call failed.");
      setTimeout(() => hideCallStatus(), 2000);
      resetCallingButton();
    }
  }

  function showAudioCallUI() {
    audioCallBar.classList.add("active");
    hideCallStatus();
  }

  // ── Video call ──────────────────────────────────────────────────────────
  async function makeVideoCall(phoneNumber) {
    try {
      showCallStatus("Initiating video call...");

      const btn = document.querySelector(
        `.ctc-phone-btn[data-number="${phoneNumber}"]`,
      );
      if (btn) setCallingButton(btn);

      let localStream = null;
      try {
        localStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
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
          showCallStatus(t("d_ringing", "Ringing..."));
        });

        currentCall.on("established", (stream) => {
          console.log("Video call connected!");
          isAudioCall = false;
          showVideoCallUI();
          startMuteCheck();
          if (stream) remoteVideo.srcObject = stream;
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
      resetCallingButton();
    }
  }

  // ── End call ────────────────────────────────────────────────────────────
  function endCall() {
    resetCallingButton();
    stopMuteCheck();
    isAudioCall = false;

    // Clean up remote audio
    const remoteAudio = document.getElementById("remoteAudio");
    if (remoteAudio) {
      if (remoteAudio.srcObject) {
        remoteAudio.srcObject.getTracks().forEach((t) => t.stop());
        remoteAudio.srcObject = null;
      }
      remoteAudio.remove();
    }

    // Hide call UIs
    audioCallBar.classList.remove("active");
    videoContainer.classList.remove("active");

    if (currentCall && currentCall.localStream) {
      currentCall.localStream.getTracks().forEach((t) => t.stop());
    }
    if (currentCall) {
      try {
        currentCall.hangup();
      } catch (e) {
        /* ignore */
      }
      currentCall = null;
    }
    if (infobipRTC) {
      try {
        infobipRTC.disconnect();
      } catch (e) {
        /* ignore */
      }
      infobipRTC = null;
    }
    if (remoteVideo.srcObject) {
      remoteVideo.srcObject.getTracks().forEach((t) => t.stop());
      remoteVideo.srcObject = null;
    }
    if (localVideo.srcObject) {
      localVideo.srcObject.getTracks().forEach((t) => t.stop());
      localVideo.srcObject = null;
    }
    isMicMuted = false;
    isVideoEnabled = true;
    updateMuteButtonUI();
    updateVideoButtonUI();

    // Notify Phone module that call ended
    try {
      window.dispatchEvent(new Event("handiCallEnded"));
    } catch (e) {}
  }

  // ── Video room ──────────────────────────────────────────────────────────
  async function createVideoRoom(roomName, participantIdentity) {
    try {
      const response = await fetch("/api/webrtc/room", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomName, identity: participantIdentity }),
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
        isAudioCall = false;
        showVideoCallUI();
      });
      infobipRTC.connect();
    } catch (error) {
      console.error("Room creation error:", error);
    }
  }

  // ── Event listeners ─────────────────────────────────────────────────────

  // Video overlay mute
  toggleMuteBtn.addEventListener("click", () => {
    if (currentCall && currentCall.localStream) {
      const audioTracks = currentCall.localStream.getAudioTracks();
      audioTracks.forEach((t) => {
        t.enabled = isMicMuted;
      });
      isMicMuted = !isMicMuted;
      updateMuteButtonUI();
    }
  });

  // Video overlay video toggle
  toggleVideoBtn.addEventListener("click", () => {
    if (currentCall && currentCall.localStream) {
      const videoTracks = currentCall.localStream.getVideoTracks();
      videoTracks.forEach((t) => {
        t.enabled = isVideoEnabled;
      });
      isVideoEnabled = !isVideoEnabled;
      updateVideoButtonUI();
    }
  });

  // Video overlay device selector
  deviceSelectBtn.addEventListener("click", () => showDeviceSelector(true));

  // Video overlay hangup
  hangupBtn.addEventListener("click", endCall);

  // Audio bar mute
  acbMuteBtn.addEventListener("click", () => {
    if (currentCall && currentCall.localStream) {
      const audioTracks = currentCall.localStream.getAudioTracks();
      audioTracks.forEach((t) => {
        t.enabled = isMicMuted;
      });
      isMicMuted = !isMicMuted;
      updateMuteButtonUI();
    }
  });

  // Audio bar device selector
  acbDeviceBtn.addEventListener("click", () => showDeviceSelector(false));

  // Audio bar hangup
  acbHangupBtn.addEventListener("click", endCall);

  // Device selector
  dsCloseBtn.addEventListener("click", () =>
    deviceSelector.classList.remove("active"),
  );
  dsApplyBtn.addEventListener("click", applyDeviceSelection);

  // ── Build contact UI ────────────────────────────────────────────────────
  const settings = loadSettings();
  const contacts = settings.click_to_call?.contacts || [];

  const pinBtn = container.querySelector(".pin-btn");
  container.innerHTML = "";
  if (pinBtn) container.prepend(pinBtn);

  const title = document.createElement("div");
  title.className = "panel-title";
  var name =
    window.LANG && window.LANG.modules && window.LANG.modules.phone
      ? window.LANG.modules.phone.name
      : "CLICK-TO-CALL";
  title.innerHTML = '<i class="fa-solid fa-phone"></i> ' + name;
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
        ${contacts
          .map(
            (c) => `
          <div class="ctc-contact-row" data-number="${escapeHtml(c.number)}">
            <div class="ctc-avatar ctc-phone-trigger" data-number="${escapeHtml(c.number)}">
              ${c.photo ? `<img src="${c.photo}" alt="">` : '<i class="fa-solid fa-user"></i>'}
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
        `,
          )
          .join("")}
      </div>`;
  }

  const settingsBtn = content.querySelector(".ctc-settings-btn");
  if (settingsBtn) {
    settingsBtn.addEventListener("click", () => {
      location.href = "settings.html?args=click_to_call";
    });
  }

  content.querySelectorAll(".ctc-phone-trigger").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      makeAudioCall(el.dataset.number);
    });
  });

  content.querySelectorAll(".ctc-phone-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (btn.classList.contains("calling")) {
        endCall();
        return;
      }
      makeAudioCall(btn.dataset.number);
    });
  });

  content.querySelectorAll(".ctc-video-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      makeVideoCall(btn.dataset.number);
    });
  });

  window.makeAudioCall = makeAudioCall;
  window.makeVideoCall = makeVideoCall;
  window.createVideoRoom = createVideoRoom;

  function escapeHtml(str) {
    if (!str) return "";
    return str.replace(
      /[&<>]/g,
      (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[m],
    );
  }
}
