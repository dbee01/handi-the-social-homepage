// modules/local-player/local-player.module.js

// TO (correct path - go up 2 levels from modules/local-player/ to root, then into js/)
import { loadMusicFiles } from '../../js/storage.js';

export default async function initLocalPlayer(container) {
  console.log("🎵 MUSIC PLAYER INIT - Container:", container);
  
  if (!container) {
    console.error("No container provided!");
    return;
  }
  
  // Make the parent dashboard-item visible
  const parentItem = container.closest('.dashboard-item');
  if (parentItem) {
    parentItem.style.display = 'block';
  }
  
  // Make container visible
  container.style.display = 'block';
  container.style.minHeight = '450px';
  container.style.backgroundColor = '#0a0a15';
  container.style.borderRadius = '12px';
  container.style.padding = '15px';
  container.style.width = '100%';
  container.style.maxWidth = '420px';
  container.style.margin = '0 auto';
  container.style.boxSizing = 'border-box';
  
  // Load music files from IndexedDB
  let musicFiles = [];
  let settingsVolume = 70;
  let settingsShuffle = false;
  
  try {
    console.log("Loading music from IndexedDB...");
    const storedMusic = await loadMusicFiles();
    if (storedMusic && storedMusic.length > 0) {
      musicFiles = storedMusic;
      console.log(`✅ Loaded ${musicFiles.length} music files from IndexedDB`);
    } else {
      console.log('No music files found in IndexedDB storage');
    }
  } catch(e) {
    console.error("Error loading music:", e);
  }
  
  // Load settings from localStorage
  try {
    const saved = localStorage.getItem('pleie_settings');
    if (saved) {
      const settings = JSON.parse(saved);
      if (settings.musicPlayer) {
        settingsVolume = settings.musicPlayer.defaultVolume || 70;
        settingsShuffle = settings.musicPlayer.defaultShuffle || false;
      }
    }
  } catch(e) {
    console.error("Error loading settings:", e);
  }
  
  // Audio Context for Visualizer
  let audioContext = null;
  let analyser = null;
  let source = null;
  let animationId = null;
  let currentAudio = null;
  let currentIndex = -1;
  let isPlaying = false;
  let isShuffle = settingsShuffle;
  let currentVolume = settingsVolume;
  
  // Build the complete music player UI
  const html = `
    <div style="display: flex; flex-direction: column; gap: 15px;">
      <!-- Now Playing Section -->
      <div id="now-playing-section" style="
        background: linear-gradient(135deg, #1a1a2e, #0d0d1a);
        border-radius: 12px;
        padding: 15px;
        text-align: center;
        border: 1px solid #00ff41;
      ">
        <div id="current-track-title" style="color: #00ff41; font-size: 1.1rem; font-weight: bold; margin-bottom: 5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
          ${musicFiles.length > 0 ? musicFiles[0].name : 'No tracks loaded'}
        </div>
        <div id="current-track-status" style="color: #888; font-size: 0.8rem;">
          ${musicFiles.length > 0 ? 'Ready to play' : 'No music found. Click gear icon → Music Player → Select Folder → Save Settings'}
        </div>
      </div>
      
      <!-- Visualizer -->
      <div style="
        background: #000;
        border-radius: 12px;
        padding: 15px;
        border: 1px solid #333;
      ">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
          <div style="color: #00ff41; font-size: 0.8rem;">
            <i class="fa-solid fa-chart-line"></i> Audio Visualizer
          </div>
          <div style="color: #888; font-size: 0.7rem;">
            <i class="fa-solid fa-waveform"></i> Real-time
          </div>
        </div>
        <canvas id="audio-visualizer" style="
          width: 100%;
          height: 80px;
          background: #0a0a0a;
          border-radius: 8px;
          display: block;
        " width="800" height="80"></canvas>
      </div>
      
      <!-- Volume Control -->
      <div style="
        background: #1a1a2e;
        border-radius: 8px;
        padding: 8px 12px;
        display: flex;
        align-items: center;
        gap: 12px;
        flex-wrap: wrap;
        border: 1px solid #333;
      ">
        <i class="fa-solid fa-volume-down" style="color: #888; font-size: 0.8rem;"></i>
        <input type="range" id="volume-slider" min="0" max="100" value="${currentVolume}" style="
          flex: 1;
          height: 4px;
          -webkit-appearance: none;
          background: #333;
          border-radius: 2px;
        ">
        <i class="fa-solid fa-volume-up" style="color: #888; font-size: 0.8rem;"></i>
        <span id="volume-percent" style="color: #00ff41; min-width: 40px; font-size: 0.8rem;">${currentVolume}%</span>
      </div>
      
      <!-- Playback Controls -->
      <div style="
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 15px;
        padding: 8px;
        background: #1a1a2e;
        border-radius: 40px;
        border: 1px solid #333;
      ">
        <button id="btn-prev" class="control-btn" style="
          background: none;
          border: none;
          color: #00ffff;
          font-size: 1.1rem;
          cursor: pointer;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          transition: all 0.2s;
        ">
          <i class="fa-solid fa-backward-step"></i>
        </button>
        <button id="btn-playpause" class="control-btn" style="
          background: #00ff41;
          border: none;
          color: #000;
          font-size: 1.3rem;
          cursor: pointer;
          width: 55px;
          height: 55px;
          border-radius: 50%;
          transition: all 0.2s;
        ">
          <i class="fa-solid fa-play"></i>
        </button>
        <button id="btn-next" class="control-btn" style="
          background: none;
          border: none;
          color: #00ffff;
          font-size: 1.1rem;
          cursor: pointer;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          transition: all 0.2s;
        ">
          <i class="fa-solid fa-forward-step"></i>
        </button>
        <button id="btn-shuffle" class="control-btn" style="
          background: none;
          border: none;
          color: ${isShuffle ? '#00ff41' : '#888'};
          font-size: 0.9rem;
          cursor: pointer;
          width: 35px;
          height: 35px;
          border-radius: 50%;
          transition: all 0.2s;
        ">
          <i class="fa-solid fa-shuffle"></i>
        </button>
      </div>
      
      <!-- Playlist -->
      <div style="
        background: #1a1a2e;
        border-radius: 12px;
        border: 1px solid #333;
        overflow: hidden;
      ">
        <div style="
          padding: 8px 12px;
          background: rgba(0,255,65,0.1);
          border-bottom: 1px solid #333;
          color: #00ff41;
          font-size: 0.8rem;
        ">
          <i class="fa-solid fa-list"></i> Playlist (${musicFiles.length} tracks)
        </div>
        <div id="playlist-container" style="
          max-height: 180px;
          overflow-y: auto;
        ">
          ${musicFiles.length === 0 ? `
            <div style="padding: 30px; text-align: center; color: #666;">
              <i class="fa-solid fa-music"></i> No music loaded<br>
              <span style="font-size: 11px;">Click the gear icon → Music Player → Select Folder → Save Settings</span>
            </div>
          ` : musicFiles.map((file, i) => `
            <div class="playlist-item" data-index="${i}" style="
              padding: 8px 12px;
              cursor: pointer;
              display: flex;
              align-items: center;
              gap: 10px;
              border-bottom: 1px solid #222;
              transition: all 0.2s;
              color: #00ffff;
              font-size: 0.85rem;
            ">
              <i class="fa-solid fa-music" style="font-size: 0.7rem;"></i>
              <span style="flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(file.name)}</span>
              <i class="fa-solid fa-play" style="font-size: 0.6rem; color: #00ff41; opacity: 0.5;"></i>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
  
  container.innerHTML = html;
  
  // Get DOM elements
  const playPauseBtn = document.getElementById('btn-playpause');
  const prevBtn = document.getElementById('btn-prev');
  const nextBtn = document.getElementById('btn-next');
  const shuffleBtn = document.getElementById('btn-shuffle');
  const volumeSlider = document.getElementById('volume-slider');
  const volumePercent = document.getElementById('volume-percent');
  const currentTrackTitle = document.getElementById('current-track-title');
  const currentTrackStatus = document.getElementById('current-track-status');
  const canvas = document.getElementById('audio-visualizer');
  const ctx = canvas?.getContext('2d');
  
  // Set canvas size
  function resizeCanvas() {
    if (canvas && canvas.parentElement) {
      canvas.width = canvas.parentElement.clientWidth - 30;
      canvas.height = 80;
    }
  }
  setTimeout(resizeCanvas, 100);
  window.addEventListener('resize', resizeCanvas);
  
  // Volume control
  if (volumeSlider) {
    volumeSlider.addEventListener('input', (e) => {
      currentVolume = e.target.value;
      volumePercent.textContent = currentVolume + '%';
      if (currentAudio) {
        currentAudio.volume = currentVolume / 100;
      }
      saveVolumeToSettings(currentVolume);
    });
  }
  
  function saveVolumeToSettings(volume) {
    try {
      const saved = localStorage.getItem('pleie_settings');
      if (saved) {
        const settings = JSON.parse(saved);
        if (!settings.musicPlayer) settings.musicPlayer = {};
        settings.musicPlayer.defaultVolume = parseInt(volume);
        localStorage.setItem('pleie_settings', JSON.stringify(settings));
      }
    } catch(e) {
      console.error("Error saving volume:", e);
    }
  }
  
  function saveShuffleToSettings(shuffle) {
    try {
      const saved = localStorage.getItem('pleie_settings');
      if (saved) {
        const settings = JSON.parse(saved);
        if (!settings.musicPlayer) settings.musicPlayer = {};
        settings.musicPlayer.defaultShuffle = shuffle;
        localStorage.setItem('pleie_settings', JSON.stringify(settings));
      }
    } catch(e) {
      console.error("Error saving shuffle:", e);
    }
  }
  
  // Setup audio visualizer
  function setupVisualizer(audioElement) {
    if (audioContext && audioContext.state !== 'closed') {
      try {
        audioContext.close();
      } catch(e) {}
    }
    
    try {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 128;
      
      source = audioContext.createMediaElementSource(audioElement);
      source.connect(analyser);
      analyser.connect(audioContext.destination);
      
      startVisualizer();
    } catch(e) {
      console.warn("Visualizer not supported:", e);
    }
  }
  
  function startVisualizer() {
    if (!analyser || !ctx) return;
    
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    function draw() {
      if (!isPlaying || !analyser) {
        animationId = requestAnimationFrame(draw);
        return;
      }
      
      analyser.getByteFrequencyData(dataArray);
      
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      const barWidth = (canvas.width / bufferLength) * 2;
      let x = 0;
      
      for (let i = 0; i < bufferLength; i++) {
        const value = dataArray[i];
        const percent = value / 255;
        const height = canvas.height * percent;
        
        const hue = 90 + (percent * 30);
        ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
        ctx.fillRect(x, canvas.height - height, barWidth - 1, height);
        
        x += barWidth;
      }
      
      animationId = requestAnimationFrame(draw);
    }
    
    draw();
  }
  
  // Play music function
  async function playMusic(index) {
    if (musicFiles.length === 0) {
      currentTrackStatus.textContent = 'No music loaded. Configure in Settings.';
      return;
    }
    
    if (index < 0 || index >= musicFiles.length) return;
    
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.src = '';
    }
    
    currentIndex = index;
    const fileData = musicFiles[currentIndex];
    currentTrackTitle.textContent = fileData.name;
    currentTrackStatus.textContent = 'Loading...';
    
    try {
      // Convert base64 to blob
      const binaryString = atob(fileData.data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: fileData.type || 'audio/mpeg' });
      const url = URL.createObjectURL(blob);
      
      currentAudio = new Audio(url);
      currentAudio.volume = currentVolume / 100;
      
      currentAudio.addEventListener('play', () => {
        isPlaying = true;
        if (playPauseBtn) playPauseBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
        currentTrackStatus.textContent = 'Playing...';
        if (audioContext && audioContext.state === 'suspended') {
          audioContext.resume();
        }
      });
      
      currentAudio.addEventListener('pause', () => {
        isPlaying = false;
        if (playPauseBtn) playPauseBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
        currentTrackStatus.textContent = 'Paused';
      });
      
      currentAudio.addEventListener('ended', () => {
        playNext();
      });
      
      currentAudio.addEventListener('error', (e) => {
        console.error('Audio error:', e);
        currentTrackStatus.textContent = 'Playback error';
      });
      
      await currentAudio.play();
      setupVisualizer(currentAudio);
      
      // Highlight current track in playlist
      document.querySelectorAll('.playlist-item').forEach((item, i) => {
        if (i === currentIndex) {
          item.style.background = 'rgba(0,255,65,0.2)';
          item.style.borderLeft = '3px solid #00ff41';
        } else {
          item.style.background = '';
          item.style.borderLeft = '';
        }
      });
      
    } catch(e) {
      console.error('Play error:', e);
      currentTrackStatus.textContent = 'Error playing track';
    }
  }
  
  function playNext() {
    if (musicFiles.length === 0) return;
    let nextIndex;
    if (isShuffle) {
      let newIndex;
      do {
        newIndex = Math.floor(Math.random() * musicFiles.length);
      } while (newIndex === currentIndex && musicFiles.length > 1);
      nextIndex = newIndex;
    } else {
      nextIndex = (currentIndex + 1) % musicFiles.length;
    }
    playMusic(nextIndex);
  }
  
  function playPrev() {
    if (musicFiles.length === 0) return;
    let prevIndex = (currentIndex - 1 + musicFiles.length) % musicFiles.length;
    playMusic(prevIndex);
  }
  
  // Button event listeners
  if (playPauseBtn) {
    playPauseBtn.onclick = () => {
      if (!currentAudio) {
        if (musicFiles.length > 0) playMusic(0);
      } else if (isPlaying) {
        currentAudio.pause();
      } else {
        currentAudio.play();
      }
    };
  }
  
  if (prevBtn) prevBtn.onclick = () => playPrev();
  if (nextBtn) nextBtn.onclick = () => playNext();
  
  if (shuffleBtn) {
    shuffleBtn.onclick = () => {
      isShuffle = !isShuffle;
      shuffleBtn.style.color = isShuffle ? '#00ff41' : '#888';
      saveShuffleToSettings(isShuffle);
    };
  }
  
  // Playlist click handlers
  document.querySelectorAll('.playlist-item').forEach((item) => {
    item.addEventListener('click', () => {
      const index = parseInt(item.dataset.index);
      playMusic(index);
    });
    
    item.addEventListener('mouseenter', () => {
      if (parseInt(item.dataset.index) !== currentIndex) {
        item.style.background = 'rgba(0,255,65,0.05)';
      }
    });
    item.addEventListener('mouseleave', () => {
      if (parseInt(item.dataset.index) !== currentIndex) {
        item.style.background = '';
      }
    });
  });
  
  // Touch-friendly button effects
  document.querySelectorAll('.control-btn').forEach(btn => {
    btn.addEventListener('touchstart', () => {
      btn.style.transform = 'scale(0.95)';
    });
    btn.addEventListener('touchend', () => {
      btn.style.transform = 'scale(1)';
    });
  });
  
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
  window.addEventListener('settingsChanged', async () => {
    console.log('Settings changed, reloading music...');
    const newMusic = await loadMusicFiles();
    if (newMusic && newMusic.length > 0) {
      musicFiles = newMusic;
      // Reload UI with new files
      initLocalPlayer(container);
    }
  });
  
  console.log(`✅ Music Player ready - ${musicFiles.length} tracks loaded`);
}