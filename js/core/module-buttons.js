/*
 * Copyright (c) 2026 Handi Homepage
 * This file is part of HandiHomepage and is released under the GNU General Public License v3.0.
 * See the LICENSE file in the repository root for full details.
 */
// js/core/module-buttons.js – unified lock, info, pin buttons
(function () {
  console.log("[module-buttons] v2 loaded – translations enabled");
  // =========================================================
  // MODULE HELP TEXTS
  // =========================================================
  // Module ID → language key mapping
  const helpKeyMap = {
    gallery: "h_gallery",
    live_bus: "h_live_bus",
    music: "h_music",
    news: "h_news",
    social: "h_social",
    radio: "h_radio",
    emergency_alert: "h_emergency_alert",
    phone: "h_phone",
    chat: "h_chat",
    calendar: "h_calendar",
        llm: "h_llm",
            task: "h_task",
            cast: "h_cast",
          };

  // Shortcut for translations (also used below in addModuleControls)
  function tr(key, fallback) {
    const t = window.t || function (k, f) { return f || k; };
    return t(key, fallback);
  }

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
                    <span style="font-weight: 700; font-size: 1.2rem;"><i class="fa-solid fa-circle-info"></i> ${tr("h_modalTitle", "Module Help")}</span>
                    <button class="help-modal-close" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; padding: 0; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 50%; transition: background 0.2s;">&times;</button>
                </div>
                <div class="help-modal-body" style="padding: 20px;"></div>
                <div style="padding: 12px 20px 20px; text-align: center;">
                    <button class="help-modal-ok" style="border: none; border-radius: 40px; padding: 8px 24px; font-size: 0.9rem; cursor: pointer; font-weight: bold;">${tr("h_gotIt", "Got it")}</button>
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
    const key = helpKeyMap[moduleId];
    const bodyEl = modal.querySelector(".help-modal-body");
    bodyEl.innerHTML =
      (key && tr(key, "")) ||
      "<strong>ℹ️ " + moduleId + "</strong><br><br>" + tr("h_noHelp", "No specific help available.");
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
        // Skip modules that don't have sound locks
        if (!["task", "news", "calendar", "chat", "social", "gallery", "live_bus", "llm"].includes(moduleId)) {
        if (
          !controlsDiv.querySelector(
            ".emergency-lock-toggle, .radio-lock-toggle, .music-lock-toggle, .phone-lock-toggle, .cast-lock-toggle",
          )
        ) {
          const possibleLockSelectors = [
            ".radio-lock-toggle",
            ".music-lock-toggle",
            ".phone-lock-toggle",
            ".emergency-lock-toggle",
            ".cast-lock-toggle",
          ];
          for (const sel of possibleLockSelectors) {
            const found = moduleElement.querySelector(sel);
            if (found) {
              lockBtn = found;
              break;
            }
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
      infoBtn.title = tr("h_helpButton", "Help");
      infoBtn.setAttribute("aria-label", tr("h_helpAria", "Help for this module"));
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
        pinBtn.title = tr("h_pinToTop", "Pin to top");
      } else {
        // Remove from old position
        pinBtn.remove();
      }
      // Update pin icon based on current pinned state
      const isPinned = moduleElement.classList.contains("is-pinned");
      if (isPinned) {
        pinBtn.classList.add("pinned");
        pinBtn.title = tr("h_unpin", "Unpin");
      } else {
        pinBtn.classList.remove("pinned");
        pinBtn.title = tr("h_pinToTop", "Pin to top");
      }
      pinBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const panel = moduleElement;
        const currentlyPinned = panel.classList.contains("is-pinned");
        if (currentlyPinned) {
          panel.classList.remove("is-pinned");
          pinBtn.classList.remove("pinned");
          pinBtn.title = tr("h_pinToTop", "Pin to top");
          moveItemToBottom(panel, grid);
        } else {
          panel.classList.add("is-pinned");
          pinBtn.classList.add("pinned");
          pinBtn.title = tr("h_unpin", "Unpin");
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
