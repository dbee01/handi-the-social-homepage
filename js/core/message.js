// js/core/message.js
(function() {
    // Detect browser type
    function getBrowserInfo() {
        const ua = navigator.userAgent;
        let browser = 'unknown';
        let instructions = '';
        
        if (ua.indexOf('Chrome') > -1 && ua.indexOf('Edge') === -1 && ua.indexOf('OPR') === -1) {
            browser = 'Chrome';
            instructions = 'Click the three dots ⋮ → Settings → On startup → Open a specific page → Add a new page → Enter: https://senior.handihomepage.com';
        } 
        else if (ua.indexOf('Firefox') > -1) {
            browser = 'Firefox';
            instructions = 'Click the menu ☰ → Settings → Home → Homepage and new windows → Custom URLs → Enter: https://senior.handihomepage.com';
        }
        else if (ua.indexOf('Edg') > -1) {
            browser = 'Edge';
            instructions = 'Click the three dots ⋯ → Settings → Start, home, and new tabs → When Edge starts → Open these pages → Add a new page → Enter: https://senior.handihomepage.com';
        }
        else if (ua.indexOf('Safari') > -1 && ua.indexOf('Chrome') === -1) {
            browser = 'Safari';
            instructions = 'Click Safari → Preferences → General → Homepage → Enter: https://senior.handihomepage.com → Set as homepage';
        }
        else if (ua.indexOf('OPR') > -1 || ua.indexOf('Opera') > -1) {
            browser = 'Opera';
            instructions = 'Click the O menu → Settings → On startup → Open a specific page → Add a new page → Enter: https://senior.handihomepage.com';
        }
        else if (ua.indexOf('Vivaldi') > -1) {
            browser = 'Vivaldi';
            instructions = 'Click the V menu → Settings → General → Startup → Homepage → Enter: https://senior.handihomepage.com';
        }
        else if (ua.indexOf('Brave') > -1) {
            browser = 'Brave';
            instructions = 'Click the hamburger menu ☰ → Settings → Get started → On startup → Open a specific page → Add a new page → Enter: https://senior.handihomepage.com';
        }
        
        return { browser, instructions };
    }
    
    const browserInfo = getBrowserInfo();
    
    // Check if homepage banner has been dismissed
    const bannerDismissed = localStorage.getItem('homepageBannerDismissed') === 'true';
    
    // =========================================================
    // HOMEPAGE BANNER (separate, fixed-top, different color)
    // =========================================================
    if (!bannerDismissed) {
        const bannerDiv = document.createElement('div');
        bannerDiv.style.backgroundColor = '#e6f7ff';
        bannerDiv.style.borderLeft = '6px solid #1890ff';
        bannerDiv.style.borderRadius = '8px';
        bannerDiv.style.padding = '12px 15px';
        bannerDiv.style.margin = '10px';
        bannerDiv.style.fontSize = '1rem';
        bannerDiv.style.display = 'flex';
        bannerDiv.style.justifyContent = 'space-between';
        bannerDiv.style.alignItems = 'center';
        bannerDiv.style.gap = '10px';
        bannerDiv.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
        
        const bannerText = document.createElement('span');
        bannerText.style.flex = '1';
        bannerText.style.lineHeight = '1.5';
        bannerText.innerHTML = `
            <strong>🏠 Make HandiHomepage your homepage!</strong><br>
            📌 ${browserInfo.instructions}<br>
            <small style="color: #666;">This will set ${browserInfo.browser} to open senior.handihomepage.com when you start your browser.</small>
        `;
        
        const bannerCloseBtn = document.createElement('button');
        bannerCloseBtn.textContent = '✕';
        bannerCloseBtn.style.background = 'none';
        bannerCloseBtn.style.border = 'none';
        bannerCloseBtn.style.fontSize = '20px';
        bannerCloseBtn.style.cursor = 'pointer';
        bannerCloseBtn.style.color = '#1890ff';
        bannerCloseBtn.style.padding = '0 5px';
        bannerCloseBtn.style.minWidth = '32px';
        bannerCloseBtn.style.minHeight = '32px';
        bannerCloseBtn.style.fontWeight = 'bold';
        
        bannerCloseBtn.onclick = function() {
            bannerDiv.remove();
            localStorage.setItem('homepageBannerDismissed', 'true');
        };
        
        bannerDiv.appendChild(bannerText);
        bannerDiv.appendChild(bannerCloseBtn);
        
        // Add to page when ready (at the top)
        function addBannerToPage() {
            const header = document.querySelector('header');
            if (header && header.parentNode) {
                header.parentNode.insertBefore(bannerDiv, header);
            } else {
                document.body.insertBefore(bannerDiv, document.body.firstChild);
            }
        }
        
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', addBannerToPage);
        } else {
            addBannerToPage();
        }
    }
    
    // =========================================================
    // ROTATING MESSAGE BOX (original)
    // =========================================================
    const messages = [        
        "❤️ We love Proton - the safe, European email provider. Learn why you should too: <a href=\"https://www.jdoqocy.com/click-101722909-13792584\">visit Proton</a> <sup>(sponsored)</sup>",
        "🔒 Handi Homepage is still in BETA. Apologies for any bugs: <a href=\"mailto:true.cork.rebel@proton.me\">true.cork.rebel@proton.me</a>",
        "🔒 Incognito Mode is NOT <i>incognito</i>! Surf the Web securely with the <a href='https://www.tkqlhce.com/click-101722909-13792632'>reputable Proton VPN</a> <sup>(sponsored)</sup>",
        "📻 Turn off all audio channels by pressing the speaker icon (left of page footer at bottom of your screen).",
        "📚 Check out our support documentation at <a href=\"https://handihomepage.com/docs.html\">handihomepage.com/docs</a>.",
        "📧 Show your support; purchase a safe Handi Tablet device; or simply buy us a <a href=\"https://buymeacoffee.com/dazrunner\">pint</a>."
    ];

    let currentIndex = 0;

    const msgDiv = document.createElement('div');
    msgDiv.style.backgroundColor = '#fff3cd';
    msgDiv.style.borderLeft = '6px solid #ffc107';
    msgDiv.style.borderRadius = '8px';
    msgDiv.style.padding = '10px 15px';
    msgDiv.style.margin = '10px';
    msgDiv.style.fontSize = '1rem';
    msgDiv.style.display = 'flex';
    msgDiv.style.justifyContent = 'space-between';
    msgDiv.style.alignItems = 'center';
    msgDiv.style.gap = '10px';
    
    const textSpan = document.createElement('span');
    textSpan.style.flex = '1';
    textSpan.style.lineHeight = '1.5';
    textSpan.innerHTML = messages[currentIndex];
    
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    closeBtn.style.background = 'none';
    closeBtn.style.border = 'none';
    closeBtn.style.fontSize = '18px';
    closeBtn.style.cursor = 'pointer';
    closeBtn.style.color = '#856404';
    closeBtn.style.padding = '0 5px';
    closeBtn.style.minWidth = '32px';
    closeBtn.style.minHeight = '32px';
    
    closeBtn.onclick = function() {
        msgDiv.remove();
        if (rotationInterval) {
            clearInterval(rotationInterval);
        }
    };
    
    msgDiv.appendChild(textSpan);
    msgDiv.appendChild(closeBtn);
    
    function rotateMessage() {
        currentIndex = (currentIndex + 1) % messages.length;
        textSpan.innerHTML = messages[currentIndex];
    }
    
    let rotationInterval = setInterval(rotateMessage, 12000);
    
    function addToPage() {
        const header = document.querySelector('header');
        if (header && header.parentNode) {
            header.parentNode.insertBefore(msgDiv, header.nextSibling);
        } else {
            document.body.insertBefore(msgDiv, document.body.firstChild);
        }
    }
    
    window.addEventListener('beforeunload', function() {
        if (rotationInterval) {
            clearInterval(rotationInterval);
        }
    });
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', addToPage);
    } else {
        addToPage();
    }
})();