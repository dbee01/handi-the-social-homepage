/*
 * Copyright (c) 2026 Handi Homepage
 * This file is part of HandiHomepage and is released under the GNU General Public License v3.0.
 * See the LICENSE file in the repository root for full details.
 */
// js/footer-controls.js
(function() {
    // --- Global Mute State ---
    let isMuted = localStorage.getItem('globalMute') === 'true';

    function updateMuteIcon() {
        const muteBtn = document.getElementById('footerMuteBtn');
        if (muteBtn) {
            const icon = muteBtn.querySelector('i');
            if (icon) {
                icon.className = isMuted ? 'fa-solid fa-volume-mute' : 'fa-solid fa-volume-high';
            }
        }
    }

    function toggleMute() {
        isMuted = !isMuted;
        localStorage.setItem('globalMute', isMuted);
        updateMuteIcon();
        window.dispatchEvent(new CustomEvent('globalMuteToggle', { detail: { muted: isMuted } }));
    }

    const muteBtn = document.getElementById('footerMuteBtn');
    if (muteBtn) {
        muteBtn.addEventListener('click', toggleMute);
        updateMuteIcon();
        window.dispatchEvent(new CustomEvent('globalMuteToggle', { detail: { muted: isMuted } }));
    }

    // --- Wake Lock (swapped icons: sun = awake, bed = sleep) ---
    let wakeLock = null;
    const wakeLockBtn = document.getElementById('footerWakeLockBtn');
    let wakeLockActive = localStorage.getItem('wakeLockActive') === 'true';

    async function requestWakeLock() {
        if ('wakeLock' in navigator) {
            try {
                wakeLock = await navigator.wakeLock.request('screen');
                wakeLockActive = true;
                localStorage.setItem('wakeLockActive', 'true');
                updateWakeLockIcon();
                document.addEventListener('visibilitychange', handleVisibilityChange);
            } catch (err) {
                console.warn('Wake lock error:', err);
                wakeLockActive = false;
                localStorage.setItem('wakeLockActive', 'false');
                updateWakeLockIcon();
            }
        } else {
            console.warn('Wake Lock API not supported');
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
        localStorage.setItem('wakeLockActive', 'false');
        updateWakeLockIcon();
        document.removeEventListener('visibilitychange', handleVisibilityChange);
    }

    function handleVisibilityChange() {
        if (wakeLockActive && document.visibilityState === 'visible') {
            requestWakeLock();
        }
    }

    function updateWakeLockIcon() {
        if (!wakeLockBtn) return;
        const icon = wakeLockBtn.querySelector('i');
        if (wakeLockActive) {
            icon.className = 'fa-solid fa-bed';          // ☀️ screen awake
            wakeLockBtn.title = 'Screen awake – click to allow sleep';
        } else {
            icon.className = 'fa-solid fa-sun';          // 💤 screen may sleep
            wakeLockBtn.title = 'Screen may sleep – click to keep awake';
        }
    }

    if (wakeLockBtn) {
        wakeLockBtn.addEventListener('click', async () => {
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

    // --- Navigation buttons ---
    const settingsBtn = document.getElementById('footerSettingsBtn');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            window.location.href = 'settings.html';
        });
    }

    const docsBtn = document.getElementById('footerDocsBtn');
    if (docsBtn) {
        docsBtn.addEventListener('click', () => {
            window.open('/docs.html', '_blank');
        });
    }

    const emailBtn = document.getElementById('footerEmailBtn');
    if (emailBtn) {
        emailBtn.addEventListener('click', () => {
            window.location.href = 'mailto:true.cork.rebel@proton.me';
        });
    }
})();