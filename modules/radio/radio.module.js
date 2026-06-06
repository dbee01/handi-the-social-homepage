/*
 * Copyright (c) 2026 Handi Homepage
 * This file is part of HandiHomepage and is released under the GNU General Public License v3.0.
 * See the LICENSE file in the repository root for full details.
 */
// modules/radio/radio.module.js
export default async function initRadio(container) {
  // ---------- Create header row: title + lock + pin ----------
  const headerRow = document.createElement("div");
  headerRow.className = "radio-header-row";

  const title = document.createElement("div");
  title.className = "panel-title";
  title.innerHTML = '<i class="fa-solid fa-radio"></i> RADIO';
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
  if (pinBtn) {
    headerActions.appendChild(pinBtn);
  }

  headerRow.appendChild(headerActions);
  container.innerHTML = "";
  container.appendChild(headerRow);

  const content = document.createElement("div");
  content.className = "radio-content";
  container.appendChild(content);

  const stations = [
    {
      name: "RTÉ Radio 1",
      url: "https://25553.live.streamtheworld.com/RTE_1_INT.mp3?tdsdk=rte",
    },
    { name: "Today FM", url: "https://edgex.audioxi.com/TD" },
    { name: "Newstalk", url: "https://edgex.audioxi.com/NT" },
    {
      name: "RTÉ Lyric FM",
      url: "https://29083.live.streamtheworld.com/RTE_LYRIC_FM.mp3?tdsdk=rte",
    },
    {
      name: "RTÉ 2FM",
      url: "https://27793.live.streamtheworld.com/RTE_2FM_INT.mp3?tdsdk=rte",
    },
    {
      name: "Cork 96FM",
      url: "https://onic.cork.live.stream.broadcasting.news/stream-96fm",
    },
    {
      name: "Dublin FM 104",
      url: "https://onic.dublin.live.stream.broadcasting.news/stream-fm104",
    },
    { name: "Galway Bay FM", url: "https://wg.cdn.tibus.net/galwaybay.mp3" },
    {
      name: "Classic FM",
      url: "https://live-bauerie.sharp-stream.com/CLASSIC",
    },
    {
      name: "Live 95 (Limerick)",
      url: "https://onic.cork.live.stream.broadcasting.news/stream-live95",
    },
  ];

  content.innerHTML = `
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

  const list = content.querySelector("#stations-list");
  const nowPlaying = content.querySelector("#now-playing");
  const error = content.querySelector("#radio-error");
  const up = content.querySelector("#radio-up");
  const down = content.querySelector("#radio-down");
  const synthCanvas = content.querySelector("#radio-synth");

  if (synthCanvas) synthCanvas.style.display = "none";

  let currentAudio = null;
  let stopVisualiser = null;
  let activeStationItem = null;
  let activeStationName = null;

  // --- GLOBAL MUTE ---
  function applyGlobalMute(muted) {
    if (currentAudio) {
      currentAudio.muted = muted;
    }
  }

  window.addEventListener("globalMuteToggle", (e) => {
    applyGlobalMute(e.detail.muted);
  });

  const initialMute = localStorage.getItem("globalMute") === "true";
  applyGlobalMute(initialMute);

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
      const width = canvas.width;
      const height = canvas.height;
      if (width === 0 || height === 0) return;
      ctx.clearRect(0, 0, width, height);
      const barCount = 32;
      const barWidth = width / barCount;
      for (let i = 0; i < barCount; i++) {
        const value = (Math.sin(time + i * 0.3) + 1) / 2;
        const noise = Math.random() * 0.3;
        const heightPercent = Math.min(0.9, value * 0.7 + noise);
        const barHeight = height * heightPercent;
        const hue = 200 + heightPercent * 60;
        ctx.fillStyle = `hsl(${hue}, 80%, 55%)`;
        ctx.fillRect(i * barWidth, height - barHeight, barWidth - 1, barHeight);
      }
    }
    draw();
    return () => {
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

  function stopPlayback(resetIcon = true) {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.src = "";
      currentAudio = null;
    }
    stopVisualiserAndClear();
    nowPlaying.innerText = "No station playing";
    error.innerText = "";
    if (resetIcon && activeStationItem) {
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

  function playStation(url, name, stationItem, playButton) {
    if (isLocked) {
      error.innerText = "Radio is locked – unlock to play";
      return;
    }
    if (
      currentAudio &&
      activeStationName === name &&
      currentAudio &&
      !currentAudio.paused
    ) {
      // Same station playing, pause it
      currentAudio.pause();
      nowPlaying.innerText = `⏸ Paused: ${name}`;
      if (playButton) {
        playButton.innerHTML = '<i class="fa-solid fa-play"></i>';
        playButton.classList.remove("playing");
      }
      stopVisualiserAndClear();
      return;
    }

    if (currentAudio) stopPlayback(true);

    nowPlaying.innerText = `Connecting to ${name}...`;
    error.innerText = "";

    try {
      currentAudio = new Audio(url);
      currentAudio.muted = localStorage.getItem("globalMute") === "true";
      currentAudio
        .play()
        .then(() => {
          nowPlaying.innerText = `▶ Now playing: ${name}`;
          document.querySelectorAll(".radio-station").forEach((item) => {
            const btn = item.querySelector(".radio-play-btn");
            if (btn) {
              btn.innerHTML = '<i class="fa-solid fa-play"></i>';
              btn.classList.remove("playing");
            }
            item.classList.remove("active-station");
          });
          if (playButton) {
            playButton.innerHTML = '<i class="fa-solid fa-pause"></i>';
            playButton.classList.add("playing");
          }
          stationItem.classList.add("active-station");
          activeStationItem = stationItem;
          activeStationName = name;
          if (!isLocked) stopVisualiser = startFakeVisualiser(synthCanvas);
        })
        .catch((err) => {
          console.warn("Play error:", err);
          error.innerText = "Cannot play this station";
          nowPlaying.innerText = "Playback failed";
          stopPlayback(true);
        });
      currentAudio.onerror = () => {
        error.innerText = "Stream unavailable";
        nowPlaying.innerText = "Stream error";
        stopPlayback(true);
      };
    } catch (err) {
      console.error(err);
      error.innerText = "Unable to play stream";
      stopPlayback(true);
    }
  }

  function applyLockState() {
    if (isLocked) stopPlayback(true);
    const allStationDivs = list.querySelectorAll(".radio-station");
    allStationDivs.forEach((div) => {
      if (isLocked) {
        div.style.pointerEvents = "none";
        div.style.opacity = "0.6";
      } else {
        div.style.pointerEvents = "";
        div.style.opacity = "";
      }
    });
    const scrollBtns = [up, down];
    scrollBtns.forEach((btn) => {
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
        nowPlaying.innerText = `▶ Now playing: ${activeStationName}`;
      } else if (!currentAudio || currentAudio.paused) {
        nowPlaying.innerText = "No station playing";
      }
      error.innerText = "";
    }
  }

  lockToggle.addEventListener("click", (e) => {
    e.stopPropagation();
    isLocked = !isLocked;
    localStorage.setItem("radioLocked", isLocked);
    updateLockIcon();
    applyLockState();
  });

  // Create station rows
  stations.forEach((station) => {
    const stationDiv = document.createElement("div");
    stationDiv.className = "radio-station";

    // Play icon (not a button, just visual)
    const playIcon = document.createElement("span");
    playIcon.className = "radio-play-btn";
    playIcon.innerHTML = '<i class="fa-solid fa-play"></i>';

    // Station name
    const nameSpan = document.createElement("span");
    nameSpan.textContent = station.name;

    stationDiv.appendChild(playIcon);
    stationDiv.appendChild(nameSpan);

    // Click on the whole station row triggers playback
    stationDiv.addEventListener("click", (e) => {
      // Don't trigger if clicking the lock or other controls
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

  // Scroll buttons with text
  up.innerHTML = "▲ Scroll Up";
  down.innerHTML = "▼ Scroll Down";

  up.addEventListener("click", () =>
    list.scrollBy({ top: -300, behavior: "smooth" }),
  );
  down.addEventListener("click", () =>
    list.scrollBy({ top: 300, behavior: "smooth" }),
  );

  applyLockState();

  return () => {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.src = "";
      currentAudio = null;
    }
    stopVisualiserAndClear();
  };
}
