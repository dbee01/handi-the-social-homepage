/*
 * Copyright (c) 2026 Handi Homepage
 * This file is part of HandiHomepage and is released under the GNU General Public License v3.0.
 * See the LICENSE file in the repository root for full details.
 */
// /js/core/ohdear.js
(function() {
    // =========================================================
    // HARDCODED WARNING MESSAGES (edit as needed)
    // =========================================================
    const messages = [
        "⚠️ Remember to lock the phone module when not in use to prevent accidental calls.",
        "🔒 The Emergency button is locked by default – unlock it to send alerts.",
        "📻 Radio streams may take a few seconds to buffer. Please be patient.",
        "🚌 Bus tracker uses scheduled times when real-time data is unavailable.",
        "🖼️ Gallery slideshow will pause automatically when you open the lightbox.",
        "🎵 Music player visualiser works best with local MP3 files.",
        "🌙 The screen wake lock is off by default – enable it in the footer bar.",
        "📧 For support, email true.cork.rebel@proton.me – we reply within 24 hours."
    ];

    // Pick a random message
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];

    // Create the warning box element
    const warningBox = document.createElement('div');
    warningBox.className = 'ohdear-warning';
    warningBox.setAttribute('role', 'alert');
    
    // Inner HTML: message text + close button
    warningBox.innerHTML = `
        <div class="ohdear-warning-content">
            <span class="ohdear-warning-text">${escapeHtml(randomMessage)}</span>
            <button class="ohdear-warning-close" aria-label="Dismiss">✕</button>
        </div>
    `;

    // Add CSS (inline styles to guarantee appearance)
    const style = document.createElement('style');
    style.textContent = `
        .ohdear-warning {
            background: #fff3cd;
            border-left: 6px solid #ffc107;
            border-radius: 12px;
            margin: 16px auto;
            padding: 12px 20px;
            max-width: 1300px;
            width: calc(100% - 40px);
            box-shadow: 0 2px 8px rgba(0,0,0,0.05);
            font-size: 1rem;
            line-height: 1.5;
            color: #856404;
            position: relative;
        }
        .ohdear-warning-content {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 16px;
        }
        .ohdear-warning-text {
            flex: 1;
        }
        .ohdear-warning-close {
            background: none;
            border: none;
            font-size: 1.4rem;
            font-weight: bold;
            cursor: pointer;
            color: #856404;
            padding: 4px 8px;
            border-radius: 50%;
            transition: background 0.2s;
            line-height: 1;
        }
        .ohdear-warning-close:hover {
            background: rgba(0,0,0,0.1);
        }
        @media (max-width: 700px) {
            .ohdear-warning {
                width: calc(100% - 24px);
                margin: 12px auto;
                padding: 10px 16px;
            }
        }
    `;
    document.head.appendChild(style);

    // Helper to escape HTML
    function escapeHtml(str) {
        return str.replace(/[&<>]/g, m => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;'
        }[m]));
    }

    // Insert the warning box after the header and before the dashboard wrapper
    function insertWarningBox() {
        const header = document.querySelector('header');
        const dashboardWrapper = document.querySelector('.dashboard-wrapper');
        if (!header || !dashboardWrapper) {
            // If elements not found, retry after a short delay
            setTimeout(insertWarningBox, 100);
            return;
        }
        // Insert right after header (before dashboard-wrapper)
        header.insertAdjacentElement('afterend', warningBox);
    }

    // Close button functionality
    warningBox.querySelector('.ohdear-warning-close').addEventListener('click', () => {
        warningBox.remove();
    });

    // Start insertion when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', insertWarningBox);
    } else {
        insertWarningBox();
    }
})();