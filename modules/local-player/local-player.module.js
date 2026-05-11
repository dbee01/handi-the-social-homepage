// modules/local-player/local-player.module.js

export default async function initLocalPlayer(container) {
  console.log("🎵 MUSIC PLAYER INIT", container);
  
  if (!container) return;
  
  // Make the parent dashboard-item visible
  const dashboardItem = container.closest('.dashboard-item');
  if (dashboardItem) {
    dashboardItem.style.display = 'block !important';
    dashboardItem.style.visibility = 'visible';
  }
  
  // Clear container
  container.innerHTML = '';
  container.style.display = 'block';
  container.style.minHeight = '200px';
  
  // Check if music exists in settings
  let musicFiles = [];
  try {
    const saved = localStorage.getItem('pleie_settings');
    if (saved) {
      const settings = JSON.parse(saved);
      if (settings.musicPlayer && settings.musicPlayer.musicFiles) {
        musicFiles = settings.musicPlayer.musicFiles;
        console.log(`Found ${musicFiles.length} music files`);
      }
    }
  } catch(e) {
    console.error('Error loading music:', e);
  }
  
  // Build content based on whether music exists
  if (musicFiles.length === 0) {
    // Show setup message
    container.innerHTML = `
      <div style="padding: 30px 20px; text-align: center;">
        <i class="fa-solid fa-circle-info" style="font-size: 48px; color: #ffaa00; margin-bottom: 15px; display: block;"></i>
        <div style="color: #ffaa00; font-size: 16px; margin-bottom: 10px;">No Music Loaded</div>
        <div style="color: #888; font-size: 13px; line-height: 1.6;">
          <p>Click the <strong style="color: #00ff41;">⚙️ Settings Icon</strong> (bottom-right)</p>
          <p>Go to <strong style="color: #00ff41;">Music Player</strong> section</p>
          <p>Select your music folder and save</p>
        </div>
      </div>
    `;
  } else {
    // Show music player
    container.innerHTML = `
      <div style="padding: 15px;">
        <div style="background: rgba(0,255,65,0.1); padding: 10px; border-radius: 8px; margin-bottom: 15px; text-align: center;">
          <i class="fa-solid fa-check-circle" style="color: #00ff41;"></i>
          <span style="color: #00ff41; margin-left: 8px;">${musicFiles.length} tracks loaded</span>
        </div>
        <div id="music-playlist" style="max-height: 200px; overflow-y: auto;">
          ${musicFiles.map((file, i) => `
            <div class="music-track" data-index="${i}" style="
              padding: 10px;
              margin: 5px 0;
              background: rgba(0,0,0,0.3);
              border-radius: 6px;
              cursor: pointer;
              color: #00ffff;
              display: flex;
              align-items: center;
              gap: 10px;
            ">
              <i class="fa-solid fa-music"></i>
              <span style="flex:1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(file.name)}</span>
              <i class="fa-solid fa-play" style="font-size: 12px; color: #00ff41;"></i>
            </div>
          `).join('')}
        </div>
      </div>
    `;
    
    // Add click handlers
    setTimeout(() => {
      document.querySelectorAll('.music-track').forEach(el => {
        el.addEventListener('click', () => {
          const index = parseInt(el.dataset.index);
          playMusic(musicFiles[index]);
        });
      });
    }, 10);
  }
  
  function playMusic(fileData) {
    try {
      // Convert base64 to blob
      const binary = atob(fileData.data);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: fileData.type || 'audio/mpeg' });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.play();
      
      // Show now playing
      const nowPlaying = document.createElement('div');
      nowPlaying.style.cssText = `
        position: fixed;
        bottom: 80px;
        right: 20px;
        background: #00ff41;
        color: #000;
        padding: 8px 15px;
        border-radius: 20px;
        z-index: 10000;
        font-size: 12px;
        font-weight: bold;
      `;
      nowPlaying.innerHTML = `🎵 Playing: ${fileData.name}`;
      document.body.appendChild(nowPlaying);
      setTimeout(() => nowPlaying.remove(), 2000);
    } catch(e) {
      console.error('Play error:', e);
    }
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
  
  console.log("✅ Music Player ready", musicFiles.length ? `${musicFiles.length} tracks` : 'awaiting setup');
}
