// modules/cast/cast.module.js
// Podcast player — like the Player module but with 250MB load limit
import { loadCast, saveCast } from "../../js/core/storage.js";

function removeFileExtension(filename) {
  return filename.replace(/\.[^.]+$/, "");
}

export default async function initCast(container) {
  var t =
    window.t ||
    function (k, e) {
      return e || k;
    };

  const headerRow = document.createElement("div");
  headerRow.className = "cast-header-row";
  const title = document.createElement("div");
  title.className = "panel-title";
  title.innerHTML =
    '<i class="fa-solid fa-podcast"></i> ' +
    t(
      "modules.cast.name",
      window.LANG && window.LANG.modules && window.LANG.modules.cast
        ? window.LANG.modules.cast.name
        : "Cast",
    );
  headerRow.appendChild(title);

  const headerActions = document.createElement("div");
  headerActions.className = "cast-header-actions";
  const lockToggle = document.createElement("button");
  lockToggle.className = "cast-lock-toggle";
  var saved = localStorage.getItem("castLocked"),
    regCfg =
      (window.HANDI_MODULE_BY_ID &&
        window.HANDI_MODULE_BY_ID("cast")?.settingsConfig?.soundLock) ??
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
  var originalPinBtn = container.querySelector(".pin-btn"),
    pinBtn = originalPinBtn;
  headerRow.appendChild(headerActions);
  container.innerHTML = "";
  container.appendChild(headerRow);

  var content = document.createElement("div");
  content.className = "cast-content";
  container.appendChild(content);
  var parentItem = container.closest(".dashboard-item");
  if (parentItem) {
    parentItem.dataset.module = "cast";
    parentItem.style.minHeight = "420px";
  }

  var tracks = [];
    try {
      tracks = await loadCast();
    } catch (err) {
      tracks = [];
    }

  if (!tracks.length) {
    content.innerHTML =
      '<div class="module-empty"><i class="fa-solid fa-podcast"></i><p>' +
      t("d_noCast", "Load your podcasts here") +
      '</p><div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;">' +
      '<button id="castLoadBtn" class="settings-link-btn"><i class="fa-solid fa-cloud-arrow-up"></i> ' +
      t("d_loadCast", "Load Podcasts") +
      '</button></div></div>';
    var loadBtn = content.querySelector("#castLoadBtn");
    if (loadBtn)
      loadBtn.onclick = function () {
        window.triggerLoad({
          accept: "audio/*",
          multiple: true,
          maxSizeMB: 250,
          onFiles: async (files) => {
            var existing = [];
            try { existing = await loadCast(); } catch (e) {}
            await saveCast([...existing, ...files]);
            container.innerHTML = "";
            initCast(container);
          },
          onError: function (msg) {
            alert(msg);
          },
        });
      };
    return;
  }

  var currentAudio = null,
    currentIndex = -1,
    isPlaying = false,
    stopVisualiser = null;

  function applyGlobalMute(muted) {
    if (currentAudio) currentAudio.muted = muted;
  }
  window.addEventListener("globalMuteToggle", function (e) {
    applyGlobalMute(e.detail.muted);
  });
  applyGlobalMute(localStorage.getItem("globalMute") === "true");

  content.innerHTML =
    '<div class="cast-now-playing"><canvas id="cast-synth" class="cast-synth"></canvas><div id="cast-status" class="cast-status"><span id="cast-track-title">—</span><span class="cast-state-text">' +
    t("d_ready", "Ready") +
    '</span></div></div><div class="cast-controls"><button id="cast-prev">⏮</button><button id="cast-playpause" class="primary">▶</button><button id="cast-next">⏭</button></div><div style="text-align:center;margin-bottom:8px;"><button id="castLoadMoreBtn" class="settings-link-btn" style="padding:6px 14px;"><i class="fa-solid fa-cloud-arrow-up"></i> ' +
    t("d_loadCast", "Load Podcasts") +
        '</button></div><div class="cast-scroll-wrapper"><button id="castScrollUp" class="cast-scroll-btn">▲</button><div id="cast-playlist" class="cast-playlist"></div><button id="castScrollDown" class="cast-scroll-btn">▼</button></div>';

  var synthCanvas = content.querySelector("#cast-synth"),
    playlist = content.querySelector("#cast-playlist");
  var up = content.querySelector("#castScrollUp"),
    down = content.querySelector("#castScrollDown");
  var playPauseBtn = content.querySelector("#cast-playpause"),
    trackTitleSpan = content.querySelector("#cast-track-title");
  var stateSpan = content.querySelector(".cast-state-text"),
    prevBtn = content.querySelector("#cast-prev"),
    nextBtn = content.querySelector("#cast-next");
  if (synthCanvas) synthCanvas.style.display = "none";

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
              "--cast-synth-hue",
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
  function ensureVisualiserRunning() {
    if (isPlaying && !isLocked) {
      if (!stopVisualiser) stopVisualiser = startFakeVisualiser(synthCanvas);
    } else {
      stopVisualiserAndClear();
    }
  }

  function updateTrackIconsAndActive() {
    var items = playlist.querySelectorAll(".cast-track-item");
    items.forEach(function (el, i) {
      var iconSpan = el.querySelector("span");
      var isCur = i === currentIndex && isPlaying;
      if (iconSpan) {
        iconSpan.innerHTML = isCur
          ? '<i class="fa-solid fa-pause"></i>'
          : i === currentIndex
            ? '<i class="fa-solid fa-play"></i>'
            : '<i class="fa-solid fa-podcast"></i>';
      }
      el.classList.toggle("active", i === currentIndex);
    });
  }

  function stopCurrentAudio(keepIndex) {
    if (currentAudio) {
      try {
        currentAudio.pause();
      } catch (e) {}
      try {
        currentAudio.src = "";
      } catch (e) {}
      currentAudio = null;
    }
    stopVisualiserAndClear();
    if (!keepIndex) {
      currentIndex = -1;
      trackTitleSpan.innerText = "—";
      stateSpan.innerText = " | " + t("d_ready", "Ready");
      playPauseBtn.innerHTML = "▶";
      isPlaying = false;
    }
    updateTrackIconsAndActive();
  }

  function showError(msg) {
    stateSpan.innerText = msg;
    setTimeout(function () {
      if (stateSpan.innerText === msg) {
        if (currentAudio && isPlaying)
          stateSpan.innerText = " | " + t("d_playing", "...playing");
        else if (currentAudio && !isPlaying)
          stateSpan.innerText = " | " + t("d_paused", " Paused");
        else stateSpan.innerText = " | " + t("d_ready", " Ready");
      }
    }, 3000);
  }

  function playTrack(index, autoPlay) {
    if (autoPlay === undefined) autoPlay = true;
    if (isLocked) {
      showError(t("d_playerLocked", "Player locked – unlock to play"));
      return;
    }
    if (index < 0 || index >= tracks.length) return;
    if (currentAudio && currentIndex === index && isPlaying) return;
    if (currentAudio) stopCurrentAudio(true);
    currentIndex = index;
    var track = tracks[currentIndex];
    trackTitleSpan.innerText = removeFileExtension(track.name);
    try {
      var audio = document.createElement("audio");
      audio.src = track.url;
      audio.volume = 1.0;
      audio.muted = localStorage.getItem("globalMute") === "true";
      currentAudio = audio;
      audio.addEventListener("error", function (e) {
        var err = currentAudio.error,
          em = t("d_cannotPlayFile", "Cannot play file");
        if (err) {
          switch (err.code) {
            case MediaError.MEDIA_ERR_ABORTED:
              em = t("d_playbackAborted", "Playback aborted");
              break;
            case MediaError.MEDIA_ERR_NETWORK:
              em = t("d_networkError", "Network error");
              break;
            case MediaError.MEDIA_ERR_DECODE:
              em = t("d_fileCorrupted", "File corrupted or unsupported format");
              break;
            case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
              em = t("d_formatNotSupported", "Format not supported");
              break;
            default:
              em = t("d_unknownError", "Unknown error");
          }
        }
        showError(em);
        isPlaying = false;
        playPauseBtn.innerHTML = "▶";
        updateTrackIconsAndActive();
      });
      if (autoPlay) {
        var pp = audio.play();
        if (pp !== undefined) {
          pp.then(function () {
            isPlaying = true;
            playPauseBtn.innerHTML = "⏸";
            stateSpan.innerText = t("d_playing", "...playing");
            updateTrackIconsAndActive();
          }).catch(function (err) {
            showError(t("d_cannotPlayFile", "Cannot play file"));
            isPlaying = false;
            playPauseBtn.innerHTML = "▶";
            updateTrackIconsAndActive();
          });
        }
      } else {
        isPlaying = false;
        playPauseBtn.innerHTML = "▶";
        stateSpan.innerText = " | " + t("d_paused", "Paused");
        updateTrackIconsAndActive();
      }
      audio.onended = function () {
        playNext();
      };
    } catch (err) {
      showError(t("d_invalidFile", "Invalid file"));
      isPlaying = false;
      playPauseBtn.innerHTML = "▶";
      updateTrackIconsAndActive();
    }
    ensureVisualiserRunning();
    updateTrackIconsAndActive();
  }

  function playNext() {
    if (isLocked) {
      showError(t("d_playerLocked", "Player locked – unlock to play"));
      return;
    }
    var ni = (currentIndex + 1) % tracks.length;
    playTrack(ni, true);
  }
  function playPrev() {
    if (isLocked) {
      showError(t("d_playerLocked", "Player locked – unlock to play"));
      return;
    }
    var pi = (currentIndex - 1 + tracks.length) % tracks.length;
    playTrack(pi, true);
  }

  function togglePlayPause() {
    if (isLocked) {
      showError(t("d_playerLocked", "Player locked – unlock to play"));
      return;
    }
    if (currentIndex === -1 || !currentAudio) {
      playTrack(0, true);
      return;
    }
    if (isPlaying) {
      currentAudio.pause();
      isPlaying = false;
      playPauseBtn.innerHTML = "▶";
      stateSpan.innerText = " | " + t("d_paused", "...paused");
      updateTrackIconsAndActive();
    } else {
      var pp = currentAudio.play();
      if (pp !== undefined) {
        pp.then(function () {
          isPlaying = true;
          playPauseBtn.innerHTML = "⏸";
          stateSpan.innerText = " | " + t("d_playing", "...playing");
          updateTrackIconsAndActive();
        }).catch(function (err) {
          showError(t("d_cannotResume", "Cannot resume"));
        });
      }
    }
  }

  function onTrackClick(index) {
    if (isLocked) {
      showError(t("d_playerLocked", "Player locked – unlock to play"));
      return;
    }
    if (index === currentIndex && currentAudio) togglePlayPause();
    else playTrack(index, true);
  }

  function applyLockState() {
    if (isLocked) stopCurrentAudio(true);
    playlist.querySelectorAll(".cast-track-item").forEach(function (item) {
      item.style.pointerEvents = isLocked ? "none" : "";
      item.style.opacity = isLocked ? "0.6" : "";
    });
    [prevBtn, playPauseBtn, nextBtn, up, down].forEach(function (btn) {
      if (btn) {
        btn.disabled = isLocked;
        btn.style.opacity = isLocked ? "0.5" : "";
        btn.style.cursor = isLocked ? "not-allowed" : "";
      }
    });
    if (isLocked) {
      stopVisualiserAndClear();
      if (currentIndex === -1) trackTitleSpan.innerText = "—";
      stateSpan.innerText = " | " + t("d_locked", "Locked");
    } else {
      ensureVisualiserRunning();
      if (currentAudio && isPlaying && currentIndex !== -1)
        stateSpan.innerText = " | " + t("d_playing", "Playing");
      else if (currentIndex !== -1 && !isPlaying)
        stateSpan.innerText = " | " + t("d_paused", "Paused");
      else stateSpan.innerText = " | " + t("d_ready", "Ready");
    }
  }

  tracks.forEach(function (tr, i) {
    var el = document.createElement("div");
    el.className = "cast-track-item";
    var iconSpan = document.createElement("span");
    iconSpan.innerHTML = '<i class="fa-solid fa-podcast"></i>';
    var nameSpan = document.createElement("span");
    nameSpan.textContent = removeFileExtension(tr.name);
    el.appendChild(iconSpan);
    el.appendChild(nameSpan);
    el.addEventListener("click", function () {
      onTrackClick(i);
    });
    playlist.appendChild(el);
  });

  lockToggle.addEventListener("click", function (e) {
    e.stopPropagation();
    isLocked = !isLocked;
    localStorage.setItem("castLocked", isLocked);
    updateLockIcon();
    applyLockState();
  });
  prevBtn.addEventListener("click", playPrev);
  nextBtn.addEventListener("click", playNext);
  playPauseBtn.addEventListener("click", togglePlayPause);
  up.addEventListener("click", function () {
    playlist.scrollBy({ top: -300, behavior: "smooth" });
  });
  down.addEventListener("click", function () {
    playlist.scrollBy({ top: 300, behavior: "smooth" });
  });

  var loadMoreBtn = content.querySelector("#castLoadMoreBtn");
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener("click", function () {
      window.triggerLoad({
        accept: "audio/*",
        multiple: true,
        maxSizeMB: 250,
        onFiles: async function (files) {
          var existing = [];
          try { existing = await loadCast(); } catch (e) {}
          await saveCast([...existing, ...files]);
          container.innerHTML = "";
          initCast(container);
        },
        onError: function (msg) { alert(msg); },
      });
    });
  }

  if (pinBtn) {
    headerActions.appendChild(pinBtn);
  }
  applyLockState();

  return function () {
    if (currentAudio) {
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
