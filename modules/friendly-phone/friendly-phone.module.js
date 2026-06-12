/*
 * Copyright (c) 2026 Handi Homepage
 * This file is part of HandiHomepage and is released under the GNU General Public License v3.0.
 * See the LICENSE file in the repository root for full details.
 */
// modules/friendly-phone/friendly-phone.module.js
// Unified Phone module — SIM, Video, and Click-to-Call in one element.
import { loadSettings } from "../../js/core/settings.js";

export default async function initPhone(container) {
  // ── Header ────────────────────────────────────────────────────────────
  const pinBtn = container.querySelector(".pin-btn");
  container.innerHTML = "";
  if (pinBtn) container.prepend(pinBtn);

  const title = document.createElement("div");
  title.className = "panel-title";
  title.innerHTML = '<i class="fa-solid fa-phone"></i> PHONE';
  container.appendChild(title);

  const content = document.createElement("div");
  content.className = "phone-content";
  container.appendChild(content);

  const parentItem = container.closest(".dashboard-item");
  if (parentItem) parentItem.dataset.module = "phone";

  const settings = loadSettings();
  const contacts = settings.phone?.contacts || [];

  // ── Empty state ───────────────────────────────────────────────────────
  if (!contacts.length) {
    content.innerHTML = `
            <div class="module-empty">
                <i class="fa-solid fa-address-book"></i>
                <p>No contacts saved.</p>
                <button class="settings-link-btn" id="phoneSettingsBtn">
                    <i class="fa-solid fa-gear"></i> Add Contacts in Settings
                </button>
            </div>
        `;
    content.querySelector("#phoneSettingsBtn").onclick = () => {
      window.location.href = "settings.html?args=phone";
    };
    return;
  }

  // ── Helper: make WebRTC audio call (reuses click-to-call logic if loaded) ──
  async function doWebRTCCall(number, btn) {
    if (typeof window.makeAudioCall === "function") {
      window.makeAudioCall(number);
    } else {
      // Fallback: try loading click-to-call module dynamically
      try {
        const mod = await import("../click-to-call/click-to-call.module.js");
        mod.default(container);
        setTimeout(() => {
          if (typeof window.makeAudioCall === "function") {
            window.makeAudioCall(number);
          } else {
            window.location.href = "tel:" + number;
          }
        }, 500);
      } catch (e) {
        window.location.href = "tel:" + number;
      }
    }
  }

  // ── Render contacts ───────────────────────────────────────────────────
  function escapeHtml(str) {
    if (!str) return "";
    return str.replace(
      /[&<>]/g,
      (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[m],
    );
  }

  content.innerHTML = `
        <div class="phone-list">
            ${contacts
              .map(
                (c) => `
                <div class="phone-card">
                    ${
                      c.photo
                        ? `<img class="phone-avatar" src="${c.photo}" alt="">`
                        : `<div class="phone-avatar placeholder"><i class="fa-solid fa-user"></i></div>`
                    }
                    <div class="phone-name">
                        ${escapeHtml(c.name)}
                        ${c.caregiver ? '<span style="font-size:0.6rem;background:#f59e0b;color:white;padding:1px 5px;border-radius:6px;margin-left:4px;">Caregiver</span>' : ""}
                    </div>
                    <div class="phone-actions">
                        <a class="phone-call sim-call" href="tel:${c.number}" title="SIM Call">
                            <i class="fa-solid fa-phone"></i>
                        </a>
                        <button class="phone-call video-call" data-number="${escapeHtml(c.number)}" title="Video Call">
                            <i class="fa-solid fa-video"></i>
                        </button>
                        <button class="phone-call webrtc-call" data-number="${escapeHtml(c.number)}" title="Free Call">
                            <i class="fa-solid fa-headset"></i>
                        </button>
                    </div>
                </div>
            `,
              )
              .join("")}
        </div>
    `;

  // ── Wire up buttons ───────────────────────────────────────────────────
  content.querySelectorAll(".webrtc-call").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      doWebRTCCall(btn.dataset.number, btn);
    });
  });

  content.querySelectorAll(".video-call").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      if (typeof window.makeVideoCall === "function") {
        window.makeVideoCall(btn.dataset.number);
      } else if (typeof window.makeAudioCall === "function") {
        window.makeAudioCall(btn.dataset.number);
      } else {
        window.location.href = "tel:" + btn.dataset.number;
      }
    });
  });
}
