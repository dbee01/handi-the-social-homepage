// js/phone-module.js - Your existing phone module with WebRTC integration
class PhoneModule {
    constructor() {
        this.contacts = [];
        this.init();
    }

    init() {
        this.loadContacts();
        this.render();
        this.setupEventListeners();
    }

    loadContacts() {
        // Your existing contact loading logic
        this.contacts = [
            { id: 1, name: 'Alice Johnson', phone: '+1234567890', webrtcId: 'alice@example.com' },
            { id: 2, name: 'Bob Smith', phone: '+1987654321', webrtcId: 'bob@example.com' },
            { id: 3, name: 'Carol Davis', phone: '+1122334455', webrtcId: 'carol@example.com' }
        ];
    }

    render() {
        const container = document.getElementById('phoneModuleContainer');
        if (!container) return;
        
        container.innerHTML = `
            <div class="hh__phone-module">
                <div class="hh__phone-header">
                    <h3><i class="fas fa-phone-alt"></i> Contacts</h3>
                    <button class="hh__add-contact-btn">+ Add Contact</button>
                </div>
                <div class="hh__contacts-list">
                    ${this.contacts.map(contact => `
                        <div class="hh__contact-item" data-id="${contact.id}">
                            <div class="hh__contact-info">
                                <div class="hh__contact-name">${contact.name}</div>
                                <div class="hh__contact-phone">${contact.phone}</div>
                            </div>
                            <div class="hh__call-actions">
                                <button class="hh__call-btn hh__audio-call" data-webrtc-id="${contact.webrtcId}">
                                    <i class="fas fa-phone"></i>
                                </button>
                                <button class="hh__call-btn hh__video-call" data-webrtc-id="${contact.webrtcId}">
                                    <i class="fas fa-video"></i>
                                </button>
                                <button class="hh__call-btn hh__room-call" data-webrtc-id="${contact.webrtcId}">
                                    <i class="fas fa-users"></i>
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        
        this.attachCallButtons();
    }

    attachCallButtons() {
        // Audio-only call
        document.querySelectorAll('.hh__audio-call').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const webrtcId = btn.dataset.webrtcId;
                this.initiateCall(webrtcId, { video: false, isRoomCall: false });
            });
        });
        
        // Video call
        document.querySelectorAll('.hh__video-call').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const webrtcId = btn.dataset.webrtcId;
                this.initiateCall(webrtcId, { video: true, isRoomCall: false });
            });
        });
        
        // Room call (add more people)
        document.querySelectorAll('.hh__room-call').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const webrtcId = btn.dataset.webrtcId;
                const roomName = prompt('Enter room name (optional):', `room_${Date.now()}`);
                this.initiateCall(webrtcId, { 
                    video: true, 
                    isRoomCall: true, 
                    roomName: roomName 
                });
            });
        });
    }

    initiateCall(contactId, options) {
        // Dispatch event for WebRTC module to handle
        window.dispatchEvent(new CustomEvent('hh_initiate_call', {
            detail: { contactId, options }
        }));
    }

    setupEventListeners() {
        // Your existing event listeners
    }
}

// Initialize phone module
const phoneModule = new PhoneModule();