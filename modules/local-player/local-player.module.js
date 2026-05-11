// modules/local-player/local-player.module.js

export default async function initLocalPlayer(container) {
  console.log("🔊 MUSIC PLAYER LOADING...");
  
  if (!container) {
    console.error("No container!");
    return;
  }

  // Make container visible
  container.style.display = "block";
  container.style.backgroundColor = "#0a0a15";
  container.style.border = "2px solid #00ff41";
  container.style.borderRadius = "10px";
  container.style.padding = "0";
  container.style.margin = "10px";
  container.style.minHeight = "300px";
  
  // Clear and add content
  container.innerHTML = "";
  
  // Title bar
  const title = document.createElement("div");
  title.style.cssText = `
    background: #1a1a2e;
    padding: 12px 15px;
    border-bottom: 2px solid #00ff41;
    color: #00ff41;
    font-weight: bold;
    font-family: monospace;
  `;
  title.innerHTML = '<i class="fa-solid fa-music"></i> Local Music Player';
  container.appendChild(title);
  
  // Content area
  const content = document.createElement("div");
  content.style.cssText = `
    padding: 30px 20px;
    text-align: center;
    color: #ccc;
    font-family: monospace;
  `;
  
  // Check what's in localStorage
  let settings = null;
  let musicFiles = [];
  
  try {
    const saved = localStorage.getItem('pleie_settings');
    console.log("Raw settings from localStorage:", saved);
    
    if (saved) {
      settings = JSON.parse(saved);
      console.log("Parsed settings:", settings);
      
      if (settings.musicPlayer && settings.musicPlayer.musicFiles) {
        musicFiles = settings.musicPlayer.musicFiles;
        console.log("Found music files:", musicFiles.length);
      } else {
        console.log("No musicPlayer.musicFiles found");
      }
    } else {
      console.log("No pleie_settings found in localStorage");
    }
  } catch(e) {
    console.error("Error reading settings:", e);
  }
  
  // Build content based on what we found
  if (musicFiles.length > 0) {
    content.innerHTML = `
      <div style="color: #00ff41; font-size: 48px; margin-bottom: 15px;">
        <i class="fa-solid fa-check-circle"></i>
      </div>
      <div style="font-size: 18px; color: #00ff41; margin-bottom: 10px;">
        ${musicFiles.length} Track${musicFiles.length !== 1 ? 's' : ''} Loaded!
      </div>
      <div style="color: #888; font-size: 12px; margin-bottom: 20px;">
        ${musicFiles.map(f => f.name).slice(0, 3).join(', ')}${musicFiles.length > 3 ? '...' : ''}
      </div>
      <div style="margin-top: 20px;">
        <button id="debug-play-btn" style="background: #00ff41; color: #000; border: none; padding: 10px 25px; border-radius: 20px; font-weight: bold; cursor: pointer;">
          <i class="fa-solid fa-play"></i> Play First Track
        </button>
      </div>
    `;
  } else {
    content.innerHTML = `
      <div style="color: #ffaa00; font-size: 48px; margin-bottom: 15px;">
        <i class="fa-solid fa-circle-exclamation"></i>
      </div>
      <div style="font-size: 18px; color: #ffaa00; margin-bottom: 10px;">
        No Music Loaded
      </div>
      <div style="color: #888; font-size: 14px; max-width: 300px; margin: 0 auto;">
        <p>Click the <strong style="color: #00ff41;">⚙️ Gear Icon</strong> in the bottom-right corner</p>
        <p>Go to <strong style="color: #00ff41;">Music Player</strong> section</p>
        <p>Click <strong style="color: #00ff41;">Select Music Folder</strong> and choose your folder</p>
        <p>Then click <strong style="color: #00ff41;">Save All Settings</strong></p>
      </div>
      <div style="margin-top: 20px; padding: 10px; background: #1a1a2e; border-radius: 8px; font-size: 11px; color: #666;">
        <i class="fa-solid fa-database"></i> localStorage check: ${saved ? 'Settings found' : 'No settings'}
      </div>
    `;
  }
  
  container.appendChild(content);
  
  // Add debug button handler
  setTimeout(() => {
    const playBtn = document.getElementById('debug-play-btn');
    if (playBtn && musicFiles.length > 0) {
      playBtn.onclick = () => {
        const firstFile = musicFiles[0];
        console.log("Playing:", firstFile.name);
        
        // Convert base64 back to blob
        const byteCharacters = atob(firstFile.data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: firstFile.type });
        const url = URL.createObjectURL(blob);
        
        const audio = new Audio(url);
        audio.play().catch(e => console.error("Play error:", e));
        
        playBtn.innerHTML = '<i class="fa-solid fa-headphones"></i> Playing...';
        setTimeout(() => {
          playBtn.innerHTML = '<i class="fa-solid fa-play"></i> Play First Track';
        }, 3000);
      };
    }
  }, 100);
  
  console.log("✅ Music Player rendered");
}
