/*
 * Copyright (c) 2026 Handi Homepage
 * This file is part of HandiHomepage and is released under the GNU General Public License v3.0.
 * See the LICENSE file in the repository root for full details.
 */

// modules/music/music.module.js
import { loadMusic, saveMusic } from "../../js/core/storage.js";
import { loadSettings } from "../../js/core/settings.js";

function removeFileExtension(filename) {
  return filename
    .replace(/\.[^.]+$/, "")
    .replace(/[+_\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Persists { index, t, playing } across reloads so playback can be resumed
// after the browser or service worker reloads the page mid-song.
const MUSIC_SESSION_KEY = "handiMusicSession";

// Returns true only when the URL answers with a 2xx status (HEAD first, GET fallback).
async function musicStreamOk(url) {
  function withTimeout(opts) {
    var ctrl = new AbortController();
    var timer = setTimeout(function () {
      ctrl.abort();
    }, 8000);
    return fetch(url, Object.assign({ cache: "no-store", signal: ctrl.signal }, opts)).finally(
      function () {
        clearTimeout(timer);
      },
    );
  }
  try {
    var r = await withTimeout({ method: "HEAD" });
    if (r.ok) return true;
  } catch (e) {}
  try {
    var r = await withTimeout({ method: "GET" });
    if (r.ok) {
      try {
        if (r.body && r.body.cancel) r.body.cancel();
      } catch (e) {}
      return true;
    }
  } catch (e) {}
  return false;
}

export default async function initMusic(container) {
  var t =
    window.t ||
    function (k, e) {
      return e || k;
    };

  // If a previous module instance left an <audio> element playing (the
  // dashboard re-inits this module without calling the old instance's cleanup),
  // kill it now — otherwise loadMusic() below revokes its blob URL and the
  // orphaned element dies with a "Network Error".
  var orphan = window.__handiMusicAudio;
  if (orphan) {
    try { orphan.pause(); } catch (e) {}
    try { orphan.removeAttribute("src"); orphan.load(); } catch (e) {}
    if (orphan.parentNode) orphan.parentNode.removeChild(orphan);
    window.__handiMusicAudio = null;
  }

  const headerRow = document.createElement("div");
  headerRow.className = "music-header-row";
  const title = document.createElement("div");
  title.className = "panel-title";
  title.innerHTML =
    '<i class="fa-solid fa-music"></i> ' +
    t(
      "modules.music.name",
      window.LANG && window.LANG.modules && window.LANG.modules.music
        ? window.LANG.modules.music.name
        : "PLAYER",
    );
  headerRow.appendChild(title);

  const headerActions = document.createElement("div");
  headerActions.className = "music-header-actions";
  const lockToggle = document.createElement("button");
  lockToggle.className = "music-lock-toggle";
  var saved = window.handiNs.get("musicLocked"),
    regCfg =
      (window.HANDI_MODULE_BY_ID &&
        window.HANDI_MODULE_BY_ID("music")?.settingsConfig?.soundLock) ??
      true,
    isLocked = saved !== null ? saved === "true" : regCfg;
  function updateLockIcon() {
    lockToggle.innerHTML = isLocked
      ? '<i class="fa-solid fa-lock"></i>'
      : '<i class="fa-solid fa-lock-open"></i>';
  }
  updateLockIcon();
  headerActions.appendChild(lockToggle);
  var originalPinBtn = container.querySelector(".pin-btn"),
    pinBtn = originalPinBtn;
  headerRow.appendChild(headerActions);
  container.innerHTML = "";
  container.appendChild(headerRow);

  var content = document.createElement("div");
  content.className = "music-content";
  container.appendChild(content);
  var parentItem = container.closest(".dashboard-item");
  if (parentItem) {
    parentItem.dataset.module = "music";
  }

  var tracks = [];
  try {
    tracks = await loadMusic();
  } catch (err) {
    if (!window.indexedDB) {
      content.innerHTML =
        '<div class="module-empty"><i class="fa-solid fa-triangle-exclamation"></i><p>' +
        t(
          "d_musicStorageBlocked",
          'Your browser blocks storage. Check Firefox settings → Privacy → make sure "Never remember history" is OFF.',
        ) +
        "</p></div>";
    } else {
      content.innerHTML =
        '<div class="module-empty"><i class="fa-solid fa-exclamation-triangle"></i><p>' +
        t("d_musicLoadFailed", "Failed to load music library.") +
        '</p><button id="musicRetryBtn" class="settings-link-btn"><i class="fa-solid fa-rotate-right"></i> ' +
        t("d_retry", "Retry") +
        "</button></div>";
      var rBtn = content.querySelector("#musicRetryBtn");
      if (rBtn)
        rBtn.onclick = function () {
          location.reload();
        };
    }
    return;
  }

  // Save the given (already merged) music files with a byte-accurate progress
  // bar (drawn by the triggerLoad overlay). Alerts and returns false on error.
  async function saveUploadedFiles(files, loadOpts) {
    try {
      await saveMusic(files, function (doneBytes, totalBytes, name) {
        if (loadOpts && loadOpts.setProgress) {
          loadOpts.setProgress(doneBytes, totalBytes, name);
        }
      });
      return true;
    } catch (err) {
      var quota =
        err &&
        (err.name === "QuotaExceededError" ||
          /quota/i.test(err.message || ""));
      alert(
        quota
          ? t(
              "d_musicStorageBlocked",
              "Not enough storage on this device to save the music files.",
            )
          : t("d_musicLoadFailed", "Could not save music") +
            ": " +
            (err.message || err),
      );
      return false;
    }
  }

  // LIST & PLAY: uploaded files always win. A configured stream URL is only
  // used as a fallback when there is nothing stored on the device.
  var hasUploads = tracks.length > 0;
  var streamUrl = "";
  if (!hasUploads) {
    try {
      streamUrl = (
        (loadSettings().music && loadSettings().music.streamUrl) ||
        ""
      ).trim();
    } catch (e) {
      streamUrl = "";
    }
    if (streamUrl && (await musicStreamOk(streamUrl))) {
      tracks = [
        { name: t("d_musicStream", "Live Stream"), url: streamUrl, isStream: true },
      ].concat(tracks);
    }
  }

  if (!tracks.length) {
    content.innerHTML =
      '<div class="module-empty"><i class="fa-solid fa-music"></i><p>' +
      t("d_noMusic", "No music loaded.") +
      '</p><div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;">' +
      '<button id="musicUploadBtn" class="settings-link-btn"><i class="fa-solid fa-upload"></i> ' +
      t("d_loadMusic", "Load Music") +
      '</button></div></div>';
    var uBtn = content.querySelector("#musicUploadBtn");
    if (uBtn)
      uBtn.onclick = function () {
        var loadOpts = {
          accept: "audio/*",
          multiple: true,
          maxSizeMB: 1024,
          progress: true,
          onFiles: async (files) => {
            var existing = [];
            try {
              existing = await loadMusic();
            } catch (e) {}
            if (await saveUploadedFiles([...existing, ...files], loadOpts)) {
              container.innerHTML = "";
              await initMusic(container);
              if (window.refreshDashboardLayout) window.refreshDashboardLayout();
            }
          },
          onError: function (msg) {
            alert(msg);
          },
        };
        window.triggerLoad(loadOpts);
      };
    return;
  }

  	var currentAudio = null,
    		currentIndex = -1,
    		isPlaying = false,
    		stopVisualiser = null,
    		pendingAutoPlayIndex = -1,
    		recoveryAttempts = 0,
    		lastProgress = 0,
    		stallCheck = null;

	  function readSession() {
	    try {
	      var s = JSON.parse(
	        sessionStorage.getItem(MUSIC_SESSION_KEY) || "null",
	      );
	      if (s && typeof s.index === "number" && typeof s.t === "number")
	        return s;
	    } catch (e) {}
	    return null;
	  }
	  function saveSession(playing) {
	    try {
	      sessionStorage.setItem(
	        MUSIC_SESSION_KEY,
	        JSON.stringify({
	          index: currentIndex,
	          t: currentAudio ? currentAudio.currentTime || 0 : 0,
	          playing: !!playing,
	          at: Date.now(),
	        }),
	      );
	    } catch (e) {}
	  }

	  // Remember where we are when the page goes away (reload, background,
	  // tab switch) so playback can be resumed if the page is reloaded.
	  function onPageHide() {
	    if (currentAudio && isPlaying) saveSession(true);
	    else if (currentIndex !== -1) saveSession(false);
	  }
	  function onVisibilityChange() {
	    if (document.visibilityState === "hidden" && currentAudio && isPlaying)
	      saveSession(true);
	  }
	  window.addEventListener("pagehide", onPageHide);
	  document.addEventListener("visibilitychange", onVisibilityChange);

	  function applyGlobalMute(muted) {
	    if (currentAudio) currentAudio.muted = muted;
	  }
	  window.addEventListener("globalMuteToggle", function (e) {
	    applyGlobalMute(e.detail.muted);
	  });
	  applyGlobalMute(window.handiNs.get("globalMute") === "true");

  content.innerHTML =
    '<div class="music-now-playing"><canvas id="music-synth" class="music-synth"></canvas><div id="music-status" class="music-status"><span id="music-track-title">—</span><span class="music-state-text">' +
    t("d_ready", "Ready") +
    '</span></div></div><div class="music-controls"><button id="music-prev">⏮</button><button id="music-playpause" class="primary">▶</button><button id="music-next">⏭</button></div><div style="text-align:center;margin-bottom:8px;"><button id="musicLoadMoreBtn" class="settings-link-btn" style="padding:6px 14px;"><i class="fa-solid fa-upload"></i> ' +
    t("d_loadMusic", "Load Music") +
    '</button></div><div class="music-scroll-wrapper"><button id="musicScrollUp" class="music-scroll-btn">▲</button><div id="music-playlist" class="music-playlist"></div><button id="musicScrollDown" class="music-scroll-btn">▼</button></div>';

  var synthCanvas = content.querySelector("#music-synth"),
    playlist = content.querySelector("#music-playlist");
  var up = content.querySelector("#musicScrollUp"),
    down = content.querySelector("#musicScrollDown");
  var playPauseBtn = content.querySelector("#music-playpause"),
    trackTitleSpan = content.querySelector("#music-track-title");
  var stateSpan = content.querySelector(".music-state-text"),
    prevBtn = content.querySelector("#music-prev"),
    nextBtn = content.querySelector("#music-next");
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
  function ensureVisualiserRunning() {
    if (isPlaying && !isLocked) {
      if (!stopVisualiser) stopVisualiser = startFakeVisualiser(synthCanvas);
    } else {
      stopVisualiserAndClear();
    }
  }

  function updateTrackIconsAndActive() {
    var items = playlist.querySelectorAll(".music-track-item");
    items.forEach(function (el, i) {
      var iconSpan = el.querySelector("span");
      var isCur = i === currentIndex && isPlaying;
      if (iconSpan) {
        var baseIcon =
          tracks[i] && tracks[i].isStream
            ? "fa-tower-broadcast"
            : "fa-music";
        iconSpan.innerHTML = isCur
          ? '<i class="fa-solid fa-pause"></i>'
          : i === currentIndex
            ? '<i class="fa-solid fa-play"></i>'
            : '<i class="fa-solid ' + baseIcon + '"></i>';
      }
      el.classList.toggle("active", i === currentIndex);
    });
  }

  function stopCurrentAudio(keepIndex) {
    var a = currentAudio;
    currentAudio = null;
    if (a) {
      try { a.pause(); } catch (e) {}
      try { a.removeAttribute("src"); a.load(); } catch (e) {}
      if (a.parentNode) a.parentNode.removeChild(a);
      if (window.__handiMusicAudio === a) window.__handiMusicAudio = null;
    }
    pendingAutoPlayIndex = -1;
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

  // Rebuild the blob URL for a local file and resume from the last known
  // position. Used both on a hard media error and when the blob pull stalls
  // without firing an error (the Vivaldi-tablet cut-out). Returns false when
  // there is nothing to recover (stream, attempts exhausted).
  function attemptRecovery(audio) {
    var track = tracks[currentIndex];
    if (!track || !track.file) return false;
    if (recoveryAttempts >= 3) return false;
    var s = readSession();
    var resumeAt =
      (audio && audio.currentTime) ||
      (s && s.index === currentIndex ? s.t : 0) ||
      0;
    // If the pull died within the last few seconds of the track, resuming at
    // the same spot would just re-stall on the same tail bytes — advance to
    // the next track instead of looping.
    if (
      audio &&
      isFinite(audio.duration) &&
      audio.duration > 0 &&
      resumeAt > audio.duration - 4
    ) {
      playNext();
      return true;
    }
    recoveryAttempts++;
    isPlaying = false;
    stopCurrentAudio(true);
    try { URL.revokeObjectURL(track.url); } catch (e) {}
    try { track.url = URL.createObjectURL(track.file); } catch (e) { track.url = ""; }
    if (!track.url) return false;
    playTrack(currentIndex, true, resumeAt);
    return true;
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

  function playTrack(index, autoPlay, startAt) {
    if (autoPlay === undefined) autoPlay = true;
    if (isLocked) {
      showError(t("d_playerLocked", "Player locked – unlock to play"));
      return;
    }
    if (index < 0 || index >= tracks.length) return;
    if (currentAudio && currentIndex === index && isPlaying) return;

    stopCurrentAudio(true);
    currentIndex = index;
    pendingAutoPlayIndex = -1;
    var track = tracks[currentIndex];
    trackTitleSpan.innerText = removeFileExtension(track.name);

    try {
      // Fresh element per play (same as the Cast module, which does not suffer
      // the ~60s cut-out). Keep it in the DOM while playing so Android Chrome
      // treats it as active, gesture-initiated media instead of pausing it.
      var audio = document.createElement("audio");
      audio.setAttribute("playsinline", "");
      audio.setAttribute("webkit-playsinline", "");
      // The file is already local (an in-memory blob), so ask the browser to
      // buffer the whole thing up front instead of relying on progressive
      // range pulls — a failed range read is the tablet cut-out. Capped: a
      // multi-hundred-MB file buffered fully could OOM a tablet.
      audio.preload =
        track.file && track.file.size > 50 * 1024 * 1024
          ? "metadata"
          : "auto";
      audio.volume = 1.0;
      audio.muted = window.handiNs.get("globalMute") === "true";
      audio.src = track.url;
      (document.body || document.documentElement).appendChild(audio);
      window.__handiMusicAudio = audio;
      currentAudio = audio;

      // Resume from a previous position (used by the blob-URL self-heal).
      if (startAt) {
        audio.addEventListener(
          "loadedmetadata",
          function () {
            try {
              if (audio.currentTime !== startAt) audio.currentTime = startAt;
            } catch (e) {}
          },
          { once: true },
        );
      }
      // Actual playback started — the source is healthy again.
      audio.addEventListener("playing", function () {
        recoveryAttempts = 0;
        lastProgress = Date.now();
      });

      // Keep the resume position fresh (used by the blob-URL self-heal and
      // by the post-reload resume). Throttled — every ~3s is plenty.
      var lastPosSave = 0;
      audio.addEventListener("timeupdate", function () {
        if (currentAudio !== audio) return;
        var now = Date.now();
        lastProgress = now;
        if (now - lastPosSave > 3000) {
          lastPosSave = now;
          saveSession(true);
        }
      });

      audio.addEventListener("waiting", function () {
        if (currentAudio === audio && isPlaying) {
          stateSpan.innerText = " | " + t("d_buffering", "Buffering…");
        }
      });
      audio.addEventListener("canplay", function () {
        if (currentAudio === audio && isPlaying) {
          stateSpan.innerText = " | " + t("d_playing", "...playing");
        }
      });
      audio.addEventListener("stalled", function () {
        if (currentAudio === audio && isPlaying) {
          stateSpan.innerText = " | " + t("d_buffering", "Buffering…");
        }
      });
      audio.addEventListener("error", function () {
        var err = audio.error;

        // The file lives on-device, so a "network error" means the browser
        // invalidated the blob URL (revoked / evicted / closed on tab sleep or
        // screen-off, which is the Vivaldi-tablet ~60s cut-out). Rebuild the
        // blob URL from the stored File and resume from the same position.
        if (err && err.code === MediaError.MEDIA_ERR_NETWORK) {
          if (attemptRecovery(audio)) return;
        }

        var em = t("d_cannotPlayFile", "Cannot play file");
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
      audio.addEventListener("ended", function () {
        // Auto-advance. If the browser blocks the next play() (autoplay
        // policy), the catch path sets up a pending state to resume by tap.
        playNext();
      });

      if (autoPlay) {
        var pp = audio.play();
        if (pp !== undefined) {
          pp.then(function () {
            isPlaying = true;
            playPauseBtn.innerHTML = "⏸";
            stateSpan.innerText = " | " + t("d_playing", "...playing");
            updateTrackIconsAndActive();
            ensureVisualiserRunning();
            saveSession(true);
          }).catch(function (err) {
            // If autoplay was blocked (common on mobile when not in a user gesture),
            // set up a pending state that the user can resume with a tap.
            if (err && err.name === "NotAllowedError") {
              pendingAutoPlayIndex = index;
              isPlaying = false;
              playPauseBtn.innerHTML = "▶";
              stateSpan.innerText = " | " + t("d_tapToPlay", "Tap ▶ to play");
              updateTrackIconsAndActive();
            } else {
              showError(t("d_cannotPlayFile", "Cannot play file"));
              isPlaying = false;
              playPauseBtn.innerHTML = "▶";
              updateTrackIconsAndActive();
            }
          });
        }
      } else {
        isPlaying = false;
        playPauseBtn.innerHTML = "▶";
        stateSpan.innerText = " | " + t("d_paused", "Paused");
        updateTrackIconsAndActive();
      }
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
    pendingAutoPlayIndex = -1;
    playTrack(ni, true);
  }
  function playPrev() {
    if (isLocked) {
      showError(t("d_playerLocked", "Player locked – unlock to play"));
      return;
    }
    var pi = (currentIndex - 1 + tracks.length) % tracks.length;
    pendingAutoPlayIndex = -1;
    playTrack(pi, true);
  }

  function togglePlayPause() {
    if (isLocked) {
      showError(t("d_playerLocked", "Player locked – unlock to play"));
      return;
    }
    // If we have a pending auto-play track that was blocked, play it now
    // (this call is from a user gesture, so it will succeed)
    if (pendingAutoPlayIndex !== -1) {
      playTrack(pendingAutoPlayIndex, true);
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
      stopVisualiserAndClear();
      saveSession(false);
    } else {
      var pp = currentAudio.play();
      if (pp !== undefined) {
        pp.then(function () {
          isPlaying = true;
          playPauseBtn.innerHTML = "⏸";
          stateSpan.innerText = " | " + t("d_playing", "...playing");
          updateTrackIconsAndActive();
          ensureVisualiserRunning();
          saveSession(true);
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
    pendingAutoPlayIndex = -1;
    if (index === currentIndex && currentAudio) togglePlayPause();
    else playTrack(index, true);
  }

  function applyLockState() {
    if (isLocked) stopCurrentAudio(true);
    playlist.querySelectorAll(".music-track-item").forEach(function (item) {
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
    el.className = "music-track-item";
    var iconSpan = document.createElement("span");
    iconSpan.innerHTML = tr.isStream
      ? '<i class="fa-solid fa-tower-broadcast"></i>'
      : '<i class="fa-solid fa-music"></i>';
    var nameSpan = document.createElement("span");
    nameSpan.textContent = removeFileExtension(tr.name);
    el.appendChild(iconSpan);
    el.appendChild(nameSpan);
    el.addEventListener("click", function () {
      onTrackClick(i);
    });
    playlist.appendChild(el);
  });

  // Resume a session that was playing when the page was reloaded (tab
  // restore, service-worker / cross-tab reload, etc.). On mobile, autoplay
  // may be blocked — the play() rejection leaves the track selected as
  // "Tap ▶ to play".
  (function () {
    var s = readSession();
    if (!s) return;
    if (s.index < 0 || s.index >= tracks.length) return;
    if (!s.playing) {
      currentIndex = s.index;
      trackTitleSpan.innerText = removeFileExtension(tracks[s.index].name);
      stateSpan.innerText = " | " + t("d_paused", " Paused");
      updateTrackIconsAndActive();
      return;
    }
    // Only auto-resume recent sessions that were actively playing.
    if (Date.now() - (s.at || 0) > 6 * 60 * 60 * 1000) return;
    var resumeIndex = s.index;
    var resumeAt = s.t > 0 ? s.t : 0;
    setTimeout(function () {
      playTrack(resumeIndex, true, resumeAt);
    }, 400);
  })();

  lockToggle.addEventListener("click", function (e) {
    e.stopPropagation();
    isLocked = !isLocked;
    window.handiNs.set("musicLocked", isLocked);
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

  var loadMoreBtn = content.querySelector("#musicLoadMoreBtn");
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener("click", function () {
      var loadOpts = {
        accept: "audio/*",
        multiple: true,
        maxSizeMB: 1024,
        progress: true,
        onFiles: async function (files) {
          var existing = [];
          try {
            existing = await loadMusic();
          } catch (e) {}
          if (await saveUploadedFiles([...existing, ...files], loadOpts)) {
            container.innerHTML = "";
            await initMusic(container);
            if (window.refreshDashboardLayout) window.refreshDashboardLayout();
          }
        },
        onError: function (msg) {
          alert(msg);
        },
      };
      window.triggerLoad(loadOpts);
    });
  }

  // Watchdog: a local file buffers instantly, so if the element says it's
  // playing but makes no progress for a while, the blob pull has stalled
  // (Vivaldi tablet cut-out) without firing an error event. Rebuild and
  // resume rather than hanging on "Buffering…" forever.
  stallCheck = setInterval(function () {
    if (!isPlaying || !currentAudio || currentAudio.paused) return;
    if (currentAudio.readyState < 2) return; // no data yet — not a stall
    if (Date.now() - lastProgress > 8000) {
      attemptRecovery(currentAudio);
    }
  }, 3000);

  if (pinBtn) {
    headerActions.appendChild(pinBtn);
  }
  applyLockState();

  return function () {
    if (stallCheck) {
      clearInterval(stallCheck);
      stallCheck = null;
    }
    window.removeEventListener("pagehide", onPageHide);
    document.removeEventListener("visibilitychange", onVisibilityChange);
    var a = currentAudio;
    currentAudio = null;
    if (a) {
      try { a.pause(); } catch (e) {}
      try { a.removeAttribute("src"); a.load(); } catch (e) {}
      if (a.parentNode) a.parentNode.removeChild(a);
      if (window.__handiMusicAudio === a) window.__handiMusicAudio = null;
    }
    stopVisualiserAndClear();
  };
}
