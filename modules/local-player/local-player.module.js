// modules/music/local-player.module.js

export default async function initMusicPlayer(container) {
  if (!container) {
    console.error("Music Player: Container not found");
    return;
  }

  // --- PRESERVE PIN BUTTON ---
  const pinBtn = container.querySelector('.pin-btn');
  container.innerHTML = '';
  if (pinBtn) container.prepend(pinBtn);
  // ---------------------------

  // Panel Title
  const panelTitle = document.createElement('div');
  panelTitle.className = 'panel-title';
  panelTitle.innerHTML = '<i class="fa-solid fa-music"></i> Local Music Player';
  container.appendChild(panelTitle);

  // Main Container
  const playerContainer = document.createElement('div');
  playerContainer.className = 'music-player-container';
  playerContainer.style.cssText = `
    display: flex;
    flex-direction: column;
    gap: 15px;
    padding: 20px;
    width: 100%;
  `;

  // 1. Folder Selection Area
  const folderSection = document.createElement('div');
  folderSection.style.cssText = `
    text-align: center;
    padding: 20px;
    background: rgba(0,0,0,0.3);
    border: 1px dashed var(--term-dim);
    border-radius: var(--radius);
    cursor: pointer;
    transition: all 0.3s;
  `;
  folderSection.innerHTML = `
    <i class="fa-solid fa-folder-open" style="font-size: 2rem; color: var(--term-cyan); margin-bottom: 10px;"></i>
    <div style="color: var(--term-cyan); font-weight: bold;">Select Music Folder</div>
    <div style="color: var(--term-dim); font-size: 0.8rem;">Click to browse local files</div>
  `;

  // 2. Player Controls & Display
  const controlsSection = document.createElement('div');
  controlsSection.style.cssText = `
    display: none; /* Hidden until folder selected */
    flex-direction: column;
    gap: 15px;
  `;

  // Track Info
  const trackInfo = document.createElement('div');
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
  trackInfo.innerHTML = `
    <div id="track-title" style="color: var(--term-cyan); font-weight: bold; font-size: 1.1rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">No track selected</div>
    <div id="track-status" style="color: var(--term-dim); font-size: 0.8rem; margin-top: 5px;">Select a folder to begin</div>
  `;

  // Visualizer
  const visualizer = document.createElement('div');
  visualizer.id = 'visualizer';
  visualizer.style.cssText = `
    display: flex;
    justify-content: center;
    align-items: flex-end;
    gap: 2px;
    height: 40px;
    margin: 10px 0;
  `;
  // Create bars
  for(let i=0; i<20; i++) {
    const bar = document.createElement('div');
    bar.className = 'vis-bar';
    bar.style.cssText = `
      width: 4px;
      background: var(--term-green);
      height: 5px;
      transition: height 0.1s ease;
    `;
    visualizer.appendChild(bar);
  }

  // Controls Row
  const controlsRow = document.createElement('div');
  controlsRow.style.cssText = `
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 20px;
  `;

  // Buttons
  const btnPrev = createControlBtn('fa-backward-step', 'Previous');
  const btnPlayPause = createControlBtn('fa-play', 'Play/Pause', true);
  const btnNext = createControlBtn('fa-forward-step', 'Next');
  const btnShuffle = createControlBtn('fa-shuffle', 'Shuffle');
  
  // Shuffle state
  let isShuffle = false;
  btnShuffle.onclick = () => {
    isShuffle = !isShuffle;
    btnShuffle.style.color = isShuffle ? 'var(--term-green)' : 'var(--term-dim)';
    shufflePlaylist();
  };

  controlsRow.append(btnPrev, btnPlayPause, btnNext, btnShuffle);

  // Playlist Section
  const playlistSection = document.createElement('div');
  playlistSection.style.cssText = `
    max-height: 200px;
    overflow-y: auto;
    background: rgba(0,0,0,0.2);
    border: 1px solid var(--panel-border);
    border-radius: var(--radius);
    padding: 5px;
  `;
  playlistSection.innerHTML = `<div style="padding: 10px; color: var(--term-dim); text-align: center;">Playlist empty</div>`;

  controlsSection.append(trackInfo, visualizer, controlsRow, playlistSection);
  playerContainer.append(folderSection, controlsSection);
  container.appendChild(playerContainer);

  // --- STATE ---
  let playlist = [];
  let currentIndex = -1;
  let audioCtx, analyser, source;
  let isPlaying = false;
  let audioElement = new Audio();
  audioElement.crossOrigin = "anonymous";

  // --- EVENT LISTENERS ---
  
  // Folder Selection
  folderSection.onclick = async () => {
    if ('showDirectoryPicker' in window) {
      try {
        const dirHandle = await window.showDirectoryPicker();
        await scanFolder(dirHandle);
      } catch (err) {
        console.error("Folder selection cancelled or failed:", err);
      }
    } else {
      alert("Your browser does not support the File System Access API. Please use Chrome, Edge, or Opera.");
    }
  };

  // Button Actions
  btnPrev.onclick = () => playTrack(currentIndex - 1);
  btnNext.onclick = () => playTrack(currentIndex + 1);
  btnPlayPause.onclick = togglePlayPause;

  // Audio Events
  audioElement.addEventListener('ended', () => {
    if (currentIndex < playlist.length - 1) {
      playTrack(currentIndex + 1);
    } else {
      isPlaying = false;
      updatePlayButton();
      document.getElementById('track-status').textContent = "Playlist finished";
    }
  });

  audioElement.addEventListener('timeupdate', updateProgress);
  audioElement.addEventListener('play', () => {
    isPlaying = true;
    updatePlayButton();
    document.getElementById('track-status').textContent = "Playing...";
    startVisualizer();
  });
  audioElement.addEventListener('pause', () => {
    isPlaying = false;
    updatePlayButton();
    document.getElementById('track-status').textContent = "Paused";
    stopVisualizer();
  });

  // --- FUNCTIONS ---

  async function scanFolder(dirHandle, path = "") {
    const files = [];
    const audioExtensions = ['.mp3', '.wav', '.ogg', '.flac', '.m4a'];
    
    for await (const entry of dirHandle.values()) {
      const fullPath = path + "/" + entry.name;
      if (entry.kind === 'file') {
        if (audioExtensions.some(ext => entry.name.toLowerCase().endsWith(ext))) {
          files.push({
            name: entry.name,
            handle: entry,
            path: fullPath
          });
        }
      } else if (entry.kind === 'directory') {
        const subFiles = await scanFolder(entry, fullPath);
        files.push(...subFiles);
      }
    }
    
    if (path === "") {
      // Root call
      playlist = files.sort((a, b) => a.name.localeCompare(b.name));
      renderPlaylist();
      folderSection.style.display = 'none';
      controlsSection.style.display = 'flex';
      document.getElementById('track-status').textContent = `${playlist.length} tracks found`;
    }
    
    return files;
  }

  function renderPlaylist() {
    playlistSection.innerHTML = '';
    playlist.forEach((track, index) => {
      const item = document.createElement('div');
      item.style.cssText = `
        padding: 8px 10px;
        cursor: pointer;
        border-radius: 4px;
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 0.9rem;
      `;
      if (index === currentIndex) {
        item.style.background = 'rgba(0, 255, 65, 0.1)';
        item.style.color = 'var(--term-green)';
      } else {
        item.style.color = 'var(--term-cyan)';
      }
      
      item.innerHTML = `
        <i class="fa-solid fa-music" style="font-size: 0.8rem; opacity: 0.7;"></i>
        <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${track.name}</span>
      `;
      
      item.onclick = () => playTrack(index);
      playlistSection.appendChild(item);
    });
  }

  async function playTrack(index) {
    if (index < 0 || index >= playlist.length) return;
    
    currentIndex = index;
    const track = playlist[index];
    
    // Update UI
    document.getElementById('track-title').textContent = track.name;
    renderPlaylist(); // Re-render to highlight current
    
    try {
      const file = await track.handle.getFile();
      const url = URL.createObjectURL(file);
      
      audioElement.src = url;
      audioElement.load();
      await audioElement.play();
    } catch (err) {
      console.error("Error playing file:", err);
      document.getElementById('track-status').textContent = "Error loading file";
    }
  }

  function togglePlayPause() {
    if (playlist.length === 0) return;
    
    if (audioElement.paused) {
      if (currentIndex === -1) playTrack(0);
      else audioElement.play();
    } else {
      audioElement.pause();
    }
  }

  function updatePlayButton() {
    const icon = btnPlayPause.querySelector('i');
    icon.className = isPlaying ? 'fa-solid fa-pause' : 'fa-solid fa-play';
  }

  function shufflePlaylist() {
    if (playlist.length < 2) return;
    // Fisher-Yates shuffle
    for (let i = playlist.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [playlist[i], playlist[j]] = [playlist[j], playlist[i]];
    }
    renderPlaylist();
    // If currently playing, restart from current index in new order
    if (currentIndex !== -1 && currentIndex < playlist.length) {
      playTrack(currentIndex);
    }
  }

  function updateProgress() {
    // Could add a progress bar here if desired
  }

  // --- VISUALIZER SETUP ---
  function startVisualizer() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      source = audioCtx.createMediaElementSource(audioElement);
      analyser = audioCtx.createAnalyser();
      source.connect(analyser);
      analyser.connect(audioCtx.destination);
      analyser.fftSize = 64; // Low resolution for performance
    }
    
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const bars = document.querySelectorAll('.vis-bar');

    function animate() {
      if (!isPlaying) return;
      requestAnimationFrame(animate);
      
      analyser.getByteFrequencyData(dataArray);
      
      // Map frequency data to bars
      const step = Math.floor(bufferLength / bars.length);
      bars.forEach((bar, i) => {
        const value = dataArray[i * step];
        const height = Math.max(5, (value / 255) * 40);
        bar.style.height = `${height}px`;
      });
    }
    
    animate();
  }

  function stopVisualizer() {
    // Reset bars
    document.querySelectorAll('.vis-bar').forEach(bar => {
      bar.style.height = '5px';
    });
  }

  function createControlBtn(iconClass, title, isMain = false) {
    const btn = document.createElement('button');
    btn.style.cssText = `
      background: none;
      border: none;
      color: ${isMain ? 'var(--term-green)' : 'var(--term-cyan)'};
      font-size: ${isMain ? '1.5rem' : '1.2rem'};
      cursor: pointer;
      transition: transform 0.2s;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    btn.innerHTML = `<i class="fa-solid ${iconClass}"></i>`;
    btn.title = title;
    btn.onmouseenter = () => btn.style.transform = 'scale(1.1)';
    btn.onmouseleave = () => btn.style.transform = 'scale(1)';
    return btn;
  }
}
