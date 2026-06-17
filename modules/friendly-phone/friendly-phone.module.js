/*
 * Copyright (c) 2026 Handi Homepage
 * This file is part of HandiHomepage and is released under the GNU General Public License v3.0.
 * See the LICENSE file in the repository root for full details.
 */
// modules/friendly-phone/friendly-phone.module.js
// Unified Phone module — SIM, Video, and Click-to-Call in one element.
import { loadSettings } from "../../js/core/settings.js";

export default async function initPhone(container) {
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

  // Restore photos from separate storage
  try {
    const photos = JSON.parse(
      localStorage.getItem("handiContactPhotos") || "{}",
    );
    contacts.forEach((c, i) => {
      if (photos[i]) c.photo = photos[i];
    });
  } catch (e) {}

  if (!contacts.length) {
    content.innerHTML = `
      <div class="module-empty">
        <i class="fa-solid fa-address-book"></i>
        <p>No contacts saved.</p>
        <button class="settings-link-btn" id="phoneSettingsBtn">
          <i class="fa-solid fa-gear"></i> Add Contacts in Settings
        </button>
      </div>`;
    content.querySelector("#phoneSettingsBtn").onclick = () => {
      window.location.href = "settings.html?args=phone";
    };
    return;
  }

  // Tracks which button is currently in a call
  let callingBtn = null;

  function setCalling(btn, active) {
    if (callingBtn && callingBtn !== btn) setCalling(callingBtn, false);
    if (!btn) return;
    if (active) {
      btn.classList.add("calling");
      btn.style.background = "#cc0000";
      btn.style.borderColor = "#cc0000";
      btn.innerHTML = '<i class="fa-solid fa-phone-slash"></i>';
      callingBtn = btn;
    } else {
      btn.classList.remove("calling");
      btn.style.background = "";
      btn.style.borderColor = "";
      btn.innerHTML = '<i class="fa-solid fa-phone"></i>';
      callingBtn = null;
    }
  }

  async function ensureWebRTC() {
    if (typeof window.makeAudioCall === "function") return true;
    // Load into a hidden container so it doesn't overwrite Phone UI
    try {
      const hidden = document.createElement("div");
      hidden.style.display = "none";
      document.body.appendChild(hidden);
      const mod = await import("../click-to-call/click-to-call.module.js");
      await mod.default(hidden);
      // Wait for makeAudioCall to appear
      for (let i = 0; i < 20; i++) {
        if (typeof window.makeAudioCall === "function") return true;
        await new Promise((r) => setTimeout(r, 100));
      }
    } catch (e) {
      console.warn("Failed to load WebRTC:", e);
    }
    return false;
  }

  // Restore button when call ends (poll for call state)
  function watchCallEnd() {
    const check = setInterval(() => {
      if (!callingBtn) {
        clearInterval(check);
        return;
      }
      if (typeof window.makeAudioCall !== "function") {
        clearInterval(check);
        return;
      }
      // No active call means the button should be reset
      // We rely on the click-to-call module's endCall to be called via hangup
    }, 2000);
  }

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
          <div class="phone-card-left">
          ${
            c.photo
              ? `<img class="phone-avatar" src="${c.photo}" alt="">`
              : `<div class="phone-avatar placeholder"><i class="fa-solid fa-user"></i></div>`
          }
          <div class="phone-name">
            ${escapeHtml(c.name)}
            ${c.caregiver ? '<span style="font-size:0.6rem;background:#f59e0b;color:white;padding:1px 5px;border-radius:6px;margin-left:4px;">Caregiver</span>' : ""}
          </div>
          </div>
          <div class="phone-actions">
            <button class="phone-call video-call" data-number="${escapeHtml(c.number)}" title="Video Call">
              <i class="fa-solid fa-video"></i>
            </button>
            <button class="phone-call webrtc-call" data-number="${escapeHtml(c.number)}" title="Free Call">
              <i class="fa-solid fa-phone"></i>
            </button>
          </div>
        </div>
      `,
        )
        .join("")}
    </div>
  `;

  // Wire up WebRTC (headset) buttons
  content.querySelectorAll(".webrtc-call").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.preventDefault();
      if (btn.classList.contains("calling")) {
        if (typeof window.endCall === "function") window.endCall();
        setCalling(btn, false);
        return;
      }
      const ok = await ensureWebRTC();
      if (!ok) {
        window.location.href = "tel:" + btn.dataset.number;
        return;
      }
      setCalling(btn, true);
      try {
        window.makeAudioCall(btn.dataset.number);
      } catch (err) {
        setCalling(btn, false);
      }
    });
  });

  // Wire up video call buttons
  content.querySelectorAll(".video-call").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.preventDefault();
      if (btn.classList.contains("calling")) {
        if (typeof window.endCall === "function") window.endCall();
        setCalling(btn, false);
        return;
      }
      const ok = await ensureWebRTC();
      if (!ok) {
        window.location.href = "tel:" + btn.dataset.number;
        return;
      }
      setCalling(btn, true);
      try {
        if (typeof window.makeVideoCall === "function") {
          window.makeVideoCall(btn.dataset.number);
        } else {
          window.makeAudioCall(btn.dataset.number);
        }
      } catch (err) {
        setCalling(btn, false);
      }
    });
  });

  // Restore button state
  window.addEventListener("handiCallEnded", () => {
    if (callingBtn) setCalling(callingBtn, false);
  });
}
