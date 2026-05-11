// modules/local-player/local-player.module.js

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
  container.style.minHeight = '400px';
  container.style.backgroundColor = '#0a0a15';
  container.style.borderRadius = '8px';
  container.style.padding = '15px';
  
  // Check localStorage for music files
  let musicFiles = [];
  let settings = null;
  
  try {
    const saved = localStorage.getItem('pleie_settings');
    if (saved) {
      settings = JSON.parse(saved);
      if (settings.musicPlayer && settings.musicPlayer.musicFiles) {
        musicFiles = settings.musicPlayer.musicFiles;
        console.log(`Found ${musicFiles.length} music files`);
      }
    }
  } catch(e) {
    console.error("Error loading music:", e);
  }
  
  // Build the complete music player UI
  let html = `
    <div style="display: flex; flex-direction: column; gap: 15px;">
      <!-- Now Playing Section -->
      <div id="now-playing-section" style="
        background: linear-gradient(135deg, #1a1a2e, #0d0d1a);
        border-radius: 12px;
        padding: 15px;
        text-align: center;
        border: 1px solid #00ff41;
      ">
        <div id="current-track-title" style="color: #00ff41; font-size: 1.1rem; font-weight: bold; margin-bottom: 5px;">
          No track selected
        </div>
        <div id="current-track-status" style="color: #888; font-size: 0.8rem;">
          Ready to play
        </div>
      </div>
      
      <!-- Visualizer / Synthesizer -->
      <div id="synthesizer" style="
        background: #000;
        border-radius: 12px;
        padding: 20px;
        border: 1px solid #333;
      ">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
          <div style="color: #00ff41; font-size: 0.9rem;">
            <i class="fa-solid fa-chart-line"></i> Audio Visualizer
          </div>
          <div style="color: #888; font-size: 0.7rem;">
            <i class="fa-solid fa-waveform"></i> Real-time
          </div>
        </div>
        <canvas id="audio-visualizer" style="
          width: 100%;
          height: 100px;
          background: #0a0a0a;
          border-radius: 8px;
          display: block;
        " width="800" height="100"></canvas>
      </div>
      
      <!-- Volume Control -->
      <div style="
        background: #1a1a2e;
        border-radius: 8px;
        padding: 10px 15px;
        display: flex;
        align-items: center;
        gap: 15px;
        flex-wrap: wrap;
        border: 1px solid #333;
      ">
        <i class="fa-solid fa-volume-down" style="color: #888;"></i>
        <input type="range" id="volume-slider" min="0" max="100" value="70" style="
          flex: 1;
          height: 4px;
          -webkit-appearance: none;
          background: #333;
          border-radius: 2px;
        ">
        <i class="fa-solid fa-volume-up" style="color: #888;"></i>
        <span id="volume-percent" style="color: #00ff41; min-width: 45px;">70%</span>
      </div>
      
      <!-- Playback Controls -->
      <div style="
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 20px;
        padding: 10px;
        background: #1a1a2e;
        border-radius: 50px;
        border: 1px solid #333;
      ">
        <button id="btn-prev" style="
          background: none;
          border: none;
          color: #00ffff;
          font-size: 1.2rem;
          cursor: pointer;
          width: 45px;
          height: 45px;
          border-radius: 50%;
          transition: all 0.2s;
        ">
          <i class="fa-solid fa-backward-step"></i>
        </button>
        <button id="btn-playpause" style="
          background: #00ff41;
          border: none;
          color: #000;
          font-size: 1.5rem;
          cursor: pointer;
          width: 60px;
          height: 60px;
          border-radius: 50%;
          transition: all 0.2s;
        ">
          <i class="fa-solid fa-play"></i>
        </button>
        <button id="btn-next" style="
          background: none;
          border: none;
          color: #00ffff;
          font-size: 1.2rem;
          cursor: pointer;
          width: 45px;
          height: 45px;
          border-radius: 50%;
          transition: all 0.2s;
        ">
          <i class="fa-solid fa-forward-step"></i>
        </button>
        <button id="btn-shuffle" style="
          background: none;
          border: none;
          color: #888;
          font-size: 1rem;
          cursor: pointer;
          width: 40px;
          height: 40px;
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
          padding: 10px 15px;
          background: rgba(0,255,65,0.1);
          border-bottom: 1px solid #333;
          color: #00ff41;
          font-size: 0.85rem;
        ">
          <i class="fa-solid fa-list"></i> Playlist
        </div>
        <div id="playlist-container" style="
          max-height: 200px;
          overflow-y: auto;
        ">
          ${musicFiles.length === 0 ? `
            <div style="padding: 30px; text-align: center; color: #666;">
              <i class="fa-solid fa-music"></i> No music loaded<br>
              <span style="font-size: 12px;">Click the gear icon to add music</span>
            </div>
          ` : musicFiles.map((file, i) => `
            <div class="playlist-item" data-index="${i}" style="
              padding: 10px 15px;
              cursor: pointer;
              display: flex;
              align-items: center;
              gap: 10px;
              border-bottom: 1px solid #222;
              transition: all 0.2s;
              color: #00ffff;
            ">
              <i class="fa-solid fa-music" style="font-size: 0.8rem;"></i>
              <span style="flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(file.name)}</span>
              <i class="fa-solid fa-play" style="font-size: 0.7rem; color: #00ff41; opacity: 0.5;"></i>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
  
  container.innerHTML = html;
  
  // Audio Context for Synthesizer/Visualizer
  let audioContext = null;
  let analyser = null;
  let source = null;
  let animationId = null;
  let currentAudio = null;
  let currentIndex = -1;
  let isPlaying = false;
  let isShuffle = false;
  let currentVolume = 70;
  
  // Get elements
  const playPauseBtn = document.getElementById('btn-playpause');
  const prevBtn = document.getElementById('btn-prev');
  const nextBtn = document.getElementById('btn-next');
  const shuffleBtn = document.getElementById('btn-shuffle');
  const volumeSlider = document.getElementById('volume-slider');
  const volumePercent = document.getElementById('volume-percent');
  const currentTrackTitle = document.getElementById('current-track-title');
  const currentTrackStatus = document.getElementById('current-track-status');
  const canvas = document.getElementById('audio-visualizer');
  const ctx = canvas.getContext('2d');
  
  // Set canvas size
  function resizeCanvas() {
    const container = canvas.parentElement;
    canvas.width = container.clientWidth;
    canvas.height = 100;
  }
  window.addEventListener('resize', resizeCanvas);
  setTimeout(resizeCanvas, 100);
  
  // Volume control
  volumeSlider.addEventListener('input', (e) => {
    currentVolume = e.target.value;
    volumePercent.textContent = currentVolume + '%';
    if (currentAudio) {
      currentAudio.volume = currentVolume / 100;
    }
  });
  
  // Setup audio visualizer
  function setupVisualizer(audioElement) {
    if (audioContext && audioContext.state !== 'closed') {
      try {
        audioContext.close();
      } catch(e) {}
    }
    
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    
    source = audioContext.createMediaElementSource(audioElement);
    source.connect(analyser);
    analyser.connect(audioContext.destination);
    
    startVisualizer();
  }
  
  function startVisualizer() {
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
      
      const barWidth = (canvas.width / bufferLength) * 2.5;
      let x = 0;
      
      for (let i = 0; i < bufferLength; i++) {
        const value = dataArray[i];
        const percent = value / 255;
        const height = canvas.height * percent;
        
        const hue = 120 - (percent * 60);
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
        playPauseBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
        currentTrackStatus.textContent = 'Playing...';
        if (audioContext && audioContext.state === 'suspended') {
          audioContext.resume();
        }
      });
      
      currentAudio.addEventListener('pause', () => {
        isPlaying = false;
        playPauseBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
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
      nextIndex = Math.floor(Math.random() * musicFiles.length);
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
  playPauseBtn.onclick = () => {
    if (!currentAudio) {
      if (musicFiles.length > 0) playMusic(0);
    } else if (isPlaying) {
      currentAudio.pause();
    } else {
      currentAudio.play();
    }
  };
  
  prevBtn.onclick = () => playPrev();
  nextBtn.onclick = () => playNext();
  
  shuffleBtn.onclick = () => {
    isShuffle = !isShuffle;
    shuffleBtn.style.color = isShuffle ? '#00ff41' : '#888';
  };
  
  // Playlist click handlers
  document.querySelectorAll('.playlist-item').forEach((item) => {
    item.addEventListener('click', () => {
      const index = parseInt(item.dataset.index);
      playMusic(index);
    });
    
    // Hover effects
    item.addEventListener('mouseenter', () => {
      item.style.background = 'rgba(0,255,65,0.1)';
    });
    item.addEventListener('mouseleave', () => {
      if (parseInt(item.dataset.index) !== currentIndex) {
        item.style.background = '';
      }
    });
  });
  
  // Button hover effects
  const buttons = ['btn-prev', 'btn-playpause', 'btn-next', 'btn-shuffle'];
  buttons.forEach(id => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.addEventListener('mouseenter', () => {
        btn.style.transform = 'scale(1.05)';
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.transform = 'scale(1)';
      });
      btn.addEventListener('touchstart', () => {
        btn.style.transform = 'scale(0.95)';
      });
      btn.addEventListener('touchend', () => {
        btn.style.transform = 'scale(1)';
      });
    }
  });
  
  // If there are music files, auto-load the first one
  if (musicFiles.length > 0) {
    playMusic(0);
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
  
  console.log("✅ Music Player with Synthesizer ready -", musicFiles.length, "tracks");
                                      }
