/*
 * Copyright (c) 2026 Handi Homepage
 * This file is part of HandiHomepage and is released under the GNU General Public License v3.0.
 * See the LICENSE file in the repository root for full details.
 */
// modules/emergency/emergency.module.js
import { loadSettings } from '../../js/core/settings.js';

// ----------------------------------------------------------------------
// Convert lat/lon to OSM shortlink code (https://osm.org/go/...)
// ----------------------------------------------------------------------
function osmShortlink(lat, lon) {
    const codeChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_~";
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
    return (lat >= minLat && lat <= maxLat && lon >= minLon && lon <= maxLon);
}

export default async function initEmergency(container) {
    // ---------- Create header row: title + lock + pin ----------
    const headerRow = document.createElement('div');
    headerRow.className = 'emergency-header-row';

    const title = document.createElement('div');
    title.className = 'panel-title';
    title.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> EMERGENCY';
    headerRow.appendChild(title);

    const headerActions = document.createElement('div');
    headerActions.className = 'emergency-header-actions';

    const lockToggle = document.createElement('button');
    lockToggle.className = 'emergency-lock-toggle';
    const saved = localStorage.getItem('emergencyLocked');
    let isLocked = saved !== null ? saved === 'true' : true;

    function updateLockIcon() {
        lockToggle.innerHTML = isLocked ? '<i class="fa-solid fa-lock"></i>' : '<i class="fa-solid fa-lock-open"></i>';
        lockToggle.style.color = isLocked ? '#cc0000' : '#008000';
    }
    updateLockIcon();

    lockToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        isLocked = !isLocked;
        localStorage.setItem('emergencyLocked', isLocked);
        updateLockIcon();
        applyLockState();
    });

    headerActions.appendChild(lockToggle);

    const originalPinBtn = container.querySelector('.pin-btn');
    let pinBtn = null;
    if (originalPinBtn) {
        pinBtn = originalPinBtn.cloneNode(true);
        pinBtn.classList.add('pin-btn-clone');
        originalPinBtn.style.display = 'none';
        headerActions.appendChild(pinBtn);
    }

    headerRow.appendChild(headerActions);
    container.innerHTML = '';
    container.appendChild(headerRow);

    const contentWrapper = document.createElement('div');
    contentWrapper.className = 'emergency-content-wrapper';
    container.appendChild(contentWrapper);

    const content = document.createElement('div');
    content.style.cssText = 'padding: 10px; text-align: center;';
    contentWrapper.appendChild(content);

    const settings = loadSettings();
    const contacts = settings.emergency?.contacts || [];

    if (contacts.length === 0) {
        content.innerHTML = `
            <div class="module-empty">
                <i class="fa-solid fa-phone"></i>
                <p>No emergency contacts saved.</p>
                <button id="emergencySettingsBtn" class="settings-link-btn">
                    <i class="fa-solid fa-gear"></i> Add Contacts Phone Numbers to Settings
                </button>
            </div>
        `;
        const settingsBtn = content.querySelector('#emergencySettingsBtn');
        if (settingsBtn) settingsBtn.onclick = () => location.href = 'settings.html';
        return;
    }

    const emergencyBtn = document.createElement('button');
    emergencyBtn.id = 'emergencyTriggerBtn';
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
        <i class="fa-solid fa-bell" style="font-size: 2rem;"></i>
        <span>EMERGENCY</span>
        <span style="font-size: 0.7rem;">Press for Help</span>
    `;
    content.appendChild(emergencyBtn);

    emergencyBtn.onmouseenter = () => {
        emergencyBtn.style.transform = 'scale(1.05)';
        emergencyBtn.style.boxShadow = '0 0 25px rgba(255,0,0,0.9)';
    };
    emergencyBtn.onmouseleave = () => {
        emergencyBtn.style.transform = 'scale(1)';
        emergencyBtn.style.boxShadow = '0 0 15px rgba(255,0,0,0.6)';
    };

    const statusDiv = document.createElement('div');
    statusDiv.style.cssText = 'margin-top: 20px; font-size: 0.8rem; color: #ffb000;';
    content.appendChild(statusDiv);

    function setStatus(msg, isError = false) {
        statusDiv.innerHTML = `<i class="fa-solid ${isError ? 'fa-exclamation-triangle' : 'fa-circle-info'}"></i> ${msg}`;
        statusDiv.style.color = isError ? '#ff8888' : '#ffb000';
        setTimeout(() => {
            if (statusDiv.innerHTML === `<i class="fa-solid ${isError ? 'fa-exclamation-triangle' : 'fa-circle-info'}"></i> ${msg}`)
                statusDiv.innerHTML = '';
        }, 8000);
    }

    async function sendSMS(phoneNumber, shortlink) {
        const fullLink = `https://osm.org/go/${shortlink}`;
        const message = `🚨 EMERGENCY ALERT! 🚨\n\nSomeone sent you their location.\n📍 Location: ${fullLink}\n⏰ Time: ${new Date().toLocaleString()}\n\nPlease check.`;
        try {
            const response = await fetch('https://sms-rest.sendmode.dev/3.0/send/bulk', {
                method: 'POST',
                headers: {
                    'Authorization': 'live_be3f344e-59b5-4f17-a276-b04368bef60b',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    sender_id: '+353899466476',
                    message: message,
                    mobile_numbers: [phoneNumber]
                })
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            return { success: true, data };
        } catch (err) {
            console.error('SMS send error:', err);
            return { success: false, error: err.message };
        }
    }

    // Main emergency flow with location validation
    function triggerEmergency() {
        if (isLocked) {
            setStatus('Emergency button is locked – unlock to activate.', true);
            return;
        }
        if (!confirm('⚠️ EMERGENCY: Are you sure you want to send an alert to all your emergency contacts? Your current location will be shared.')) {
            setStatus('Emergency cancelled.', false);
            return;
        }

        setStatus('Requesting your location (please allow precise location)...', false);

        if (!navigator.geolocation) {
            setStatus('Geolocation is not supported by your browser.', true);
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
                        `Do you still want to send the emergency alert with this location?`
                    );
                    if (!proceed) {
                        setStatus('Emergency cancelled – location inaccurate.', true);
                        return;
                    }
                }

                const shortCode = osmShortlink(lat, lon);
                const osmShortUrl = `https://osm.org/go/${shortCode}?z=16`;

                setStatus(`Location obtained. Sending alerts to ${contacts.length} contact(s)...`, false);

                let successCount = 0;
                let failCount = 0;
                for (const contact of contacts) {
                    const result = await sendSMS(contact.number, shortCode);
                    if (result.success) successCount++;
                    else failCount++;
                    await new Promise(r => setTimeout(r, 500));
                }

                if (successCount > 0) {
                    setStatus(`✅ Emergency alerts sent to ${successCount} contact(s). ${failCount > 0 ? `Failed: ${failCount}` : ''}`, false);
                    const linkDiv = document.createElement('div');
                    linkDiv.style.cssText = 'margin-top: 10px; font-size: 0.7rem; word-break: break-all;';
                    linkDiv.innerHTML = `<a href="${osmShortUrl}" target="_blank" style="color:#00ff41;">📍 View shared location on OpenStreetMap</a>`;
                    content.appendChild(linkDiv);
                    setTimeout(() => linkDiv.remove(), 15000);
                } else {
                    setStatus('❌ Failed to send any emergency alerts. Check network or contact numbers.', true);
                }
            },
            (error) => {
                let errorMsg = '';
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        errorMsg = 'Location permission denied. Please allow precise location in your browser settings.';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMsg = 'Location information unavailable. Please check your GPS or try again.';
                        break;
                    case error.TIMEOUT:
                        errorMsg = 'Location request timed out. Please move to an area with better GPS signal.';
                        break;
                    default:
                        errorMsg = 'Unknown geolocation error.';
                }
                setStatus(errorMsg, true);
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 } // increased timeout, allow some cache
        );
    }

    function applyLockState() {
        if (isLocked) {
            emergencyBtn.disabled = true;
            emergencyBtn.style.opacity = '0.6';
            emergencyBtn.style.cursor = 'not-allowed';
            emergencyBtn.onmouseenter = null;
            emergencyBtn.onmouseleave = null;
        } else {
            emergencyBtn.disabled = false;
            emergencyBtn.style.opacity = '';
            emergencyBtn.style.cursor = '';
            emergencyBtn.innerHTML = `
                <i class="fa-solid fa-bell" style="font-size: 2rem;"></i>
                <span>EMERGENCY</span>
                <span style="font-size: 0.7rem;">Press for Help</span>
            `;
            emergencyBtn.onmouseenter = () => {
                emergencyBtn.style.transform = 'scale(1.05)';
                emergencyBtn.style.boxShadow = '0 0 25px rgba(255,0,0,0.9)';
            };
            emergencyBtn.onmouseleave = () => {
                emergencyBtn.style.transform = 'scale(1)';
                emergencyBtn.style.boxShadow = '0 0 15px rgba(255,0,0,0.6)';
            };
        }
    }

    emergencyBtn.onclick = triggerEmergency;
    applyLockState();
}