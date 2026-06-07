/*
 * Copyright (c) 2026 Handi Homepage
 * This file is part of HandiHomepage and is released under the GNU General Public License v3.0.
 * See the LICENSE file in the repository root for full details.
 */
// modules/emergency/emergency.module.js
import { loadSettings } from "../../js/core/settings.js";

// ----------------------------------------------------------------------
// Convert lat/lon to OSM shortlink code (https://osm.org/go/...)
// ----------------------------------------------------------------------
function osmShortlink(lat, lon) {
  const codeChars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_~";
  const base = codeChars.length;

  let latInt = Math.floor((lat + 90) * 10000);
  let lonInt = Math.floor((lon + 180) * 10000);
  if (latInt < 0) latInt = 0;
  if (latInt >= 1800000) latInt = 1800000 - 1;
  if (lonInt < 0) lonInt = 0;
  if (lonInt >= 3600000) lonInt = 3600000 - 1;

  let combined = lonInt * 1800000 + latInt;
  let result = "";
  while (combined > 0) {
    result = codeChars[combined % base] + result;
    combined = Math.floor(combined / base);
  }
  return result || "0";
}

// Helper: Check if coordinates are plausibly in Ireland
function isPlausibleIrelandLocation(lat, lon) {
  // Ireland bounding box (approximate)
  const minLat = 51.0;
  const maxLat = 55.5;
  const minLon = -11.0;
  const maxLon = -5.5;
  return lat >= minLat && lat <= maxLat && lon >= minLon && lon <= maxLon;
}

