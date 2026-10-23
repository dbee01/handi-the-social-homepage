/*
 * Copyright (c) 2026 Handi Homepage
 * This file is part of HandiHomepage and is released under the GNU General Public License v3.0.
 * See the LICENSE file in the repository root for full details.
 */

// js/core/ring-alert.js
// Standalone ringing / red-flash + beep alert for incoming calls.
//
// This is intentionally separate from the calendar module so a ringing phone
// always produces the visual (red flash) and audible (beep) alert even when
// the calendar module isn't enabled (the calendar is premium and usually off).
// Any module can trigger it by dispatching window "handiRingingStart" /
// "handiRingingStop" events, or by calling the exposed window.handiRingAlert
// API directly.

(function () {
  var FLASH_COLORS = ["rgba(220, 0, 0, 0.25)", "rgba(220, 0, 0, 0.50)"];

  var flashOverlay = null;
  var flashInterval = null;
  var dismissHandler = null;

  // Audible ring (beep) using the Web Audio API — no external asset needed.
  var audioCtx = null;
  var beepTimer = null;

  function ensureAudioContext() {
    if (!audioCtx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      audioCtx = new AC();
    }
    if (audioCtx.state === "suspended") {
      audioCtx.resume().catch(function () {});
    }
    return audioCtx;
  }

  function playSingleBeep() {
    var ctx = ensureAudioContext();
    if (!ctx) return;
    if (ctx.state === "suspended") {
      ctx.resume().catch(function () {});
    }
    try {
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch (e) {
      /* audio may be blocked until a user gesture */
    }
  }

  function startBeep() {
    stopBeep();
    // Two beeps per second (classic ring), repeating until stopped.
    beepTimer = setInterval(function () {
      playSingleBeep();
      setTimeout(playSingleBeep, 500);
    }, 1000);
    playSingleBeep();
  }

  function stopBeep() {
    if (beepTimer) {
      clearInterval(beepTimer);
      beepTimer = null;
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
    // Visual red flash + audible beep.
    startFlash();
    startBeep();
  }

  function stop() {
    stopFlash();
    stopBeep();
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

  // --- Sound lock ---
  // While a phone call is ringing or in progress, other audio modules (radio,
  // music, cast) pause themselves. This is a shared source of truth keyed off
  // the same decoupled events the phone modules already use for ringing. The
  // phone modules dispatch `handiCallStarted` the moment a call starts ringing
  // (outgoing dial or incoming ring) and `handiCallEnded` when it hangs up; a
  // counter handles overlapping phones so the lock only drops when the last
  // call ends.
  var soundLockCount = 0;
  function setSoundLock(locked) {
    // Normalise to a boolean so callers can rely on `detail.locked`.
    window.dispatchEvent(
      new CustomEvent("handiSoundLockChange", { detail: { locked: !!locked } }),
    );
  }
  window.addEventListener("handiCallStarted", function () {
    soundLockCount++;
    if (soundLockCount === 1) setSoundLock(true);
  });
  window.addEventListener("handiCallEnded", function () {
    if (soundLockCount > 0) soundLockCount--;
    if (soundLockCount === 0) setSoundLock(false);
  });

  // Exposed API so modules could query or force the lock without events.
  window.handiSoundLock = {
    lock: function () { setSoundLock(true); },
    unlock: function () { setSoundLock(false); },
  };

  // Unlock/resume the audio context on the first user interaction so the
  // beep is audible when an incoming call arrives (browsers block autoplay
  // until after a gesture).
  function unlockAudio() {
    ensureAudioContext();
    window.removeEventListener("click", unlockAudio);
    window.removeEventListener("keydown", unlockAudio);
    window.removeEventListener("touchstart", unlockAudio);
  }
  window.addEventListener("click", unlockAudio);
  window.addEventListener("keydown", unlockAudio);
  window.addEventListener("touchstart", unlockAudio);
})();
