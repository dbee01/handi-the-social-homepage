/*
 * Copyright (c) 2026 Handi Homepage
 * This file is part of HandiHomepage and is released under the GNU General Public License v3.0.
 * See the LICENSE file in the repository root for full details.
 */

// modules/cast/cast.module.js
// Podcast player — like the Player module but with 250MB load limit
import { loadCastFn, saveCastFn } from "../../js/core/storage.js";
import { loadSettings } from "../../js/core/settings.js";

function removeFileExtension(filename) {
  return filename
    .replace(/\.[^.]+$/, "")
    .replace(/[+_\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Small HTML escaper for podcast metadata rendered into the module.
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function hostnameOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch (e) {
    return "";
  }
}

// Pull channel-level podcast metadata (title, thumbnail, description,
// author, website link) out of an iTunes-compatible RSS feed.
function parseCastInfo(doc) {
  function firstText(selector) {
    const el = doc.querySelector(selector);
    return el ? (el.textContent || "").trim() : "";
  }
  function firstTagText(tagName) {
    const el = doc.getElementsByTagName(tagName)[0];
    return el ? (el.textContent || "").trim() : "";
  }
  var title = firstText("channel > title") || firstText("feed > title") || "";
  var image = "";
  var itunesImage = doc.getElementsByTagName("itunes:image")[0];
  if (itunesImage) image = (itunesImage.getAttribute("href") || "").trim();
  if (!image) image = firstText("channel > image > url");
  var description =
    firstTagText("itunes:summary") ||
    firstTagText("itunes:subtitle") ||
    firstText("channel > description") ||
    "";
  var author = firstTagText("itunes:author") || "";
  var link = firstText("channel > link") || firstText("feed > link") || "";
  return {
    title: title,
    image: image,
    description: description,
    author: author,
    link: link,
  };
}

// If `url` is an RSS/Atom podcast feed, parse its episodes (title + audio
// enclosure) into tracks. Returns [] when it isn't a feed, so plain audio
// stream URLs keep working through the live-stream path below.
async function fetchCastFeed(url) {
  try {
    const resp = await fetch("/api/feed?url=" + encodeURIComponent(url));
    if (!resp.ok) return { info: null, tracks: [] };
    const doc = new DOMParser().parseFromString(await resp.text(), "text/xml");
    if (doc.querySelector("parsererror")) return { info: null, tracks: [] };
    const items = doc.getElementsByTagName("item");
    const out = [];
    for (let i = 0; i < items.length; i++) {
      const enclosures = items[i].getElementsByTagName("enclosure");
      if (!enclosures.length) continue;
      const audioUrl = (enclosures[0].getAttribute("url") || "").trim();
      if (!audioUrl) continue;
      const titles = items[i].getElementsByTagName("title");
      out.push({
        name: titles.length
          ? (titles[0].textContent || "").trim()
          : "Episode " + (i + 1),
        url: audioUrl,
        isStream: false,
        isEpisode: true,
      });
    }
    return { info: parseCastInfo(doc), tracks: out };
  } catch (e) {
    return { info: null, tracks: [] };
  }
}

// Returns true only when the URL answers with a 2xx status (HEAD first, GET fallback).
async function castStreamOk(url) {
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

export default async function initCast(container) {
  var t =
    window.t ||
    function (k, e) {
      return e || k;
    };

  const headerRow = document.createElement("div");
  headerRow.className = "music-header-row";
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
  headerActions.className = "music-header-actions";
  const lockToggle = document.createElement("button");
  lockToggle.className = "music-lock-toggle";
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
    parentItem.style.minHeight = "420px";
  }

  var tracks = [];
    try {
      tracks = await loadCastFn();
    } catch (err) {
      tracks = [];
    }

  // LIST & PLAY: when a stream/feed URL is configured and reachable, use it.
  var streamUrl = "";
  try {
    streamUrl = (
      (loadSettings().cast && loadSettings().cast.streamUrl) ||
      ""
    ).trim();
  } catch (e) {
    streamUrl = "";
  }
  var castInfo = null;
  if (streamUrl) {
    // Podcast RSS/Atom feed? Then list its episodes; otherwise treat it as a
    // direct audio stream and offer it as a single live track.
    var castFeed = await fetchCastFeed(streamUrl);
    var feedTracks = castFeed.tracks || [];
    if (feedTracks.length) {
      castInfo = castFeed.info || null;
      tracks = feedTracks.concat(tracks);
    } else if (await castStreamOk(streamUrl)) {
      tracks = [
        { name: t("d_castStream", "Live Stream"), url: streamUrl, isStream: true },
      ].concat(tracks);
    }
  }

  if (!tracks.length) {
    content.innerHTML =
      '<div class="module-empty"><i class="fa-solid fa-podcast"></i><p>' +
      t("d_noCast", "Load your podcasts here") +
      '</p><div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;">' +
      '<button id="castLoadBtn" class="settings-link-btn"><i class="fa-solid fa-cloud-arrow-up"></i> ' +
      t("d_loadCastFn", "Load Podcasts") +
      '</button></div></div>';
    var loadBtn = content.querySelector("#castLoadBtn");
    if (loadBtn)
      loadBtn.onclick = function () {
        window.triggerLoad({
          accept: "audio/*",
          multiple: true,
          maxSizeMB: 250,
          onFiles: async (files) => {
                      await saveCastFn(files);
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

  // Podcast info card (title, thumbnail, description, …) above the player.
  var infoHtml = "";
  if (castInfo && (castInfo.title || castInfo.image)) {
    infoHtml =
      '<div class="cast-info" style="display:flex;gap:12px;align-items:flex-start;margin:0 0 10px;padding:16px;border-radius:10px;border:1px solid color-mix(in srgb, var(--topbar-accent, #0047cc) 25%, transparent);background:color-mix(in srgb, var(--topbar-accent, #0047cc) 5%, transparent);">' +
      (castInfo.image
        ? '<img src="' + escapeHtml(castInfo.image) + '" alt="" loading="lazy" style="width:88px;height:88px;border-radius:8px;object-fit:cover;flex-shrink:0;" onerror="this.style.display=\'none\'"/>'
        : "") +
      '<div style="min-width:0;flex:1;">' +
      (castInfo.title
        ? '<div style="font-weight:700;font-size:1.05rem;line-height:1.3;">' +
          escapeHtml(castInfo.title) +
          "</div>"
        : "") +
      (castInfo.author
        ? '<div style="font-size:0.85rem;opacity:0.7;margin-top:2px;">' +
          escapeHtml(castInfo.author) +
          "</div>"
        : "") +
      (castInfo.description
        ? '<div style="font-size:0.9rem;line-height:1.4;opacity:0.85;margin-top:6px;"><span id="castDesc">' +
          escapeHtml(
            castInfo.description.length > 180
              ? castInfo.description
                  .slice(0, 180)
                  .replace(/\s+\S*$/, "") + "…"
              : castInfo.description,
          ) +
          "</span>" +
          (castInfo.description.length > 180
            ? ' <a href="#" id="castDescMore" style="font-weight:700;white-space:nowrap;">' +
              t("d_more", "More") +
              "</a>"
            : "") +
          "</div>"
        : "") +
      (castInfo.link
        ? '<a href="' +
          escapeHtml(castInfo.link) +
          '" target="_blank" rel="noopener" style="display:inline-block;margin-top:8px;font-size:0.9rem;font-weight:700;">' +
          t("d_castWebsite", "Website") +
          " ↗</a>"
        : "") +
      "</div></div>";
  }

  // Mastodon-style source bar: website · feed label + change source button.
  var sourceBarHtml = "";
  if (streamUrl) {
    var srcWebsite =
      hostnameOf((castInfo && castInfo.link) || streamUrl) ||
      hostnameOf(streamUrl);
    var srcLabel = castInfo && castInfo.title
      ? castInfo.title
      : t("d_castStream", "Live Stream");
    sourceBarHtml =
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">' +
      '<small style="opacity:0.7;">' +
      escapeHtml(srcWebsite) +
      " · " +
      escapeHtml(srcLabel) +
      "</small>" +
      '<button id="castChangeSource" style="background:none;border:none;cursor:pointer;font-size:0.85rem;opacity:0.6;color:inherit;" title="' +
      t("d_changeSource", "Change source") +
      '"><i class="fa-solid fa-rotate-right"></i> ' +
      t("d_changeSource", "Source") +
      "</button></div>";
  }

  content.innerHTML =
    sourceBarHtml +
    infoHtml +
    '<div class="music-now-playing"><canvas id="castSynth" class="music-synth"></canvas><div id="music-status" class="music-status"><span id="music-track-title">—</span><span class="music-state-text">' +
    t("d_ready", "Ready") +
    '</span></div></div><div class="music-controls"><button id="music-prev">⏮</button><button id="music-playpause" class="primary">▶</button><button id="music-next">⏭</button></div><div style="text-align:center;margin-bottom:8px;"><button id="castLoadMoreBtn" class="settings-link-btn" style="padding:6px 14px;"><i class="fa-solid fa-cloud-arrow-up"></i> ' +
    t("d_loadCastFn", "Load Podcasts") +
        '</button></div><div class="music-scroll-wrapper" style="display:flex;flex-direction:column;gap:8px;"><button id="castScrollUp" class="music-scroll-btn" style="display:block;width:100%;">▲</button><div id="music-playlist" class="music-playlist" style="max-height:none;overflow:visible;"></div><button id="castScrollDown" class="music-scroll-btn" style="display:block;width:100%;">▼</button></div>';

  var synthCanvas = content.querySelector("#castSynth"),
    playlist = content.querySelector("#music-playlist");
  var up = content.querySelector("#castScrollUp"),
    down = content.querySelector("#castScrollDown");
  var playPauseBtn = content.querySelector("#music-playpause"),
    trackTitleSpan = content.querySelector("#music-track-title");

  // "Change source" -> open the Cast settings section.
  var castChangeBtn = content.querySelector("#castChangeSource");
  if (castChangeBtn)
    castChangeBtn.onclick = function () {
      window.location.href = "settings.html?args=cast";
    };

  // "More" link — inline at the end of the preview text. Expands to the
  // full description (capped at 500 characters), "Less" collapses back.
  var descEl = content.querySelector("#castDesc");
  var descMoreEl = content.querySelector("#castDescMore");
  if (descEl && descMoreEl && castInfo && castInfo.description) {
    var fullDesc = castInfo.description;
    var previewDesc =
      fullDesc.length > 180
        ? fullDesc.slice(0, 180).replace(/\s+\S*$/, "") + "…"
        : fullDesc;
    var clampedDesc =
      fullDesc.length > 500
        ? fullDesc.slice(0, 500).replace(/\s+\S*$/, "") + "…"
        : fullDesc;
    var moreText = t("d_more", "More"),
      lessText = t("d_less", "Less");
    descMoreEl.addEventListener("click", function (e) {
      e.preventDefault();
      if (descMoreEl.textContent === lessText) {
        descEl.textContent = previewDesc;
        descMoreEl.textContent = moreText;
      } else {
        descEl.textContent = clampedDesc;
        descMoreEl.textContent = lessText;
      }
    });
  }
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
            : "fa-podcast";
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
    trackTitleSpan.innerText = track.isEpisode
      ? track.name
      : removeFileExtension(track.name);
    try {
      var audio = document.createElement("audio");
      audio.src = track.url;
      audio.volume = 1.0;
      audio.muted = localStorage.getItem("globalMute") === "true";
      currentAudio = audio;
      audio.addEventListener("error", function (e) {
        var err = currentAudio.error,
          em;
        if (track.isStream) {
          em = t("d_cannotPlayStream", "Cannot play live stream");
        } else {
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
                      ensureVisualiserRunning();
                    }).catch(function (err) {
            showError(
              track.isStream
                ? t("d_cannotPlayStream", "Cannot play live stream")
                : t("d_cannotPlayFile", "Cannot play file"),
            );
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
          stopVisualiserAndClear();
              } else {
      var pp = currentAudio.play();
      if (pp !== undefined) {
        pp.then(function () {
                  isPlaying = true;
                  playPauseBtn.innerHTML = "⏸";
                  stateSpan.innerText = " | " + t("d_playing", "...playing");
                  updateTrackIconsAndActive();
                  ensureVisualiserRunning();
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
    playlist.querySelectorAll(".music-track-item").forEach(function (item) {
      item.style.pointerEvents = isLocked ? "none" : "";
      item.style.opacity = isLocked ? "0.6" : "";
    });
    [prevBtn, playPauseBtn, nextBtn, up, down].forEach(function (btn) {
      if (btn) {
        btn.disabled = isLocked;
        btn.style.cursor = isLocked ? "not-allowed" : "";
        if (isLocked) {
          btn.style.opacity = "0.5";
        } else if (btn !== up && btn !== down) {
          btn.style.opacity = "";
        }
      }
    });
    if (!isLocked) updateCastVisibility();
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

  // Homepage list: show 10 episodes at a time; the up/down buttons page
  // through them and dim when there's nothing more in that direction.
  const CAST_VISIBLE = 10;
  const CAST_STEP = 5;
  var castStart = 0;
  var trackEls = [];

  tracks.forEach(function (tr, i) {
    var el = document.createElement("div");
    el.className = "music-track-item";
    var iconSpan = document.createElement("span");
    iconSpan.innerHTML = tr.isStream
      ? '<i class="fa-solid fa-tower-broadcast"></i>'
      : '<i class="fa-solid fa-podcast"></i>';
    var nameSpan = document.createElement("span");
    nameSpan.textContent = tr.isEpisode
      ? tr.name
      : removeFileExtension(tr.name);
    el.appendChild(iconSpan);
    el.appendChild(nameSpan);
    el.addEventListener("click", function () {
      onTrackClick(i);
    });
    playlist.appendChild(el);
    trackEls.push(el);
  });

  function updateCastVisibility() {
    trackEls.forEach(function (el, i) {
      el.style.display =
        i >= castStart && i < castStart + CAST_VISIBLE ? "" : "none";
    });
    up.style.opacity = castStart === 0 ? "0.7" : "1";
    down.style.opacity =
      castStart + CAST_VISIBLE >= tracks.length ? "0.7" : "1";
  }
  updateCastVisibility();

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
    if (castStart > 0) {
      castStart = Math.max(0, castStart - CAST_STEP);
      updateCastVisibility();
    }
  });
  down.addEventListener("click", function () {
    if (castStart + CAST_VISIBLE < tracks.length) {
      castStart = Math.min(
        tracks.length - CAST_VISIBLE,
        castStart + CAST_STEP,
      );
      updateCastVisibility();
    }
  });

  var loadMoreBtn = content.querySelector("#castLoadMoreBtn");
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener("click", function () {
      window.triggerLoad({
        accept: "audio/*",
        multiple: true,
        maxSizeMB: 250,
        onFiles: async function (files) {
                  await saveCastFn(files);
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