export default async function initEmergency(container) {
  // ---------- Create header row: title + lock + pin ----------
  const headerRow = document.createElement("div");
  headerRow.className = "emergency-header-row";

  const title = document.createElement("div");
  title.className = "panel-title";
  title.innerHTML = '<i class="fa-solid fa-location-dot"></i> LOCATION SHARE';
  headerRow.appendChild(title);

  const headerActions = document.createElement("div");
  headerActions.className = "emergency-header-actions";

  const lockToggle = document.createElement("button");
  lockToggle.className = "emergency-lock-toggle";
  const saved = localStorage.getItem("emergencyLocked");
  let isLocked = saved !== null ? saved === "true" : true;

  function updateLockIcon() {
    lockToggle.innerHTML = isLocked
      ? '<i class="fa-solid fa-lock"></i>'
      : '<i class="fa-solid fa-lock-open"></i>';
    lockToggle.style.color = isLocked ? "#cc0000" : "#008000";
  }
  updateLockIcon();

  lockToggle.addEventListener("click", (e) => {
    e.stopPropagation();
    isLocked = !isLocked;
    localStorage.setItem("emergencyLocked", isLocked);
    updateLockIcon();
    const btn = content.querySelector("#emergencyTriggerBtn");
    if (btn) applyLockState(btn);
  });

  headerActions.appendChild(lockToggle);

  const originalPinBtn = container.querySelector(".pin-btn");
  let pinBtn = null;
  if (originalPinBtn) {
    pinBtn = originalPinBtn.cloneNode(true);
    pinBtn.classList.add("pin-btn-clone");
    originalPinBtn.style.display = "none";
    headerActions.appendChild(pinBtn);
  }

  headerRow.appendChild(headerActions);
  container.innerHTML = "";
  container.appendChild(headerRow);

  const contentWrapper = document.createElement("div");
  contentWrapper.className = "emergency-content-wrapper";
  container.appendChild(contentWrapper);

  const content = document.createElement("div");
  content.style.cssText = "padding: 10px; text-align: center;";
  contentWrapper.appendChild(content);

  function applyLockState(btn) {
    if (isLocked) {
      btn.disabled = true;
      btn.style.opacity = "0.6";
      btn.style.cursor = "not-allowed";
      btn.onmouseenter = null;
      btn.onmouseleave = null;
    } else {
      btn.disabled = false;
      btn.style.opacity = "";
      btn.style.cursor = "";
      btn.innerHTML = `
                <i class="fa-solid fa-location-dot" style="font-size: 2rem;"></i>
                <span>SHARE</span>
                <span style="font-size: 0.7rem;">Send my location</span>
            `;
      btn.onmouseenter = () => {
        btn.style.transform = "scale(1.05)";
        btn.style.boxShadow = "0 0 25px rgba(255,0,0,0.9)";
      };
      btn.onmouseleave = () => {
        btn.style.transform = "scale(1)";
        btn.style.boxShadow = "0 0 15px rgba(255,0,0,0.6)";
      };
    }
  }

  async function sendSMS(phoneNumber, shortlink) {
    const settings = loadSettings();
    const webrtc = settings.webrtc || {};
    const baseUrl = webrtc.baseUrl || "";
    const apiKey = webrtc.apiKey || "";
    const from = webrtc.callerId || "InfoSMS";

    console.log("[Emergency] sendSMS called", {
      phoneNumber,
      shortlink,
      baseUrl,
      from,
      hasApiKey: !!apiKey,
    });

    if (!baseUrl || !apiKey) {
      console.error(
        "[Emergency] Infobip not configured: missing base URL or API key",
      );
      return { success: false, error: "Infobip not configured in Settings" };
    }

    const fullLink = `https://osm.org/go/${shortlink}`;
    const message = `📍 Someone shared their location with you.\n\nLocation: ${fullLink}\nTime: ${new Date().toLocaleString()}`;

    // Strip + prefix from phone numbers (Infobip expects E.164 without +)
    const cleanNumber = phoneNumber.replace(/^\+/, "");
    console.log("[Emergency] Sending SMS via Infobip", {
      to: cleanNumber,
      from,
      messageLength: message.length,
    });

    try {
      const response = await fetch(`https://${baseUrl}/sms/2/text/advanced`, {
        method: "POST",
        headers: {
          Authorization: apiKey,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          messages: [
            {
              destinations: [{ to: cleanNumber }],
              from: from,
              text: message,
            },
          ],
        }),
      });
      console.log("[Emergency] Infobip response status:", response.status);
      if (!response.ok) {
        let detail = `HTTP ${response.status}`;
        try {
          const errBody = await response.text();
          detail += ` — ${errBody}`;
          console.error("[Emergency] Infobip error body:", errBody);
        } catch (_) {}
        throw new Error(detail);
      }
      const data = await response.json();
      console.log("[Emergency] SMS sent successfully:", data);
      return { success: true, data };
    } catch (err) {
      console.error("[Emergency] SMS send error:", err);
      return { success: false, error: err.message };
    }
  }

  // Re-render whenever settings change (listens for same-tab storage events)
  function render() {
    const settings = loadSettings();
    const contacts = settings.emergency_alert?.contacts || [];

    if (contacts.length === 0) {
      content.innerHTML = `
                <div class="module-empty">
                    <i class="fa-solid fa-phone"></i>
                    <p>No trusted contacts saved.</p>
                    <button id="emergencySettingsBtn" class="settings-link-btn">
                        <i class="fa-solid fa-gear"></i> Add Contacts
                    </button>
                </div>
            `;
      const settingsBtn = content.querySelector("#emergencySettingsBtn");
      if (settingsBtn)
        settingsBtn.onclick = () =>
          (location.href = "settings.html?args=emergency");
      return;
    }

    content.innerHTML = "";

    const emergencyBtn = document.createElement("button");
    emergencyBtn.id = "emergencyTriggerBtn";
    emergencyBtn.style.cssText = `
            width: 160px;
            height: 160px;
            border-radius: 50%;
            border: 3px solid #ffffff;
            color: white;
            background: radial-gradient(circle at 30% 30%, #cc0000, #800000) !important;
            font-size: 1.2rem;
            font-weight: bold;
            cursor: pointer;
            margin: 10px auto;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 8px;
            box-shadow: 0 0 15px rgba(255,0,0,0.6);
            transition: all 0.2s;
        `;
    emergencyBtn.innerHTML = `
            <i class="fa-solid fa-location-dot" style="font-size: 2rem;"></i>
            <span>LOCATION SHARE</span>
            <span style="font-size: 0.7rem;">Send my location</span>
        `;
    content.appendChild(emergencyBtn);

    // Main location sharing flow
    function triggerShare() {
      if (isLocked) {
        setStatus("Share button is locked – unlock to activate.", true);
        return;
      }
      if (
        !confirm(
          "📍 Share your location? This will send your current location to your trusted contacts.",
        )
      ) {
        setStatus("Share cancelled.", false);
        return;
      }

      setStatus(
        "Getting your location (please allow precise location)...",
        false,
      );

      if (!navigator.geolocation) {
        setStatus("Geolocation is not supported by your browser.", true);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;

          // Validate location – if not in Ireland, warn and ask to proceed
          if (!isPlausibleIrelandLocation(lat, lon)) {
            const proceed = confirm(
              `⚠️ The location we received (${lat.toFixed(2)}, ${lon.toFixed(2)}) does not appear to be in Ireland.\n` +
                `This may be because your browser could not get a precise GPS fix.\n\n` +
                `Do you still want to send your location?`,
            );
            if (!proceed) {
              setStatus("Share cancelled – location inaccurate.", true);
              return;
            }
          }

          const shortCode = osmShortlink(lat, lon);
          const osmShortUrl = `https://osm.org/go/${shortCode}?z=16`;

          setStatus(
            `Location obtained. Sending to ${contacts.length} contact(s)...`,
            false,
          );

          let successCount = 0;
          let failCount = 0;
          for (const contact of contacts) {
            const result = await sendSMS(contact.number, shortCode);
            if (result.success) successCount++;
            else failCount++;
            await new Promise((r) => setTimeout(r, 500));
          }

          if (successCount > 0) {
            setStatus(
              `✅ Location sent to ${successCount} contact(s). ${failCount > 0 ? `Failed: ${failCount}` : ""}`,
              false,
            );
            const linkDiv = document.createElement("div");
            linkDiv.style.cssText =
              "margin-top: 10px; font-size: 0.7rem; word-break: break-all;";
            linkDiv.innerHTML = `<a href="${osmShortUrl}" target="_blank" style="color:#00ff41;">📍 View shared location on OpenStreetMap</a>`;
            content.appendChild(linkDiv);
            setTimeout(() => linkDiv.remove(), 15000);
          } else {
            setStatus(
              "❌ Failed to send location. Check network or contact numbers.",
              true,
            );
          }
        },
        (error) => {
          let errorMsg = "";
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMsg =
                "Location permission denied. Please allow precise location in your browser settings.";
              break;
            case error.POSITION_UNAVAILABLE:
              errorMsg =
                "Location information unavailable. Please check your GPS or try again.";
              break;
            case error.TIMEOUT:
              errorMsg =
                "Location request timed out. Please move to an area with better GPS signal.";
              break;
            default:
              errorMsg = "Unknown geolocation error.";
          }
          setStatus(errorMsg, true);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 },
      );
    }

    const statusDiv = document.createElement("div");
    statusDiv.style.cssText =
      "margin-top: 20px; font-size: 0.8rem; color: #ffb000;";
    content.appendChild(statusDiv);

    function setStatus(msg, isError = false) {
      statusDiv.innerHTML = `<i class="fa-solid ${isError ? "fa-exclamation-triangle" : "fa-circle-info"}"></i> ${msg}`;
      statusDiv.style.color = isError ? "#ff8888" : "#ffb000";
      setTimeout(() => {
        if (
          statusDiv.innerHTML ===
          `<i class="fa-solid ${isError ? "fa-exclamation-triangle" : "fa-circle-info"}"></i> ${msg}`
        )
          statusDiv.innerHTML = "";
      }, 8000);
    }

    emergencyBtn.onclick = triggerShare;
    applyLockState(emergencyBtn);
  }

  // Initial render
  render();

  // Re-render when settings change (triggered by saving in settings.html)
  window.addEventListener("storage", (e) => {
    if (e.key === "handiSettings") render();
  });

  // Also listen for a custom event dispatched from settings page save
  window.addEventListener("handiSettingsSaved", () => render());
}
