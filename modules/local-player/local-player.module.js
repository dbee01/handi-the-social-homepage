// modules/local-player/local-player.module.js

export default async function initLocalPlayer(container) {
  console.log("🎵 MUSIC PLAYER INIT - Container:", container);
  
  if (!container) {
    console.error("No container provided!");
    return;
  }
  
  // FORCE the parent dashboard-item to be visible
  const parentItem = container.closest('.dashboard-item');
  if (parentItem) {
    console.log("Found parent dashboard-item:", parentItem.id);
    parentItem.style.display = 'block';
    parentItem.style.visibility = 'visible';
    parentItem.style.opacity = '1';
  }
  
  // FORCE the container to be visible
  container.style.display = 'block';
  container.style.width = '100%';
  container.style.minHeight = '250px';
  container.style.backgroundColor = '#0a0a15';
  container.style.borderRadius = '8px';
  container.style.padding = '15px';
  container.style.margin = '0';
  container.style.boxSizing = 'border-box';
  
  // Clear any existing content
  container.innerHTML = '';
  
  // Check localStorage for music
  let musicFiles = [];
  let settings = null;
  
  try {
    const saved = localStorage.getItem('pleie_settings');
    console.log("localStorage pleie_settings:", saved ? "Found" : "Not found");
    
    if (saved) {
      settings = JSON.parse(saved);
      if (settings.musicPlayer && settings.musicPlayer.musicFiles) {
        musicFiles = settings.musicPlayer.musicFiles;
        console.log(`Found ${musicFiles.length} music files`);
      }
    }
  } catch(e) {
    console.error("Error reading settings:", e);
  }
  
  // Build HTML content
  let html = '';
  
  if (musicFiles.length === 0) {
    // No music - show setup instructions
    html = `
      <div style="text-align: center; padding: 40px 20px;">
        <i class="fa-solid fa-circle-info" style="font-size: 48px; color: #ffaa00; margin-bottom: 15px; display: block;"></i>
        <div style="color: #ffaa00; font-size: 18px; font-weight: bold; margin-bottom: 10px;">No Music Loaded</div>
        <div style="color: #888; font-size: 14px; line-height: 1.6; max-width: 300px; margin: 0 auto;">
          <p>📁 Click the <strong style="color: #00ff41;">⚙️ Settings Icon</strong> (bottom-right)</p>
          <p>🎵 Go to <strong style="color: #00ff41;">Music Player</strong> section</p>
          <p>📂 Click <strong style="color: #00ff41;">Select Music Folder</strong></p>
          <p>💾 Click <strong style="color: #00ff41;">Save All Settings</strong></p>
        </div>
        <div style="margin-top: 20px; padding: 10px; background: rgba(0,0,0,0.3); border-radius: 8px; font-size: 11px; color: #555;">
          <i class="fa-solid fa-database"></i> Storage: ${saved ? 'Settings found' : 'No settings'}
        </div>
      </div>
    `;
  } else {
    // Has music - show player
    html = `
      <div style="background: rgba(0,255,65,0.1); padding: 10px; border-radius: 8px; margin-bottom: 15px; text-align: center;">
        <i class="fa-solid fa-check-circle" style="color: #00ff41;"></i>
        <span style="color: #00ff41; margin-left: 8px;">${musicFiles.length} track${musicFiles.length !== 1 ? 's' : ''} loaded</span>
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
            transition: all 0.2s;
          ">
            <i class="fa-solid fa-music"></i>
            <span style="flex:1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(file.name)}</span>
            <i class="fa-solid fa-play" style="font-size: 12px; color: #00ff41;"></i>
          </div>
        `).join('')}
      </div>
      <div id="now-playing" style="margin-top: 15px; padding: 8px; background: rgba(0,0,0,0.3); border-radius: 6px; text-align: center; font-size: 12px; color: #888;">
        <i class="fa-solid fa-headphones"></i> Click a track to play
      </div>
    `;
  }
  
  container.innerHTML = html;
  
  // Add click handlers if music exists
  if (musicFiles.length > 0) {
    setTimeout(() => {
      document.querySelectorAll('.music-track').forEach(el => {
        el.addEventListener('click', async () => {
          const index = parseInt(el.dataset.index);
          const fileData = musicFiles[index];
          const nowPlayingDiv = document.getElementById('now-playing');
          
          if (nowPlayingDiv) {
            nowPlayingDiv.innerHTML = `<i class="fa-solid fa-play-circle"></i> Loading: ${escapeHtml(fileData.name)}...`;
            nowPlayingDiv.style.color = '#00ff41';
          }
          
          await playMusic(fileData, nowPlayingDiv);
        });
        
        // Hover effect
        el.addEventListener('mouseenter', () => {
          el.style.background = 'rgba(0,255,65,0.2)';
        });
        el.addEventListener('mouseleave', () => {
          el.style.background = 'rgba(0,0,0,0.3)';
        });
      });
    }, 10);
  }
  
  // Helper function to play music
  async function playMusic(fileData, statusDiv) {
    try {
      // Convert base64 to blob
      const binaryString = atob(fileData.data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      const blob = new Blob([bytes], { type: fileData.type || 'audio/mpeg' });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      
      audio.onplay = () => {
        if (statusDiv) {
          statusDiv.innerHTML = `<i class="fa-solid fa-play-circle"></i> Now Playing: ${escapeHtml(fileData.name)}`;
          statusDiv.style.color = '#00ff41';
        }
      };
      
      audio.onended = () => {
        if (statusDiv) {
          statusDiv.innerHTML = `<i class="fa-solid fa-headphones"></i> Playback finished`;
          statusDiv.style.color = '#888';
        }
        URL.revokeObjectURL(url);
      };
      
      audio.onerror = () => {
        if (statusDiv) {
          statusDiv.innerHTML = `<i class="fa-solid fa-exclamation-triangle"></i> Error playing: ${escapeHtml(fileData.name)}`;
          statusDiv.style.color = '#ff4444';
        }
      };
      
      await audio.play();
      
    } catch(e) {
      console.error("Play error:", e);
      if (statusDiv) {
        statusDiv.innerHTML = `<i class="fa-solid fa-exclamation-triangle"></i> Playback error: ${e.message}`;
        statusDiv.style.color = '#ff4444';
      }
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
  
  console.log("✅ Music Player mounted - Music files:", musicFiles.length);
}
