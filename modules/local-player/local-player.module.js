// modules/local-player/local-player.module.js

// --- IndexedDB Configuration ---
const DB_NAME = 'MusicLibrary';
const DB_VERSION = 3;
const STORE_NAME = 'tracks';
let db = null;

async function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error("DB Open Error:", event.target.error);
      reject('DB Error: ' + event.target.error);
    };
    
    request.onupgradeneeded = (event) => {
      const database = event.target.result;
      
      if (database.objectStoreNames.contains(STORE_NAME)) {
        database.deleteObjectStore(STORE_NAME);
      }
      
      database.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      console.log("Database created/upgraded to version", DB_VERSION);
    };

    request.onsuccess = (event) => {
      db = event.target.result;
      resolve(db);
    };
  });
}

function readFileAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}

async function saveTracksToDB(tracks) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    store.clear().onsuccess = () => {
      let completed = 0;
      
      tracks.forEach(async (track, idx) => {
        try {
          const arrayBuffer = await readFileAsArrayBuffer(track);
          
          let mimeType = track.type;
          if (!mimeType || mimeType === '') {
            const ext = track.name.split('.').pop().toLowerCase();
            const mimeMap = {
              'mp3': 'audio/mpeg',
              'wav': 'audio/wav',
              'ogg': 'audio/ogg',
              'flac': 'audio/flac',
              'm4a': 'audio/mp4'
            };
            mimeType = mimeMap[ext] || 'audio/mpeg';
          }
          
          const trackObj = {
            name: track.name,
            type: mimeType,
            size: track.size,
            lastModified: track.lastModified || Date.now(),
            data: arrayBuffer
          };
          
          store.add(trackObj);
          completed++;
          
          if (completed === tracks.length) {
            transaction.oncomplete = () => resolve(completed);
          }
        } catch (err) {
          console.error("Error saving:", track.name, err);
          completed++;
          if (completed === tracks.length) {
            transaction.oncomplete = () => resolve(completed);
          }
        }
      });
    };
    
    transaction.onerror = () => reject(transaction.error);
  });
}

async function loadTracksFromDB() {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      const tracks = request.result;
      const validTracks = [];
      
      for (const track of tracks) {
        if (track && track.data && track.data.byteLength > 0) {
          const blob = new Blob([track.data], { type: track.type || 'audio/mpeg' });
          validTracks.push({
            id: track.id,
            name: track.name,
            type: track.type,
            size: track.size,
            lastModified: track.lastModified,
            blob: blob
          });
        }
      }
      
      resolve(validTracks);
    };
    request.onerror = () => reject(request.error);
  });
}

