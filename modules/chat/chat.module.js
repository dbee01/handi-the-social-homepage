// modules/chat/chat.module.js
import { loadSettings } from '../../js/core/settings.js';

export default async function initChat(container) {
    const pinBtn = container.querySelector('.pin-btn');
    container.innerHTML = '';
    if (pinBtn) container.prepend(pinBtn);

    const title = document.createElement('div');
    title.className = 'panel-title';
    title.innerHTML = '<i class="fa-regular fa-message"></i> CHAT';
    container.appendChild(title);

    const content = document.createElement('div');
    content.className = 'chat-content';
    container.appendChild(content);

    const settings = loadSettings();
    const roomUrls = settings.chat?.rooms || ['', '', ''];
    const refreshSeconds = settings.chat?.refreshInterval || 30;
    
    let refreshIntervalId = null;
    let lastEventIds = {};

    // Matrix guest access helper
    async function peekRoom(roomUrl) {
        if (!roomUrl || roomUrl.trim() === '') return null;
        
        try {
            // Parse room ID from URL (supports matrix.to links and direct room IDs)
            let roomId = roomUrl.trim();
            if (roomId.includes('matrix.to')) {
                const match = roomId.match(/#([^:]+:[^/]+)/);
                if (match) roomId = match[1];
            }
            if (!roomId.startsWith('!')) return null;
            
            // Use matrix.org's public guest access endpoint
            const homeserver = 'https://matrix.org';
            
            // Step 1: Get guest access token
            const guestRes = await fetch(`${homeserver}/_matrix/client/v3/register?kind=guest`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            const guestData = await guestRes.json();
            if (!guestData.access_token) return null;
            
            const token = guestData.access_token;
            const userId = guestData.user_id;
            
            // Step 2: Try to peek into the room (public rooms only)
            const peekRes = await fetch(`${homeserver}/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/messages?dir=b&limit=10`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!peekRes.ok) {
                // Room may be private or guest access disabled
                return { error: 'Cannot access room (private or requires login)', messages: [] };
            }
            
            const messages = await peekRes.json();
            return { messages: messages.chunk || [], error: null };
        } catch (err) {
            console.error(`Chat peek error for ${roomUrl}:`, err);
            return { error: err.message, messages: [] };
        }
    }
    
    // Check for new activity
    function checkForNewActivity(roomIndex, messages, roomUrl) {
        if (!messages || messages.length === 0) return false;
        
        const latestEvent = messages[0];
        const latestEventId = latestEvent.event_id;
        
        if (lastEventIds[roomIndex] && lastEventIds[roomIndex] !== latestEventId) {
            lastEventIds[roomIndex] = latestEventId;
            return true;
        }
        if (!lastEventIds[roomIndex]) {
            lastEventIds[roomIndex] = latestEventId;
        }
        return false;
    }
    
    // Format timestamp
    function formatTime(timestamp) {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // Extract display name from sender
    function getSenderName(event) {
        const sender = event.sender || '';
        // Extract local part from @username:server
        const match = sender.match(/^@([^:]+):/);
        if (match) return match[1];
        return sender.split(':')[0].substring(1) || 'User';
    }
    
    async function fetchAllRooms() {
        const validRooms = roomUrls.filter(url => url && url.trim() !== '');
        
        if (validRooms.length === 0) {
            content.innerHTML = `
                <div class="module-empty">
                    <i class="fa-regular fa-comment-dots"></i>
                    <p>No chat rooms configured.</p>
                    <button id="chatSettingsBtn" class="settings-link-btn">
                        <i class="fa-solid fa-gear"></i> Add Rooms in Settings
                    </button>
                </div>
            `;
            const settingsBtn = content.querySelector('#chatSettingsBtn');
            if (settingsBtn) settingsBtn.onclick = () => location.href = 'settings.html?args=chat';
            return;
        }
        
        content.innerHTML = '<div class="chat-loading"><i class="fa-solid fa-spinner fa-spin"></i> Loading rooms...</div>';
        
        const results = [];
        for (let i = 0; i < roomUrls.length; i++) {
            const roomUrl = roomUrls[i];
            if (!roomUrl || roomUrl.trim() === '') continue;
            
            const roomData = await peekRoom(roomUrl);
            const hasNew = checkForNewActivity(i, roomData.messages, roomUrl);
            results.push({ 
                index: i, 
                url: roomUrl, 
                data: roomData, 
                hasNew 
            });
        }
        
        renderChat(results);
    }
    
    function renderChat(results) {
        if (!results.length) return;
        
        let html = `
            <div class="chat-rooms-wrapper">
                <div class="chat-rooms-list">
        `;
        
        for (const room of results) {
            const roomData = room.data;
            const roomName = extractRoomName(room.url);
            const hasNew = room.hasNew;
            
            html += `
                <div class="chat-room-card ${hasNew ? 'has-new' : ''}" data-room-index="${room.index}">
                    <div class="chat-room-header">
                        <div class="chat-room-name">
                            <i class="fa-regular ${hasNew ? 'fa-bell' : 'fa-comment'}"></i>
                            ${escapeHtml(roomName)}
                            ${hasNew ? '<span class="new-badge">New!</span>' : ''}
                        </div>
                        <button class="chat-toggle-msgs" data-room="${room.index}">▼</button>
                    </div>
                    <div class="chat-room-messages" id="chat-msgs-${room.index}" style="display: none;">
            `;
            
            if (roomData.error) {
                html += `<div class="chat-error">⚠️ ${escapeHtml(roomData.error)}</div>`;
            } else if (roomData.messages && roomData.messages.length > 0) {
                const latest = roomData.messages.slice(0, 5);
                for (const msg of latest) {
                    const body = msg.content?.body || msg.content?.msgtype || 'Message';
                    const sender = getSenderName(msg);
                    const time = formatTime(msg.origin_server_ts);
                    html += `
                        <div class="chat-message">
                            <span class="chat-sender">${escapeHtml(sender)}</span>
                            <span class="chat-time">${time}</span>
                            <div class="chat-body">${escapeHtml(body.substring(0, 150))}</div>
                        </div>
                    `;
                }
                if (roomData.messages.length > 5) {
                    html += `<div class="chat-more">+ ${roomData.messages.length - 5} more messages</div>`;
                }
            } else {
                html += `<div class="chat-empty">No messages yet</div>`;
            }
            
            html += `
                    </div>
                </div>
            `;
        }
        
        html += `
                </div>
            </div>
            <button id="chatRefreshBtn" class="chat-refresh-btn">⟳ Refresh</button>
        `;
        
        content.innerHTML = html;
        
        // Add toggle functionality
        document.querySelectorAll('.chat-toggle-msgs').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const roomIndex = btn.dataset.room;
                const msgDiv = document.getElementById(`chat-msgs-${roomIndex}`);
                if (msgDiv) {
                    const isVisible = msgDiv.style.display === 'block';
                    msgDiv.style.display = isVisible ? 'none' : 'block';
                    btn.textContent = isVisible ? '▼' : '▲';
                }
            });
        });
        
        // Refresh button
        const refreshBtn = document.getElementById('chatRefreshBtn');
        if (refreshBtn) refreshBtn.addEventListener('click', () => fetchAllRooms());
        
        if (window.refreshDashboardLayout) window.refreshDashboardLayout();
    }
    
    function extractRoomName(roomUrl) {
        if (!roomUrl) return 'Room';
        // Try to extract readable name from URL
        if (roomUrl.includes('matrix.to')) {
            const match = roomUrl.match(/#([^:]+):/);
            if (match) return match[1].replace(/^#/, '');
        }
        // Return last part of URL or clean up
        let name = roomUrl.split('/').pop();
        if (name.startsWith('#') && name.includes(':')) {
            name = name.split(':')[0].replace(/^#/, '');
        }
        return name.length > 20 ? name.substring(0, 20) + '...' : name;
    }
    
    function startRefresh() {
        if (refreshIntervalId) clearInterval(refreshIntervalId);
        fetchAllRooms();
        refreshIntervalId = setInterval(fetchAllRooms, refreshSeconds * 1000);
    }
    
    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/[&<>]/g, m => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;' }[m]));
    }
    
    startRefresh();
    return () => {
        if (refreshIntervalId) clearInterval(refreshIntervalId);
    };
}