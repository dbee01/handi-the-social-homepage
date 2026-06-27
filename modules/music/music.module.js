// modules/music/music.module.js
import { loadMusic } from "../../js/core/storage.js";

function removeFileExtension(filename) {
  if (!filename) return "";
  return filename.replace(/\.[^/.]+$/, "");
}

export default async function initMusic(container) {
  const headerRow = document.createElement("div");
  headerRow.className = "music-header-row";
  const title = document.createElement("div");
  title.className = "panel-title";
  title.innerHTML = '<i class="fa-solid fa-music"></i> PLAYER';
  headerRow.appendChild(title);

  const headerActions = document.createElement("div");
  headerActions.className = "music-header-actions";
  const lockToggle = document.createElement("button");
  lockToggle.className = "music-lock-toggle";
  const saved = localStorage.getItem("musicLocked");
  let isLocked = saved !== null ? saved === "true" : true;

  function updateLockIcon() {
    lockToggle.innerHTML = isLocked
      ? '<i class="fa-solid fa-lock"></i>'
      : '<i class="fa-solid fa-lock-open"></i>';
    lockToggle.style.color = isLocked ? "#cc0000" : "#008000";
  }
  updateLockIcon();
  headerActions.appendChild(lockToggle);

  const originalPinBtn = container.querySelector(".pin-btn");
  let pinBtn = null;
  if (originalPinBtn) {
    pinBtn = originalPinBtn.cloneNode(true);
    pinBtn.classList.add("pin-btn-clone");
    originalPinBtn.style.display = "none";
    headerActions.appendChild(pinBtn);
  }
  headerRow.appendChild(headerActions);
  container.innerHTML = "";
  container.appendChild(headerRow);

  const content = document.createElement("div");
  content.className = "music-content";
  container.appendChild(content);

  const parentItem = container.closest(".dashboard-item");
  if (parentItem) {
    parentItem.dataset.module = "music";
    parentItem.style.minHeight = "420px";
  }

  let tracks = [];
  try {
    tracks = await loadMusic();
  } catch (err) {
    console.error("Failed to load music:", err);
    // Detect if storage is blocked
    if (!window.indexedDB) {
      content.innerHTML = `<div class="module-empty"><i class="fa-solid fa-triangle-exclamation"></i><p>Your browser blocks storage. Check Firefox settings → Privacy → make sure "Never remember history" is OFF.</p></div>`;
    } else {
      content.innerHTML = `
              <div class="module-empty">
                  <i class="fa-solid fa-exclamation-triangle"></i>
                  <p>Failed to load music library.</p>
                  <button id="musicRetryBtn" class="settings-link-btn">
                      <i class="fa-solid fa-rotate-right"></i> Retry
                  </button>
              </div>
          `;
      const retryBtn = content.querySelector("#musicRetryBtn");
      if (retryBtn) retryBtn.onclick = () => location.reload();
      return;
    }
  }

  // NO validation – assume all tracks are valid
  // The audio element's onerror will handle playback issues
  if (tracks.length === 0) {
    content.innerHTML = `
            <div class="module-empty">
                <i class="fa-solid fa-music"></i>
                <p>No music loaded.</p>
                <button id="musicSettingsBtn" class="settings-link-btn">
                    <i class="fa-solid fa-gear"></i> Add Music in Settings
                </button>
            </div>
        `;
    const settingsBtn = content.querySelector("#musicSettingsBtn");
    if (settingsBtn)
      settingsBtn.onclick = () => (location.href = "settings.html?args=music");
    return;
  }

  let currentAudio = null;
  let currentIndex = -1;
  let isPlaying = false;
  let stopVisualiser = null;

  console.log(
    "Loaded tracks:",
    tracks.map((t) => ({ name: t.name, url: t.url?.substring(0, 100) })),
  );

  // Global mute
  function applyGlobalMute(muted) {
    if (currentAudio) currentAudio.muted = muted;
  }
  window.addEventListener("globalMuteToggle", (e) => {
    applyGlobalMute(e.detail.muted);
  });
  const initialMute = localStorage.getItem("globalMute") === "true";
  applyGlobalMute(initialMute);

  // Build UI
  content.innerHTML = `
        <div class="music-now-playing">
            <canvas id="music-synth" class="music-synth"></canvas>
            <div id="music-status" class="music-status">
                <span id="music-track-title">—</span>
                <span class="music-state-text">Ready</span>
            </div>
        </div>
        <div class="music-controls">
            <button id="music-prev">⏮</button>
            <button id="music-playpause" class="primary">▶</button>
            <button id="music-next">⏭</button>
        </div>
        <div class="music-scroll-wrapper">
            <button id="musicScrollUp" class="music-scroll-btn">▲</button>
            <div id="music-playlist" class="music-playlist"></div>
            <button id="musicScrollDown" class="music-scroll-btn">▼</button>
        </div>
    `;

  const synthCanvas = content.querySelector("#music-synth");
  const playlist = content.querySelector("#music-playlist");
  const up = content.querySelector("#musicScrollUp");
  const down = content.querySelector("#musicScrollDown");
  const playPauseBtn = content.querySelector("#music-playpause");
  const trackTitleSpan = content.querySelector("#music-track-title");
  const stateSpan = content.querySelector(".music-state-text");
  const prevBtn = content.querySelector("#music-prev");
  const nextBtn = content.querySelector("#music-next");

  if (synthCanvas) synthCanvas.style.display = "none";

  // Visualiser
  function startFakeVisualiser(canvas) {
    if (!canvas) return null;
    if (stopVisualiser) stopVisualiser();
    canvas.style.display = "block";
    let animationId = null;
    const ctx = canvas.getContext("2d");

    function resizeCanvas() {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    }
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    let time = 0;
    function draw() {
      animationId = requestAnimationFrame(draw);
      time += 0.05;
      const width = canvas.width;
      const height = canvas.height;
      if (width === 0 || height === 0) return;
      ctx.clearRect(0, 0, width, height);
      const barCount = 32;
      const barWidth = width / barCount;
      for (let i = 0; i < barCount; i++) {
        const value = (Math.sin(time + i * 0.3) + 1) / 2;
        const noise = Math.random() * 0.3;
        const heightPercent = Math.min(0.9, value * 0.7 + noise);
        const barHeight = height * heightPercent;
        const hue =
          parseInt(
            getComputedStyle(document.body).getPropertyValue(
              "--music-synth-hue",
            ),
          ) || 200;
        ctx.fillStyle = `hsl(${hue}, 80%, 55%)`;
        ctx.fillRect(i * barWidth, height - barHeight, barWidth - 1, barHeight);
      }
    }
    draw();
    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resizeCanvas);
    };
  }

  function stopVisualiserAndClear() {
    if (stopVisualiser) {
      stopVisualiser();
      stopVisualiser = null;
    }
    if (synthCanvas) {
      const ctx = synthCanvas.getContext("2d");
      if (ctx) ctx.clearRect(0, 0, synthCanvas.width, synthCanvas.height);
      synthCanvas.style.display = "none";
    }
  }

  function ensureVisualiserRunning() {
    if (isPlaying && currentAudio && currentIndex !== -1 && !isLocked) {
      if (!stopVisualiser) {
        stopVisualiser = startFakeVisualiser(synthCanvas);
      }
    } else {
      stopVisualiserAndClear();
    }
  }

  function updateTrackIconsAndActive() {
    document.querySelectorAll(".music-track-item").forEach((item, idx) => {
      const iconSpan = item.querySelector(".music-track-icon");
      const isCurrent = idx === currentIndex;
      if (isCurrent && isPlaying) {
        iconSpan.innerHTML = '<i class="fa-solid fa-volume-high"></i>';
        item.classList.add("active");
      } else if (isCurrent && !isPlaying && currentIndex !== -1) {
        iconSpan.innerHTML = '<i class="fa-solid fa-volume-mute"></i>';
        item.classList.add("active");
      } else {
        iconSpan.innerHTML = '<i class="fa-solid fa-volume-mute"></i>';
        item.classList.remove("active");
      }
    });
    ensureVisualiserRunning();
  }

  function stopCurrentAudio(resetIcon = true) {
    if (currentAudio && typeof currentAudio.pause === "function") {
      try {
        currentAudio.pause();
      } catch (e) {
        /* ignore */
      }
      try {
        currentAudio.src = "";
      } catch (e) {
        /* ignore */
      }
      currentAudio = null;
    }
    isPlaying = false;
    if (resetIcon) updateTrackIconsAndActive();
    stateSpan.innerText = "Stopped";
    if (currentIndex === -1) trackTitleSpan.innerText = "—";
  }

  function showError(message) {
    stateSpan.innerText = message;
    setTimeout(() => {
      if (stateSpan.innerText === message) {
        if (currentAudio && isPlaying) {
          stateSpan.innerText = "Playing...";
        } else if (currentAudio && !isPlaying) {
          stateSpan.innerText = "Paused";
        } else {
          stateSpan.innerText = "Ready";
        }
      }
    }, 3000);
  }

  function playTrack(index, autoPlay = true) {
    if (isLocked) {
      showError("Player locked – unlock to play");
      return;
    }
    if (index < 0 || index >= tracks.length) return;

    if (currentAudio && currentIndex === index && isPlaying) return;

    if (currentAudio) {
      stopCurrentAudio(true);
    }

    currentIndex = index;
    const track = tracks[currentIndex];
    const displayName = removeFileExtension(track.name);
    trackTitleSpan.innerText = displayName;

    try {
      const audio = document.createElement("audio");
      audio.src = track.url;
      audio.volume = 1.0;
      audio.muted = localStorage.getItem("globalMute") === "true";
      currentAudio = audio;

      console.log("Attempting to play:", displayName);

      currentAudio.addEventListener("error", (e) => {
        const error = currentAudio.error;
        let errorMsg = "Cannot play file";
        if (error) {
          switch (error.code) {
            case MediaError.MEDIA_ERR_ABORTED:
              errorMsg = "Playback aborted";
              break;
            case MediaError.MEDIA_ERR_NETWORK:
              errorMsg = "Network error";
              break;
            case MediaError.MEDIA_ERR_DECODE:
              errorMsg = "File corrupted or unsupported format";
              break;
            case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
              errorMsg = "Format not supported";
              break;
            default:
              errorMsg = "Unknown error";
          }
        }
        console.error("Audio error:", errorMsg);
        showError(errorMsg);
        isPlaying = false;
        playPauseBtn.innerHTML = "▶";
        updateTrackIconsAndActive();
      });

      if (autoPlay) {
        const playPromise = currentAudio.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              isPlaying = true;
              playPauseBtn.innerHTML = "⏸";
              stateSpan.innerText = "Playing...";
              updateTrackIconsAndActive();
            })
            .catch((err) => {
              console.error("Playback failed:", err.message);
              showError("Cannot play file");
              isPlaying = false;
              playPauseBtn.innerHTML = "▶";
              updateTrackIconsAndActive();
            });
        }
      } else {
        isPlaying = false;
        playPauseBtn.innerHTML = "▶";
        stateSpan.innerText = "Paused";
        updateTrackIconsAndActive();
      }

      currentAudio.onended = () => {
        console.log("Track ended, playing next");
        playNext();
      };
    } catch (err) {
      console.error("Failed to create audio:", err);
      showError("Invalid file");
      isPlaying = false;
      playPauseBtn.innerHTML = "▶";
      updateTrackIconsAndActive();
    }

    ensureVisualiserRunning();
    updateTrackIconsAndActive();
  }

  function playNext() {
    if (isLocked) {
      showError("Player locked – unlock to play");
      return;
    }
    if (tracks.length === 0) return;
    const nextIndex = (currentIndex + 1) % tracks.length;
    playTrack(nextIndex, true);
  }

  function playPrev() {
    if (isLocked) {
      showError("Player locked – unlock to play");
      return;
    }
    if (tracks.length === 0) return;
    const prevIndex = (currentIndex - 1 + tracks.length) % tracks.length;
    playTrack(prevIndex, true);
  }

  function togglePlayPause() {
    if (isLocked) {
      showError("Player locked – unlock to play");
      return;
    }
    if (currentIndex === -1 || !currentAudio) {
      playTrack(0, true);
      return;
    }
    if (isPlaying) {
      currentAudio.pause();
      isPlaying = false;
      playPauseBtn.innerHTML = "▶";
      stateSpan.innerText = "Paused";
      updateTrackIconsAndActive();
    } else {
      const playPromise = currentAudio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            isPlaying = true;
            playPauseBtn.innerHTML = "⏸";
            stateSpan.innerText = "Playing...";
            updateTrackIconsAndActive();
          })
          .catch((err) => {
            console.error("Resume failed:", err);
            showError("Cannot resume");
          });
      }
    }
  }

  function onTrackClick(index) {
    if (isLocked) {
      showError("Player locked – unlock to play");
      return;
    }

    if (index === currentIndex && currentAudio) {
      togglePlayPause();
    } else {
      playTrack(index, true);
    }
  }

  function applyLockState() {
    if (isLocked) stopCurrentAudio(true);
    const allTrackItems = playlist.querySelectorAll(".music-track-item");
    allTrackItems.forEach((item) => {
      if (isLocked) {
        item.style.pointerEvents = "none";
        item.style.opacity = "0.6";
      } else {
        item.style.pointerEvents = "";
        item.style.opacity = "";
      }
    });
    const controlBtns = [prevBtn, playPauseBtn, nextBtn, up, down];
    controlBtns.forEach((btn) => {
      if (btn) {
        if (isLocked) {
          btn.disabled = true;
          btn.style.opacity = "0.5";
          btn.style.cursor = "not-allowed";
        } else {
          btn.disabled = false;
          btn.style.opacity = "";
          btn.style.cursor = "";
        }
      }
    });
    if (isLocked) {
      stopVisualiserAndClear();
      if (currentIndex === -1) trackTitleSpan.innerText = "—";
      stateSpan.innerText = "Locked";
    } else {
      ensureVisualiserRunning();
      if (currentAudio && isPlaying && currentIndex !== -1) {
        stateSpan.innerText = "Playing...";
      } else if (currentIndex !== -1 && !isPlaying) {
        stateSpan.innerText = "Paused";
      } else {
        stateSpan.innerText = "Ready";
      }
    }
  }

  lockToggle.addEventListener("click", (e) => {
    e.stopPropagation();
    isLocked = !isLocked;
    localStorage.setItem("musicLocked", isLocked);
    updateLockIcon();
    applyLockState();
  });

  tracks.forEach((track, i) => {
    const el = document.createElement("div");
    el.className = "music-track-item";
    el.dataset.index = i;
    const iconSpan = document.createElement("span");
    iconSpan.className = "music-track-icon";
    iconSpan.innerHTML = '<i class="fa-solid fa-volume-mute"></i>';
    const nameSpan = document.createElement("span");
    nameSpan.textContent = escapeHtml(removeFileExtension(track.name));
    el.appendChild(iconSpan);
    el.appendChild(nameSpan);
    el.addEventListener("click", () => onTrackClick(i));
    playlist.appendChild(el);
  });

  updateTrackIconsAndActive();
  up.addEventListener("click", () =>
    playlist.scrollBy({ top: -300, behavior: "smooth" }),
  );
  down.addEventListener("click", () =>
    playlist.scrollBy({ top: 300, behavior: "smooth" }),
  );
  prevBtn.addEventListener("click", playPrev);
  nextBtn.addEventListener("click", playNext);
  playPauseBtn.addEventListener("click", togglePlayPause);
  applyLockState();

  return () => {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.src = "";
      currentAudio = null;
    }
    stopVisualiserAndClear();
  };
}

function escapeHtml(str) {
  return (str || "").replace(
    /[&<>]/g,
    (m) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
      })[m],
  );
}
