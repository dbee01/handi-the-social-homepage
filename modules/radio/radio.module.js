/*
 * Copyright (c) 2026 Handi Homepage
 * This file is part of HandiHomepage and is released under the GNU General Public License v3.0.
 * See the LICENSE file in the repository root for full details.
 */
// modules/radio/radio.module.js – international radio stations with country filter
import { loadSettings } from "../../js/core/settings.js";

export default async function initRadio(container) {
  // International radio stations with country flags
  const STATIONS = [
    // Ireland
    {
      flag: "🇮🇪",
      name: "RTÉ Radio 1",
      url: "https://25553.live.streamtheworld.com/RTE_1_INT.mp3?tdsdk=rte",
    },
    { flag: "🇮🇪", name: "Today FM", url: "https://edgex.audioxi.com/TD" },
    { flag: "🇮🇪", name: "Newstalk", url: "https://edgex.audioxi.com/NT" },
    {
      flag: "🇮🇪",
      name: "RTÉ Lyric FM",
      url: "https://29083.live.streamtheworld.com/RTE_LYRIC_FM.mp3?tdsdk=rte",
    },
    {
      flag: "🇮🇪",
      name: "RTÉ 2FM",
      url: "https://27793.live.streamtheworld.com/RTE_2FM_INT.mp3?tdsdk=rte",
    },
    {
      flag: "🇮🇪",
      name: "Cork 96FM",
      url: "https://onic.cork.live.stream.broadcasting.news/stream-96fm",
    },
    // UK
    {
      flag: "🇬🇧",
      name: "BBC Radio 1",
      url: "https://stream.live.vc.bbcmedia.co.uk/bbc_radio_one",
    },
    {
      flag: "🇬🇧",
      name: "BBC Radio 2",
      url: "https://stream.live.vc.bbcmedia.co.uk/bbc_radio_two",
    },
    {
      flag: "🇬🇧",
      name: "BBC Radio 4",
      url: "https://stream.live.vc.bbcmedia.co.uk/bbc_radio_fourfm",
    },
    {
      flag: "🇬🇧",
      name: "Capital FM London",
      url: "https://media-ssl.musicradio.com/Capital",
    },
    // France
    {
      flag: "🇫🇷",
      name: "France Inter",
      url: "https://stream.radiofrance.fr/franceinter/franceinter.m3u8",
    },
    {
      flag: "🇫🇷",
      name: "France Info",
      url: "https://stream.radiofrance.fr/franceinfo/franceinfo.m3u8",
    },
    {
      flag: "🇫🇷",
      name: "FIP",
      url: "https://stream.radiofrance.fr/fip/fip.m3u8",
    },
    {
      flag: "🇫🇷",
      name: "NRJ",
      url: "https://scdn.nrjaudio.fm/fr/30001/mp3_128.mp3",
    },
    // Germany
    {
      flag: "🇩🇪",
      name: "Deutschlandfunk",
      url: "https://st01.sslstream.dlf.de/dlf/01/128/mp3/stream.mp3",
    },
    {
      flag: "🇩🇪",
      name: "WDR 2",
      url: "https://wdr-wdr2-rheinland.icecastssl.wdr.de/wdr/wdr2/rheinland/mp3/128/stream.mp3",
    },
    {
      flag: "🇩🇪",
      name: "Radio Eins",
      url: "https://dispatcher.rndfnk.com/rbb/radioeins/live/mp3/mid",
    },
    {
      flag: "🇩🇪",
      name: "Bayern 1",
      url: "https://dispatcher.rndfnk.com/br/br1/obb/mp3/mid",
    },
    // Spain
    {
      flag: "🇪🇸",
      name: "RNE Radio 1",
      url: "https://dispatcher.rndfnk.com/crtve/rne1/main/mp3/high",
    },
    {
      flag: "🇪🇸",
      name: "Cadena SER",
      url: "https://playerservices.streamtheworld.com/api/livestream-redirect/CADENASER.mp3",
    },
    {
      flag: "🇪🇸",
      name: "Los 40 Principales",
      url: "https://playerservices.streamtheworld.com/api/livestream-redirect/LOS40.mp3",
    },
    // Italy
    {
      flag: "🇮🇹",
      name: "Rai Radio 1",
      url: "https://icestreaming.rai.it/1.mp3",
    },
    {
      flag: "🇮🇹",
      name: "Rai Radio 2",
      url: "https://icestreaming.rai.it/2.mp3",
    },
    {
      flag: "🇮🇹",
      name: "Radio Deejay",
      url: "https://deejay_wr_06.ice.infomaniak.ch/deejay_wr_06-128.mp3",
    },
    {
      flag: "🇮🇹",
      name: "Radio 105",
      url: "https://icecast.unitedradio.it/Radio105.mp3",
    },
    // Netherlands
    {
      flag: "🇳🇱",
      name: "NPO Radio 1",
      url: "https://icecast.omroep.nl/radio1-bb-mp3",
    },
    {
      flag: "🇳🇱",
      name: "NPO Radio 2",
      url: "https://icecast.omroep.nl/radio2-bb-mp3",
    },
    {
      flag: "🇳🇱",
      name: "NPO 3FM",
      url: "https://icecast.omroep.nl/3fm-bb-mp3",
    },
    {
      flag: "🇳🇱",
      name: "Radio 538",
      url: "https://playerservices.streamtheworld.com/api/livestream-redirect/RADIO538.mp3",
    },
    // Poland
    {
      flag: "🇵🇱",
      name: "Polskie Radio 1",
      url: "https://stream85.polskieradio.pl/pr1/pr1.sdp/playlist.m3u8",
    },
    {
      flag: "🇵🇱",
      name: "Polskie Radio 3",
      url: "https://stream85.polskieradio.pl/pr3/pr3.sdp/playlist.m3u8",
    },
    {
      flag: "🇵🇱",
      name: "RMF FM",
      url: "https://rs202-krk.rmfstream.pl/RMFFM48",
    },
    {
      flag: "🇵🇱",
      name: "Radio Zet",
      url: "https://playerservices.streamtheworld.com/api/livestream-redirect/RADIO_ZET.mp3",
    },
    // Portugal
    {
      flag: "🇵🇹",
      name: "Antena 1",
      url: "https://streaming-live.rtp.pt/liveradio/antena180a/playlist.m3u8",
    },
    {
      flag: "🇵🇹",
      name: "Antena 3",
      url: "https://streaming-live.rtp.pt/liveradio/antena380a/playlist.m3u8",
    },
    {
      flag: "🇵🇹",
      name: "RFM",
      url: "https://playerservices.streamtheworld.com/api/livestream-redirect/RFM.mp3",
    },
    // Sweden
    {
      flag: "🇸🇪",
      name: "Sveriges Radio P1",
      url: "https://sverigesradio.se/topsy/direkt/132-hi-mp3.m3u",
    },
    {
      flag: "🇸🇪",
      name: "Sveriges Radio P3",
      url: "https://sverigesradio.se/topsy/direkt/164-hi-mp3.m3u",
    },
    {
      flag: "🇸🇪",
      name: "Mix Megapol",
      url: "https://live-bauerse-fm-05-hls-sodra.akamaized.net/secure/1/se/radio28/icecast.audio",
    },
    // Norway
    {
      flag: "🇳🇴",
      name: "NRK P1",
      url: "https://lyd.nrk.no/nrk_radio_p1_ostlandssendingen_mp3_h",
    },
    {
      flag: "🇳🇴",
      name: "NRK P3",
      url: "https://lyd.nrk.no/nrk_radio_p3_mp3_h",
    },
    {
      flag: "🇳🇴",
      name: "Radio Norge",
      url: "https://live-bauerno.sharp-stream.com/radionorge_no_mp3",
    },
    // USA
    {
      flag: "🇺🇸",
      name: "NPR 24",
      url: "https://npr-ice.streamguys1.com/live.mp3",
    },
    {
      flag: "🇺🇸",
      name: "KEXP Seattle",
      url: "https://kexp.streamguys1.com/kexp160.mp3",
    },
    {
      flag: "🇺🇸",
      name: "WNYC New York",
      url: "https://fm939.wnyc.org/wnycfm-web",
    },
    // Canada
    {
      flag: "🇨🇦",
      name: "CBC Radio One",
      url: "https://cbcradiolive.akamaized.net/hls/live/2040989/ES_R2ET/master.m3u8",
    },
    {
      flag: "🇨🇦",
      name: "CBC Music",
      url: "https://cbcradiolive.akamaized.net/hls/live/2041050/ES_R2EHC/master.m3u8",
    },
    {
      flag: "🇨🇦",
      name: "ICI Musique",
      url: "https://rcavliveaudio.akamaized.net/hls/live/2006998/M-7QMTL0_MTL/master.m3u8",
    },
    // Australia
    {
      flag: "🇦🇺",
      name: "ABC Radio Sydney",
      url: "https://live-radio01.mediahubaustralia.com/2LRW/mp3/",
    },
    {
      flag: "🇦🇺",
      name: "triple j",
      url: "https://live-radio01.mediahubaustralia.com/2TJW/mp3/",
    },
    {
      flag: "🇦🇺",
      name: "Double J",
      url: "https://live-radio01.mediahubaustralia.com/DUBW/mp3/",
    },
    // New Zealand
    {
      flag: "🇳🇿",
      name: "RNZ National",
      url: "https://stream-ice.radionz.co.nz/national.mp3",
    },
    {
      flag: "🇳🇿",
      name: "RNZ Concert",
      url: "https://stream-ice.radionz.co.nz/concert.mp3",
    },
    {
      flag: "🇳🇿",
      name: "The Rock",
      url: "https://livestream.mediaworks.nz/radio_ngtm/therock/playlist.m3u8",
    },
  ];

  // Extract unique countries with their flags
  var countries = [];
  var seen = {};
  STATIONS.forEach(function (s) {
    if (!seen[s.flag]) {
      seen[s.flag] = true;
      countries.push({ flag: s.flag });
    }
  });

  // ---------- Create header row ----------
  const headerRow = document.createElement("div");
  headerRow.className = "radio-header-row";

  const title = document.createElement("div");
  title.className = "panel-title";
  var name =
    window.LANG && window.LANG.modules && window.LANG.modules.radio
      ? window.LANG.modules.radio.name
      : "RADIO";
  title.innerHTML = '<i class="fa-solid fa-radio"></i> ' + name;
  headerRow.appendChild(title);

  const headerActions = document.createElement("div");
  headerActions.className = "radio-header-actions";

  const lockToggle = document.createElement("button");
  lockToggle.className = "radio-lock-toggle";
  const saved = localStorage.getItem("radioLocked");
  let isLocked = saved !== null ? saved === "true" : true;
  function updateLockIcon() {
    lockToggle.innerHTML = isLocked
      ? '<i class="fa-solid fa-lock"></i>'
      : '<i class="fa-solid fa-lock-open"></i>';
    lockToggle.style.color = isLocked ? "#cc0000" : "#008000";
  }
  updateLockIcon();
  headerActions.appendChild(lockToggle);

  const pinBtn = container.querySelector(".pin-btn");
  if (pinBtn) headerActions.appendChild(pinBtn);

  headerRow.appendChild(headerActions);
  container.innerHTML = "";
  container.appendChild(headerRow);

  const content = document.createElement("div");
  content.className = "radio-content";
  container.appendChild(content);

  // Country filter dropdown
  var storedFlag = "";
  try {
    var radioSettings = loadSettings();
    storedFlag =
      (radioSettings.radio && radioSettings.radio.defaultCountry) ||
      localStorage.getItem("handiRadioCountry") ||
      "";
  } catch (e) {}
  var selectedFlag = storedFlag;

  content.innerHTML = `
    <div style="text-align:center;margin-bottom:8px;">
      <select id="radioCountryFilter" style="padding:6px 10px;border-radius:8px;border:2px solid #cbd5e1;font-size:0.9rem;max-width:100%;">
        <option value="">— Select country —</option>
        ${countries
          .map(function (c) {
            return '<option value="' + c.flag + '">' + c.flag + "</option>";
          })
          .join("")}
      </select>
    </div>
    <div class="radio-top-bar">
      <canvas id="radio-synth" class="radio-synth"></canvas>
    </div>
    <div class="radio-now-playing" id="now-playing">No station playing</div>
    <div class="radio-scroll-wrapper">
      <button id="radio-up" class="radio-scroll-btn">▲ Scroll Up</button>
      <div id="stations-list" class="radio-list"></div>
      <button id="radio-down" class="radio-scroll-btn">▼ Scroll Down</button>
    </div>
    <div class="radio-error" id="radio-error"></div>
  `;

  const countryFilter = content.querySelector("#radioCountryFilter");
  const list = content.querySelector("#stations-list");
  const nowPlaying = content.querySelector("#now-playing");
  const error = content.querySelector("#radio-error");
  const up = content.querySelector("#radio-up");
  const down = content.querySelector("#radio-down");
  const synthCanvas = content.querySelector("#radio-synth");
  if (synthCanvas) synthCanvas.style.display = "none";

  // Set saved country
  if (selectedFlag) countryFilter.value = selectedFlag;

  let currentAudio = null;
  let stopVisualiser = null;
  let activeStationItem = null;
  let activeStationName = null;

  // Render stations for selected country
  function renderStations() {
    list.innerHTML = "";
    if (!selectedFlag) {
      var name =
        window.LANG && window.LANG.modules && window.LANG.modules.radio
          ? window.LANG.modules.radio.name
          : "RADIO";
      list.innerHTML =
        '<div class="module-empty" style="padding:20px;text-align:center;"><i class="fa-solid fa-radio"></i><p>Select a country above to browse stations</p></div>';
      nowPlaying.innerText = "No station playing";
      return;
    }
    var filtered = STATIONS.filter(function (s) {
      return s.flag === selectedFlag;
    });

    filtered.forEach(function (station) {
      const stationDiv = document.createElement("div");
      stationDiv.className = "radio-station";
      stationDiv.style.display = "flex";
      stationDiv.style.alignItems = "center";
      stationDiv.style.gap = "8px";

      var flagSpan = document.createElement("span");
      flagSpan.style.fontSize = "1.2rem";
      flagSpan.textContent = station.flag;

      const playIcon = document.createElement("span");
      playIcon.className = "radio-play-btn";
      playIcon.innerHTML = '<i class="fa-solid fa-play"></i>';

      const nameSpan = document.createElement("span");
      nameSpan.textContent = station.name;
      nameSpan.style.flex = "1";

      stationDiv.appendChild(flagSpan);
      stationDiv.appendChild(playIcon);
      stationDiv.appendChild(nameSpan);

      stationDiv.addEventListener("click", function (e) {
        if (e.target.closest(".radio-lock-toggle, .pin-btn")) return;
        playStation(station.url, station.name, stationDiv, playIcon);
      });

      stationDiv.stationData = {
        url: station.url,
        name: station.name,
        element: stationDiv,
        playBtn: playIcon,
      };
      list.appendChild(stationDiv);
    });
  }

  renderStations();

  countryFilter.addEventListener("change", function () {
    selectedFlag = this.value;
    try {
      localStorage.setItem("handiRadioCountry", selectedFlag);
    } catch (e) {}
    stopPlayback(true);
    renderStations();
  });

  // --- GLOBAL MUTE ---
  function applyGlobalMute(muted) {
    if (currentAudio) currentAudio.muted = muted;
  }
  window.addEventListener("globalMuteToggle", function (e) {
    applyGlobalMute(e.detail.muted);
  });
  applyGlobalMute(localStorage.getItem("globalMute") === "true");

  // --- Visualiser ---
  function startFakeVisualiser(canvas) {
    if (!canvas) return null;
    canvas.style.display = "block";
    let animationId = null;
    const ctx = canvas.getContext("2d");
    function resizeCanvas() {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    }
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    let time = 0;
    function draw() {
      animationId = requestAnimationFrame(draw);
      time += 0.05;
      const width = canvas.width,
        height = canvas.height;
      if (width === 0 || height === 0) return;
      ctx.clearRect(0, 0, width, height);
      const barCount = 32,
        barWidth = width / barCount;
      for (let i = 0; i < barCount; i++) {
        const value = (Math.sin(time + i * 0.3) + 1) / 2;
        const barHeight =
          height * Math.min(0.9, value * 0.7 + Math.random() * 0.3);
        const hue =
          parseInt(
            getComputedStyle(document.body).getPropertyValue(
              "--music-synth-hue",
            ),
          ) || 200;
        ctx.fillStyle = "hsl(" + hue + ", 80%, 55%)";
        ctx.fillRect(i * barWidth, height - barHeight, barWidth - 1, barHeight);
      }
    }
    draw();
    return function () {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resizeCanvas);
    };
  }

  function stopVisualiserAndClear() {
    if (stopVisualiser) {
      stopVisualiser();
      stopVisualiser = null;
    }
    if (synthCanvas) {
      const ctx = synthCanvas.getContext("2d");
      if (ctx) ctx.clearRect(0, 0, synthCanvas.width, synthCanvas.height);
      synthCanvas.style.display = "none";
    }
  }

  function stopPlayback(resetIcon) {
    if (currentAudio && typeof currentAudio.pause === "function") {
      try {
        currentAudio.pause();
      } catch (e) {}
      try {
        currentAudio.src = "";
      } catch (e) {}
      currentAudio = null;
    }
    stopVisualiserAndClear();
    nowPlaying.innerText = "No station playing";
    error.innerText = "";
    if (resetIcon !== false && activeStationItem) {
      const playBtn = activeStationItem.querySelector(".radio-play-btn");
      if (playBtn) {
        playBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
        playBtn.classList.remove("playing");
      }
      activeStationItem.classList.remove("active-station");
      activeStationItem = null;
      activeStationName = null;
    }
  }

  function playStation(url, stationName, stationItem, playButton) {
    if (isLocked) {
      error.innerText = "Radio is locked – unlock to play";
      return;
    }
    if (
      currentAudio &&
      activeStationName === stationName &&
      !currentAudio.paused
    ) {
      currentAudio.pause();
      nowPlaying.innerText = "⏸ Paused: " + stationName;
      if (playButton) {
        playButton.innerHTML = '<i class="fa-solid fa-play"></i>';
        playButton.classList.remove("playing");
      }
      stopVisualiserAndClear();
      return;
    }
    if (currentAudio) stopPlayback(true);
    nowPlaying.innerText = "Connecting to " + stationName + "...";
    error.innerText = "";
    try {
      const audio = document.createElement("audio");
      audio.src = url;
      audio.muted = localStorage.getItem("globalMute") === "true";
      currentAudio = audio;
      const playPromise = audio.play();
      if (playPromise === undefined) {
        onPlaySuccess(audio, stationName, stationItem, playButton);
      } else {
        playPromise
          .then(function () {
            onPlaySuccess(audio, stationName, stationItem, playButton);
          })
          .catch(function (err) {
            onPlayError(audio, err);
          });
      }
      audio.onerror = function () {
        onPlayError(audio, new Error("Stream error"));
      };
    } catch (err) {
      console.error(err);
      error.innerText = "Unable to play stream";
      stopPlayback(true);
    }

    function onPlaySuccess(audio, name, item, btn) {
      if (audio !== currentAudio) return;
      nowPlaying.innerText = "▶ Now playing: " + name;
      document.querySelectorAll(".radio-station").forEach(function (el) {
        var b = el.querySelector(".radio-play-btn");
        if (b) {
          b.innerHTML = '<i class="fa-solid fa-play"></i>';
          b.classList.remove("playing");
        }
        el.classList.remove("active-station");
      });
      if (btn) {
        btn.innerHTML = '<i class="fa-solid fa-pause"></i>';
        btn.classList.add("playing");
      }
      item.classList.add("active-station");
      activeStationItem = item;
      activeStationName = name;
      if (!isLocked) stopVisualiser = startFakeVisualiser(synthCanvas);
    }
    function onPlayError(audio, err) {
      if (audio !== currentAudio) return;
      console.warn("Play error:", err);
      error.innerText =
        err.message === "Stream error"
          ? "Stream unavailable"
          : "Cannot play this station";
      nowPlaying.innerText = "Playback failed";
      stopPlayback(true);
    }
  }

  function applyLockState() {
    if (isLocked) stopPlayback(true);
    list.querySelectorAll(".radio-station").forEach(function (div) {
      if (isLocked) {
        div.style.pointerEvents = "none";
        div.style.opacity = "0.6";
      } else {
        div.style.pointerEvents = "";
        div.style.opacity = "";
      }
    });
    [up, down].forEach(function (btn) {
      if (isLocked) {
        btn.disabled = true;
        btn.style.opacity = "0.5";
        btn.style.cursor = "not-allowed";
      } else {
        btn.disabled = false;
        btn.style.opacity = "";
        btn.style.cursor = "";
      }
    });
    if (isLocked) {
      stopVisualiserAndClear();
      nowPlaying.innerText = "Radio locked";
      error.innerText = "";
    } else {
      if (activeStationItem && currentAudio && !currentAudio.paused) {
        stopVisualiser = startFakeVisualiser(synthCanvas);
        nowPlaying.innerText = "▶ Now playing: " + activeStationName;
      } else if (!currentAudio || currentAudio.paused) {
        nowPlaying.innerText = "No station playing";
      }
      error.innerText = "";
    }
  }

  lockToggle.addEventListener("click", function (e) {
    e.stopPropagation();
    isLocked = !isLocked;
    localStorage.setItem("radioLocked", isLocked);
    updateLockIcon();
    applyLockState();
  });

  up.addEventListener("click", function () {
    list.scrollBy({ top: -300, behavior: "smooth" });
  });
  down.addEventListener("click", function () {
    list.scrollBy({ top: 300, behavior: "smooth" });
  });

  applyLockState();

  return function () {
    if (currentAudio && typeof currentAudio.pause === "function") {
      try {
        currentAudio.pause();
      } catch (e) {}
      try {
        currentAudio.src = "";
      } catch (e) {}
      currentAudio = null;
    }
    stopVisualiserAndClear();
  };
}
