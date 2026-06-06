/*
 * Copyright (c) 2026 Handi Homepage
 * This file is part of HandiHomepage and is released under the GNU General Public License v3.0.
 * See the LICENSE file in the repository root for full details.
 */
// js/core/footer-controls.js
(function () {
  // --- Global Mute State ---
  let isMuted = localStorage.getItem("globalMute") === "true";

  function updateMuteIcon() {
    const muteBtn = document.getElementById("footerMuteBtn");
    if (muteBtn) {
      const icon = muteBtn.querySelector("i");
      if (icon) {
        icon.className = isMuted
          ? "fa-solid fa-volume-mute"
          : "fa-solid fa-volume-high";
      }
    }
  }

  function toggleMute() {
    isMuted = !isMuted;
    localStorage.setItem("globalMute", isMuted);
    updateMuteIcon();
    window.dispatchEvent(
      new CustomEvent("globalMuteToggle", { detail: { muted: isMuted } }),
    );
  }

  const muteBtn = document.getElementById("footerMuteBtn");
  if (muteBtn) {
    muteBtn.addEventListener("click", toggleMute);
    updateMuteIcon();
    window.dispatchEvent(
      new CustomEvent("globalMuteToggle", { detail: { muted: isMuted } }),
    );
  }

  // --- Wake Lock ---
  let wakeLock = null;
  const wakeLockBtn = document.getElementById("footerWakeLockBtn");
  let wakeLockActive = localStorage.getItem("wakeLockActive") === "true";

  async function requestWakeLock() {
    if ("wakeLock" in navigator) {
      try {
        wakeLock = await navigator.wakeLock.request("screen");
        wakeLockActive = true;
        localStorage.setItem("wakeLockActive", "true");
        updateWakeLockIcon();
        document.addEventListener("visibilitychange", handleVisibilityChange);
      } catch (err) {
        console.warn("Wake lock error:", err);
        wakeLockActive = false;
        localStorage.setItem("wakeLockActive", "false");
        updateWakeLockIcon();
      }
    } else {
      console.warn("Wake Lock API not supported");
      wakeLockActive = false;
      updateWakeLockIcon();
    }
  }

  async function releaseWakeLock() {
    if (wakeLock) {
      await wakeLock.release();
      wakeLock = null;
    }
    wakeLockActive = false;
    localStorage.setItem("wakeLockActive", "false");
    updateWakeLockIcon();
    document.removeEventListener("visibilitychange", handleVisibilityChange);
  }

  function handleVisibilityChange() {
    if (wakeLockActive && document.visibilityState === "visible") {
      requestWakeLock();
    }
  }

  function updateWakeLockIcon() {
    if (!wakeLockBtn) return;
    const icon = wakeLockBtn.querySelector("i");
    if (wakeLockActive) {
      icon.className = "fa-solid fa-sun";
      wakeLockBtn.style.color = "#f59e0b";
      wakeLockBtn.title = "Screen awake – click to allow sleep";
    } else {
      icon.className = "fa-solid fa-sun";
      wakeLockBtn.style.color = "#0047cc";
      wakeLockBtn.title = "Screen may sleep – click to keep awake";
    }
  }

  if (wakeLockBtn) {
    wakeLockBtn.addEventListener("click", async () => {
      if (wakeLockActive) {
        await releaseWakeLock();
      } else {
        await requestWakeLock();
      }
    });
    if (wakeLockActive) {
      requestWakeLock();
    } else {
      updateWakeLockIcon();
    }
  }

  // --- Scroll buttons ---
  const scrollUpBtn = document.getElementById("footerScrollUpBtn");
  if (scrollUpBtn) {
    scrollUpBtn.addEventListener("click", () => {
      window.scrollBy({ top: -window.innerHeight * 0.8, behavior: "smooth" });
    });
  }

  const scrollDownBtn = document.getElementById("footerScrollDownBtn");
  if (scrollDownBtn) {
    scrollDownBtn.addEventListener("click", () => {
      window.scrollBy({ top: window.innerHeight * 0.8, behavior: "smooth" });
    });
  }

  // --- Navigation buttons ---
  const settingsBtn = document.getElementById("footerSettingsBtn");
  if (settingsBtn) {
    settingsBtn.addEventListener("click", () => {
      window.location.href = "settings.html";
    });
  }

  const docsBtn = document.getElementById("footerDocsBtn");
  if (docsBtn) {
    docsBtn.addEventListener("click", () => {
      window.open("/docs.html", "_blank");
    });
  }

  const reorderBtn = document.getElementById("footerReorderBtn");
  if (reorderBtn) {
    reorderBtn.addEventListener("click", () => {
      localStorage.removeItem("handiHomepageModulesSelected");
      location.reload();
    });
  }
})();
