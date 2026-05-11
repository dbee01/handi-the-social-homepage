// modules/local-player/local-player.module.js

export default async function initLocalPlayer(container) {
  if (!container) {
    console.error("Music Player: Container not found");
    return;
  }

  // Preserve pin button if it exists in the parent panel
  const parentPanel = container.closest(".dashboard-item, .grid-item, .panel");
  const pinBtn = parentPanel?.querySelector(":scope > .pin-btn") || null;

  // Clear only the music-player container, not the outer panel
  container.innerHTML = "";

  // Panel Title
  const panelTitle = document.createElement("div");
  panelTitle.className = "panel-title";
  panelTitle.innerHTML =
    '<i class="fa-solid fa-music"></i> Local Music Player';
  container.appendChild(panelTitle);

  // Main Container
  const playerContainer = document.createElement("div");
  playerContainer.className = "music-player-container";
  playerContainer.style.cssText = `
    display: flex;
    flex-direction: column;
    gap: 15px;
    padding: 20px;
    width: 100%;
    box-sizing: border-box;
  `;

  // Info Section (replaces folder selector)
  const infoSection = document.createElement("div");
  infoSection.style.cssText = `
    text-align: center;
    padding: 20px;
    background: rgba(0,0,0,0.3);
    border: 1px dashed var(--term-dim);
    border-radius: var(--radius);
    transition: all 0.3s;
  `;
  infoSection.innerHTML = `
    <i class="fa-solid fa-music"
       style="font-size: 2rem; color: var(--term-cyan); margin-bottom: 10px;"></i>
    <div style="color: var(--term-cyan); font-weight: bold;">
      Music Player
    </div>
    <div style="color: var(--term-dim); font-size: 0.8rem; margin-top: 5px;">
      <i class="fa-solid fa-gear"></i> Configure in Settings (gear icon)
    </div>
    <div id="music-player-status" style="color: var(--term-dim); font-size: 0.8rem; margin-top: 10px;">
      No music loaded
    </div>
  `;

  // Controls Section
  const controlsSection = document.createElement("div");
  controlsSection.style.cssText = `
    display: none;
    flex-direction: column;
    gap: 15px;
  `;

  // Track Info
  const trackInfo = document.createElement("div");
  trackInfo.style.cssText = `
    text-align: center;
    padding: 10px;
    background: #000;
    border: 1px solid var(--panel-border);
    border-radius: var(--radius);
    min-height: 60px;
    display: flex;
    flex-direction: column;
    justify-content: center;
  `;

  const trackTitle = document.createElement("div");
  trackTitle.style.cssText = `
    color: var(--term-cyan);
    font-weight: bold;
    font-size: 1.1rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  `;
  trackTitle.textContent = "No track selected";

  const trackStatus = document.createElement("div");
  trackStatus.style.cssText = `
    color: var(--term-dim);
    font-size: 0.8rem;
    margin-top: 5px;
  `;
  trackStatus.textContent = "Configure music in Settings";

  trackInfo.append(trackTitle, trackStatus);

  // Visualizer
  const visualizer = document.createElement("div");
  visualizer.style.cssText = `
    display: flex;
    justify-content: center;
    align-items: flex-end;
    gap: 2px;
    height: 40px;
    margin: 10px 0;
  `;

  const bars = [];
  for (let i = 0; i < 20; i++) {
    const bar = document.createElement("div");
    bar.style.cssText = `
      width: 4px;
      background: var(--term-green);
      height: 5px;
      transition: height 0.1s ease;
    `;
    visualizer.appendChild(bar);
    bars.push(bar);
  }

  // Controls Row
  const controlsRow = document.createElement("div");
  controlsRow.style.cssText = `
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 20px;
  `;

  const btnPrev = createControlBtn("fa-backward-step", "Previous");
  const btnPlayPause = createControlBtn(
    "fa-play",
    "Play/Pause",
    true
  );
  const btnNext = createControlBtn("fa-forward-step", "Next");
  const btnShuffle = createControlBtn("fa-shuffle", "Shuffle");

  controlsRow.append(
    btnPrev,
    btnPlayPause,
    btnNext,
    btnShuffle
  );

  // Playlist Section
  const playlistSection = document.createElement("div");
  playlistSection.style.cssText = `
    max-height: 200px;
    overflow-y: auto;
    background: rgba(0,0,0,0.2);
    border: 1px solid var(--panel-border);
    border-radius: var(--radius);
    padding: 5px;
  `;
  playlistSection.innerHTML =
    '<div style="padding:10px;color:var(--term-dim);text-align:center;">Playlist empty</div>';

  controlsSection.append(
    trackInfo,
    visualizer,
    controlsRow,
    playlistSection
  );

  playerContainer.append(infoSection, controlsSection);
  container.appendChild(playerContainer);

  // ===== STATE =====
  let playlist = [];
  let currentIndex = -1;
  let isPlaying = false;
  let isShuffle = false;
  let musicFolderFiles = [];

  const audioElement = new Audio();
  audioElement.preload = "auto";

  let audioCtx = null;
  let analyser = null;
  let source = null;
  let animationFrame = null;

  // ===== LOAD MUSIC FROM SETTINGS =====
  function loadMusicFromSettings() {
    const saved = localStorage.getItem('pleie_settings');
    if (saved) {
      const settings = JSON.parse(saved);
      if (settings.musicPlayer && settings.musicPlayer.musicFiles) {
        musicFolderFiles = settings.musicPlayer.musicFiles;
        const statusMsg = document.getElementById('music-player-status');
        
        if (musicFolderFiles.length > 0) {
          // Convert stored data to File objects
          playlist = musicFolderFiles.map(fileData => ({
            name: fileData.name,
            file: new File([fileData.data], fileData.name, { type: fileData.type })
          }));
          
          if (statusMsg) {
            statusMsg.innerHTML = `<i class="fa-solid fa-check-circle"></i> ${playlist.length} tracks loaded`;
            statusMsg.style.color = 'var(--term-green)';
          }
          
          // Show controls, hide info section
          infoSection.style.display = "none";
          controlsSection.style.display = "flex";
          trackStatus.textContent = `${playlist.length} tracks loaded`;
          renderPlaylist();
          
          // Apply saved volume and shuffle
          if (settings.musicPlayer.defaultVolume) {
            audioElement.volume = settings.musicPlayer.defaultVolume / 100;
          }
          if (settings.musicPlayer.defaultShuffle) {
            isShuffle = settings.musicPlayer.defaultShuffle;
            btnShuffle.style.color = isShuffle ? "var(--term-green)" : "var(--term-cyan)";
          }
        } else {
          if (statusMsg) {
            statusMsg.innerHTML = '<i class="fa-solid fa-gear"></i> No music loaded. Configure in Settings';
            statusMsg.style.color = 'var(--term-dim)';
          }
        }
      }
    }
  }

  // ===== CONTROL EVENTS =====
  btnPrev.onclick = () => {
    if (!playlist.length) return;
    playTrack(
      (currentIndex - 1 + playlist.length) %
        playlist.length
    );
  };

  btnNext.onclick = () => {
    if (!playlist.length) return;
    playTrack((currentIndex + 1) % playlist.length);
  };

  btnPlayPause.onclick = () => {
    if (!playlist.length) return;

    if (currentIndex === -1) {
      playTrack(0);
      return;
    }

    if (audioElement.paused) {
      audioElement.play();
    } else {
      audioElement.pause();
    }
  };

  btnShuffle.onclick = () => {
    isShuffle = !isShuffle;
    btnShuffle.style.color = isShuffle
      ? "var(--term-green)"
      : "var(--term-cyan)";
  };

  // ===== AUDIO EVENTS =====
  audioElement.addEventListener("play", () => {
    isPlaying = true;
    updatePlayButton();
    trackStatus.textContent = "Playing...";
    startVisualizer();
  });

  audioElement.addEventListener("pause", () => {
    isPlaying = false;
    updatePlayButton();
    trackStatus.textContent = "Paused";
    stopVisualizer();
  });

  audioElement.addEventListener("ended", () => {
    if (!playlist.length) return;

    if (isShuffle) {
      const next =
        Math.floor(Math.random() * playlist.length);
      playTrack(next);
    } else {
      playTrack((currentIndex + 1) % playlist.length);
    }
  });

  audioElement.addEventListener("error", (e) => {
    console.error("Audio error:", e);
    trackStatus.textContent = "Playback error";
  });

  // ===== FUNCTIONS =====
  async function playTrack(index) {
    if (index < 0 || index >= playlist.length) return;

    currentIndex = index;
    const track = playlist[index];

    trackTitle.textContent = track.name;
    renderPlaylist();

    try {
      if (
        audioElement.src &&
        audioElement.src.startsWith("blob:")
      ) {
        URL.revokeObjectURL(audioElement.src);
      }

      const url = URL.createObjectURL(track.file);
      audioElement.src = url;
      audioElement.load();
      await audioElement.play();
    } catch (error) {
      console.error("Error playing track:", error);
      trackStatus.textContent = "Playback error";
    }
  }

  function renderPlaylist() {
    playlistSection.innerHTML = "";

    playlist.forEach((track, index) => {
      const item = document.createElement("div");
      item.style.cssText = `
        padding: 8px 10px;
        cursor: pointer;
        border-radius: 4px;
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 0.9rem;
        color: ${
          index === currentIndex
            ? "var(--term-green)"
            : "var(--term-cyan)"
        };
        background: ${
          index === currentIndex
            ? "rgba(0,255,65,0.1)"
            : "transparent"
        };
      `;

      item.innerHTML = `
        <i class="fa-solid fa-music"
           style="font-size:0.8rem;opacity:0.7;"></i>
        <span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
          ${escapeHtml(track.name)}
        </span>
      `;

      item.onclick = () => playTrack(index);
      playlistSection.appendChild(item);
    });
  }

  function updatePlayButton() {
    const icon = btnPlayPause.querySelector("i");
    icon.className = isPlaying
      ? "fa-solid fa-pause"
      : "fa-solid fa-play";
  }

  function createControlBtn(
    iconClass,
    title,
    isMain = false
  ) {
    const btn = document.createElement("button");

    btn.style.cssText = `
      background: none;
      border: none;
      color: ${
        isMain
          ? "var(--term-green)"
          : "var(--term-cyan)"
      };
      font-size: ${
        isMain ? "1.5rem" : "1.2rem"
      };
      cursor: pointer;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    btn.innerHTML = `<i class="fa-solid ${iconClass}"></i>`;
    btn.title = title;

    return btn;
  }

  function startVisualizer() {
    if (!audioCtx) {
      try {
        audioCtx = new (
          window.AudioContext ||
          window.webkitAudioContext
        )();

        source =
          audioCtx.createMediaElementSource(
            audioElement
          );
        analyser = audioCtx.createAnalyser();

        source.connect(analyser);
        analyser.connect(audioCtx.destination);

        analyser.fftSize = 64;
      } catch (error) {
        console.warn(
          "Visualizer unavailable:",
          error
        );
        return;
      }
    }

    if (audioCtx.state === "suspended") {
      audioCtx.resume();
    }

    const bufferLength =
      analyser.frequencyBinCount;
    const dataArray = new Uint8Array(
      bufferLength
    );

    function animate() {
      if (!isPlaying) return;

      animationFrame =
        requestAnimationFrame(animate);

      analyser.getByteFrequencyData(dataArray);

      bars.forEach((bar, i) => {
        const value =
          dataArray[
            i % dataArray.length
          ];
        const height = Math.max(
          5,
          (value / 255) * 40
        );
        bar.style.height = `${height}px`;
      });
    }

    animate();
  }

  function stopVisualizer() {
    if (animationFrame) {
      cancelAnimationFrame(animationFrame);
      animationFrame = null;
    }

    bars.forEach((bar) => {
      bar.style.height = "5px";
    });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
      if (m === '&') return '&amp;';
      if (m === '<') return '&lt;';
      if (m === '>') return '&gt;';
      return m;
    });
  }

  // Listen for settings changes
  window.addEventListener('settingsChanged', () => {
    loadMusicFromSettings();
  });

  // Initial load
  loadMusicFromSettings();
}
