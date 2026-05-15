// modules/emergency/emergency.module.js
import { loadSettings } from '../../js/core/settings.js';

// ----------------------------------------------------------------------
// Convert lat/lon to OSM shortlink code (https://osm.org/go/...)
// Based on the official OpenStreetMap shortlink algorithm
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

export default async function initEmergency(container) {
    // Preserve pin button
    const pinBtn = container.querySelector('.pin-btn');
    container.innerHTML = '';
    if (pinBtn) container.appendChild(pinBtn);

    // Title
    const title = document.createElement('div');
    title.className = 'panel-title';
    title.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> EMERGENCY';
    container.appendChild(title);

    const content = document.createElement('div');
    content.style.cssText = 'padding: 10px; text-align: center;';
    container.appendChild(content);

    // Load contacts from settings
    const settings = loadSettings();
    const contacts = settings.emergency?.contacts || [];

    // If no contacts, show a helpful message
    if (contacts.length === 0) {
        content.innerHTML = `
            <div style="border:1px solid #ff4444; border-radius:12px; padding:20px;">
                <i class="fa-solid fa-phone" style="font-size:2rem;"></i>
                <p style="margin-top:10px;">No emergency contacts saved.</p>
                <button id="goToSettingsBtn" style="margin-top:10px; padding:8px 16px; color:#000; border:none; border-radius:6px; cursor:pointer;">Add Contacts in Settings</button>
            </div>
        `;
        const btn = document.getElementById('goToSettingsBtn');
        if (btn) btn.onclick = () => location.href = 'settings.html';
        return;
    }

    // Create the big red emergency button
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

    // Status area
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

    // Send SMS via SendMode API (hardcoded sender ID)
    async function sendSMS(phoneNumber, shortlink) {
        const fullLink = `https://osm.org/go/${shortlink}`;
        const message = `🚨 EMERGENCY ALERT! 🚨\n\nSomeone needs your help.\n📍 Location: ${fullLink}\n⏰ Time: ${new Date().toLocaleString()}\n\nPlease check on them immediately.`;
        try {
            const response = await fetch('https://sms-rest.sendmode.dev/3.0/send/bulk', {
                method: 'POST',
                headers: {
                    'Authorization': 'live_be3f344e-59b5-4f17-a276-b04368bef60b',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    sender_id: '+353899466476', // hardcoded sender number
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

    // Main emergency flow
    function triggerEmergency() {
        if (!confirm('⚠️ EMERGENCY: Are you sure you want to send an alert to all your emergency contacts? Your current location will be shared.')) {
            setStatus('Emergency cancelled.', false);
            return;
        }

        setStatus('Requesting your location...', false);

        if (!navigator.geolocation) {
            setStatus('Geolocation is not supported by your browser.', true);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                const shortCode = osmShortlink(lat, lon);
                const osmShortUrl = `https://osm.org/go/${shortCode}?z=16`;

                setStatus(`Location obtained. Sending alerts to ${contacts.length} contact(s)...`, false);

                let successCount = 0;
                let failCount = 0;
                for (const contact of contacts) {
                    const result = await sendSMS(contact.number, shortCode);
                    if (result.success) successCount++;
                    else failCount++;
                    // brief delay to avoid overwhelming the API
                    await new Promise(r => setTimeout(r, 500));
                }

                if (successCount > 0) {
                    setStatus(`✅ Emergency alerts sent to ${successCount} contact(s). ${failCount > 0 ? `Failed: ${failCount}` : ''}`, false);
                    // Show the short link in the UI
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
                    case error.PERMISSION_DENIED: errorMsg = 'Location permission denied. Cannot send alert.'; break;
                    case error.POSITION_UNAVAILABLE: errorMsg = 'Location information unavailable.'; break;
                    case error.TIMEOUT: errorMsg = 'Location request timed out.'; break;
                    default: errorMsg = 'Unknown geolocation error.';
                }
                setStatus(errorMsg, true);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    }

    emergencyBtn.onclick = triggerEmergency;
}