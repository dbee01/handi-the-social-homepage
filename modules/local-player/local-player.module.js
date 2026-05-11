// modules/local-player/local-player.module.js

export default async function initLocalPlayer(container) {
  // DIRECT DOM MANIPULATION - NO EXCUSES
  if (!container) return;
  
  // NUKE IT
  container.innerHTML = '';
  
  // FORCE VISIBLE
  container.style.cssText = `
    display: block !important;
    visibility: visible !important;
    opacity: 1 !important;
    min-height: 300px !important;
    background: #0d0d1a !important;
    border: 2px solid #00ff41 !important;
    border-radius: 12px !important;
    margin: 10px !important;
    padding: 0 !important;
  `;
  
  // ADD CONTENT DIRECTLY
  const html = `
    <div style="background: #1a1a2e; padding: 12px 15px; border-bottom: 2px solid #00ff41; border-radius: 12px 12px 0 0;">
      <i class="fa-solid fa-music" style="color: #00ff41;"></i>
      <span style="color: #00ff41; font-weight: bold; margin-left: 8px;">Local Music Player</span>
    </div>
    <div style="padding: 40px 20px; text-align: center;">
      <i class="fa-solid fa-music" style="font-size: 48px; color: #666; display: block; margin-bottom: 15px;"></i>
      <div style="color: #00ff41; font-size: 18px; margin-bottom: 10px;">Music Player</div>
      <div style="color: #888; font-size: 14px; margin-bottom: 20px;">
        Click the <strong style="color: #ffaa00;">⚙️ Gear Icon</strong> (bottom right)<br>
        Go to <strong style="color: #00ff41;">Music Player</strong> section<br>
        Select your music folder and save
      </div>
      <div style="color: #ffaa00; font-size: 12px; background: rgba(255,170,0,0.1); padding: 10px; border-radius: 8px; display: inline-block;">
        <i class="fa-solid fa-info-circle"></i> No music loaded
      </div>
    </div>
  `;
  
  container.insertAdjacentHTML('beforeend', html);
  
  console.log('🎵 MUSIC PLAYER MOUNTED');
  console.log('Container width:', container.offsetWidth);
  console.log('Container height:', container.offsetHeight);
}
