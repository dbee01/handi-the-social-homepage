// js/webrtc-module.js - WebRTC module UI integration
class WebRTCModule {
    constructor() {
        this.settings = {
            contactOnlyMode: true  // ON by default - requires calls from contacts only
        };
        this.callHistory = [];
        this.availableDevices = {
            audioInput: [],
            audioOutput: [],
            videoInput: []
        };
        this.init();
    }

    init() {
        this.loadSettings();
        this.loadCallHistory();
        this.render();
        this.setupEventListeners();
        this.enumerateDevices();
    }

    loadSettings() {
        const saved = localStorage.getItem('hh_webrtc_settings');
        if (saved) {
            this.settings = JSON.parse(saved);
        }
    }

    saveSettings() {
        localStorage.setItem('hh_webrtc_settings', JSON.stringify(this.settings));
        // Notify WebRTC client of settings change
        window.dispatchEvent(new CustomEvent('hh_settings_changed', {
            detail: { contactOnlyMode: this.settings.contactOnlyMode }
        }));
        this.showToast('Settings saved', 'success');
    }

    loadCallHistory() {
        const saved = localStorage.getItem('hh_webrtc_history');
        if (saved) {
            this.callHistory = JSON.parse(saved);
        }
    }

    saveCallHistory() {
        // Keep only last 50 calls
        if (this.callHistory.length > 50) {
            this.callHistory = this.callHistory.slice(0, 50);
        }
        localStorage.setItem('hh_webrtc_history', JSON.stringify(this.callHistory));
    }

    addToHistory(call) {
        this.callHistory.unshift({
            ...call,
            timestamp: Date.now(),
            date: new Date().toLocaleString()
        });
        this.saveCallHistory();
        this.renderCallHistory();
    }

