// modules/webrtc/webrtc.module.js
const API_BASE = 'http://localhost:3001/api/webrtc';

export default function initWebRTC(container) {
    console.log('🔵 WebRTC module initializing...');
    console.log(`📍 API Base: ${API_BASE}`);
    
    // Clear container
    container.innerHTML = '';
    
    // Create module HTML with HandiHomepage styling
    const moduleHTML = `
        <div style="background: white; border-radius: 24px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
            <div style="background: linear-gradient(135deg, #1F2B3C, #2C3E50); color: white; padding: 20px 24px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <i class="fa-solid fa-phone" style="font-size: 28px;"></i>
                    <div>
                        <h3 style="margin: 0; font-size: 20px; font-weight: 600;">Free Calls</h3>
                        <p style="margin: 4px 0 0; font-size: 13px; opacity: 0.8;">WebRTC calling</p>
                    </div>
                </div>
                <div id="webrtc-status-badge" style="display: flex; align-items: center; gap: 8px; background: rgba(255,255,255,0.15); padding: 8px 16px; border-radius: 40px;">
                    <i class="fa-solid fa-circle" style="font-size: 10px; color: #6B7280;"></i>
                    <span style="font-size: 14px;">Disconnected</span>
                </div>
            </div>
            
            <div style="padding: 24px;">
                <!-- Login Panel -->
                <div id="webrtc-login-panel">
                    <div style="background: #F8FAFE; border-radius: 20px; padding: 20px; margin-bottom: 20px;">
                        <label style="display: block; font-weight: 600; margin-bottom: 12px; font-size: 17px;">
                            <i class="fa-solid fa-user"></i> Your Caller ID
                        </label>
                        <div style="display: flex; gap: 12px; flex-wrap: wrap;">
                            <input type="text" id="webrtc-user-id" placeholder="e.g., alice or bob" 
                                style="flex: 1; padding: 14px 18px; border: 2px solid #E2E8F0; border-radius: 48px; font-size: 17px; outline: none;">
                            <button id="webrtc-connect-btn" style="background: #3B82F6; color: white; border: none; padding: 12px 28px; border-radius: 48px; font-size: 17px; font-weight: 600; cursor: pointer;">
                                <i class="fa-solid fa-plug"></i> Connect
                            </button>
                        </div>
                        <p style="font-size: 13px; color: #6B7280; margin-top: 12px;">
                            <i class="fa-solid fa-info-circle"></i> Enter a username to start calling
                        </p>
                    </div>
                </div>
                
                <!-- Call Panel (hidden initially) -->
                <div id="webrtc-call-panel" style="display: none;">
                    <div style="background: #F8FAFE; border-radius: 20px; padding: 20px; margin-bottom: 20px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 12px;">
                            <div>
                                <div style="font-size: 13px; color: #6B7280;">Registered as</div>
                                <div id="webrtc-registered-id" style="font-weight: 700; font-size: 18px;">-</div>
                            </div>
                            <div id="webrtc-call-status" style="display: flex; align-items: center; gap: 8px; background: #D1FAE5; padding: 8px 16px; border-radius: 40px;">
                                <i class="fa-solid fa-circle" style="font-size: 8px; color: #10B981;"></i>
                                <span style="font-size: 14px;">Ready</span>
                            </div>
                        </div>
                        
                        <div style="margin-bottom: 20px;">
                            <label style="display: block; font-weight: 600; margin-bottom: 12px; font-size: 17px;">
                                <i class="fa-solid fa-phone"></i> Call to
                            </label>
                            <div style="display: flex; gap: 12px; flex-wrap: wrap;">
                                <input type="text" id="webrtc-destination" placeholder="Username (e.g., bob)" 
                                    style="flex: 1; padding: 14px 18px; border: 2px solid #E2E8F0; border-radius: 48px; font-size: 17px; outline: none;">
                                <button id="webrtc-call-btn" style="background: #10B981; color: white; border: none; padding: 12px 28px; border-radius: 48px; font-size: 17px; font-weight: 600; cursor: pointer;">
                                    <i class="fa-solid fa-phone"></i> Call
                                </button>
                                <button id="webrtc-hangup-btn" style="background: #EF4444; color: white; border: none; padding: 12px 28px; border-radius: 48px; font-size: 17px; font-weight: 600; cursor: pointer; display: none;">
                                    <i class="fa-solid fa-phone-slash"></i> Hangup
                                </button>
                            </div>
                        </div>
                        
                        <button id="webrtc-logout-btn" style="background: none; border: none; color: #6B7280; font-size: 14px; cursor: pointer;">
                            <i class="fa-solid fa-sign-out-alt"></i> Disconnect
                        </button>
                    </div>
                    
                    <div id="webrtc-call-log" style="background: #1a1a2e; border-radius: 16px; padding: 16px; color: #10B981; font-family: monospace; font-size: 12px; max-height: 120px; overflow-y: auto;">
                        <div style="color: #10B981;">✨ Ready for calls</div>
                        <div style="color: #3B82F6;">💡 To test: Open another browser window as "bob"</div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    container.innerHTML = moduleHTML;
    
    // WebRTC state
    let isConnected = false;
    let currentUserId = null;
    
    // DOM elements
    const loginPanel = document.getElementById('webrtc-login-panel');
    const callPanel = document.getElementById('webrtc-call-panel');
    const userIdInput = document.getElementById('webrtc-user-id');
    const connectBtn = document.getElementById('webrtc-connect-btn');
    const callBtn = document.getElementById('webrtc-call-btn');
    const hangupBtn = document.getElementById('webrtc-hangup-btn');
    const destinationInput = document.getElementById('webrtc-destination');
    const logoutBtn = document.getElementById('webrtc-logout-btn');
    const registeredIdSpan = document.getElementById('webrtc-registered-id');
    const callStatusSpan = document.getElementById('webrtc-call-status');
    const statusBadge = document.getElementById('webrtc-status-badge');
    const callLog = document.getElementById('webrtc-call-log');
    
    function addLog(message, type = 'info') {
        console.log(`[WebRTC] ${message}`);
        const logDiv = document.createElement('div');
        const colors = { error: '#EF4444', success: '#10B981', info: '#3B82F6' };
        logDiv.style.cssText = `padding: 4px 0; border-bottom: 1px solid #333; color: ${colors[type] || '#3B82F6'}`;
        logDiv.innerHTML = `[${new Date().toLocaleTimeString()}] ${message}`;
        if (callLog) callLog.appendChild(logDiv);
        if (callLog) callLog.scrollTop = callLog.scrollHeight;
        while (callLog && callLog.children.length > 30) callLog.removeChild(callLog.firstChild);
    }
    
    function updateStatus(text, statusType) {
        const statusText = statusType === 'connected' ? 'Connected' : (statusType === 'connecting' ? 'Connecting...' : 'Disconnected');
        const statusColor = statusType === 'connected' ? '#10B981' : (statusType === 'connecting' ? '#F59E0B' : '#6B7280');
        
        if (statusBadge) {
            statusBadge.innerHTML = `<i class="fa-solid fa-circle" style="font-size: 10px; color: ${statusColor};"></i><span style="font-size: 14px;">${statusText}</span>`;
        }
        if (callStatusSpan) {
            callStatusSpan.innerHTML = `<i class="fa-solid fa-circle" style="font-size: 8px; color: ${statusColor};"></i><span style="font-size: 14px;">${text}</span>`;
        }
    }
    
    async function getToken(userId) {
        addLog(`Getting token for ${userId}...`, 'info');
        try {
            const url = `${API_BASE}/token`;
            console.log(`📡 Fetching token from: ${url}`);
            
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, displayName: userId })
            });
            
            console.log(`📡 Response status: ${response.status}`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log(`📡 Response data:`, data);
            
            if (!data.token) throw new Error(data.error || 'No token received');
            addLog(`✅ Token received`, 'success');
            return data.token;
        } catch (error) {
            console.error('❌ Token fetch error:', error);
            addLog(`❌ Failed: ${error.message}`, 'error');
            throw error;
        }
    }
    
    async function connect() {
        const userId = userIdInput.value.trim();
        if (!userId) {
            addLog('❌ Please enter a Caller ID', 'error');
            return;
        }
        
        updateStatus('Connecting...', 'connecting');
        addLog(`Connecting as ${userId}...`, 'info');
        
        try {
            const token = await getToken(userId);
            addLog(`✅ Got token: ${token.substring(0, 20)}...`, 'success');
            
            // Here you would initialize InfobipRTC with the token
            // For now, simulate successful connection
            isConnected = true;
            currentUserId = userId;
            loginPanel.style.display = 'none';
            callPanel.style.display = 'block';
            registeredIdSpan.textContent = userId;
            updateStatus('Ready for calls', 'connected');
            addLog(`✅ Connected as ${userId}`, 'success');
            localStorage.setItem('hh_webrtc_user', userId);
            
        } catch (error) {
            addLog(`❌ Connection failed: ${error.message}`, 'error');
            updateStatus('Disconnected', 'disconnected');
        }
    }
    
    function disconnect() {
        isConnected = false;
        currentUserId = null;
        loginPanel.style.display = 'block';
        callPanel.style.display = 'none';
        updateStatus('Disconnected', 'disconnected');
        addLog(`🔌 Disconnected`, 'info');
    }
    
    function makeCall() {
        const destination = destinationInput.value.trim();
        if (!destination) {
            addLog('❌ Please enter a destination', 'error');
            return;
        }
        
        if (!isConnected) {
            addLog('❌ Not connected', 'error');
            return;
        }
        
        addLog(`📞 Calling ${destination}...`, 'info');
        callBtn.style.display = 'none';
        hangupBtn.style.display = 'inline-flex';
        
        // Simulate call connection
        setTimeout(() => {
            addLog(`✅ Call connected to ${destination}`, 'success');
            const statusSpan = callStatusSpan?.querySelector('span');
            if (statusSpan) statusSpan.textContent = 'In call';
        }, 1000);
    }
    
    function hangup() {
        addLog(`🔴 Call ended`, 'info');
        callBtn.style.display = 'inline-flex';
        hangupBtn.style.display = 'none';
        const statusSpan = callStatusSpan?.querySelector('span');
        if (statusSpan) statusSpan.textContent = 'Ready';
    }
    
    // Test server connection on load
    async function testServerConnection() {
        try {
            addLog('Testing WebRTC server connection...', 'info');
            const response = await fetch(`${API_BASE}/health`);
            if (response.ok) {
                const data = await response.json();
                addLog(`✅ Server connected (port 3001)`, 'success');
                console.log('Server health:', data);
            } else {
                addLog(`⚠️ Server returned ${response.status}`, 'error');
            }
        } catch (error) {
            addLog(`❌ Cannot reach WebRTC server on port 3001`, 'error');
            addLog(`💡 Run: node modules/webrtc/server.js`, 'info');
            console.error('Server connection error:', error);
        }
    }
    
    // Event listeners
    if (connectBtn) connectBtn.onclick = connect;
    if (callBtn) callBtn.onclick = makeCall;
    if (hangupBtn) hangupBtn.onclick = hangup;
    if (logoutBtn) logoutBtn.onclick = disconnect;
    
    // Load saved user
    const savedUser = localStorage.getItem('hh_webrtc_user');
    if (savedUser && userIdInput) userIdInput.value = savedUser;
    
    addLog('✨ WebRTC module ready', 'success');
    addLog(`📍 API: ${API_BASE}`, 'info');
    
    // Test server connection
    testServerConnection();
}