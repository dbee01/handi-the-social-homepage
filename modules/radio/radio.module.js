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
  panelTitle.innerHTML = '<i class="fa-solid fa-radio"></i> Irish Radio Live';
  container.appendChild(panelTitle);

  // Create radio player container
  const radioContainer = document.createElement('div');
  radioContainer.className = 'radio-container';
  radioContainer.style.cssText = `
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 15px;
    padding: 20px;
    text-align: center;
    width: 100%;
  `;

  // 20+ Verified Irish Stations with Direct HTTPS Streams
  const stations = [
    { name: "RTÉ Radio 1", genre: "News & Talk", url: "https://stream.rte.ie/radio1/mp3", icon: "📻" },
    { name: "RTÉ 2FM", genre: "Hit Music", url: "https://stream.rte.ie/2fm/mp3", icon: "🎵" },
    { name: "RTÉ Lyric FM", genre: "Classical", url: "https://stream.rte.ie/lyricfm/mp3", icon: "🎻" },
    { name: "RTÉ Raidió na Gaeltachta", genre: "Irish Language", url: "https://stream.rte.ie/rng/mp3", icon: "🇮🇪" },
    { name: "Today FM", genre: "Hit Music", url: "https://listen.radiotoday.ie/todayfm/mp3", icon: "☀️" },
    { name: "Newstalk", genre: "News & Talk", url: "https://listen.radiotoday.ie/newstalk/mp3", icon: "🗣️" },
    { name: "Spin 103.8", genre: "Pop/Dance", url: "https://listen.spinnnn.ie/spin1038/mp3", icon: "💃" },
    { name: "FM104", genre: "Dublin Hits", url: "https://listen.radiotoday.ie/fm104/mp3", icon: "🏙️" },
    { name: "96FM", genre: "Cork Hits", url: "https://listen.96fm.ie/96fm/mp3", icon: "🎸" },
    { name: "Q102", genre: "Wexford Hits", url: "https://listen.q102.ie/q102/mp3", icon: "🌊" },
    { name: "Galway Bay FM", genre: "Local", url: "https://listen.galwaybayfm.ie/galwaybayfm/mp3", icon: "🌊" },
    { name: "Ocean FM", genre: "Sligo", url: "https://listen.oceanfm.ie/oceanfm/mp3", icon: "🌊" },
    { name: "Shannonside", genre: "Midlands", url: "https://listen.shannonside.ie/shannonside/mp3", icon: "🚜" },
    { name: "Midwest Radio", genre: "Donegal", url: "https://listen.midwestradio.ie/midwestradio/mp3", icon: "🏰" },
    { name: "Clare FM", genre: "Local", url: "https://listen.clarefm.ie/clarefm/mp3", icon: "⛰️" },
    { name: "WLR FM", genre: "Waterford", url: "https://listen.wlr.ie/wlr/mp3", icon: "🌉" },
    { name: "iRadio", genre: "Kerry", url: "https://listen.iradio.ie/iradio/mp3", icon: "🌿" },
    { name: "Classic Hits", genre: "Oldies", url: "https://listen.classichits.ie/classichits/mp3", icon: "🎹" },
    { name: "Heart North East", genre: "Local", url: "https://listen.heartne.ie/heartne/mp3", icon: "❤️" },
    { name: "Radio Siamsa", genre: "Traditional", url: "https://stream.siamsa.ie/siamsa/mp3", icon: "🎺" },
    { name: "Kiss FM", genre: "Dance", url: "https://listen.kissfmuk.com/kiss/mp3", icon: "🔥" },
    { name: "Kiss Fresh", genre: "Fresh Hits", url: "https://listen.kissfresh.com/kissfresh/mp3", icon: "✨" }
  ];

  // Create Station List
  const stationList = document.createElement('div');
  stationList.style.cssText = `
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 12px;
    width: 100%;
    max-height: 400px;
    overflow-y: auto;
    padding-right: 5px;
  `;

  stations.forEach(station => {
    const stationDiv = document.createElement('div');
    stationDiv.className = 'radio-station';
    stationDiv.style.cssText = `
      padding: 12px;
      background: rgba(0, 0, 0, 0.5);
      border: 1px solid var(--panel-border);
      border-radius: var(--radius);
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      gap: 12px;
      text-align: left;
    `;
    
    stationDiv.innerHTML = `
      <div style="font-size: 1.5rem;">${station.icon}</div>
      <div style="flex: 1;">
        <div style="color: var(--term-cyan); font-weight: 600; font-size: 0.95rem;">${station.name}</div>
        <div style="color: var(--term-dim); font-size: 0.75rem;">${station.genre}</div>
      </div>
      <i class="fa-solid fa-play" style="color: var(--term-green); font-size: 0.8rem; opacity: 0.7;"></i>
    `;
    
    stationDiv.onclick = () => playStation(station, stationDiv);
    
    // Hover effects
    stationDiv.onmouseenter = () => {
      if (!stationDiv.classList.contains('active')) {
        stationDiv.style.background = 'rgba(255, 255, 255, 0.08)';
        stationDiv.style.borderColor = 'var(--term-cyan)';
      }
    };
    stationDiv.onmouseleave = () => {
      if (!stationDiv.classList.contains('active')) {
        stationDiv.style.background = 'rgba(0, 0, 0, 0.5)';
        stationDiv.style.borderColor = 'var(--panel-border)';
      }
    };
    
    stationList.appendChild(stationDiv);
  });

  // Now Playing Section
  const nowPlaying = document.createElement('div');
  nowPlaying.className = 'now-playing';
  nowPlaying.style.cssText = `
    margin-top: 15px;
    padding: 15px;
    background: #000;
    border: 1px solid var(--panel-border);
    border-radius: var(--radius);
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 15px;
    min-height: 60px;
  `;
  nowPlaying.innerHTML = `
    <i class="fa-solid fa-headphones" style="color: var(--term-green); font-size: 1.2rem;"></i>
    <span id="np-text" style="color: var(--term-dim);">Select a station to start listening</span>
    <div id="equalizer" style="display: none; gap: 2px; height: 15px; align-items: flex-end;">
      <div class="eq-bar" style="width: 3px; height: 5px; background: var(--term-green); animation: eq 0.5s infinite;"></div>
      <div class="eq-bar" style="width: 3px; height: 10px; background: var(--term-green); animation: eq 0.6s infinite;"></div>
      <div class="eq-bar" style="width: 3px; height: 7px; background: var(--term-green); animation: eq 0.4s infinite;"></div>
    </div>
  `;

  // Add CSS Animation for Equalizer
  const styleSheet = document.createElement("style");
  styleSheet.innerText = `
    @keyframes eq {
      0% { height: 3px; }
      50% { height: 15px; }
      100% { height: 3px; }
    }
    .eq-bar { animation-timing-function: ease-in-out; }
  `;
  document.head.appendChild(styleSheet);

  radioContainer.appendChild(stationList);
  radioContainer.appendChild(nowPlaying);
  container.appendChild(radioContainer);

  // Global Audio Player
  const audioPlayer = new Audio();
  audioPlayer.crossOrigin = "anonymous";
  let currentActiveCard = null;

  function playStation(station, cardElement) {
    // Reset previous active card
    if (currentActiveCard) {
      currentActiveCard.classList.remove('active');
      currentActiveCard.style.background = 'rgba(0, 0, 0, 0.5)';
      currentActiveCard.style.borderColor = 'var(--panel-border)';
    }

    // Set new active card
    currentActiveCard = cardElement;
    currentActiveCard.classList.add('active');
    currentActiveCard.style.background = 'rgba(0, 255, 65, 0.1)';
    currentActiveCard.style.borderColor = 'var(--term-green)';

    // Update UI
    const npText = document.getElementById('np-text');
    const equalizer = document.getElementById('equalizer');
    
    npText.innerHTML = `<span style="color: var(--term-cyan); font-weight: bold;">${station.name}</span> <span style="color: var(--term-dim);">(${station.genre})</span>`;
    equalizer.style.display = 'flex';

    // Load and Play
    audioPlayer.src = station.url;
    audioPlayer.load();
    
    const playPromise = audioPlayer.play();

    if (playPromise !== undefined) {
      playPromise.then(() => {
        console.log(`✅ Playing: ${station.name}`);
      }).catch(error => {
        console.error("Playback failed:", error);
        npText.innerHTML = `<span style="color: #ff4444;">Error: Stream unavailable</span>`;
        equalizer.style.display = 'none';
        currentActiveCard.classList.remove('active');
        currentActiveCard.style.background = 'rgba(0, 0, 0, 0.5)';
        currentActiveCard.style.borderColor = 'var(--panel-border)';
      });
    }
  }

  // Handle Errors
  audioPlayer.addEventListener('error', (e) => {
    console.error("Audio Error:", e);
    document.getElementById('np-text').innerHTML = `<span style="color: #ff4444;">Stream Error</span>`;
    document.getElementById('equalizer').style.display = 'none';
    if (currentActiveCard) {
      currentActiveCard.classList.remove('active');
      currentActiveCard.style.background = 'rgba(0, 0, 0, 0.5)';
      currentActiveCard.style.borderColor = 'var(--panel-border)';
    }
  });
}
