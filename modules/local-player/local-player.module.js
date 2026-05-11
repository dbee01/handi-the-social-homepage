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
  container.style.minHeight = '250px';
  container.style.backgroundColor = '#0a0a15';
  container.style.borderRadius = '8px';
  container.style.padding = '15px';
  
  // Clear and add content
  container.innerHTML = `
    <div style="text-align: center; padding: 30px 20px;">
      <i class="fa-solid fa-music" style="font-size: 48px; color: #00ff41; margin-bottom: 15px; display: block;"></i>
      <div style="color: #00ff41; font-size: 18px; font-weight: bold; margin-bottom: 10px;">Music Player</div>
      <div style="color: #888; font-size: 14px; line-height: 1.6;">
        Click the <strong style="color: #ffaa00;">⚙️ Gear Icon</strong> (bottom-right)<br>
        Go to <strong style="color: #00ff41;">Music Player</strong> section<br>
        Select your music folder and save
      </div>
    </div>
  `;
  
  console.log("✅ Music Player rendered");
}
