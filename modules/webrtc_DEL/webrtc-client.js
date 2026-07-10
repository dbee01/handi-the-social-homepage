// webrtc/webrtc-client.js - Frontend WebRTC logic
class WebRTCClient {
    constructor() {
        this.infobipRTC = null;
        this.currentCall = null;
        this.currentRoomCall = null;
        this.isConnected = false;
        this.userIdentity = null;
        this.contactOnlyMode = true; // Default ON - from settings
        this.allowedContacts = new Set();
        this.pendingIncomingCall = null;
        
        this.init();
    }

    async init() {
        await this.loadSettings();
        await this.loadContacts();
        await this.authenticateAndConnect();
        this.setupEventListeners();
    }

    async loadSettings() {
        // Load from localStorage or your settings module
        const saved = localStorage.getItem('hh_webrtc_settings');
        if (saved) {
            const settings = JSON.parse(saved);
            this.contactOnlyMode = settings.contactOnlyMode !== false; // Default true
        }
        
        // Listen for settings changes
        window.addEventListener('hh_settings_changed', (e) => {
            if (e.detail.contactOnlyMode !== undefined) {
                this.contactOnlyMode = e.detail.contactOnlyMode;
                console.log('Contact-only mode:', this.contactOnlyMode);
            }
        });
    }

    async loadContacts() {
        try {
            const userId = localStorage.getItem('hh_user_id');
            if (!userId) return;
            
            const response = await fetch(`/api/webrtc/contacts/${userId}`);
            const data = await response.json();
            
            if (data.success) {
                this.allowedContacts.clear();
                data.contacts.forEach(contact => {
                    if (contact.webrtcId) {
                        this.allowedContacts.add(contact.webrtcId);
                    }
                    if (contact.phoneNumber) {
                        this.allowedContacts.add(contact.phoneNumber);
                    }
                });
            }
        } catch (error) {
            console.error('Failed to load contacts:', error);
        }
    }

