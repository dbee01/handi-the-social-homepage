/*
 * Copyright (c) 2026 Handi Homepage
 * This file is part of HandiHomepage and is released under the GNU General Public License v3.0.
 * See the LICENSE file in the repository root for full details.
 */

// js/webrtc-integration.js - WebRTC module integration for premium users
let webrtcWidget = null;
let webrtcClient = null;
let isWebRTCReady = false;

class WebRTCWidget {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.isVisible = false;
        this.init();
    }
    
    async init() {
        const hasAccess = await checkUserAccess();
        
        if (!hasAccess) {
            this.showUpgradeMessage();
            return;
        }
        
        this.loadWebRTCModule();
    }
    
    showUpgradeMessage() {
        if (!this.container) return;
        this.container.innerHTML = `
            <div class="webrtc-upgrade-message">
                <i class="fa-solid fa-lock"></i>
                <h4>Free & Unlimited Calls</h4>
                <p>Upgrade to Premium to make unlimited WebRTC calls</p>
                <button class="upgrade-btn" onclick="alert('Contact support for upgrade')">
                    Upgrade Now →
                </button>
            </div>
        `;
    }
    
    async loadWebRTCModule() {
        // Load Infobip SDK dynamically
        if (!document.querySelector('script[src*="infobip.rtc.js"]')) {
            const script = document.createElement('script');
            script.src = 'https://rtc.cdn.infobip.com/2/latest/infobip.rtc.js';
            script.onload = () => this.initWebRTCClient();
            document.head.appendChild(script);
        } else {
            this.initWebRTCClient();
        }
    }
    
    async initWebRTCClient() {
        try {
            // Get token from backend
            const userId = USER_ACCESS.userId || window.handiNs.get('webrtc_user_id') || 'user_' + Date.now();
            const response = await fetch('/api/webrtc/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, displayName: userId })
            });
            const { token } = await response.json();
            
            // Initialize Infobip client
            webrtcClient = createInfobipRtc(token, { debug: false });
            
            webrtcClient.on('connected', () => {
                console.log('WebRTC connected');
                isWebRTCReady = true;
                this.renderWidget();
            });
            
            webrtcClient.on('incoming-webrtc-call', (event) => {
                this.showIncomingCall(event.incomingCall);
            });
            
            webrtcClient.connect();
            
        } catch (error) {
            console.error('WebRTC init failed:', error);
            this.showError();
        }
    }
    
    renderWidget() {
        if (!this.container) return;
        
        this.container.innerHTML = `
            <div class="webrtc-widget">
                <div class="webrtc-widget-header">
                    <i class="fa-solid fa-phone-volume"></i>
                    <span>Free & Unlimited Calls</span>
                    <span class="webrtc-status online">● Online</span>
                </div>
                <div class="webrtc-widget-body">
                    <div class="webrtc-quick-call">
                        <input type="text" id="webrtcQuickCall" placeholder="Enter phone number or WebRTC ID...">
                        <div class="webrtc-call-buttons">
                            <button id="webrtcAudioCall" class="call-btn audio">
                                <i class="fa-solid fa-phone"></i> Call
                            </button>
                            <button id="webrtcVideoCall" class="call-btn video">
                                <i class="fa-solid fa-video"></i> Video
                            </button>
                        </div>
                    </div>
                    <div class="webrtc-contacts">
                        <h4>Contacts</h4>
                        <div id="webrtcContactsList" class="contacts-list"></div>
                        <button id="webrtcAddContact" class="add-contact-btn-sm">
                            <i class="fa-solid fa-plus"></i> Add Contact
                        </button>
                    </div>
                </div>
                <div id="webrtcCallStatus" class="webrtc-call-status" style="display:none;"></div>
            </div>
        `;
        
        this.attachEvents();
        this.loadContacts();
    }
    
    attachEvents() {
        const audioBtn = document.getElementById('webrtcAudioCall');
        const videoBtn = document.getElementById('webrtcVideoCall');
        const quickInput = document.getElementById('webrtcQuickCall');
        const addContactBtn = document.getElementById('webrtcAddContact');
        
        audioBtn?.addEventListener('click', () => this.makeCall('audio'));
        videoBtn?.addEventListener('click', () => this.makeCall('video'));
        quickInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.makeCall('audio');
        });
        addContactBtn?.addEventListener('click', () => this.addContact());
    }
    
    async makeCall(type) {
        const target = document.getElementById('webrtcQuickCall')?.value.trim();
        if (!target) {
            this.showNotification('Enter a phone number or WebRTC ID', 'error');
            return;
        }
        
        if (!webrtcClient || !isWebRTCReady) {
            this.showNotification('Connecting to call service...', 'warning');
            return;
        }
        
        this.showCallStatus(`Calling ${target}...`, 'calling');
        
        try {
            const options = { video: type === 'video' };
            const call = webrtcClient.callWebrtc(target, options);
            this.setupCallHandlers(call);
        } catch (error) {
            this.showNotification(`Call failed: ${error.message}`, 'error');
            this.hideCallStatus();
        }
    }
    
    setupCallHandlers(call) {
        call.on('established', (event) => {
            this.showCallStatus('Connected', 'connected');
            if (event.stream) {
                this.showRemoteVideo(event.stream);
            }
        });
        
        call.on('hangup', () => {
            this.hideCallStatus();
            this.hideRemoteVideo();
            this.showNotification('Call ended', 'info');
        });
        
        call.on('error', (error) => {
            this.showNotification(`Call error`, 'error');
            this.hideCallStatus();
        });
    }
    
    showIncomingCall(incomingCall) {
        const caller = incomingCall.source().identifier;
        
        const modal = document.createElement('div');
        modal.className = 'webrtc-incoming-modal';
        modal.innerHTML = `
            <div class="incoming-header">
                <i class="fa-solid fa-phone-ring"></i>
                <span>Incoming Call</span>
            </div>
            <div class="incoming-body">
                <div class="caller-name">${caller}</div>
                <div class="incoming-actions">
                    <button class="accept-btn">Accept</button>
                    <button class="decline-btn">Decline</button>
                </div>
            </div>
        `;
        
        modal.querySelector('.accept-btn').onclick = () => {
            incomingCall.accept();
            modal.remove();
        };
        
        modal.querySelector('.decline-btn').onclick = () => {
            incomingCall.decline();
            modal.remove();
        };
        
        document.body.appendChild(modal);
        setTimeout(() => modal.remove(), 30000);
    }
    
    async loadContacts() {
        try {
            const userId = USER_ACCESS.userId || window.handiNs.get('webrtc_user_id');
            const response = await fetch(`/api/webrtc/contacts/${userId}`);
            const data = await response.json();
            
            const container = document.getElementById('webrtcContactsList');
            if (container && data.contacts) {
                container.innerHTML = data.contacts.map(c => `
                    <div class="contact-item" data-id="${c.webrtcId}">
                        <i class="fa-solid fa-user-circle"></i>
                        <div class="contact-info">
                            <div class="contact-name">${c.name}</div>
                            <div class="contact-number">${c.webrtcId || c.phoneNumber}</div>
                        </div>
                        <button class="call-contact-btn" data-number="${c.webrtcId}">
                            <i class="fa-solid fa-phone"></i>
                        </button>
                    </div>
                `).join('');
                
                document.querySelectorAll('.call-contact-btn').forEach(btn => {
                    btn.addEventListener('click', () => {
                        document.getElementById('webrtcQuickCall').value = btn.dataset.number;
                        this.makeCall('audio');
                    });
                });
            }
        } catch (error) {
            console.error('Failed to load contacts:', error);
        }
    }
    
    addContact() {
        const name = prompt('Enter contact name:');
        if (!name) return;
        const identifier = prompt('Enter phone number or WebRTC ID:');
        if (!identifier) return;
        
        // Save contact via API
        fetch('/api/webrtc/contacts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: USER_ACCESS.userId,
                name: name,
                webrtcId: identifier
            })
        }).then(() => this.loadContacts());
    }
    
    showCallStatus(message, type) {
        const statusDiv = document.getElementById('webrtcCallStatus');
        if (statusDiv) {
            statusDiv.className = `webrtc-call-status ${type}`;
            statusDiv.innerHTML = `<i class="fa-solid fa-phone-alt"></i> ${message}`;
            statusDiv.style.display = 'flex';
        }
    }
    
    hideCallStatus() {
        const statusDiv = document.getElementById('webrtcCallStatus');
        if (statusDiv) statusDiv.style.display = 'none';
    }
    
    showRemoteVideo(stream) {
        let videoContainer = document.getElementById('webrtcRemoteVideo');
        if (!videoContainer) {
            videoContainer = document.createElement('div');
            videoContainer.id = 'webrtcRemoteVideo';
            videoContainer.className = 'webrtc-remote-video';
            videoContainer.innerHTML = `<video autoplay playsinline></video><button id="closeVideoBtn">✕</button>`;
            this.container?.appendChild(videoContainer);
            document.getElementById('closeVideoBtn')?.addEventListener('click', () => this.hideRemoteVideo());
        }
        const video = videoContainer.querySelector('video');
        if (video) video.srcObject = stream;
        videoContainer.style.display = 'block';
    }
    
    hideRemoteVideo() {
        const videoContainer = document.getElementById('webrtcRemoteVideo');
        if (videoContainer) {
            const video = videoContainer.querySelector('video');
            if (video && video.srcObject) {
                video.srcObject.getTracks().forEach(track => track.stop());
                video.srcObject = null;
            }
            videoContainer.style.display = 'none';
        }
    }
    
    showNotification(message, type) {
        const notification = document.createElement('div');
        notification.className = `webrtc-notification ${type}`;
        notification.innerHTML = `<span>${message}</span>`;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 3000);
    }
    
    showError() {
        if (!this.container) return;
        this.container.innerHTML = `
            <div class="webrtc-error">
                <i class="fa-solid fa-exclamation-triangle"></i>
                <p>Unable to load calling service. Please try again later.</p>
                <button onclick="location.reload()">Retry</button>
            </div>
        `;
    }
}

// Initialize when DOM ready
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('webrtcWidgetContainer')) {
        webrtcWidget = new WebRTCWidget('webrtcWidgetContainer');
    }
});