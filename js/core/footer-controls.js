/*
 * Copyright (c) 2026 Handi Homepage
 * This file is part of HandiHomepage and is released under the GNU General Public License v3.0.
 * See the LICENSE file in the repository root for full details.
 */
// js/core/footer-controls.js
(function () {
  // --- Global Mute State ---
  let isMuted = window.handiNs.get("globalMute") === "true";

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
    window.handiNs.set("globalMute", isMuted);
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
  let wakeLockActive = window.handiNs.get("wakeLockActive") === "true";

  async function requestWakeLock() {
    if ("wakeLock" in navigator) {
      try {
        wakeLock = await navigator.wakeLock.request("screen");
        wakeLockActive = true;
        window.handiNs.set("wakeLockActive", "true");
        updateWakeLockIcon();
        document.addEventListener("visibilitychange", handleVisibilityChange);
      } catch (err) {
        console.warn("Wake lock error:", err);
        wakeLockActive = false;
        window.handiNs.set("wakeLockActive", "false");
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
    window.handiNs.set("wakeLockActive", "false");
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
      icon.className = "fa-solid fa-sun active-sun";
      wakeLockBtn.title = "Screen awake – click to allow sleep";
    } else {
      icon.className = "fa-solid fa-sun";
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
    docsBtn.addEventListener("click", async () => {
      try {
        const settings = JSON.parse(
          window.handiNs.get("handiSettings") || "{}",
        );
        const contacts = settings.phone?.contacts || [];
        const caregiver = contacts.find((c) => c.caregiver) || contacts[0];
        if (caregiver && caregiver.number) {
          // Ensure WebRTC is loaded
          if (typeof window.makeAudioCall !== "function") {
            try {
              const hidden = document.createElement("div");
              hidden.style.display = "none";
              document.body.appendChild(hidden);
              const mod =
                await import("/modules/friendly-phone/click-to-call.module.js");
              await mod.default(hidden);
              for (let i = 0; i < 20; i++) {
                if (typeof window.makeAudioCall === "function") break;
                await new Promise((r) => setTimeout(r, 100));
              }
            } catch (e) {
              console.warn("WebRTC load failed:", e);
            }
          }
          if (typeof window.makeAudioCall === "function") {
            window.makeAudioCall(caregiver.number);
          } else {
            window.location.href = `tel:${caregiver.number}`;
          }
        } else {
          alert(
            "No caregiver contact found. Add a contact in Settings \u2192 Phone.",
          );
        }
      } catch (e) {
        console.warn("Caregiver call failed:", e);
      }
    });
  }

  const reorderBtn = document.getElementById("footerReorderBtn");
  if (reorderBtn) {
    reorderBtn.addEventListener("click", () => {
      window.handiNs.remove("handiHomepageModulesSelected");
      location.reload();
    });
  }
})();