    async authenticateAndConnect() {
        try {
            const userId = localStorage.getItem('hh_user_id') || 'user_' + Date.now();
            const displayName = localStorage.getItem('hh_display_name') || userId;
            
            // Get token from backend
            const tokenResponse = await fetch('/api/webrtc/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, displayName })
            });
            
            const { token, identity } = await tokenResponse.json();
            this.userIdentity = identity;
            
            // Initialize InfobipRTC (global from SDK)
            this.infobipRTC = createInfobipRtc(token, { debug: true });
            
            // Setup event handlers
            this.setupInfobipEvents();
            
            // Connect
            this.infobipRTC.connect();
            
        } catch (error) {
            console.error('Authentication failed:', error);
            this.showNotification('Failed to connect to calling service', 'error');
        }
    }

    setupInfobipEvents() {
        this.infobipRTC.on('connected', (event) => {
            this.isConnected = true;
            console.log('Connected as:', event.identity);
            this.showNotification('Ready for calls', 'success');
            this.updateUIStatus('connected');
        });

        this.infobipRTC.on('disconnected', (event) => {
            this.isConnected = false;
            console.log('Disconnected');
            this.updateUIStatus('disconnected');
        });

        // Incoming call handler with contact filtering
        this.infobipRTC.on('incoming-webrtc-call', async (event) => {
            const incomingCall = event.incomingCall;
            const callerIdentity = incomingCall.source().identifier;
            
            // Contact-only mode check
            if (this.contactOnlyMode && !this.allowedContacts.has(callerIdentity)) {
                console.log(`Blocked call from non-contact: ${callerIdentity}`);
                incomingCall.decline();
                this.showNotification(`Blocked call from ${callerIdentity} (not in contacts)`, 'warning');
                return;
            }
            
            // Show incoming call UI
            this.pendingIncomingCall = incomingCall;
            this.showIncomingCallUI(callerIdentity, incomingCall);
        });
    }

    showIncomingCallUI(callerIdentity, incomingCall) {
        // Create modal or use existing one
        const modal = this.createCallModal();
        modal.querySelector('.caller-name').textContent = callerIdentity;
        modal.querySelector('.call-type').textContent = 'Incoming WebRTC Call';
        
        // Setup accept/decline buttons
        modal.querySelector('.accept-btn').onclick = () => {
            this.currentCall = incomingCall;
            this.setupCallEventHandlers(incomingCall);
            incomingCall.accept();
            modal.remove();
            this.showCallInterface(incomingCall);
        };
        
        modal.querySelector('.decline-btn').onclick = () => {
            incomingCall.decline();
            modal.remove();
        };
        
        document.body.appendChild(modal);
    }

    // Make a WebRTC call to a contact
    async makeCall(contactId, options = {}) {
        if (!this.isConnected) {
            this.showNotification('Not connected to calling service', 'error');
            return null;
        }
        
        const { video = false, isRoomCall = false, roomName = null } = options;
        
        try {
            if (isRoomCall) {
                const roomId = roomName || `room_${Date.now()}`;
                const roomOptions = RoomCallOptions.builder().setVideo(video).build();
                this.currentRoomCall = this.infobipRTC.joinRoom(roomId, roomOptions);
                this.setupRoomEventHandlers(this.currentRoomCall);
                this.showRoomInterface(this.currentRoomCall, roomId);
                return this.currentRoomCall;
            } else {
                const callOptions = WebrtcCallOptions.builder().setVideo(video).build();
                this.currentCall = this.infobipRTC.callWebrtc(contactId, callOptions);
                this.setupCallEventHandlers(this.currentCall);
                this.showCallInterface(this.currentCall, video);
                return this.currentCall;
            }
        } catch (error) {
            console.error('Call failed:', error);
            this.showNotification('Failed to start call', 'error');
            return null;
        }
    }

    setupCallEventHandlers(call) {
        call.on(CallsApiEvents.RINGING, () => {
            console.log('Ringing...');
            this.updateCallStatus('ringing');
        });
        
        call.on(CallsApiEvents.ESTABLISHED, (event) => {
            console.log('Call established');
            this.updateCallStatus('connected');
            
            // Play remote audio
            const audioEl = document.getElementById('remoteAudio');
            if (audioEl) audioEl.srcObject = event.stream;
        });
        
        call.on(CallsApiEvents.HANGUP, (event) => {
            console.log('Call ended');
            this.currentCall = null;
            this.hideCallInterface();
        });
        
        call.on(CallsApiEvents.ERROR, (event) => {
            console.error('Call error:', event.errorCode);
            this.showNotification(`Call error: ${event.errorCode.name}`, 'error');
            this.hideCallInterface();
        });
        
        // Video events
        call.on(CallsApiEvents.CAMERA_VIDEO_ADDED, (event) => {
            const videoEl = document.getElementById('localVideo');
            if (videoEl) videoEl.srcObject = event.stream;
        });
        
        call.on(CallsApiEvents.REMOTE_CAMERA_VIDEO_ADDED, (event) => {
            const videoEl = document.getElementById('remoteVideo');
            if (videoEl) videoEl.srcObject = event.stream;
        });
    }

    setupRoomEventHandlers(roomCall) {
        roomCall.on(CallsApiEvents.ROOM_JOINED, (event) => {
            console.log(`Joined room with ${event.participants.length} participants`);
            const audioEl = document.getElementById('roomAudio');
            if (audioEl) audioEl.srcObject = event.stream;
            this.updateParticipantsList(event.participants);
        });
        
        roomCall.on(CallsApiEvents.PARTICIPANT_JOINED, (event) => {
            console.log(`${event.participant.endpoint.identifier} joined`);
            this.addParticipantToUI(event.participant);
        });
        
        roomCall.on(CallsApiEvents.PARTICIPANT_LEFT, (event) => {
            console.log(`${event.participant.endpoint.identifier} left`);
            this.removeParticipantFromUI(event.participant.endpoint.identifier);
        });
        
        roomCall.on(CallsApiEvents.PARTICIPANT_CAMERA_VIDEO_ADDED, (event) => {
            this.addRemoteVideo(event.participant.endpoint.identifier, event.stream);
        });
    }

    // Call controls
    muteAudio(muted) {
        if (this.currentCall) {
            this.currentCall.mute(muted);
        } else if (this.currentRoomCall) {
            this.currentRoomCall.mute(muted);
        }
    }
    
    toggleCamera(enabled) {
        if (this.currentCall) {
            this.currentCall.cameraVideo(enabled);
        } else if (this.currentRoomCall) {
            this.currentRoomCall.cameraVideo(enabled);
        }
    }
    
    toggleScreenShare(enabled) {
        if (this.currentCall) {
            this.currentCall.screenShare(enabled);
        } else if (this.currentRoomCall) {
            this.currentRoomCall.screenShare(enabled);
        }
    }
    
    hangup() {
        if (this.currentCall) {
            this.currentCall.hangup();
            this.currentCall = null;
        } else if (this.currentRoomCall) {
            this.currentRoomCall.leave();
            this.currentRoomCall = null;
        }
        this.hideCallInterface();
    }
    
    sendDTMF(code) {
        if (this.currentCall && this.currentCall.sendDTMF) {
            this.currentCall.sendDTMF(code);
        }
    }

    // UI Methods
    showCallInterface(call, hasVideo = false) {
        const modal = this.createCallModal();
        modal.id = 'activeCallModal';
        modal.innerHTML = `
            <div class="hh__call-container">
                <div class="hh__call-header">
                    <h3>Active Call</h3>
                    <button class="hh__close-btn">&times;</button>
                </div>
                <div class="hh__video-container" style="display: ${hasVideo ? 'flex' : 'none'}">
                    <video id="remoteVideo" autoplay playsinline class="hh__remote-video"></video>
                    <video id="localVideo" autoplay playsinline muted class="hh__local-video"></video>
                </div>
                <audio id="remoteAudio" autoplay></audio>
                <div class="hh__call-controls">
                    <button class="hh__control-btn" id="muteBtn">
                        <i class="fas fa-microphone"></i>
                    </button>
                    <button class="hh__control-btn" id="videoBtn" style="display: ${hasVideo ? 'flex' : 'none'}">
                        <i class="fas fa-video"></i>
                    </button>
                    <button class="hh__control-btn hh__hangup-btn" id="hangupBtn">
                        <i class="fas fa-phone-slash"></i>
                    </button>
                    <button class="hh__control-btn" id="dtmfBtn">
                        <i class="fas fa-keypad"></i>
                    </button>
                </div>
                <div class="hh__dtmf-pad" style="display: none;">
                    ${[1,2,3,4,5,6,7,8,9,'*',0,'#'].map(n => 
                        `<button class="hh__dtmf-key" data-code="${n}">${n}</button>`
                    ).join('')}
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        this.attachCallControls(modal, call);
    }
    
    attachCallControls(modal, call) {
        let muted = false;
        let videoEnabled = true;
        
        modal.querySelector('#muteBtn').onclick = () => {
            muted = !muted;
            this.muteAudio(muted);
            modal.querySelector('#muteBtn i').className = muted ? 'fas fa-microphone-slash' : 'fas fa-microphone';
        };
        
        modal.querySelector('#videoBtn')?.addEventListener('click', () => {
            videoEnabled = !videoEnabled;
            this.toggleCamera(videoEnabled);
            modal.querySelector('#videoBtn i').className = videoEnabled ? 'fas fa-video' : 'fas fa-video-slash';
        });
        
        modal.querySelector('#hangupBtn').onclick = () => this.hangup();
        
        modal.querySelector('#dtmfBtn').onclick = () => {
            const pad = modal.querySelector('.hh__dtmf-pad');
            pad.style.display = pad.style.display === 'none' ? 'grid' : 'none';
        };
        
        modal.querySelectorAll('.hh__dtmf-key').forEach(btn => {
            btn.onclick = () => this.sendDTMF(btn.dataset.code);
        });
        
        modal.querySelector('.hh__close-btn').onclick = () => this.hangup();
    }
    
    showRoomInterface(roomCall, roomId) {
        const modal = this.createCallModal();
        modal.id = 'activeRoomModal';
        modal.innerHTML = `
            <div class="hh__call-container">
                <div class="hh__call-header">
                    <h3>Room: ${roomId}</h3>
                    <button class="hh__close-btn">&times;</button>
                </div>
                <div class="hh__participants-grid" id="participantsGrid">
                    <div class="hh__local-preview">
                        <video id="localVideo" autoplay playsinline muted></video>
                        <span>You</span>
                    </div>
                </div>
                <audio id="roomAudio" autoplay></audio>
                <div class="hh__call-controls">
                    <button class="hh__control-btn" id="roomMuteBtn">
                        <i class="fas fa-microphone"></i>
                    </button>
                    <button class="hh__control-btn" id="roomVideoBtn">
                        <i class="fas fa-video"></i>
                    </button>
                    <button class="hh__control-btn hh__hangup-btn" id="leaveRoomBtn">
                        <i class="fas fa-sign-out-alt"></i>
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        modal.querySelector('#roomMuteBtn').onclick = () => {
            const muted = !roomCall.muted();
            roomCall.mute(muted);
            modal.querySelector('#roomMuteBtn i').className = muted ? 'fas fa-microphone-slash' : 'fas fa-microphone';
        };
        
        modal.querySelector('#roomVideoBtn').onclick = () => {
            const enabled = !(modal.querySelector('#roomVideoBtn i').className === 'fas fa-video-slash');
            roomCall.cameraVideo(enabled);
            modal.querySelector('#roomVideoBtn i').className = enabled ? 'fas fa-video-slash' : 'fas fa-video';
        };
        
        modal.querySelector('#leaveRoomBtn').onclick = () => {
            roomCall.leave();
            modal.remove();
        };
        
        modal.querySelector('.hh__close-btn').onclick = () => {
            roomCall.leave();
            modal.remove();
        };
    }
    
    createCallModal() {
        const existing = document.querySelector('.hh__call-modal');
        if (existing) existing.remove();
        
        const modal = document.createElement('div');
        modal.className = 'hh__call-modal';
        return modal;
    }
    
    showNotification(message, type = 'info') {
        // Use your existing notification system
        const notification = document.createElement('div');
        notification.className = `hh__notification hh__notification-${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 5000);
    }
    
    updateUIStatus(status) {
        const statusEl = document.getElementById('webrtcStatus');
        if (statusEl) {
            statusEl.className = `hh__status-${status}`;
            statusEl.textContent = status === 'connected' ? '● Ready' : '○ Offline';
        }
    }
    
    updateCallStatus(status) {
        const statusEl = document.getElementById('callStatus');
        if (statusEl) statusEl.textContent = status;
    }
    
    hideCallInterface() {
        const modal = document.querySelector('.hh__call-modal');
        if (modal) modal.remove();
    }
    
    updateParticipantsList(participants) {
        const grid = document.getElementById('participantsGrid');
        if (!grid) return;
        
        participants.forEach(participant => {
            this.addParticipantToUI(participant);
        });
    }
    
    addParticipantToUI(participant) {
        const grid = document.getElementById('participantsGrid');
        if (!grid) return;
        
        const participantDiv = document.createElement('div');
        participantDiv.className = 'hh__participant';
        participantDiv.id = `participant_${participant.endpoint.identifier}`;
        participantDiv.innerHTML = `
            <video id="remoteVideo_${participant.endpoint.identifier}" autoplay playsinline></video>
            <span>${participant.endpoint.identifier}</span>
        `;
        grid.appendChild(participantDiv);
    }
    
    removeParticipantFromUI(identifier) {
        const el = document.getElementById(`participant_${identifier}`);
        if (el) el.remove();
    }
    
    addRemoteVideo(identifier, stream) {
        const videoEl = document.getElementById(`remoteVideo_${identifier}`);
        if (videoEl) videoEl.srcObject = stream;
    }
    
    setupEventListeners() {
        // Listen for call requests from phone module
        window.addEventListener('hh_initiate_call', (e) => {
            this.makeCall(e.detail.contactId, e.detail.options);
        });
    }
}

// Initialize when DOM ready
let webRTCClient = null;
document.addEventListener('DOMContentLoaded', () => {
    webRTCClient = new WebRTCClient();
});