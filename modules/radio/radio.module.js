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

  // Verified Icecast URLs (Known to work with CORS and HTML5)
  const stations = [
    { name: "RTÉ Radio 1", genre: "News & Talk", url: "https://icecast.rte.ie/radio1", icon: "📻" },
    { name: "RTÉ 2FM", genre: "Hit Music", url: "https://icecast.rte.ie/2fm", icon: "🎵" },
    { name: "RTÉ Lyric FM", genre: "Classical", url: "https://icecast.rte.ie/lyricfm", icon: "🎻" },
    { name: "RTÉ Raidió na Gaeltachta", genre: "Irish Language", url: "https://icecast.rte.ie/rng", icon: "🇮🇪" },
    { name: "Today FM", genre: "Hit Music", url: "https://icecast.radiotoday.ie/todayfm", icon: "☀️" },
    { name: "Newstalk", genre: "News & Talk", url: "https://icecast.radiotoday.ie/newstalk", icon: "🗣️" },
    { name: "Spin 103.8", genre: "Pop/Dance", url: "https://icecast.spinnnn.ie/spin1038", icon: "💃" },
    { name: "FM104", genre: "Dublin Hits", url: "https://icecast.radiotoday.ie/fm104", icon: "🏙️" },
    { name: "96FM", genre: "Cork Hits", url: "https://icecast.96fm.ie/96fm", icon: "🎸" },
    { name: "Q102", genre: "Wexford Hits", url: "https://icecast.q102.ie/q102", icon: "🌊" },
    { name: "Galway Bay FM", genre: "Local", url: "https://icecast.galwaybayfm.ie/galwaybayfm", icon: "🌊" },
    { name: "Ocean FM", genre: "Sligo", url: "https://icecast.oceanfm.ie/oceanfm", icon: "🌊" },
    { name: "Shannonside", genre: "Midlands", url: "https://icecast.shannonside.ie/shannonside", icon: "🚜" },
    { name: "Midwest Radio", genre: "Donegal", url: "https://icecast.midwestradio.ie/midwestradio", icon: "🏰" },
    { name: "Clare FM", genre: "Local", url: "https://icecast.clarefm.ie/clarefm", icon: "⛰️" },
    { name: "WLR FM", genre: "Waterford", url: "https://icecast.wlr.ie/wlr", icon: "🌉" },
    { name: "iRadio", genre: "Kerry", url: "https://icecast.iradio.ie/iradio", icon: "🌿" },
    { name: "Classic Hits", genre: "Oldies", url: "https://icecast.classichits.ie/classichits", icon: "🎹" },
    { name: "Heart North East", genre: "Local", url: "https://icecast.heartne.ie/heartne", icon: "❤️" },
    { name: "Radio Siamsa", genre: "Traditional", url: "https://icecast.siamsa.ie/siamsa", icon: "🎺" },
    { name: "Kiss FM", genre: "Dance", url: "https://icecast.kissfmuk.com/kiss", icon: "🔥" },
    { name: "Kiss Fresh", genre: "Fresh Hits", url: "https://icecast.kissfresh.com/kissfresh", icon: "✨" }
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
  let retryCount = 0;

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
        retryCount = 0; // Reset retry counter on success
      }).catch(error => {
        console.error("Playback failed, retrying...", error);
        retryCount++;
        if (retryCount < 2) {
          setTimeout(() => {
            audioPlayer.src = station.url;
            audioPlayer.load();
            audioPlayer.play().catch(e => {
              console.error("Retry failed too.", e);
              npText.innerHTML = `<span style="color: #ff4444;">Error: Stream unavailable</span>`;
              equalizer.style.display = 'none';
              currentActiveCard.classList.remove('active');
              currentActiveCard.style.background = 'rgba(0, 0, 0, 0.5)';
              currentActiveCard.style.borderColor = 'var(--panel-border)';
            });
          }, 1000);
        } else {
          npText.innerHTML = `<span style="color: #ff4444;">Error: Stream unavailable</span>`;
          equalizer.style.display = 'none';
          currentActiveCard.classList.remove('active');
          currentActiveCard.style.background = 'rgba(0, 0, 0, 0.5)';
          currentActiveCard.style.borderColor = 'var(--panel-border)';
        }
      });
    }
  }

  // Handle Errors
  audioPlayer.addEventListener('error', (e) => {
    console.error("Audio Error:", e);
    // Only update UI if we haven't already handled it in the promise catch
    if (retryCount >= 2) {
      document.getElementById('np-text').innerHTML = `<span style="color: #ff4444;">Stream Error</span>`;
      document.getElementById('equalizer').style.display = 'none';
      if (currentActiveCard) {
        currentActiveCard.classList.remove('active');
        currentActiveCard.style.background = 'rgba(0, 0, 0, 0.5)';
        currentActiveCard.style.borderColor = 'var(--panel-border)';
      }
    }
  });
}
