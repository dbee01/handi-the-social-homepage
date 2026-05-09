// modules/radio/radio.module.js

export default async function initRadio(container) {
  if (!container) {
    console.error("Radio Module: Container not found");
    return;
  }

  // --- PRESERVE PIN BUTTON ---
  const pinBtn = container.querySelector('.pin-btn');
  container.innerHTML = '';
  if (pinBtn) container.prepend(pinBtn);
  // ---------------------------

  // Add panel title
  const panelTitle = document.createElement('div');
  panelTitle.className = 'panel-title';
  panelTitle.innerHTML = '<i class="fa-solid fa-radio"></i> Irish Radio';
  container.appendChild(panelTitle);

  // Create radio player container
  const radioContainer = document.createElement('div');
  radioContainer.className = 'radio-container';
  radioContainer.style.cssText = `
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 20px;
    padding: 20px;
    text-align: center;
  `;

  // Add radio stations list
  const stations = [
    { name: "RTE 2FM", url: "https://irishradiolive.com/rte-2fm#server908", img: "https://irishradiolive.com/public/img/launcher/logo_96.png" },
    { name: "RTE Radio 1", url: "https://irishradiolive.com/rte-radio-1#server908", img: "https://irishradiolive.com/public/img/launcher/logo_96.png" },
    { name: "Today FM", url: "https://irishradiolive.com/today-fm#server908", img: "https://irishradiolive.com/public/img/launcher/logo_96.png" },
    { name: "Newstalk", url: "https://irishradiolive.com/newstalk#server908", img: "https://irishradiolive.com/public/img/launcher/logo_96.png" }
  ];

  stations.forEach(station => {
    const stationDiv = document.createElement('div');
    stationDiv.className = 'radio-station';
    stationDiv.style.cssText = `
      padding: 15px;
      background: rgba(0, 0, 0, 0.5);
      border: 1px solid var(--panel-border);
      border-radius: var(--radius);
      cursor: pointer;
      transition: all 0.3s;
      width: 100%;
    `;
    
    stationDiv.innerHTML = `
      <div style="display: flex; align-items: center; gap: 15px;">
        <img src="${station.img}" alt="${station.name}" style="width: 48px; height: 48px;">
        <div style="flex: 1; text-align: left;">
          <h3 style="color: var(--term-cyan); margin-bottom: 5px;">${station.name}</h3>
          <p style="color: var(--term-dim); font-size: 0.8rem;">Click to play</p>
        </div>
        <i class="fa-solid fa-play" style="color: var(--term-green); font-size: 1.2rem;"></i>
      </div>
    `;
    
    stationDiv.onclick = () => {
      // Remove active class from all stations
      const allStations = document.querySelectorAll('.radio-station');
      allStations.forEach(s => {
        s.style.background = 'rgba(0, 0, 0, 0.5)';
        s.style.borderColor = 'var(--panel-border)';
      });
      // Highlight selected station
      stationDiv.style.background = 'rgba(0, 255, 65, 0.1)';
      stationDiv.style.borderColor = 'var(--term-green)';
      
      // Update now playing text
      const nowPlayingDiv = document.querySelector('.now-playing');
      if (nowPlayingDiv) {
        nowPlayingDiv.innerHTML = `
          <i class="fa-solid fa-headphones" style="color: var(--term-green); margin-right: 10px;"></i>
          <span style="color: var(--term-cyan);">Now Playing: ${station.name}</span>
          <br>
          <small style="color: var(--term-dim);">Radio popup opened</small>
        `;
      }
      
      // Open radio popup
      window.open(station.url, 'radioPlayer', 'width=400,height=600,resizable=yes,scrollbars=yes');
    };
    
    stationDiv.onmouseenter = () => {
      if (!stationDiv.style.background.includes('rgba(0, 255, 65')) {
        stationDiv.style.background = 'rgba(255, 255, 255, 0.05)';
      }
    };
    
    stationDiv.onmouseleave = () => {
      if (!stationDiv.style.background.includes('rgba(0, 255, 65')) {
        stationDiv.style.background = 'rgba(0, 0, 0, 0.5)';
      }
    };
    
    radioContainer.appendChild(stationDiv);
  });

  // Add now playing section
  const nowPlaying = document.createElement('div');
  nowPlaying.className = 'now-playing';
  nowPlaying.style.cssText = `
    margin-top: 20px;
    padding: 15px;
    background: #000;
    border: 1px solid var(--panel-border);
    border-radius: var(--radius);
    width: 100%;
    text-align: center;
  `;
  nowPlaying.innerHTML = `
    <i class="fa-solid fa-headphones" style="color: var(--term-green); margin-right: 10px;"></i>
    <span style="color: var(--term-dim);">Select a station to start listening</span>
  `;
  radioContainer.appendChild(nowPlaying);

  container.appendChild(radioContainer);

  // Load the radio player script (only once)
  if (!document.querySelector('#radio-player-script')) {
    const script = document.createElement('script');
    script.id = 'radio-player-script';
    script.src = 'https://irishradiolive.com/public/jsv260507210358/jquery.embed-popup-player.js';
    script.async = true;
    script.onload = () => {
      console.log('✅ Radio player script loaded');
    };
    script.onerror = () => {
      console.error('❌ Failed to load radio player script');
    };
    document.head.appendChild(script);
  }
}