/*
 * Copyright (c) 2026 Handi Homepage
 * This file is part of HandiHomepage and is released under the GNU General Public License v3.0.
 * See the LICENSE file in the repository root for full details.
 */

// js/core/ring-alert.js
// Standalone ringing / red-flash alert for incoming calls.
//
// This is intentionally separate from the calendar module so a ringing phone
// always produces the visual + audible alert, even when the calendar module
// isn't enabled (the calendar is premium and usually off). Any module can
// trigger it by dispatching window "handiRingingStart" / "handiRingingStop"
// events, or by calling the exposed window.handiRingAlert API directly.

(function () {
  var FLASH_COLORS = ["rgba(220, 0, 0, 0.25)", "rgba(220, 0, 0, 0.50)"];

  var flashOverlay = null;
  var flashInterval = null;
  var dismissHandler = null;
  var audioCtx = null;
  var osc = null;
  var gain = null;
  var beepStopTimer = null;

  function initAudio() {
    if (audioCtx) return audioCtx;
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      audioCtx = null;
    }
    return audioCtx;
  }

  function startBeep() {
    var ctx = initAudio();
    if (!ctx) return;
    if (ctx.state === "suspended") {
      ctx.resume().catch(function () {});
    }
    var o = ctx.createOscillator();
    var g = ctx.createGain();
    o.type = "square";
    o.frequency.value = 880;
    g.gain.value = 0.15;
    o.connect(g);
    g.connect(ctx.destination);
    o.start();

    var startTime = ctx.currentTime;
    var duration = 10;
    for (var t = 0; t < duration; t += 0.5) {
      var isOn = Math.floor(t / 0.5) % 2 === 0;
      g.gain.setValueAtTime(isOn ? 0.15 : 0, startTime + t);
    }
    g.gain.setValueAtTime(0, startTime + duration);
    o.stop(startTime + duration);

    osc = o;
    gain = g;

    if (beepStopTimer) clearTimeout(beepStopTimer);
    beepStopTimer = setTimeout(function () {
      try { o.stop(); } catch (e) {}
      osc = null;
      gain = null;
    }, (duration + 0.5) * 1000);
  }

  function stopBeep() {
    if (osc) {
      try { osc.stop(); } catch (e) {}
      osc = null;
    }
    if (gain) {
      try { gain.disconnect(); } catch (e) {}
      gain = null;
    }
    if (beepStopTimer) {
      clearTimeout(beepStopTimer);
      beepStopTimer = null;
    }
  }

  function startFlash() {
    if (!flashOverlay) {
      flashOverlay = document.createElement("div");
      flashOverlay.id = "calendar-alert-flash";
      flashOverlay.style.cssText =
        "position:fixed;top:0;left:0;right:0;bottom:0;" +
        "pointer-events:auto;z-index:9999;transition:none;opacity:1;";
      document.body.appendChild(flashOverlay);
    }

    var colorIndex = 0;
    if (flashInterval) clearInterval(flashInterval);
    flashOverlay.style.background = FLASH_COLORS[0];
    flashOverlay.style.opacity = "1";
    flashInterval = setInterval(function () {
      colorIndex = 1 - colorIndex;
      flashOverlay.style.background = FLASH_COLORS[colorIndex];
    }, 400);

    if (dismissHandler) {
      flashOverlay.removeEventListener("click", dismissHandler);
      flashOverlay.removeEventListener("touchstart", dismissHandler);
    }
    dismissHandler = function (e) {
      e.preventDefault();
      stop();
    };
    flashOverlay.addEventListener("click", dismissHandler);
    flashOverlay.addEventListener("touchstart", dismissHandler);
  }

  function stopFlash() {
    if (flashInterval) {
      clearInterval(flashInterval);
      flashInterval = null;
    }
    if (dismissHandler && flashOverlay) {
      flashOverlay.removeEventListener("click", dismissHandler);
      flashOverlay.removeEventListener("touchstart", dismissHandler);
      dismissHandler = null;
    }
    if (flashOverlay) {
      flashOverlay.style.opacity = "0";
      flashOverlay.style.background = "none";
      flashOverlay.style.pointerEvents = "none";
    }
  }

  function ring() {
    startBeep();
    startFlash();
  }

  function stop() {
    stopBeep();
    stopFlash();
  }

  // Exposed API.
  window.handiRingAlert = {
    ring: ring,
    flash: startFlash,
    stop: stop,
  };

  // Decoupled trigger via events (so the phone module doesn't need a direct
  // reference). The phone dispatches these; we react here.
  window.addEventListener("handiRingingStart", ring);
  window.addEventListener("handiRingingStop", stop);
})();
