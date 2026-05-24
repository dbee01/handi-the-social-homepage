// js/core/message.js
(function() {
    // Simple message box - no external requests, no permissions
    const messages = [
        "📻 Radio streams may take a few seconds to buffer. Please be patient.",
        "⚠️ Remember to lock the phone module when not in use.",
        "🔒 The Emergency button is locked by default – unlock to send alerts.",
        "🚌 Bus tracker uses scheduled times when real-time data is unavailable.",
        "🖼️ Gallery slideshow will pause when you open the lightbox.",
        "🎵 Music player visualiser works best with local MP3 files.",
        "🌙 Screen wake lock is off by default – enable in footer bar.",
        "📧 Email true.cork.rebel@proton.me for support."
    ];

    const randomMessage = messages[Math.floor(Math.random() * messages.length)];

    // Create div
    const msgDiv = document.createElement('div');
    msgDiv.style.backgroundColor = '#fff3cd';
    msgDiv.style.borderLeft = '6px solid #ffc107';
    msgDiv.style.borderRadius = '8px';
    msgDiv.style.padding = '10px 15px';
    msgDiv.style.margin = '10px';
    msgDiv.style.fontSize = '14px';
    msgDiv.style.display = 'flex';
    msgDiv.style.justifyContent = 'space-between';
    msgDiv.style.alignItems = 'center';
    msgDiv.style.gap = '10px';
    
    const textSpan = document.createElement('span');
    textSpan.textContent = randomMessage;
    textSpan.style.flex = '1';
    
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    closeBtn.style.background = 'none';
    closeBtn.style.border = 'none';
    closeBtn.style.fontSize = '18px';
    closeBtn.style.cursor = 'pointer';
    closeBtn.style.color = '#856404';
    closeBtn.style.padding = '0 5px';
    
    closeBtn.onclick = function() {
        msgDiv.remove();
    };
    
    msgDiv.appendChild(textSpan);
    msgDiv.appendChild(closeBtn);
    
    // Add to page when ready
    function addToPage() {
        const header = document.querySelector('header');
        if (header) {
            header.parentNode.insertBefore(msgDiv, header.nextSibling);
        } else {
            document.body.insertBefore(msgDiv, document.body.firstChild);
        }
    }
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', addToPage);
    } else {
        addToPage();
    }
})();