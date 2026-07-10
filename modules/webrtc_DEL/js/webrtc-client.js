// modules/webrtc/js/webrtc-client.js - Infobip SDK integration
class WebRTCClient {
    constructor() {
        this.infobipRTC = null;
        this.currentCall = null;
        this.currentRoomCall = null;
        this.isConnected = false;
        this.userIdentity = null;
        this.contactOnlyMode = true;
        this.allowedContacts = new Set();
        this.pendingIncomingCall = null;
        this.userId = localStorage.getItem('webrtc_user_id') || 'user_123';
        this.callStartTime = null;
        this.callDurationInterval = null;
        
        this.init();
    }

    async init() {
        await this.loadSettings();
        await this.loadContacts();
        await this.authenticateAndConnect();
        this.setupEventListeners();
    }

    async loadSettings() {
        const saved = localStorage.getItem('webrtc_settings');
        if (saved) {
            const settings = JSON.parse(saved);
            this.contactOnlyMode = settings.contactOnlyMode !== false;
        }
        
        window.addEventListener('webrtc_settings_changed', (e) => {
            if (e.detail.contactOnlyMode !== undefined) {
                this.contactOnlyMode = e.detail.contactOnlyMode;
                console.log('Contact-only mode:', this.contactOnlyMode);
            }
        });
    }

    async loadContacts() {
        try {
            const response = await fetch(`/api/webrtc/contacts/${this.userId}`);
            const data = await response.json();
            
            if (data.success) {
                this.allowedContacts.clear();
                data.contacts.forEach(contact => {
                    if (contact.webrtcId) this.allowedContacts.add(contact.webrtcId);
                    if (contact.phoneNumber) this.allowedContacts.add(contact.phoneNumber);
                });
                console.log('Loaded contacts:', Array.from(this.allowedContacts));
            }
        } catch (error) {
            console.error('Failed to load contacts:', error);
        }
    }

