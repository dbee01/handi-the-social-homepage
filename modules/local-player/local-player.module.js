// modules/local-player/local-player.module.js

export default async function initLocalPlayer(container) {
  console.log("=== MUSIC PLAYER INITIALIZING ===");
  
  if (!container) {
    console.error("Music Player: Container not found");
    return;
  }

  // FORCE container to be visible
  container.style.display = "block";
  container.style.minHeight = "350px";
  container.style.backgroundColor = "#0d0d1a";
  container.style.borderRadius = "12px";
  container.style.padding = "0";
  container.style.margin = "10px 0";
  
  // Clear everything
  container.innerHTML = "";
  
  // Add PIN button preservation if needed
  const parentItem = container.closest('.dashboard-item');
  let existingPinBtn = null;
  if (parentItem) {
    existingPinBtn = parentItem.querySelector('.pin-btn');
  }
  
  // ========== BUILD MUSIC PLAYER UI ==========
  
  // Panel Title
  const panelTitle = document.createElement("div");
  panelTitle.style.cssText = `
    padding: 12px 15px;
    background: linear-gradient(135deg, #1a1a2e, #0d0d1a);
    border-bottom: 2px solid #00ff41;
    border-radius: 12px 12px 0 0;
    font-size: 1.1rem;
    font-weight: bold;
    color: #00ff41;
    font-family: monospace;
  `;
  panelTitle.innerHTML = '<i class="fa-solid fa-music"></i> Local Music Player';
  container.appendChild(panelTitle);
  
  // Content Area
  const contentArea = document.createElement("div");
  contentArea.style.cssText = `
    padding: 20px;
    background: rgba(0,0,0,0.3);
    min-height: 280px;
    border-radius: 0 0 12px 12px;
  `;
  
  // Check for music in settings
  let hasMusic = false;
  let musicCount = 0;
  
  try {
    const saved = localStorage.getItem('pleie_settings');
    if (saved) {
      const settings = JSON.parse(saved);
      if (settings.musicPlayer && settings.musicPlayer.musicFiles) {
        musicCount = settings.musicPlayer.musicFiles.length;
        hasMusic = musicCount > 0;
      }
    }
  } catch(e) {
    console.error("Error reading settings:", e);
  }
  
  if (hasMusic) {
    // Show music player controls
    contentArea.innerHTML = `
      <div style="text-align: center; padding: 20px;">
        <i class="fa-solid fa-check-circle" style="font-size: 48px; color: #00ff41;"></i>
        <h3 style="color: #00ff41; margin: 15px 0;">${musicCount} Tracks Loaded</h3>
        <p style="color: #888;">Music files found! Click play to start.</p>
        <div style="margin: 20px 0;">
          <button id="test-play-btn" style="background: #00ff41; color: #000; border: none; padding: 10px 30px; border-radius: 25px; font-weight: bold; cursor: pointer;">
            <i class="fa-solid fa-play"></i> PLAY MUSIC
          </button>
        </div>
        <p style="color: #666; font-size: 12px;">Full player controls will appear here</p>
      </div>
    `;
  } else {
    // Show setup message
    contentArea.innerHTML = `
      <div style="text-align: center; padding: 40px 20px;">
        <i class="fa-solid fa-music" style="font-size: 64px; color: #666;"></i>
        <h3 style="color: #00ff41; margin: 20px 0;">Music Player</h3>
        <div style="background: rgba(255,170,0,0.1); border-left: 3px solid #ffaa00; padding: 15px; margin: 20px 0; text-align: left;">
          <i class="fa-solid fa-gear" style="color: #ffaa00;"></i>
          <strong style="color: #ffaa00;"> No music loaded</strong>
          <p style="color: #888; margin-top: 10px; font-size: 14px;">
            Click the <strong style="color: #00ff41;">gear icon</strong> in the bottom-right corner,<br>
            go to <strong style="color: #00ff41;">Music Player</strong> section, and select your music folder.
          </p>
        </div>
        <p style="color: #666; font-size: 12px; margin-top: 20px;">
          <i class="fa-solid fa-info-circle"></i> Supports MP3, WAV, OGG, FLAC, M4A
        </p>
      </div>
    `;
  }
  
  container.appendChild(contentArea);
  
  console.log("=== MUSIC PLAYER RENDERED ===");
  console.log("Has music:", hasMusic, "Count:", musicCount);
}
