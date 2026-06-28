/*
 * Copyright (c) 2026 Handi Homepage
 * This file is part of HandiHomepage and is released under the GNU General Public License v3.0.
 * See the LICENSE file in the repository root for full details.
 */
// js/core/module-buttons.js – unified lock, info, pin buttons
(function () {
  // =========================================================
  // MODULE HELP TEXTS
  // =========================================================
  const helpTexts = {
    gallery: `
            <strong>📸 Gallery</strong><br><br>
            • Upload images in <strong>Settings → Gallery</strong>.<br>
            • Use <strong>Prev / Next</strong> to browse, <strong>Play/Pause</strong> for slideshow.<br>
            • Click <strong>Full Screen Gallery</strong> to open the lightbox.<br>
            • Image filenames appear as captions – use names like <code>my+lovely+horse.jpg</code> for readability.
        `,
    live_bus: `
            <strong>🚌 Live Bus</strong><br><br>
            • Shows real‑time arrival times for your chosen stop.<br>
            • Configure routes and stops in <strong>Settings → Live Bus Tracker</strong>.<br>
            • Click <strong>Refresh Times</strong> to update manually.
            • Use <strong>Switch Direction</strong> to toggle between stops.
        `,
    music: `
            <strong>🎵 Music Player</strong><br><br>
            • Upload MP3 files in <strong>Settings → Music Player</strong>.<br>
            • Click a track to play – the visualiser responds to sound.<br>
            • Use <strong>Prev / Next</strong> and the <strong>lock</strong> to prevent accidental changes.<br>
            • File extensions (e.g., .mp3) are hidden for cleaner display.
        `,
    news: `
            <strong>📰 News</strong><br><br>
            • Fetches the latest headlines from your chosen RSS feed.<br>
            • Change the feed in <strong>Settings → News</strong>.<br>
            • Use the <strong>▲ / ▼</strong> buttons to scroll through articles.<br>
            • Click any headline to read the full story on the source website.
        `,
    social: `
            <strong>🐘 Social</strong><br><br>
            • Shows trending links from your Mastodon feed.<br>
            • Change the instance in <strong>Settings → Social</strong>.<br>
            • Use <strong>▲ / ▼</strong> to scroll through posts.
            • Click any link to open it in a new tab.
        `,
    radio: `
            <strong>📻 Radio</strong><br><br>
            • Choose from 10 Irish radio stations.<br>
            • Click a station to start streaming – may take a few seconds.<br>
            • The synthesiser animates while playing.<br>
            • Use the <strong>lock</strong> (🔒) to disable accidental station changes.
        `,
    emergency_alert: `
            <strong>📍 Location Alert</strong><br><br>
            <strong>📱 Mobile phones only.</strong><br>
            • Sends an SMS with your GPS location to trusted contacts.<br>
            • Requires GPS and mobile network (not available on desktop/tablet).<br>
            • Add contacts in <strong>Settings → Location Share</strong>.<br>
            • Unlock the button (🔓) then press <strong>SHARE</strong> to send.<br>
            • Test with your own number first to ensure it works.
        `,
    phone: `
            <strong>📞 Friendly Phone</strong><br><br>
            • One‑tap calling to your saved contacts.<br>
            • Add contacts with photos in <strong>Settings → Friendly Phone</strong>.<br>
            • The module is <strong>locked by default</strong> – unlock to enable calls.<br>
            • Photos help identify contacts at a glance.
        `,
    chat: `
            <strong>💬 Chat (Matrix)</strong><br><br>
            • Create your own Matrix account at <a href="https://app.element.io" target="_blank" rel="noopener">Element Matrix</a> to start private family or friend chat rooms.<br>
            • Add room URLs, access token, user ID in <strong>Settings → Chat</strong>.<br>
            • The module checks for new messages every 30 seconds.<br>
            • Click the room header to expand and view messages.<br>
            • New message notifications appear as a red badge.
        `,
    calendar: `
            <strong>📅 Calendar (Proton ICS)</strong><br><br>
            • Shows today's events from your Proton Calendar.<br>
            • Get your ICS link from Proton Calendar → Settings → Calendars → "Share with anyone" → "Create link".<br>
            • Paste the ICS link in <strong>Settings → Calendar</strong>.<br>

            <strong>⚠️ Important limitations (Proton, not this module):</strong><br>
            • The ICS feed updates <strong>every 4–16 hours</strong> – new events take time to appear.<br>
            • Recurring events may not appear correctly.<br>

            <strong>💡 Tips:</strong><br>
            • If an event doesn't appear, wait a few hours and try again.
        `,
  };

  // ----- Help modal (singleton) -----
  let modal = null;
  let modalOverlay = null;

  function createModal() {
    modalOverlay = document.createElement("div");
    modalOverlay.className = "help-modal-overlay";
    modalOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 10001;
            display: none;
            align-items: center;
            justify-content: center;
        `;
    modal = document.createElement("div");
    modal.className = "help-modal";
    modal.style.cssText = `
            max-width: 90%;
            width: 500px;
            border-radius: 24px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            padding: 0;
            position: relative;
            font-family: inherit;
            font-size: 1rem;
            line-height: 1.5;
            color: #1e1e1e;
            border: 1px solid #cbd5e1;
        `;
    modal.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid #e2e8f0;">
                <span style="font-weight: 700; font-size: 1.2rem;"><i class="fa-solid fa-circle-info"></i> Module Help</span>
                <button class="help-modal-close" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; padding: 0; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 50%; transition: background 0.2s;">&times;</button>
            </div>
            <div class="help-modal-body" style="padding: 20px;"></div>
            <div style="padding: 12px 20px 20px; text-align: center;">
                <button class="help-modal-ok" style="border: none; border-radius: 40px; padding: 8px 24px; font-size: 0.9rem; cursor: pointer; font-weight: bold;">Got it</button>
            </div>
        `;
    modalOverlay.appendChild(modal);
    document.body.appendChild(modalOverlay);

    const closeModal = () => (modalOverlay.style.display = "none");
    modal
      .querySelector(".help-modal-close")
      .addEventListener("click", closeModal);
    modal.querySelector(".help-modal-ok").addEventListener("click", closeModal);
    modalOverlay.addEventListener("click", (e) => {
      if (e.target === modalOverlay) closeModal();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && modalOverlay.style.display === "flex")
        closeModal();
    });
  }

  function showHelp(moduleId) {
    if (!modal) createModal();
    const bodyEl = modal.querySelector(".help-modal-body");
    bodyEl.innerHTML =
      helpTexts[moduleId] ||
      `<strong>ℹ️ ${moduleId}</strong><br><br>No specific help available.`;
    modalOverlay.style.display = "flex";
  }

  // ----- Pin logic (replaces pins.js) -----
  function moveItemToTop(panel, grid) {
    const firstUnpinned = [...grid.children].find(
      (el) => !el.classList.contains("is-pinned"),
    );
    if (firstUnpinned) grid.insertBefore(panel, firstUnpinned);
    else grid.prepend(panel);
  }

  function moveItemToBottom(panel, grid) {
    grid.appendChild(panel);
  }

  function refreshLayout() {
    if (window.packeryInstance) {
      window.packeryInstance.reloadItems();
      requestAnimationFrame(() => window.packeryInstance.layout());
    }
  }

  // ----- Build unified controls for a module -----
  function addModuleControls(moduleElement) {
    const moduleId = moduleElement.getAttribute("id");
    if (!moduleId) return;

    const grid = document.getElementById("dashboard-grid");
    if (!grid) return;

    // Create or reuse controls container
    let controlsDiv = moduleElement.querySelector(".module-controls");
    if (!controlsDiv) {
      controlsDiv = document.createElement("div");
      controlsDiv.className = "module-controls";
      controlsDiv.style.cssText = `
              position: absolute;
              top: 12px;
              right: 12px;
              display: flex;
              gap: 8px;
              z-index: 10;
          `;
      moduleElement.appendChild(controlsDiv);
    }

    // 1. Lock button (move existing if present, skip if already in controls)
    let lockBtn = null;
    if (
      !controlsDiv.querySelector(
        ".emergency-lock-toggle, .radio-lock-toggle, .music-lock-toggle, .phone-lock-toggle",
      )
    ) {
      const possibleLockSelectors = [
        ".radio-lock-toggle",
        ".music-lock-toggle",
        ".phone-lock-toggle",
        ".emergency-lock-toggle",
      ];
      for (const sel of possibleLockSelectors) {
        const found = moduleElement.querySelector(sel);
        if (found) {
          lockBtn = found;
          break;
        }
      }
    }
    if (lockBtn) {
      lockBtn.style.order = "0";
      // Move lock button into controls (preserve its event listeners)
      lockBtn.remove();
      controlsDiv.appendChild(lockBtn);
      lockBtn.style.position = "relative";
      lockBtn.style.top = "auto";
      lockBtn.style.right = "auto";
      // Preserve red/green lock color
      const icon = lockBtn.querySelector("i");
      if (icon && icon.style.color) {
        lockBtn.style.color = icon.style.color;
      }
    }

    // 2. Info button
    if (!controlsDiv.querySelector(".module-info-btn")) {
      const infoBtn = document.createElement("button");
      infoBtn.className = "module-info-btn";
      infoBtn.style.order = "1";
      infoBtn.innerHTML = '<i class="fa-solid fa-circle-info"></i>';
      infoBtn.title = "Help";
      infoBtn.setAttribute("aria-label", "Help for this module");
      infoBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        showHelp(moduleId);
      });
      controlsDiv.appendChild(infoBtn);
    }

    // 3. Pin button (create new, or use existing if found somewhere)
    if (!controlsDiv.querySelector(".pin-btn")) {
      let pinBtn = moduleElement.querySelector(".pin-btn");
      if (!pinBtn) {
        pinBtn = document.createElement("button");
        pinBtn.className = "pin-btn";
        pinBtn.style.order = "2";
        pinBtn.innerHTML = '<i class="fa-solid fa-thumbtack"></i>';
        pinBtn.title = "Pin to top";
      } else {
        // Remove from old position
        pinBtn.remove();
      }
      // Update pin icon based on current pinned state
      const isPinned = moduleElement.classList.contains("is-pinned");
      if (isPinned) {
        pinBtn.classList.add("pinned");
        pinBtn.title = "Unpin";
      } else {
        pinBtn.classList.remove("pinned");
        pinBtn.title = "Pin to top";
      }
      pinBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const panel = moduleElement;
        const currentlyPinned = panel.classList.contains("is-pinned");
        if (currentlyPinned) {
          panel.classList.remove("is-pinned");
          pinBtn.classList.remove("pinned");
          pinBtn.title = "Pin to top";
          moveItemToBottom(panel, grid);
        } else {
          panel.classList.add("is-pinned");
          pinBtn.classList.add("pinned");
          pinBtn.title = "Unpin";
          moveItemToTop(panel, grid);
        }
        refreshLayout();
      });
      controlsDiv.appendChild(pinBtn);
    }

    // Style all buttons uniformly
    const buttons = controlsDiv.querySelectorAll("button");
    buttons.forEach((btn) => {
      btn.style.width = "44px";
      btn.style.height = "44px";
      btn.style.borderRadius = "12px";
      btn.style.fontSize = "1.2rem";
      btn.style.cursor = "pointer";
      btn.style.display = "inline-flex";
      btn.style.alignItems = "center";
      btn.style.justifyContent = "center";
      btn.style.transition = "background 0.2s";
      btn.addEventListener("mouseenter", () => (btn.style.background = ""));
      btn.addEventListener("mouseleave", () => (btn.style.background = ""));
    });

    // Ensure module has relative positioning
    if (window.getComputedStyle(moduleElement).position !== "relative") {
      moduleElement.style.position = "relative";
    }

    moduleElement.appendChild(controlsDiv);
  }

  // ----- Initialise all modules and watch for new ones -----
  function scanAll() {
    document.querySelectorAll(".dashboard-item").forEach(addModuleControls);
  }

  function init() {
    const dashboard = document.getElementById("dashboard-grid");
    if (!dashboard) return;

    document.querySelectorAll(".dashboard-item").forEach(addModuleControls);

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (
            node.nodeType === 1 &&
            node.classList &&
            node.classList.contains("dashboard-item")
          ) {
            addModuleControls(node);
          }
        });
      });
    });
    observer.observe(dashboard, { childList: true, subtree: false });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // Expose for re-scan after modules initialize
  window.refreshModuleControls = scanAll;
})();