    async authenticateAndConnect() {
        try {
            const displayName = localStorage.getItem('webrtc_display_name') || this.userId;
            
            const tokenResponse = await fetch('/api/webrtc/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: this.userId, displayName })
            });
            
            const { token, identity } = await tokenResponse.json();
            this.userIdentity = identity;
            
            console.log('Token received:', token.substring(0, 50) + '...');
            
            // Initialize InfobipRTC (global from SDK)
            this.infobipRTC = createInfobipRtc(token, { debug: true });
            
            // Setup event handlers
            this.setupInfobipEvents();
            
            // Connect
            this.infobipRTC.connect();
            this.updateConnectionStatus('connecting');
            
        } catch (error) {
            console.error('Authentication failed:', error);
            this.updateConnectionStatus('disconnected');
            this.showNotification('Failed to connect to calling service', 'error');
        }
    }

    setupInfobipEvents() {
        // ============================================
        // CRITICAL: Incoming Call Event Handler
        // ============================================
        this.infobipRTC.on('incoming-webrtc-call', async (event) => {
            console.log('📞 INCOMING CALL DETECTED!', event);
            
            const incomingCall = event.incomingCall;
            const callerIdentity = incomingCall.source().identifier;
            const callerDisplayName = incomingCall.source().displayName || callerIdentity;
            
            console.log(`Incoming call from: ${callerDisplayName} (${callerIdentity})`);
            this.showNotification(`Incoming call from ${callerDisplayName}...`, 'info');
            
            // Contact-only mode check
            if (this.contactOnlyMode && !this.allowedContacts.has(callerIdentity)) {
                console.log(`Blocked call from non-contact: ${callerIdentity}`);
                this.showNotification(`Blocked call from ${callerDisplayName} (not in contacts)`, 'warning');
                incomingCall.decline();
                return;
            }
            
            // Store pending call
            this.pendingIncomingCall = incomingCall;
            
            // Show incoming call UI modal
            this.showIncomingCallUI(callerIdentity, callerDisplayName, incomingCall);
        });

        // Connection events
        this.infobipRTC.on('connected', (event) => {
            this.isConnected = true;
            console.log('✅ Connected as:', event.identity);
            this.updateConnectionStatus('connected');
            this.showNotification('Ready for calls', 'success');
        });

        this.infobipRTC.on('disconnected', (event) => {
            this.isConnected = false;
            console.log('Disconnected');
            this.updateConnectionStatus('disconnected');
        });

        this.infobipRTC.on('error', (event) => {
            console.error('Connection error:', event);
            this.updateConnectionStatus('disconnected');
            this.showNotification('Connection error', 'error');
        });
    }

    showIncomingCallUI(callerIdentity, callerDisplayName, incomingCall) {
        // Remove existing incoming modal
        const existing = document.querySelector('.webrtc__incoming-modal');
        if (existing) existing.remove();
        
        const modal = document.createElement('div');
        modal.className = 'webrtc__incoming-modal';
        modal.innerHTML = `
            <div class="webrtc__incoming-header">
                <i class="fas fa-phone-ring" style="animation: pulse 1s infinite;"></i>
                <span>Incoming Call</span>
            </div>
            <div class="webrtc__incoming-body">
                <div class="webrtc__incoming-caller">
                    <i class="fas fa-user-circle"></i>
                    <strong>${escapeHtml(callerDisplayName)}</strong>
                    <small style="display: block; font-size: 0.8rem;">${escapeHtml(callerIdentity)}</small>
                </div>
                <div class="webrtc__incoming-actions">
                    <button class="webrtc__accept-btn" style="background: #10B981;">
                        <i class="fas fa-check"></i> Accept
                    </button>
                    <button class="webrtc__decline-btn" style="background: #EF4444;">
                        <i class="fas fa-times"></i> Decline
                    </button>
                </div>
            </div>
        `;
        
        // Add styles for modal
        const style = document.createElement('style');
        style.textContent = `
            .webrtc__incoming-modal {
                position: fixed;
                bottom: 100px;
                right: 20px;
                width: 320px;
                background: white;
                border-radius: 16px;
                box-shadow: 0 10px 40px rgba(0,0,0,0.2);
                z-index: 10001;
                animation: slideInRight 0.3s ease;
                overflow: hidden;
            }
            .webrtc__incoming-header {
                background: #3B82F6;
                color: white;
                padding: 12px 16px;
                display: flex;
                align-items: center;
                gap: 10px;
                font-weight: 600;
            }
            .webrtc__incoming-body {
                padding: 20px;
                text-align: center;
            }
            .webrtc__incoming-caller {
                margin-bottom: 20px;
            }
            .webrtc__incoming-caller i {
                font-size: 48px;
                color: #3B82F6;
                margin-bottom: 10px;
            }
            .webrtc__incoming-actions {
                display: flex;
                gap: 12px;
                justify-content: center;
            }
            .webrtc__incoming-actions button {
                padding: 10px 24px;
                border: none;
                border-radius: 40px;
                color: white;
                cursor: pointer;
                font-weight: 600;
                transition: transform 0.1s;
            }
            .webrtc__incoming-actions button:active {
                transform: scale(0.95);
            }
            @keyframes slideInRight {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.5; }
            }
        `;
        document.head.appendChild(style);
        
        modal.querySelector('.webrtc__accept-btn').onclick = () => {
            console.log('✅ Accepting incoming call');
            this.currentCall = incomingCall;
            this.setupCallEventHandlers(incomingCall);
            incomingCall.accept();
            modal.remove();
            this.showCallInterface(incomingCall, true);
            this.showNotification('Call accepted', 'success');
        };
        
        modal.querySelector('.webrtc__decline-btn').onclick = () => {
            console.log('❌ Declining incoming call');
            incomingCall.decline();
            modal.remove();
            this.showNotification('Call declined', 'info');
        };
        
        document.body.appendChild(modal);
        
        // Auto-decline after 30 seconds
        setTimeout(() => {
            if (modal.parentNode) {
                console.log('Auto-declining call (timeout)');
                incomingCall.decline();
                modal.remove();
            }
        }, 30000);
    }

    // Make a WebRTC call
    async makeCall(contactId, options = {}) {
        if (!this.isConnected) {
            this.showNotification('Not connected to calling service', 'error');
            return null;
        }
        
        const { video = true, isRoomCall = false, roomName = null } = options;
        
        try {
            // Request permissions first
            await this.requestPermissions(video);
            
            if (isRoomCall) {
                const roomId = roomName || `room_${Date.now()}`;
                const roomOptions = RoomCallOptions.builder().setVideo(video).build();
                this.currentRoomCall = this.infobipRTC.joinRoom(roomId, roomOptions);
                this.setupRoomEventHandlers(this.currentRoomCall);
                this.showRoomInterface(this.currentRoomCall, roomId);
                this.callStartTime = Date.now();
                this.startCallDurationTimer();
                return this.currentRoomCall;
            } else {
                const callOptions = WebrtcCallOptions.builder().setVideo(video).build();
                console.log(`Calling ${contactId} with video=${video}`);
                this.currentCall = this.infobipRTC.callWebrtc(contactId, callOptions);
                this.setupCallEventHandlers(this.currentCall);
                this.showCallInterface(this.currentCall, video);
                this.callStartTime = Date.now();
                this.startCallDurationTimer();
                return this.currentCall;
            }
        } catch (error) {
            console.error('Call failed:', error);
            this.showNotification(`Failed to start call: ${error.message}`, 'error');
            return null;
        }
    }
    
    async requestPermissions(video = true) {
        const constraints = { audio: true };
        if (video) constraints.video = true;
        
        try {
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            // Stop the stream immediately - we just need permission
            stream.getTracks().forEach(track => track.stop());
            console.log('✅ Permissions granted');
            return true;
        } catch (error) {
            console.error('❌ Permissions denied:', error);
            throw new Error('Microphone/Camera access denied');
        }
    }

    setupCallEventHandlers(call) {
        call.on(CallsApiEvents.RINGING, () => {
            console.log('📞 Ringing...');
            this.updateCallStatus('ringing');
            this.showNotification('Call is ringing...', 'info');
        });
        
        call.on(CallsApiEvents.ESTABLISHED, (event) => {
            console.log('✅ Call established!');
            this.updateCallStatus('connected');
            this.updateCallDuration();
            this.showNotification('Call connected', 'success');
            
            // Play remote audio
            const audioEl = document.getElementById('remoteAudio');
            if (audioEl && event.stream) {
                audioEl.srcObject = event.stream;
            }
            
            // Handle remote video
            const remoteVideoEl = document.getElementById('remoteVideo');
            if (remoteVideoEl && event.stream && event.stream.getVideoTracks().length > 0) {
                remoteVideoEl.srcObject = event.stream;
                console.log('📹 Remote video stream attached');
            }
        });
        
        call.on(CallsApiEvents.HANGUP, (event) => {
            console.log('Call ended');
            const duration = this.getCallDuration();
            this.stopCallDurationTimer();
            
            this.recordCallToHistory({
                contactId: call.destination ? call.destination().identifier : 'unknown',
                direction: 'outgoing',
                type: 'call',
                duration: duration,
                status: 'completed'
            });
            
            this.currentCall = null;
            this.hideCallInterface();
            this.updateCallStatus('ended');
            this.showNotification('Call ended', 'info');
        });
        
        call.on(CallsApiEvents.ERROR, (event) => {
            console.error('Call error:', event.errorCode);
            this.showNotification(`Call error: ${event.errorCode?.name || 'Unknown error'}`, 'error');
            this.stopCallDurationTimer();
            this.hideCallInterface();
        });
        
        // Local camera events
        call.on(CallsApiEvents.CAMERA_VIDEO_ADDED, (event) => {
            console.log('📹 Local camera added');
            const videoEl = document.getElementById('localVideo');
            if (videoEl) videoEl.srcObject = event.stream;
        });
        
        call.on(CallsApiEvents.CAMERA_VIDEO_UPDATED, (event) => {
            console.log('📹 Local camera updated');
            const videoEl = document.getElementById('localVideo');
            if (videoEl) videoEl.srcObject = event.stream;
        });
        
        call.on(CallsApiEvents.CAMERA_VIDEO_REMOVED, (event) => {
            console.log('📹 Local camera removed');
            const videoEl = document.getElementById('localVideo');
            if (videoEl) videoEl.srcObject = null;
        });
        
        // Remote camera events
        call.on(CallsApiEvents.REMOTE_CAMERA_VIDEO_ADDED, (event) => {
            console.log('📹 Remote camera added');
            const videoEl = document.getElementById('remoteVideo');
            if (videoEl) videoEl.srcObject = event.stream;
        });
        
        call.on(CallsApiEvents.REMOTE_CAMERA_VIDEO_REMOVED, (event) => {
            console.log('📹 Remote camera removed');
            const videoEl = document.getElementById('remoteVideo');
            if (videoEl) videoEl.srcObject = null;
        });
        
        // Screen share events
        call.on(CallsApiEvents.SCREEN_SHARE_ADDED, (event) => {
            console.log('🖥️ Screen share added');
            const screenEl = document.getElementById('screenShareVideo');
            if (screenEl) screenEl.srcObject = event.stream;
        });
        
        call.on(CallsApiEvents.SCREEN_SHARE_REMOVED, (event) => {
            console.log('🖥️ Screen share removed');
            const screenEl = document.getElementById('screenShareVideo');
            if (screenEl) screenEl.srcObject = null;
        });
        
        // Remote screen share
        call.on(CallsApiEvents.REMOTE_SCREEN_SHARE_ADDED, (event) => {
            console.log('📺 Remote screen share added');
            const screenEl = document.getElementById('remoteScreenShare');
            if (screenEl) screenEl.srcObject = event.stream;
        });
        
        call.on(CallsApiEvents.REMOTE_SCREEN_SHARE_REMOVED, (event) => {
            console.log('📺 Remote screen share removed');
            const screenEl = document.getElementById('remoteScreenShare');
            if (screenEl) screenEl.srcObject = null;
        });
    }

    setupRoomEventHandlers(roomCall) {
        roomCall.on(CallsApiEvents.ROOM_JOINED, (event) => {
            console.log(`Joined room with ${event.participants.length} participants`);
            const audioEl = document.getElementById('roomAudio');
            if (audioEl) audioEl.srcObject = event.stream;
            this.updateParticipantsList(event.participants);
            this.showNotification(`Joined room call`, 'success');
        });
        
        roomCall.on(CallsApiEvents.ROOM_LEFT, (event) => {
            console.log('Left room');
            this.hideCallInterface();
        });
        
        roomCall.on(CallsApiEvents.PARTICIPANT_JOINED, (event) => {
            console.log(`${event.participant.endpoint.identifier} joined`);
            this.addParticipantToUI(event.participant);
            this.showNotification(`${event.participant.endpoint.identifier} joined the room`, 'info');
        });
        
        roomCall.on(CallsApiEvents.PARTICIPANT_LEFT, (event) => {
            console.log(`${event.participant.endpoint.identifier} left`);
            this.removeParticipantFromUI(event.participant.endpoint.identifier);
        });
        
        roomCall.on(CallsApiEvents.PARTICIPANT_CAMERA_VIDEO_ADDED, (event) => {
            this.addRemoteVideo(event.participant.endpoint.identifier, event.stream);
        });
        
        roomCall.on(CallsApiEvents.PARTICIPANT_CAMERA_VIDEO_REMOVED, (event) => {
            this.removeRemoteVideo(event.participant.endpoint.identifier);
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
        this.stopCallDurationTimer();
        this.hideCallInterface();
    }
    
    sendDTMF(code) {
        if (this.currentCall && this.currentCall.sendDTMF) {
            this.currentCall.sendDTMF(code);
        }
    }

    // UI Methods
    showCallInterface(call, hasVideo = false) {
        const existing = document.querySelector('.webrtc__call-modal');
        if (existing) existing.remove();
        
        const modal = document.createElement('div');
        modal.className = 'webrtc__call-modal';
        modal.id = 'activeCallModal';
        modal.innerHTML = `
            <div class="webrtc__call-container">
                <div class="webrtc__call-header">
                    <h3><i class="fas fa-phone-alt"></i> Active Call</h3>
                    <div class="webrtc__call-timer" id="callTimer">00:00</div>
                    <button class="webrtc__close-btn" id="closeCallBtn">&times;</button>
                </div>
                <div class="webrtc__video-container" style="display: ${hasVideo ? 'flex' : 'none'}">
                    <video id="remoteVideo" autoplay playsinline class="webrtc__remote-video"></video>
                    <video id="localVideo" autoplay playsinline muted class="webrtc__local-video"></video>
                </div>
                <div id="screenShareContainer" style="display: none;">
                    <video id="screenShareVideo" autoplay playsinline></video>
                    <video id="remoteScreenShare" autoplay playsinline></video>
                </div>
                <audio id="remoteAudio" autoplay></audio>
                <div class="webrtc__call-controls">
                    <button class="webrtc__control-btn" id="muteBtn">
                        <i class="fas fa-microphone"></i>
                    </button>
                    <button class="webrtc__control-btn" id="videoBtn" style="display: ${hasVideo ? 'flex' : 'none'}">
                        <i class="fas fa-video"></i>
                    </button>
                    <button class="webrtc__control-btn" id="screenShareBtn">
                        <i class="fas fa-desktop"></i>
                    </button>
                    <button class="webrtc__control-btn webrtc__hangup-btn" id="hangupBtn">
                        <i class="fas fa-phone-slash"></i>
                    </button>
                    <button class="webrtc__control-btn" id="dtmfBtn">
                        <i class="fas fa-keypad"></i>
                    </button>
                </div>
                <div class="webrtc__dtmf-pad" style="display: none;">
                    ${[1,2,3,4,5,6,7,8,9,'*',0,'#'].map(n => 
                        `<button class="webrtc__dtmf-key" data-code="${n}">${n}</button>`
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
        let screenSharing = false;
        
        modal.querySelector('#muteBtn').onclick = () => {
            muted = !muted;
            this.muteAudio(muted);
            modal.querySelector('#muteBtn i').className = muted ? 'fas fa-microphone-slash' : 'fas fa-microphone';
        };
        
        const videoBtn = modal.querySelector('#videoBtn');
        if (videoBtn) {
            videoBtn.onclick = () => {
                videoEnabled = !videoEnabled;
                this.toggleCamera(videoEnabled);
                videoBtn.innerHTML = videoEnabled ? '<i class="fas fa-video"></i>' : '<i class="fas fa-video-slash"></i>';
            };
        }
        
        modal.querySelector('#screenShareBtn').onclick = () => {
            screenSharing = !screenSharing;
            this.toggleScreenShare(screenSharing);
            modal.querySelector('#screenShareBtn').style.background = screenSharing ? '#059669' : '';
        };
        
        modal.querySelector('#hangupBtn').onclick = () => this.hangup();
        modal.querySelector('#closeCallBtn').onclick = () => this.hangup();
        
        modal.querySelector('#dtmfBtn').onclick = () => {
            const pad = modal.querySelector('.webrtc__dtmf-pad');
            pad.style.display = pad.style.display === 'none' ? 'grid' : 'none';
        };
        
        modal.querySelectorAll('.webrtc__dtmf-key').forEach(btn => {
            btn.onclick = () => this.sendDTMF(btn.dataset.code);
        });
    }
    
    showRoomInterface(roomCall, roomId) {
        const existing = document.querySelector('.webrtc__call-modal');
        if (existing) existing.remove();
        
        const modal = document.createElement('div');
        modal.className = 'webrtc__call-modal';
        modal.id = 'activeRoomModal';
        modal.innerHTML = `
            <div class="webrtc__call-container">
                <div class="webrtc__call-header">
                    <h3><i class="fas fa-users"></i> Room: ${escapeHtml(roomId)}</h3>
                    <div class="webrtc__call-timer" id="callTimer">00:00</div>
                    <button class="webrtc__close-btn" id="closeRoomBtn">&times;</button>
                </div>
                <div class="webrtc__participants-grid" id="participantsGrid">
                    <div class="webrtc__local-preview">
                        <video id="localVideo" autoplay playsinline muted></video>
                        <span>You (${escapeHtml(this.userIdentity)})</span>
                    </div>
                </div>
                <audio id="roomAudio" autoplay></audio>
                <div class="webrtc__call-controls">
                    <button class="webrtc__control-btn" id="roomMuteBtn">
                        <i class="fas fa-microphone"></i>
                    </button>
                    <button class="webrtc__control-btn" id="roomVideoBtn">
                        <i class="fas fa-video"></i>
                    </button>
                    <button class="webrtc__control-btn webrtc__hangup-btn" id="leaveRoomBtn">
                        <i class="fas fa-sign-out-alt"></i>
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        let roomMuted = false;
        let roomVideoEnabled = true;
        
        modal.querySelector('#roomMuteBtn').onclick = () => {
            roomMuted = !roomMuted;
            this.muteAudio(roomMuted);
            modal.querySelector('#roomMuteBtn i').className = roomMuted ? 'fas fa-microphone-slash' : 'fas fa-microphone';
        };
        
        modal.querySelector('#roomVideoBtn').onclick = () => {
            roomVideoEnabled = !roomVideoEnabled;
            this.toggleCamera(roomVideoEnabled);
            modal.querySelector('#roomVideoBtn').innerHTML = roomVideoEnabled ? '<i class="fas fa-video"></i>' : '<i class="fas fa-video-slash"></i>';
        };
        
        modal.querySelector('#leaveRoomBtn').onclick = () => this.hangup();
        modal.querySelector('#closeRoomBtn').onclick = () => this.hangup();
    }
    
    updateParticipantsList(participants) {
        const grid = document.getElementById('participantsGrid');
        if (!grid) return;
        
        participants.forEach(participant => {
            if (participant.endpoint.identifier !== this.userIdentity) {
                this.addParticipantToUI(participant);
            }
        });
    }
    
    addParticipantToUI(participant) {
        const grid = document.getElementById('participantsGrid');
        if (!grid) return;
        
        if (document.getElementById(`participant_${participant.endpoint.identifier}`)) return;
        
        const participantDiv = document.createElement('div');
        participantDiv.className = 'webrtc__participant';
        participantDiv.id = `participant_${participant.endpoint.identifier}`;
        participantDiv.innerHTML = `
            <video id="remoteVideo_${participant.endpoint.identifier}" autoplay playsinline></video>
            <span>${escapeHtml(participant.endpoint.identifier)}</span>
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
    
    removeRemoteVideo(identifier) {
        const videoEl = document.getElementById(`remoteVideo_${identifier}`);
        if (videoEl) videoEl.srcObject = null;
    }
    
    startCallDurationTimer() {
        this.callDurationInterval = setInterval(() => {
            this.updateCallDuration();
        }, 1000);
    }
    
    stopCallDurationTimer() {
        if (this.callDurationInterval) {
            clearInterval(this.callDurationInterval);
            this.callDurationInterval = null;
        }
    }
    
    updateCallDuration() {
        const timerEl = document.getElementById('callTimer');
        if (timerEl && this.callStartTime) {
            const duration = Math.floor((Date.now() - this.callStartTime) / 1000);
            const minutes = Math.floor(duration / 60);
            const seconds = duration % 60;
            timerEl.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
    }
    
    getCallDuration() {
        if (this.callStartTime) {
            const duration = Math.floor((Date.now() - this.callStartTime) / 1000);
            const minutes = Math.floor(duration / 60);
            const seconds = duration % 60;
            return `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }
        return '0:00';
    }
    
    recordCallToHistory(callData) {
        window.dispatchEvent(new CustomEvent('webrtc_call_completed', {
            detail: {
                ...callData,
                timestamp: Date.now(),
                date: new Date().toLocaleString()
            }
        }));
    }
    
    updateConnectionStatus(status) {
        window.dispatchEvent(new CustomEvent('webrtc_connection_status', {
            detail: { status }
        }));
    }
    
    updateCallStatus(status) {
        window.dispatchEvent(new CustomEvent('webrtc_call_status', {
            detail: { status }
        }));
    }
    
    showNotification(message, type = 'info') {
        window.dispatchEvent(new CustomEvent('webrtc_notification', {
            detail: { message, type }
        }));
    }
    
    hideCallInterface() {
        const modal = document.querySelector('.webrtc__call-modal');
        if (modal) modal.remove();
        window.dispatchEvent(new CustomEvent('webrtc_call_ended'));
    }
    
    setupEventListeners() {
        window.addEventListener('webrtc_initiate_call', (e) => {
            this.makeCall(e.detail.contactId, e.detail.options);
        });
        
        window.addEventListener('webrtc_show_active_call', () => {
            const modal = document.querySelector('.webrtc__call-modal');
            if (modal) {
                modal.style.zIndex = '10000';
                modal.style.display = 'flex';
            }
        });
        
        window.addEventListener('webrtc_hangup', () => {
            this.hangup();
        });
    }
}

// Helper function to escape HTML
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// Initialize WebRTC client
let webRTCClient = null;
document.addEventListener('DOMContentLoaded', () => {
    webRTCClient = new WebRTCClient();
});