    async enumerateDevices() {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            
            this.availableDevices = {
                audioInput: devices.filter(d => d.kind === 'audioinput'),
                audioOutput: devices.filter(d => d.kind === 'audiooutput'),
                videoInput: devices.filter(d => d.kind === 'videoinput')
            };
            
            this.renderDeviceSettings();
        } catch (error) {
            console.error('Failed to enumerate devices:', error);
        }
    }

    render() {
        const container = document.getElementById('webrtcModuleContainer');
        if (!container) return;
        
        container.innerHTML = `
            <div class="hh__webrtc-module">
                <div class="hh__webrtc-header">
                    <h3><i class="fas fa-video"></i> WebRTC Calling</h3>
                    <div class="hh__webrtc-status">
                        <span id="webrtcStatus" class="hh__status-disconnected">
                            <i class="fas fa-circle"></i> Offline
                        </span>
                    </div>
                </div>
                
                <!-- Quick Call -->
                <div class="hh__quick-call">
                    <input type="text" id="hhQuickCallInput" placeholder="Enter WebRTC ID or phone number..." />
                    <div class="hh__quick-call-options">
                        <button id="hhAudioOnlyBtn" class="hh__call-type-btn">
                            <i class="fas fa-phone"></i> Audio
                        </button>
                        <button id="hhVideoCallBtn" class="hh__call-type-btn">
                            <i class="fas fa-video"></i> Video
                        </button>
                        <button id="hhRoomCallBtn" class="hh__call-type-btn">
                            <i class="fas fa-users"></i> Room
                        </button>
                    </div>
                </div>
                
                <!-- Settings Panel -->
                <div class="hh__settings-panel">
                    <div class="hh__settings-header" id="hhSettingsToggle">
                        <i class="fas fa-cog"></i>
                        <span>Call Settings</span>
                        <i class="fas fa-chevron-down"></i>
                    </div>
                    <div class="hh__settings-content" id="hhSettingsContent" style="display: none;">
                        <!-- Contact-Only Mode Toggle (ON by default) -->
                        <div class="hh__setting-item">
                            <div class="hh__setting-info">
                                <label class="hh__setting-label">
                                    <i class="fas fa-user-shield"></i>
                                    Contact-Only Mode
                                </label>
                                <p class="hh__setting-desc">Only receive calls from numbers in your contacts list</p>
                            </div>
                            <label class="hh__toggle-switch">
                                <input type="checkbox" id="hhContactOnlyToggle" 
                                    ${this.settings.contactOnlyMode ? 'checked' : ''}>
                                <span class="hh__toggle-slider"></span>
                            </label>
                        </div>
                        
                        <!-- Device Settings -->
                        <div class="hh__setting-item">
                            <div class="hh__setting-info">
                                <label class="hh__setting-label">
                                    <i class="fas fa-microphone"></i>
                                    Microphone
                                </label>
                            </div>
                            <select id="hhAudioInputSelect" class="hh__device-select">
                                <option value="">Default Device</option>
                            </select>
                        </div>
                        
                        <div class="hh__setting-item">
                            <div class="hh__setting-info">
                                <label class="hh__setting-label">
                                    <i class="fas fa-camera"></i>
                                    Camera
                                </label>
                            </div>
                            <select id="hhVideoInputSelect" class="hh__device-select">
                                <option value="">Default Device</option>
                            </select>
                        </div>
                        
                        <div class="hh__setting-item">
                            <div class="hh__setting-info">
                                <label class="hh__setting-label">
                                    <i class="fas fa-volume-up"></i>
                                    Speaker
                                </label>
                            </div>
                            <select id="hhAudioOutputSelect" class="hh__device-select">
                                <option value="">Default Device</option>
                            </select>
                        </div>
                    </div>
                </div>
                
                <!-- Call History -->
                <div class="hh__history-panel">
                    <div class="hh__history-header" id="hhHistoryToggle">
                        <i class="fas fa-history"></i>
                        <span>Call History</span>
                        <i class="fas fa-chevron-down"></i>
                    </div>
                    <div class="hh__history-content" id="hhHistoryContent" style="display: none;">
                        <div id="hhCallHistoryList" class="hh__call-history-list">
                            ${this.renderCallHistoryHTML()}
                        </div>
                    </div>
                </div>
                
                <!-- Active Call Indicator -->
                <div id="hhActiveCallIndicator" class="hh__active-call-indicator" style="display: none;">
                    <div class="hh__active-call-info">
                        <i class="fas fa-phone-alt call-active-icon"></i>
                        <span id="hhActiveCallStatus">Call in progress...</span>
                    </div>
                    <button id="hhShowCallBtn" class="hh__show-call-btn">
                        <i class="fas fa-expand"></i> Show
                    </button>
                </div>
            </div>
        `;
        
        this.renderDeviceSettings();
        this.attachEventListeners();
    }

    renderCallHistoryHTML() {
        if (this.callHistory.length === 0) {
            return '<div class="hh__empty-history">No calls yet</div>';
        }
        
        return this.callHistory.map(call => `
            <div class="hh__history-item ${call.direction}" data-contact="${call.contactId}">
                <div class="hh__history-icon">
                    <i class="fas ${call.type === 'video' ? 'fa-video' : (call.type === 'room' ? 'fa-users' : 'fa-phone')}"></i>
                </div>
                <div class="hh__history-details">
                    <div class="hh__history-contact">${call.contactName || call.contactId}</div>
                    <div class="hh__history-meta">
                        <span class="hh__history-direction">
                            ${call.direction === 'outgoing' ? 'Outgoing' : 'Incoming'}
                        </span>
                        <span class="hh__history-duration">${call.duration || '—'}</span>
                        <span class="hh__history-date">${call.date || new Date(call.timestamp).toLocaleString()}</span>
                    </div>
                </div>
                <div class="hh__history-status ${call.status}">
                    ${call.status === 'completed' ? '✓' : (call.status === 'missed' ? '⚠' : '✗')}
                </div>
            </div>
        `).join('');
    }

    renderCallHistory() {
        const container = document.getElementById('hhCallHistoryList');
        if (container) {
            container.innerHTML = this.renderCallHistoryHTML();
            // Re-attach click handlers for history items
            document.querySelectorAll('.hh__history-item').forEach(item => {
                item.addEventListener('click', () => {
                    const contactId = item.dataset.contact;
                    if (contactId) {
                        document.getElementById('hhQuickCallInput').value = contactId;
                    }
                });
            });
        }
    }

    renderDeviceSettings() {
        const audioInputSelect = document.getElementById('hhAudioInputSelect');
        const videoInputSelect = document.getElementById('hhVideoInputSelect');
        const audioOutputSelect = document.getElementById('hhAudioOutputSelect');
        
        if (audioInputSelect) {
            audioInputSelect.innerHTML = '<option value="">Default Microphone</option>' +
                this.availableDevices.audioInput.map(d => `<option value="${d.deviceId}">${d.label || 'Microphone'}</option>`).join('');
        }
        
        if (videoInputSelect) {
            videoInputSelect.innerHTML = '<option value="">Default Camera</option>' +
                this.availableDevices.videoInput.map(d => `<option value="${d.deviceId}">${d.label || 'Camera'}</option>`).join('');
        }
        
        if (audioOutputSelect) {
            audioOutputSelect.innerHTML = '<option value="">Default Speaker</option>' +
                this.availableDevices.audioOutput.map(d => `<option value="${d.deviceId}">${d.label || 'Speaker'}</option>`).join('');
        }
    }

    attachEventListeners() {
        // Quick call buttons
        const audioBtn = document.getElementById('hhAudioOnlyBtn');
        const videoBtn = document.getElementById('hhVideoCallBtn');
        const roomBtn = document.getElementById('hhRoomCallBtn');
        const quickInput = document.getElementById('hhQuickCallInput');
        
        if (audioBtn) {
            audioBtn.addEventListener('click', () => this.initiateQuickCall('audio'));
        }
        if (videoBtn) {
            videoBtn.addEventListener('click', () => this.initiateQuickCall('video'));
        }
        if (roomBtn) {
            roomBtn.addEventListener('click', () => this.initiateQuickCall('room'));
        }
        if (quickInput) {
            quickInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.initiateQuickCall('audio');
            });
        }
        
        // Settings toggle
        const settingsToggle = document.getElementById('hhSettingsToggle');
        const settingsContent = document.getElementById('hhSettingsContent');
        if (settingsToggle && settingsContent) {
            settingsToggle.addEventListener('click', () => {
                const isVisible = settingsContent.style.display !== 'none';
                settingsContent.style.display = isVisible ? 'none' : 'block';
                settingsToggle.querySelector('.fa-chevron-down').style.transform = isVisible ? 'rotate(0deg)' : 'rotate(180deg)';
            });
        }
        
        // History toggle
        const historyToggle = document.getElementById('hhHistoryToggle');
        const historyContent = document.getElementById('hhHistoryContent');
        if (historyToggle && historyContent) {
            historyToggle.addEventListener('click', () => {
                const isVisible = historyContent.style.display !== 'none';
                historyContent.style.display = isVisible ? 'none' : 'block';
                historyToggle.querySelector('.fa-chevron-down').style.transform = isVisible ? 'rotate(0deg)' : 'rotate(180deg)';
            });
        }
        
        // Contact-only mode toggle
        const contactOnlyToggle = document.getElementById('hhContactOnlyToggle');
        if (contactOnlyToggle) {
            contactOnlyToggle.addEventListener('change', (e) => {
                this.settings.contactOnlyMode = e.target.checked;
                this.saveSettings();
            });
        }
        
        // Device selection
        const audioInputSelect = document.getElementById('hhAudioInputSelect');
        const videoInputSelect = document.getElementById('hhVideoInputSelect');
        const audioOutputSelect = document.getElementById('hhAudioOutputSelect');
        
        if (audioInputSelect) {
            audioInputSelect.addEventListener('change', (e) => {
                this.setAudioInputDevice(e.target.value);
            });
        }
        if (videoInputSelect) {
            videoInputSelect.addEventListener('change', (e) => {
                this.setVideoInputDevice(e.target.value);
            });
        }
        if (audioOutputSelect) {
            audioOutputSelect.addEventListener('change', (e) => {
                this.setAudioOutputDevice(e.target.value);
            });
        }
        
        // Show call button
        const showCallBtn = document.getElementById('hhShowCallBtn');
        if (showCallBtn) {
            showCallBtn.addEventListener('click', () => {
                window.dispatchEvent(new CustomEvent('hh_show_active_call'));
            });
        }
        
        // Listen for WebRTC client events
        this.listenForClientEvents();
    }

    initiateQuickCall(type) {
        const input = document.getElementById('hhQuickCallInput');
        const target = input?.value.trim();
        
        if (!target) {
            this.showToast('Please enter a WebRTC ID or phone number', 'warning');
            return;
        }
        
        const options = {
            video: type === 'video',
            isRoomCall: type === 'room',
            roomName: type === 'room' ? `quick_room_${Date.now()}` : null
        };
        
        this.addToHistory({
            contactId: target,
            contactName: target,
            direction: 'outgoing',
            type: type,
            status: 'initiated',
            timestamp: Date.now()
        });
        
        window.dispatchEvent(new CustomEvent('hh_initiate_call', {
            detail: { contactId: target, options }
        }));
    }

    async setAudioInputDevice(deviceId) {
        if (!deviceId) return;
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: { deviceId: { exact: deviceId } } });
            // Store device preference
            localStorage.setItem('hh_audio_device', deviceId);
            this.showToast('Microphone changed', 'success');
        } catch (error) {
            console.error('Failed to set audio device:', error);
            this.showToast('Failed to change microphone', 'error');
        }
    }

    async setVideoInputDevice(deviceId) {
        if (!deviceId) return;
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { deviceId: { exact: deviceId } } });
            localStorage.setItem('hh_video_device', deviceId);
            this.showToast('Camera changed', 'success');
        } catch (error) {
            console.error('Failed to set video device:', error);
            this.showToast('Failed to change camera', 'error');
        }
    }

    async setAudioOutputDevice(deviceId) {
        if (!deviceId) return;
        try {
            // @ts-ignore - setSinkId is not fully supported in all browsers
            if (HTMLMediaElement.prototype.setSinkId) {
                const audioElements = document.querySelectorAll('audio, video');
                for (const el of audioElements) {
                    await el.setSinkId(deviceId);
                }
            }
            localStorage.setItem('hh_audio_output', deviceId);
            this.showToast('Speaker changed', 'success');
        } catch (error) {
            console.error('Failed to set audio output:', error);
        }
    }

    listenForClientEvents() {
        // Update connection status
        window.addEventListener('hh_connection_status', (e) => {
            const statusEl = document.getElementById('webrtcStatus');
            if (statusEl) {
                const isConnected = e.detail.status === 'connected';
                statusEl.className = isConnected ? 'hh__status-connected' : 'hh__status-disconnected';
                statusEl.innerHTML = isConnected ? 
                    '<i class="fas fa-circle"></i> Ready' : 
                    '<i class="fas fa-circle"></i> Offline';
            }
        });
        
        // Update active call indicator
        window.addEventListener('hh_call_active', (e) => {
            const indicator = document.getElementById('hhActiveCallIndicator');
            const statusSpan = document.getElementById('hhActiveCallStatus');
            if (indicator && statusSpan) {
                indicator.style.display = 'flex';
                statusSpan.textContent = e.detail.status || 'Call in progress...';
            }
        });
        
        window.addEventListener('hh_call_ended', () => {
            const indicator = document.getElementById('hhActiveCallIndicator');
            if (indicator) {
                indicator.style.display = 'none';
            }
        });
        
        // Record call to history when ended
        window.addEventListener('hh_call_completed', (e) => {
            this.addToHistory({
                contactId: e.detail.contactId,
                contactName: e.detail.contactName || e.detail.contactId,
                direction: e.detail.direction || 'outgoing',
                type: e.detail.type || 'audio',
                duration: e.detail.duration,
                status: e.detail.success ? 'completed' : 'failed',
                timestamp: Date.now()
            });
        });
    }

    showToast(message, type = 'info') {
        // Create toast notification
        const toast = document.createElement('div');
        toast.className = `hh__toast hh__toast-${type}`;
        toast.innerHTML = `
            <i class="fas ${type === 'success' ? 'fa-check-circle' : (type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle')}"></i>
            <span>${message}</span>
        `;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.add('hh__toast-hide');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

// Initialize WebRTC module when DOM is ready
let webRTCModule = null;
document.addEventListener('DOMContentLoaded', () => {
    webRTCModule = new WebRTCModule();
});