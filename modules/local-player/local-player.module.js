// modules/local-player/local-player.module.js

export default async function initLocalPlayer(container) {
  // container is the #music-player div inside the dashboard-item
  console.log("🎵 initLocalPlayer called with container:", container);
  
  if (!container) {
    console.error("No container provided");
    return;
  }
  
  // Clear only the module content, NOT the pin button
  container.innerHTML = '';
  
  // Make sure parent dashboard-item is visible
  const parentItem = container.closest('.dashboard-item');
  if (parentItem) {
    parentItem.style.display = 'block';
  }
  
  // Force container to be visible
  container.style.display = 'block';
  container.style.minHeight = '200px';
  container.style.width = '100%';
  
  // Add simple visible content - NO TITLE (already exists in HTML)
  const content = document.createElement('div');
  content.style.cssText = `
    padding: 20px;
    text-align: center;
    background: #0a0a15;
    border-radius: 8px;
  `;
  
  // Check for music in localStorage
  let hasMusic = false;
  let musicCount = 0;
  
  try {
    const saved = localStorage.getItem('pleie_settings');
    console.log("Settings from localStorage:", saved);
    
    if (saved) {
      const settings = JSON.parse(saved);
      if (settings.musicPlayer && settings.musicPlayer.musicFiles) {
        musicCount = settings.musicPlayer.musicFiles.length;
        hasMusic = musicCount > 0;
        console.log(`Found ${musicCount} music files`);
      }
    }
  } catch(e) {
    console.error("Error reading settings:", e);
  }
  
  if (hasMusic) {
    content.innerHTML = `
      <div style="color: #00ff41; font-size: 48px; margin-bottom: 10px;">
        <i class="fa-solid fa-check-circle"></i>
      </div>
      <div style="color: #00ff41; font-size: 18px; font-weight: bold; margin-bottom: 10px;">
        ${musicCount} Track${musicCount !== 1 ? 's' : ''} Ready
      </div>
      <div style="color: #888; font-size: 12px; margin-bottom: 20px;">
        Click a track below to play
      </div>
      <div id="music-playlist-placeholder" style="max-height: 150px; overflow-y: auto; margin-top: 15px;"></div>
    `;
    
    // Load playlist
    setTimeout(() => {
      const playlistDiv = document.getElementById('music-playlist-placeholder');
      if (playlistDiv && settings.musicPlayer.musicFiles) {
        playlistDiv.innerHTML = settings.musicPlayer.musicFiles.map((file, i) => `
          <div data-index="${i}" style="
            padding: 8px;
            margin: 5px 0;
            background: rgba(0,0,0,0.3);
            border-radius: 5px;
            cursor: pointer;
            color: #00ffff;
            text-align: left;
            font-size: 12px;
          ">
            <i class="fa-solid fa-music"></i> ${file.name}
          </div>
        `).join('');
        
        // Add click handlers
        playlistDiv.querySelectorAll('[data-index]').forEach(el => {
          el.onclick = () => {
            const idx = parseInt(el.dataset.index);
            const file = settings.musicPlayer.musicFiles[idx];
            playMusic(file);
          };
        });
      }
    }, 10);
  } else {
    content.innerHTML = `
      <div style="color: #ffaa00; font-size: 48px; margin-bottom: 10px;">
        <i class="fa-solid fa-circle-exclamation"></i>
      </div>
      <div style="color: #ffaa00; font-size: 16px; font-weight: bold; margin-bottom: 15px;">
        No Music Loaded
      </div>
      <div style="color: #888; font-size: 13px; line-height: 1.6;">
        <p>Click the <strong style="color: #00ff41;">⚙️ Gear Icon</strong> (bottom-right)</p>
        <p>Go to <strong style="color: #00ff41;">Music Player</strong> section</p>
        <p>Click <strong style="color: #00ff41;">Select Music Folder</strong></p>
        <p>Then click <strong style="color: #00ff41;">Save All Settings</strong></p>
      </div>
    `;
  }
  
  container.appendChild(content);
  
  // Helper function to play music
  function playMusic(fileData) {
    try {
      const binary = atob(fileData.data);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: fileData.type });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.play().catch(e => console.error("Play error:", e));
      
      // Show playing status
      const statusDiv = document.createElement('div');
      statusDiv.style.cssText = `
        position: fixed;
        bottom: 100px;
        right: 20px;
        background: #00ff41;
        color: #000;
        padding: 10px 15px;
        border-radius: 8px;
        z-index: 9999;
        font-size: 12px;
      `;
      statusDiv.innerHTML = `🎵 Playing: ${fileData.name}`;
      document.body.appendChild(statusDiv);
      setTimeout(() => statusDiv.remove(), 2000);
    } catch(e) {
      console.error("Play error:", e);
    }
  }
  
  console.log("✅ Music Player rendered");
}
