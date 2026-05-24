// js/core/webrtc-integration.js - WebRTC module for premium users
(function() {
    'use strict';
    
    // Check if user has premium access (modify based on your auth system)
    function isPremiumUser() {
        // Check localStorage for premium status
        const premium = localStorage.getItem('user_is_premium');
        if (premium !== null) {
            return premium === 'true';
        }
        // Check session storage
        const sessionPremium = sessionStorage.getItem('user_is_premium');
        if (sessionPremium !== null) {
            return sessionPremium === 'true';
        }
        // Default to false for non-premium users
        // Change to true for testing
        return false;
    }
    
    // Show upgrade message
    function showUpgradeMessage(container) {
        container.innerHTML = `
            <div class="webrtc-upgrade" style="text-align: center; padding: 30px 20px;">
                <i class="fa-solid fa-lock" style="font-size: 2.5rem; color: #f59e0b; margin-bottom: 15px; display: block;"></i>
                <h4 style="margin-bottom: 10px; color: #1e293b;">Free & Unlimited Calls</h4>
                <p style="color: #64748b; margin-bottom: 20px; font-size: 0.85rem;">Upgrade to Premium to make unlimited WebRTC calls</p>
                <button class="upgrade-now-btn" style="background: #3B82F6; color: white; border: none; padding: 10px 24px; border-radius: 2rem; cursor: pointer; font-weight: 600;">
                    Upgrade Now →
                </button>
            </div>
        `;
        
        const upgradeBtn = container.querySelector('.upgrade-now-btn');
        if (upgradeBtn) {
            upgradeBtn.addEventListener('click', () => {
                alert('Contact support@handihomepage.com for premium upgrade');
            });
        }
    }
    
    // Show error message
    function showErrorMessage(container, message) {
        container.innerHTML = `
            <div class="webrtc-error" style="text-align: center; padding: 30px 20px;">
                <i class="fa-solid fa-exclamation-triangle" style="font-size: 2rem; color: #ef4444; margin-bottom: 15px; display: block;"></i>
                <p style="color: #64748b;">${message || 'Unable to load calling service'}</p>
                <button onclick="location.reload()" style="background: #3B82F6; color: white; border: none; padding: 6px 16px; border-radius: 2rem; margin-top: 10px; cursor: pointer;">Retry</button>
            </div>
        `;
    }
    
    // Show call status
    function showCallStatus(message, type) {
        const statusDiv = document.getElementById('webrtcCallStatus');
        if (statusDiv) {
            const colors = {
                calling: '#fef3c7',
                ringing: '#fef3c7',
                connected: '#d1fae5',
                error: '#fee2e2'
            };
            statusDiv.style.cssText = `padding: 10px; margin-top: 10px; border-radius: 2rem; text-align: center; font-size: 0.8rem; background: ${colors[type] || '#f1f5f9'}; display: block;`;
            statusDiv.innerHTML = `<i class="fa-solid fa-phone-alt"></i> ${message}`;
        }
    }
    
    function hideCallStatus() {
        const statusDiv = document.getElementById('webrtcCallStatus');
        if (statusDiv) statusDiv.remove();
    }
    
    // Main render function
    window.initWebRTCWidget = function(containerId) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.warn('WebRTC container not found:', containerId);
            return;
        }
        
        // Check premium access
        if (!isPremiumUser()) {
            showUpgradeMessage(container);
            return;
        }
        
        // Render the WebRTC interface for premium users
        container.innerHTML = `
            <div class="webrtc-interface">
                <div class="webrtc-status-bar" style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: #f1f5f9; border-radius: 12px; margin-bottom: 15px;">
                    <span style="font-size: 0.7rem; color: #059669;">
                        <i class="fa-solid fa-circle" style="font-size: 0.5rem;"></i> Ready for calls
                    </span>
                    <span style="font-size: 0.7rem; color: #64748b;">
                        <i class="fa-solid fa-shield-alt"></i> Encrypted
                    </span>
                </div>
                
                <div class="call-input-area" style="margin-bottom: 15px;">
                    <input type="text" id="webrtcNumber" placeholder="Enter phone number or WebRTC ID..." 
                           style="width: 100%; padding: 12px; border: 1px solid #e2e8f0; border-radius: 2rem; margin-bottom: 10px; font-size: 0.9rem;">
                    <div style="display: flex; gap: 10px;">
                        <button id="audioCallBtn" class="call-btn-audio" style="flex: 1; padding: 10px; background: #10B981; color: white; border: none; border-radius: 2rem; cursor: pointer; font-weight: 600;">
                            <i class="fa-solid fa-phone"></i> Audio Call
                        </button>
                        <button id="videoCallBtn" class="call-btn-video" style="flex: 1; padding: 10px; background: #3B82F6; color: white; border: none; border-radius: 2rem; cursor: pointer; font-weight: 600;">
                            <i class="fa-solid fa-video"></i> Video Call
                        </button>
                    </div>
                </div>
                
                <div class="contacts-area">
                    <h4 style="margin-bottom: 10px; font-size: 0.8rem; color: #64748b; display: flex; align-items: center; gap: 8px;">
                        <i class="fa-solid fa-address-book"></i> Quick Contacts
                        <button id="addContactBtn" style="margin-left: auto; background: none; border: none; color: #3B82F6; cursor: pointer; font-size: 0.75rem;">
                            <i class="fa-solid fa-plus"></i> Add
                        </button>
                    </h4>
                    <div id="quickContactsList" style="display: flex; flex-wrap: wrap; gap: 8px;">
                        <button class="contact-chip" data-number="alice@webrtc.example" style="background: #f1f5f9; border: none; padding: 6px 14px; border-radius: 20px; cursor: pointer; font-size: 0.8rem;">
                            👤 Alice
                        </button>
                        <button class="contact-chip" data-number="bob@webrtc.example" style="background: #f1f5f9; border: none; padding: 6px 14px; border-radius: 20px; cursor: pointer; font-size: 0.8rem;">
                            👤 Bob
                        </button>
                        <button class="contact-chip" data-number="carol@webrtc.example" style="background: #f1f5f9; border: none; padding: 6px 14px; border-radius: 20px; cursor: pointer; font-size: 0.8rem;">
                            👤 Carol
                        </button>
                    </div>
                </div>
                
                <div id="webrtcCallStatus" style="display: none;"></div>
            </div>
        `;
        
        // Attach event listeners
        const audioBtn = document.getElementById('audioCallBtn');
        const videoBtn = document.getElementById('videoCallBtn');
        const numberInput = document.getElementById('webrtcNumber');
        const addContactBtn = document.getElementById('addContactBtn');
        
        // Make call function
        function makeCall(type) {
            const number = numberInput?.value.trim();
            if (!number) {
                alert('Please enter a phone number or WebRTC ID');
                return;
            }
            
            // Create temporary status div
            let statusDiv = document.getElementById('webrtcCallStatus');
            if (!statusDiv) {
                statusDiv = document.createElement('div');
                statusDiv.id = 'webrtcCallStatus';
                container.appendChild(statusDiv);
            }
            
            statusDiv.style.cssText = 'padding: 10px; margin-top: 10px; border-radius: 2rem; text-align: center; font-size: 0.8rem; background: #fef3c7; display: block;';
            statusDiv.innerHTML = `<i class="fa-solid fa-phone-alt"></i> Calling ${number}...`;
            
            // Simulate call (replace with actual WebRTC implementation)
            setTimeout(() => {
                statusDiv.style.cssText = 'padding: 10px; margin-top: 10px; border-radius: 2rem; text-align: center; font-size: 0.8rem; background: #fee2e2; display: block;';
                statusDiv.innerHTML = `<i class="fa-solid fa-phone-slash"></i> Call ended (demo mode)`;
                setTimeout(() => {
                    statusDiv.style.display = 'none';
                }, 2000);
            }, 3000);
            
            // Log for debugging
            console.log(`[WebRTC] ${type} call initiated to: ${number}`);
        }
        
        // Add contact function
        function addContact() {
            const name = prompt('Enter contact name:');
            if (!name) return;
            const identifier = prompt('Enter WebRTC ID or phone number:');
            if (!identifier) return;
            
            const contactsList = document.getElementById('quickContactsList');
            if (contactsList) {
                const newContact = document.createElement('button');
                newContact.className = 'contact-chip';
                newContact.setAttribute('data-number', identifier);
                newContact.style.cssText = 'background: #f1f5f9; border: none; padding: 6px 14px; border-radius: 20px; cursor: pointer; font-size: 0.8rem;';
                newContact.innerHTML = `👤 ${name}`;
                newContact.addEventListener('click', () => {
                    if (numberInput) numberInput.value = identifier;
                    makeCall('audio');
                });
                contactsList.appendChild(newContact);
            }
        }
        
        // Attach events
        if (audioBtn) audioBtn.addEventListener('click', () => makeCall('audio'));
        if (videoBtn) videoBtn.addEventListener('click', () => makeCall('video'));
        if (numberInput) {
            numberInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') makeCall('audio');
            });
        }
        if (addContactBtn) addContactBtn.addEventListener('click', addContact);
        
        // Attach contact chip events
        document.querySelectorAll('.contact-chip').forEach(btn => {
            btn.addEventListener('click', () => {
                const number = btn.getAttribute('data-number');
                if (numberInput) numberInput.value = number;
                makeCall('audio');
            });
        });
        
        console.log('WebRTC widget initialized');
    };
    
    // Auto-initialize if container exists
    function autoInit() {
        const container = document.getElementById('webrtcWidgetContainer');
        if (container && window.initWebRTCWidget) {
            window.initWebRTCWidget('webrtcWidgetContainer');
        }
    }
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', autoInit);
    } else {
        autoInit();
    }
})();

// Helper function for testing premium access (remove in production)
window.setWebRTCPremium = function(enabled) {
    localStorage.setItem('user_is_premium', enabled);
    const container = document.getElementById('webrtcWidgetContainer');
    if (container && window.initWebRTCWidget) {
        window.initWebRTCWidget('webrtcWidgetContainer');
    }
    console.log(`WebRTC premium access set to: ${enabled}`);
};