async function deleteAllTracks() {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// --- Main Module ---
export default async function initLocalPlayer(container) {
  if (!container) {
    console.error("Music Player: Container not found");
    return;
  }

  try {
    await initDB();
  } catch (err) {
    console.error("Failed to initialize IndexedDB:", err);
    container.innerHTML = '<div style="color:red">Storage initialization failed. Check console.</div>';
    return;
  }

  container.innerHTML = "";

  // Panel Title
  const panelTitle = document.createElement("div");
  panelTitle.className = "panel-title";
  panelTitle.innerHTML = '<i class="fa-solid fa-music"></i> Music Player new';
  container.appendChild(panelTitle);

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

  // Folder Selection Area
  const folderSection = document.createElement("div");
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
    <div style="color: var(--term-dim); font-size: 0.8rem;">Click to load or reload library</div>
  `;

  // Controls Section
  const controlsSection = document.createElement("div");
  controlsSection.style.cssText = `display: none; flex-direction: column; gap: 15px;`;

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
  trackStatus.style.cssText = `color: var(--term-dim); font-size: 0.8rem; margin-top: 5px;`;
  trackStatus.textContent = "Initializing...";

  trackInfo.append(trackTitle, trackStatus);

  // Visualizer
  const visualizer = document.createElement("div");
  visualizer.style.cssText = `display: flex; justify-content: center; align-items: flex-end; gap: 2px; height: 40px; margin: 10px 0;`;

  const bars = [];
  for (let i = 0; i < 20; i++) {
    const bar = document.createElement("div");
    bar.style.cssText = `width: 4px; background: var(--term-green); height: 5px; transition: height 0.1s ease;`;
    visualizer.appendChild(bar);
    bars.push(bar);
  }

  const controlsRow = document.createElement("div");
  controlsRow.style.cssText = `display: flex; justify-content: center; align-items: center; gap: 20px;`;

  const btnPrev = createControlBtn("fa-backward-step", "Previous");
  const btnPlayPause = createControlBtn("fa-play", "Play/Pause", true);
  const btnNext = createControlBtn("fa-forward-step", "Next");
  const btnShuffle = createControlBtn("fa-shuffle", "Shuffle");
  const btnClear = createControlBtn("fa-trash-can", "Clear Library", false);
  btnClear.style.color = "var(--term-red)";

  controlsRow.append(btnPrev, btnPlayPause, btnNext, btnShuffle, btnClear);

  const playlistSection = document.createElement("div");
  playlistSection.style.cssText = `
    max-height: 200px;
    overflow-y: auto;
    background: rgba(0,0,0,0.2);
    border: 1px solid var(--panel-border);
    border-radius: var(--radius);
    padding: 5px;
  `;
  playlistSection.innerHTML = '<div style="padding:10px;color:var(--term-dim);text-align:center;">Playlist empty</div>';

  controlsSection.append(trackInfo, visualizer, controlsRow, playlistSection);
  playerContainer.append(folderSection, controlsSection);
  container.appendChild(playerContainer);

  // ===== STATE =====
  let playlist = [];
  let currentIndex = -1;
  let isPlaying = false;
  let isShuffle = false;
  let currentBlobUrl = null;

  const audioElement = new Audio();
  audioElement.preload = "auto";

  let audioCtx = null;
  let analyser = null;
  let source = null;
  let animationFrame = null;

  // ===== LOAD LIBRARY =====
  async function loadLibrary() {
    try {
      trackStatus.textContent = "Loading library...";
      const storedTracks = await loadTracksFromDB();
      
      if (storedTracks && storedTracks.length > 0) {
        playlist = storedTracks;
        folderSection.style.display = "none";
        controlsSection.style.display = "flex";
        trackStatus.textContent = `${playlist.length} tracks loaded`;
        renderPlaylist();
        console.log("Loaded", playlist.length, "tracks");
      } else {
        trackStatus.textContent = "Select a folder to load music";
      }
    } catch (e) {
      console.error("Error loading library:", e);
      trackStatus.textContent = "Storage error. Select folder.";
    }
  }

  loadLibrary();

  // ===== FILE PICKER =====
  folderSection.onclick = async () => {
    try {
      let files = [];

      if ('showDirectoryPicker' in window) {
        try {
          const dirHandle = await window.showDirectoryPicker();
          for await (const entry of dirHandle.values()) {
            if (entry.kind === 'file') {
              const file = await entry.getFile();
              if (/\.mp3|\.wav|\.ogg|\.flac|\.m4a$/i.test(file.name)) {
                files.push(file);
              }
            }
          }
        } catch (err) {
          console.log("Dir picker failed, using file picker");
        }
      }

      if (files.length === 0) {
        const input = document.createElement("input");
        input.type = "file";
        input.multiple = true;
        input.accept = ".mp3,.wav,.ogg,.flac,.m4a,audio/*";
        
        await new Promise(resolve => {
          input.onchange = () => {
            files = Array.from(input.files || []);
            resolve();
          };
          input.click();
        });
      }

      if (!files.length) return;

      trackStatus.textContent = `Saving ${files.length} tracks...`;
      files.sort((a, b) => a.name.localeCompare(b.name));
      
      await saveTracksToDB(files);
      
      playlist = await loadTracksFromDB();
      
      folderSection.style.display = "none";
      controlsSection.style.display = "flex";
      trackStatus.textContent = `${playlist.length} tracks saved`;
      renderPlaylist();

    } catch (error) {
      console.error("Error selecting files:", error);
      trackStatus.textContent = "Error: " + error.message;
    }
  };

  // ===== CLEAR LIBRARY =====
  btnClear.onclick = async () => {
    if (!confirm("Delete all stored music?")) return;
    try {
      await deleteAllTracks();
      playlist = [];
      currentIndex = -1;
      
      if (currentBlobUrl) {
        URL.revokeObjectURL(currentBlobUrl);
        currentBlobUrl = null;
      }
      
      audioElement.pause();
      audioElement.src = "";
      
      folderSection.style.display = "block";
      controlsSection.style.display = "none";
      trackTitle.textContent = "No track selected";
      trackStatus.textContent = "Library cleared";
      renderPlaylist();
    } catch (e) {
      console.error("Error clearing:", e);
      trackStatus.textContent = "Error clearing";
    }
  };

  // ===== CONTROLS =====
  btnPrev.onclick = () => {
    if (!playlist.length) return;
    playTrack((currentIndex - 1 + playlist.length) % playlist.length);
  };

  btnNext.onclick = () => {
    if (!playlist.length) return;
    playTrack((currentIndex + 1) % playlist.length);
  };

  btnPlayPause.onclick = () => {
    if (!playlist.length) return;
    if (currentIndex === -1) {
      playTrack(0);
    } else if (audioElement.paused) {
      audioElement.play().catch(e => {
        console.error("Play failed:", e);
        trackStatus.textContent = "Playback error: " + e.message;
      });
    } else {
      audioElement.pause();
    }
  };

  btnShuffle.onclick = () => {
    isShuffle = !isShuffle;
    btnShuffle.style.color = isShuffle ? "var(--term-green)" : "var(--term-cyan)";
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
      playTrack(Math.floor(Math.random() * playlist.length));
    } else {
      playTrack((currentIndex + 1) % playlist.length);
    }
  });

  audioElement.addEventListener("error", (e) => {
    console.error("Audio Error:", audioElement.error);
    trackStatus.textContent = "Playback unavailable: Invalid data format in storage";
    isPlaying = false;
    updatePlayButton();
    stopVisualizer();
  });

  // ===== PLAY TRACK =====
  async function playTrack(index) {
    if (index < 0 || index >= playlist.length) return;

    currentIndex = index;
    const track = playlist[index];

    trackTitle.textContent = track.name;
    renderPlaylist();

    try {
      if (currentBlobUrl) {
        URL.revokeObjectURL(currentBlobUrl);
        currentBlobUrl = null;
      }

      const blob = track.blob;
      
      if (!blob || !(blob instanceof Blob) || blob.size === 0) {
        throw new Error("Invalid blob data");
      }

      currentBlobUrl = URL.createObjectURL(blob);
      audioElement.src = currentBlobUrl;
      
      await audioElement.play();
      
    } catch (error) {
      console.error("Play error:", error);
      trackStatus.textContent = "Playback unavailable: Invalid data format in storage";
    }
  }

  // ===== RENDER PLAYLIST =====
  function renderPlaylist() {
    playlistSection.innerHTML = "";
    if (!playlist.length) {
      playlistSection.innerHTML = '<div style="padding:10px;color:var(--term-dim);text-align:center;">Playlist empty</div>';
      return;
    }

    playlist.forEach((track, index) => {
      const item = document.createElement("div");
      item.style.cssText = `
        padding: 12px 10px;
        cursor: pointer;
        border-radius: 4px;
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 0.9rem;
        color: ${index === currentIndex ? "var(--term-green)" : "var(--term-cyan)"};
        background: ${index === currentIndex ? "rgba(0,255,65,0.1)" : "transparent"};
        touch-action: manipulation;
      `;

      item.innerHTML = `
        <i class="fa-solid fa-music" style="font-size:0.8rem;opacity:0.7;"></i>
        <span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(track.name)}</span>
      `;

      item.onclick = () => playTrack(index);
      playlistSection.appendChild(item);
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

  function updatePlayButton() {
    const icon = btnPlayPause.querySelector("i");
    icon.className = isPlaying ? "fa-solid fa-pause" : "fa-solid fa-play";
  }

  function createControlBtn(iconClass, title, isMain = false) {
    const btn = document.createElement("button");
    btn.style.cssText = `
      background: none;
      border: none;
      color: ${isMain ? "var(--term-green)" : "var(--term-cyan)"};
      font-size: ${isMain ? "2rem" : "1.5rem"};
      cursor: pointer;
      width: 50px;
      height: 50px;
      display: flex;
      align-items: center;
      justify-content: center;
      touch-action: manipulation;
    `;
    btn.innerHTML = `<i class="fa-solid ${iconClass}"></i>`;
    btn.title = title;
    return btn;
  }

  function startVisualizer() {
    if (!audioCtx) {
      try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        source = audioCtx.createMediaElementSource(audioElement);
        analyser = audioCtx.createAnalyser();
        source.connect(analyser);
        analyser.connect(audioCtx.destination);
        analyser.fftSize = 64;
      } catch (error) {
        console.warn("Visualizer unavailable:", error);
        return;
      }
    }
    
    if (audioCtx.state === "suspended") {
      audioCtx.resume();
    }

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    function animate() {
      if (!isPlaying || !analyser) return;
      animationFrame = requestAnimationFrame(animate);
      analyser.getByteFrequencyData(dataArray);
      bars.forEach((bar, i) => {
        const value = dataArray[i % dataArray.length];
        const height = Math.max(5, (value / 255) * 40);
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
    bars.forEach((bar) => { bar.style.height = "5px"; });
  }

  // Cleanup
  window.addEventListener('beforeunload', () => {
    if (currentBlobUrl) {
      URL.revokeObjectURL(currentBlobUrl);
    }
    if (audioCtx) {
      audioCtx.close();
    }
  });
}
