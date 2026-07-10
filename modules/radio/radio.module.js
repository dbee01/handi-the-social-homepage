// modules/radio/radio.module.js – international radio stations with country filter
import { loadSettings } from "../../js/core/settings.js";

export default async function initRadio(container) {
  var t =
    window.t ||
    function (k, e) {
      return e || k;
    };

  // International radio stations with country flags
  const STATIONS = [
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
    {
      flag: "🇬🇧",
      name: "Heart UK",
      url: "https://media-ssl.musicradio.com/HeartUK",
    },
    {
      flag: "🇬🇧",
      name: "Smooth Radio UK",
      url: "https://media-ssl.musicradio.com/SmoothUK",
    },
    {
      flag: "🇬🇧",
      name: "LBC UK",
      url: "https://media-ssl.musicradio.com/LBCUK",
    },
    {
      flag: "🇬🇧",
      name: "Capital FM London",
      url: "https://media-ssl.musicradio.com/Capital",
    },
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
      url: "https://4c4b867c89244861ac216426883d1ad0.msvdn.net/radiodeejay/radiodeejay/master.m3u8",
    },
    {
      flag: "🇮🇹",
      name: "Radio 105",
      url: "https://icecast.unitedradio.it/Radio105.mp3",
    },
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
    {
      flag: "🇵🇱",
      name: "RMF24",
      url: "https://rs202-krk.rmfstream.pl/RMF24",
    },
    {
      flag: "🇵🇱",
      name: "Meloradio",
      url: "https://playerservices.streamtheworld.com/api/livestream-redirect/MELORADIO.mp3",
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
    {
      flag: "🇵🇹",
      name: "Observador",
      url: "https://playerservices.streamtheworld.com/api/livestream-redirect/OBSERVADOR.mp3",
    },
    {
      flag: "🇵🇹",
      name: "M80 Rádio",
      url: "https://playerservices.streamtheworld.com/api/livestream-redirect/M80RADIO.mp3",
    },
    {
      flag: "🇵🇹",
      name: "RFM",
      url: "https://playerservices.streamtheworld.com/api/livestream-redirect/RFM.mp3",
    },
    {
      flag: "🇸🇪",
      name: "Sveriges Radio P1",
      url: "https://live1.sr.se/p1-mp3-96",
    },
    {
      flag: "🇸🇪",
      name: "Sveriges Radio P3",
      url: "https://live1.sr.se/p3-mp3-96",
    },
    {
      flag: "🇸🇪",
      name: "Sveriges Radio P2",
      url: "https://live1.sr.se/p2-mp3-96",
    },
    {
      flag: "🇸🇪",
      name: "Sveriges Radio P4 Stockholm",
      url: "https://live1.sr.se/p4sth-mp3-96",
    },
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
    {
      flag: "🇺🇸",
      name: "NPR 24",
      url: "https://npr-ice.streamguys1.com/live.mp3",
    },
    {
      flag: "🇺🇸",
      name: "KEXP Seattle",
      url: "https://kexp-mp3-128.streamguys1.com/kexp128.mp3",
    },
    {
      flag: "🇺🇸",
      name: "WNYC New York",
      url: "https://fm939.wnyc.org/wnycfm-web",
    },
    {
      flag: "🇨🇦",
      name: "NewsTalk 1010 Toronto",
      url: "https://playerservices.streamtheworld.com/api/livestream-redirect/CFRBAM.mp3",
    },
    {
      flag: "🇨🇦",
      name: "CKUA Edmonton",
      url: "https://ckua.streamon.fm/stream/CKUA-48k.aac",
    },
    {
      flag: "🇨🇦",
      name: "CJAD 800 Montréal",
      url: "https://playerservices.streamtheworld.com/api/livestream-redirect/CJADAM.mp3",
    },
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
      name: "ABC Classic",
      url: "https://live-radio01.mediahubaustralia.com/2FMW/mp3/",
    },
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
      name: "RNZ Pacific",
      url: "https://stream-ice.radionz.co.nz/international.mp3",
    },
  ];

  var flagToCountry = {
    "🇮🇪": "Ireland",
    "🇬🇧": "United Kingdom",
    "🇫🇷": "France",
    "🇩🇪": "Germany",
    "🇪🇸": "Spain",
    "🇮🇹": "Italy",
    "🇳🇱": "Netherlands",
    "🇵🇱": "Poland",
    "🇵🇹": "Portugal",
    "🇸🇪": "Sweden",
    "🇳🇴": "Norway",
    "🇺🇸": "United States",
    "🇨🇦": "Canada",
    "🇦🇺": "Australia",
    "🇳🇿": "New Zealand",
  };

  var countries = [],
    seen = {};
  STATIONS.forEach(function (s) {
    if (!seen[s.flag]) {
      seen[s.flag] = true;
      countries.push({ flag: s.flag, name: flagToCountry[s.flag] || s.flag });
    }
  });

  // Header
  const headerRow = document.createElement("div");
  headerRow.className = "radio-header-row";
  const title = document.createElement("div");
  title.className = "panel-title";
  title.innerHTML =
    '<i class="fa-solid fa-radio"></i> ' +
    t(
      "modules.radio.name",
      window.LANG && window.LANG.modules && window.LANG.modules.radio
        ? window.LANG.modules.radio.name
        : "RADIO",
    );
  headerRow.appendChild(title);

  const headerActions = document.createElement("div");
  headerActions.className = "radio-header-actions";
  const lockToggle = document.createElement("button");
  lockToggle.className = "radio-lock-toggle";
  var saved = localStorage.getItem("radioLocked"),
    regCfg =
      (window.HANDI_MODULE_BY_ID &&
        window.HANDI_MODULE_BY_ID("radio")?.settingsConfig?.soundLock) ??
      true,
    isLocked = saved !== null ? saved === "true" : regCfg;
  function updateLockIcon() {
    lockToggle.innerHTML = isLocked
      ? '<i class="fa-solid fa-lock"></i>'
      : '<i class="fa-solid fa-lock-open"></i>';
    lockToggle.style.color = isLocked ? "#cc0000" : "#008000";
  }
  updateLockIcon();
  headerActions.appendChild(lockToggle);
  var pinBtn = container.querySelector(".pin-btn");
  if (pinBtn) headerActions.appendChild(pinBtn);
  headerRow.appendChild(headerActions);
  container.innerHTML = "";
  container.appendChild(headerRow);

  var content = document.createElement("div");
  content.className = "radio-content";
  container.appendChild(content);

  var storedFlag = "";
  try {
    var rs = loadSettings();
    storedFlag =
      (rs.radio && rs.radio.defaultCountry) ||
      localStorage.getItem("handiRadioCountry") ||
      "";
  } catch (e) {}
  var selectedFlag = "";

  // Always show selector, ignore saved country

  content.innerHTML =
    '<div style="text-align:center;margin-bottom:8px;"><select id="radioCountryFilter" style="padding:6px 10px;border-radius:8px;border:2px solid #cbd5e1;font-size:0.9rem;max-width:100%;"><option value="">' +
    t("d_selectCountry", "— Select country —") +
    "</option>" +
    countries
      .map(function (c) {
        return (
          '<option value="' +
          c.flag +
          '">' +
          c.flag +
          " " +
          c.name +
          "</option>"
        );
      })
      .join("") +
    '</select></div><div class="radio-top-bar"><canvas id="radio-synth" class="radio-synth"></canvas></div><div class="radio-now-playing" id="now-playing">' +
    t("d_noStation", "No station playing") +
    '</div><div class="radio-scroll-wrapper"><button id="radio-up" class="radio-scroll-btn">▲</button><div id="stations-list" class="radio-list"></div><button id="radio-down" class="radio-scroll-btn">▼</button></div><div class="radio-error" id="radio-error"></div>';

  var countryFilter = content.querySelector("#radioCountryFilter"),
    list = content.querySelector("#stations-list");
  var nowPlaying = content.querySelector("#now-playing"),
    error = content.querySelector("#radio-error");
  var up = content.querySelector("#radio-up"),
    down = content.querySelector("#radio-down");
  var synthCanvas = content.querySelector("#radio-synth");
  if (synthCanvas) synthCanvas.style.display = "none";

  var currentAudio = null,
    stopVisualiser = null,
    activeStationItem = null,
    activeStationName = null;

  function renderStations() {
    list.innerHTML = "";
    if (!selectedFlag) {
      list.innerHTML =
        '<div class="module-empty" style="padding:20px;text-align:center;"><i class="fa-solid fa-radio"></i><p>' +
        t("d_browseStations", "Select a country above to browse stations") +
        "</p></div>";
      nowPlaying.innerText = t("d_noStation", "No station playing");
      return;
    }
    STATIONS.filter(function (s) {
      return s.flag === selectedFlag;
    }).forEach(function (station) {
      var d = document.createElement("div");
      d.className = "radio-station";
      d.style.cssText = "display:flex;align-items:center;gap:8px;";
      var fs = document.createElement("span");
      fs.style.fontSize = "1.2rem";
      fs.textContent = station.flag;
      var pi = document.createElement("span");
      pi.className = "radio-play-btn";
      pi.innerHTML = '<i class="fa-solid fa-play"></i>';
      var ns = document.createElement("span");
      ns.textContent = station.name;
      ns.style.flex = "1";
      d.appendChild(fs);
      d.appendChild(pi);
      d.appendChild(ns);
      d.addEventListener("click", function (e) {
        if (e.target.closest(".radio-lock-toggle, .pin-btn")) return;
        playStation(station.url, station.name, d, pi);
      });
      d.stationData = {
        url: station.url,
        name: station.name,
        element: d,
        playBtn: pi,
      };
      list.appendChild(d);
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

  function applyGlobalMute(muted) {
    if (currentAudio) currentAudio.muted = muted;
  }
  window.addEventListener("globalMuteToggle", function (e) {
    applyGlobalMute(e.detail.muted);
  });
  applyGlobalMute(localStorage.getItem("globalMute") === "true");

  function startFakeVisualiser(canvas) {
    if (!canvas) return null;
    canvas.style.display = "block";
    var aid = null,
      ctx = canvas.getContext("2d");
    function rc() {
      var r = canvas.getBoundingClientRect();
      canvas.width = r.width;
      canvas.height = r.height;
    }
    rc();
    window.addEventListener("resize", rc);
    var tm = 0;
    function draw() {
      aid = requestAnimationFrame(draw);
      tm += 0.05;
      var w = canvas.width,
        h = canvas.height;
      if (!w || !h) return;
      ctx.clearRect(0, 0, w, h);
      for (var i = 0, bc = 32, bw = w / bc; i < bc; i++) {
        var bh =
          h *
          Math.min(
            0.9,
            ((Math.sin(tm + i * 0.3) + 1) / 2) * 0.7 + Math.random() * 0.3,
          );
        var hue =
          parseInt(
            getComputedStyle(document.body).getPropertyValue(
              "--music-synth-hue",
            ),
          ) || 200;
        ctx.fillStyle = "hsl(" + hue + ", 80%, 55%)";
        ctx.fillRect(i * bw, h - bh, bw - 1, bh);
      }
    }
    draw();
    return function () {
      cancelAnimationFrame(aid);
      window.removeEventListener("resize", rc);
    };
  }

  function stopVisualiserAndClear() {
    if (stopVisualiser) {
      stopVisualiser();
      stopVisualiser = null;
    }
    if (synthCanvas) {
      var sc = synthCanvas.getContext("2d");
      if (sc) sc.clearRect(0, 0, synthCanvas.width, synthCanvas.height);
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
    nowPlaying.innerText = t("d_noStation", "No station playing");
    error.innerText = "";
    if (resetIcon !== false && activeStationItem) {
      var pb = activeStationItem.querySelector(".radio-play-btn");
      if (pb) {
        pb.innerHTML = '<i class="fa-solid fa-play"></i>';
        pb.classList.remove("playing");
      }
      activeStationItem.classList.remove("active-station");
      activeStationItem = null;
      activeStationName = null;
    }
  }

  function playStation(url, sName, sItem, sBtn) {
    if (isLocked) {
      error.innerText = t("d_radioLocked", "Radio is locked – unlock to play");
      return;
    }
    if (currentAudio && activeStationName === sName && !currentAudio.paused) {
      currentAudio.pause();
      nowPlaying.innerText = "⏸ " + t("d_paused", "Paused:") + " " + sName;
      if (sBtn) {
        sBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
        sBtn.classList.remove("playing");
      }
      stopVisualiserAndClear();
      return;
    }
    if (currentAudio) stopPlayback(true);
    nowPlaying.innerText =
      t("d_connecting", "Connecting to") + " " + sName + "...";
    error.innerText = "";
    try {
      var a = document.createElement("audio");
      a.src = url;
      a.muted = localStorage.getItem("globalMute") === "true";
      currentAudio = a;
      var pp = a.play();
      if (pp === undefined) {
        os(a, sName, sItem, sBtn);
      } else {
        pp.then(function () {
          os(a, sName, sItem, sBtn);
        }).catch(function (er) {
          oe(a, er);
        });
      }
      a.onerror = function () {
        oe(a, new Error("Stream error"));
      };
    } catch (err) {
      console.error(err);
      error.innerText = t("d_playbackFailed", "Unable to play stream");
      stopPlayback(true);
    }
    function os(a2, n2, i2, b2) {
      if (a2 !== currentAudio) return;
      nowPlaying.innerText =
        "▶ " + t("d_nowPlaying", "Now playing:") + " " + n2;
      document.querySelectorAll(".radio-station").forEach(function (el) {
        var b = el.querySelector(".radio-play-btn");
        if (b) {
          b.innerHTML = '<i class="fa-solid fa-play"></i>';
          b.classList.remove("playing");
        }
        el.classList.remove("active-station");
      });
      if (b2) {
        b2.innerHTML = '<i class="fa-solid fa-pause"></i>';
        b2.classList.add("playing");
      }
      i2.classList.add("active-station");
      activeStationItem = i2;
      activeStationName = n2;
      if (!isLocked) stopVisualiser = startFakeVisualiser(synthCanvas);
    }
    function oe(a2, err) {
      if (a2 !== currentAudio) return;
      console.warn("Play error:", err);
      error.innerText =
        err.message === "Stream error"
          ? t("d_streamUnavailable", "Stream unavailable")
          : t("d_cannotPlay", "Cannot play this station");
      nowPlaying.innerText = t("d_playbackFailed", "Playback failed");
      stopPlayback(true);
    }
  }

  function applyLockState() {
    if (isLocked) stopPlayback(true);
    list.querySelectorAll(".radio-station").forEach(function (d) {
      d.style.pointerEvents = isLocked ? "none" : "";
      d.style.opacity = isLocked ? "0.6" : "";
    });
    [up, down].forEach(function (b) {
      b.disabled = isLocked;
      b.style.opacity = isLocked ? "0.5" : "";
      b.style.cursor = isLocked ? "not-allowed" : "";
    });
    if (isLocked) {
      stopVisualiserAndClear();
      nowPlaying.innerText = t("d_radioLockedShort", "Radio locked");
      error.innerText = "";
    } else {
      if (activeStationItem && currentAudio && !currentAudio.paused) {
        stopVisualiser = startFakeVisualiser(synthCanvas);
        nowPlaying.innerText =
          "▶ " + t("d_nowPlaying", "Now playing:") + " " + activeStationName;
      } else if (!currentAudio || currentAudio.paused) {
        nowPlaying.innerText = t("d_noStation", "No station playing");
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
