// js/core/message.js
(function() {
    // Simple message box - no external requests, no permissions
    const messages = [        
        "❤️ We love Proton - the safe, European email provider. Learn why you should too: <a href=\"https://www.jdoqocy.com/click-101722909-13792584\">visit Proton</a> <sup>(sponsored)</sup>",
        "🔒 Handi Homepage is still in BETA. Apologies for any bugs: <a href=\"mailto:true.cork.rebel@proton.me\">true.cork.rebel@proton.me</a>",
        "🚌 Bus tracker uses scheduled times when real-time data is unavailable.",
        "🔒 Incognito Mode is NOT <i>incognito</i>! Surf the Web securely with the <a href='https://www.tkqlhce.com/click-101722909-13792632'>reputable Proton VPN</a> <sup>(sponsored)</sup>",
        "📻 Turn off all audio channels by pressing the speaker icon (left of page footer at bottom of your screen).",
        "📚 Check out our support documentation at <a href=\"https://handihomepage.com/docs.html\">handihomepage.com/docs</a>.",
        "📧 Show your support; purchase a safe Handi Tablet device; or simply buy us a <a href=\"https://buymeacoffee.com/dazrunner\">pint</a>."
    ];

    let currentIndex = 0;

    // Create div
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
    // Use innerHTML to render HTML links
    textSpan.innerHTML = messages[currentIndex];
    
    // Close button - COMMENTED OUT
    // const closeBtn = document.createElement('button');
    // closeBtn.textContent = '✕';
    // closeBtn.style.background = 'none';
    // closeBtn.style.border = 'none';
    // closeBtn.style.fontSize = '18px';
    // closeBtn.style.cursor = 'pointer';
    // closeBtn.style.color = '#856404';
    // closeBtn.style.padding = '0 5px';
    // 
    // closeBtn.onclick = function() {
    //     msgDiv.remove();
    // };
    
    // msgDiv.appendChild(textSpan);
    // msgDiv.appendChild(closeBtn);
    
    // Just append textSpan without close button
    msgDiv.appendChild(textSpan);
    
    // Function to rotate messages
    function rotateMessage() {
        currentIndex = (currentIndex + 1) % messages.length;
        textSpan.innerHTML = messages[currentIndex];
    }
    
    // Start rotation every 12 seconds
    let rotationInterval = setInterval(rotateMessage, 12000);
    
    // Add to page when ready
    function addToPage() {
        const header = document.querySelector('header');
        if (header) {
            header.parentNode.insertBefore(msgDiv, header.nextSibling);
        } else {
            document.body.insertBefore(msgDiv, document.body.firstChild);
        }
    }
    
    // Clean up interval when page is unloaded (optional)
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