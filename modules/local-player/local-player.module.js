// modules/local-player/local-player.module.js

export default async function initLocalPlayer(container) {
  console.log("🎵 initLocalPlayer called");
  console.log("Container element:", container);
  console.log("Container ID:", container?.id);
  
  if (!container) return;
  
  // DON'T clear the container completely - just add content
  // But first, add a red border so we can SEE it
  container.style.border = "3px solid #ff0000";
  container.style.minHeight = "200px";
  container.style.backgroundColor = "#0a0a15";
  container.style.padding = "15px";
  container.style.display = "block";
  
  // Add simple content that will definitely show
  container.innerHTML = `
    <div style="color: #00ff41; font-family: monospace; text-align: center; padding: 20px;">
      <h2 style="color: #00ff41;">🎵 MUSIC PLAYER</h2>
      <p style="color: #fff;">Module is loaded and working!</p>
      <p style="color: #ffaa00; margin-top: 10px;">
        ⚙️ Configure in Settings (gear icon bottom-right)
      </p>
    </div>
  `;
  
  console.log("✅ Music Player content added");
}
