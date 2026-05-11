// modules/local-player/local-player.module.js

import { loadMusicFiles } from '../../js/storage.js';

export default async function initLocalPlayer(container) {
  console.log("🎵 MUSIC PLAYER INIT");
  
  if (!container) return;
  
  const parentItem = container.closest('.dashboard-item');
  if (parentItem) parentItem.style.display = 'block';
  
  container.innerHTML = '';
  container.style.cssText = `
    display: block;
    min-height: 400px;
    background: #0a0a15;
    border-radius: 12px;
    padding: 15px;
    width: 100%;
    max-width: 420px;
    margin: 0 auto;
    box-sizing: border-box;
  `;
  
  // Load music
  let musicFiles = [];
  let currentAudio = null;
  let currentIndex = -1;
  let isPlaying = false;
  let currentVolume = 70;
  
  try {
    musicFiles = await loadMusicFiles();
    console.log(`Loaded ${musicFiles.length} tracks`);
  } catch(e) {
    console.error("Error loading music:", e);
  }
  
  // Build UI
  container.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 12px;">
      <div id="nowPlaying" style="background: #1a1a2e; border-radius: 8px; padding: 12px; text-align: center; border: 1px solid #00ff41;">
        <div id="trackName" style="color: #00ff41; font-weight: bold; margin-bottom: 5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
          ${musicFiles.length > 0 ? escapeHtml(musicFiles[0].name) : 'No tracks'}
        </div>
        <div id="trackStatus" style="color: #888; font-size: 0.75rem;">${musicFiles.length > 0 ? 'Ready' : 'Select folder in Settings'}</div>
      </div>
      
      <div style="display: flex; justify-content: center; gap: 20px; padding: 10px;">
        <button id="btnPrev" style="background: #1f1f1f; border: none; color: #00ffff; font-size: 1.2rem; cursor: pointer; width: 45px; height: 45px; border-radius: 50%;">⏮</button>
        <button id="btnPlay" style="background: #00ff41; border: none; color: #000; font-size: 1.3rem; cursor: pointer; width: 55px; height: 55px; border-radius: 50%;">▶</button>
        <button id="btnNext" style="background: #1f1f1f; border: none; color: #00ffff; font-size: 1.2rem; cursor: pointer; width: 45px; height: 45px; border-radius: 50%;">⏭</button>
      </div>
      
      <div style="display: flex; align-items: center; gap: 10px; padding: 5px 10px; background: #1a1a2e; border-radius: 20px;">
        <i class="fa-solid fa-volume-down" style="color: #888; font-size: 0.8rem;"></i>
        <input type="range" id="volumeSlider" min="0" max="100" value="${currentVolume}" style="flex:1; height: 3px;">
        <span id="volumeValue" style="color: #00ff41; font-size: 0.7rem;">${currentVolume}%</span>
      </div>
      
      <div style="background: #1a1a2e; border-radius: 8px; max-height: 150px; overflow-y: auto;">
        <div style="padding: 8px; background: #0f0f0f; color: #00ff41; font-size: 0.75rem;">Playlist (${musicFiles.length})</div>
        <div id="playlist">
          ${musicFiles.map((file, i) => `
            <div class="track-item" data-index="${i}" style="padding: 8px; cursor: pointer; border-bottom: 1px solid #222; color: #00ffff; font-size: 0.8rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
              🎵 ${escapeHtml(file.name)}
            </div>
          `).join('') || '<div style="padding: 20px; text-align: center; color: #666;">No music loaded</div>'}
        </div>
      </div>
    </div>
  `;
  
  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));
  }
  
  // Get elements
  const playBtn = document.getElementById('btnPlay');
  const prevBtn = document.getElementById('btnPrev');
  const nextBtn = document.getElementById('btnNext');
  const volumeSlider = document.getElementById('volumeSlider');
  const volumeValue = document.getElementById('volumeValue');
  const trackName = document.getElementById('trackName');
  const trackStatus = document.getElementById('trackStatus');
  
  // Play function
  async function playTrack(index) {
    if (!musicFiles.length || index < 0 || index >= musicFiles.length) return;
    
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.src = '';
    }
    
    currentIndex = index;
    const track = musicFiles[currentIndex];
    trackName.textContent = track.name;
    trackStatus.textContent = 'Loading...';
    
    try {
      const url = URL.createObjectURL(track.file);
      currentAudio = new Audio(url);
      currentAudio.volume = currentVolume / 100;
      
      currentAudio.oncanplay = () => {
        trackStatus.textContent = 'Ready';
      };
      
      currentAudio.onplay = () => {
        isPlaying = true;
        playBtn.innerHTML = '⏸';
        trackStatus.textContent = 'Playing';
      };
      
      currentAudio.onpause = () => {
        isPlaying = false;
        playBtn.innerHTML = '▶';
        trackStatus.textContent = 'Paused';
      };
      
      currentAudio.onended = () => {
        playNext();
      };
      
      currentAudio.onerror = (e) => {
        console.error('Audio error:', e);
        trackStatus.textContent = 'Error';
        isPlaying = false;
        playBtn.innerHTML = '▶';
      };
      
      await currentAudio.play();
      
      // Highlight current track
      document.querySelectorAll('.track-item').forEach((item, i) => {
        item.style.background = i === currentIndex ? 'rgba(0,255,65,0.1)' : '';
        item.style.borderLeft = i === currentIndex ? '3px solid #00ff41' : '';
      });
      
    } catch(e) {
      console.error('Play error:', e);
      trackStatus.textContent = 'Cannot play';
      isPlaying = false;
      playBtn.innerHTML = '▶';
    }
  }
  
  function playNext() {
    if (!musicFiles.length) return;
    let next = (currentIndex + 1) % musicFiles.length;
    playTrack(next);
  }
  
  function playPrev() {
    if (!musicFiles.length) return;
    let prev = (currentIndex - 1 + musicFiles.length) % musicFiles.length;
    playTrack(prev);
  }
  
  // Event listeners
  playBtn.onclick = () => {
    if (!currentAudio) {
      playTrack(0);
    } else if (isPlaying) {
      currentAudio.pause();
    } else {
      currentAudio.play();
    }
  };
  
  prevBtn.onclick = playPrev;
  nextBtn.onclick = playNext;
  
  volumeSlider.oninput = (e) => {
    currentVolume = e.target.value;
    volumeValue.textContent = currentVolume + '%';
    if (currentAudio) currentAudio.volume = currentVolume / 100;
  };
  
  document.querySelectorAll('.track-item').forEach(item => {
    item.onclick = () => playTrack(parseInt(item.dataset.index));
  });
  
  // Cleanup
  window.addEventListener('beforeunload', () => {
    if (currentAudio) currentAudio.pause();
  });
  
  console.log(`✅ Music Player ready`);
}