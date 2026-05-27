/*
 * Copyright (c) 2026 Handi Homepage
 * Matrix Chat Module + Lightweight Bot
 */

// modules/chat/chat.module.js

import { loadSettings } from '../../js/core/settings.js';

export default async function initChat(container) {
    const pinBtn = container.querySelector('.pin-btn');

    container.innerHTML = '';

    if (pinBtn) {
        container.prepend(pinBtn);
    }

    const title = document.createElement('div');
    title.className = 'panel-title';
    title.innerHTML = '<i class="fa-regular fa-message"></i> CHAT';

    container.appendChild(title);

    const content = document.createElement('div');
    content.className = 'chat-content';

    container.appendChild(content);

    let settings = loadSettings();

    let roomUrls = settings.chat?.rooms || ['', '', ''];
    let refreshSeconds = settings.chat?.refreshInterval || 30;
    let homeserver = settings.chat?.homeserver || 'https://matrix.org';
    let accessToken = settings.chat?.accessToken || '';
    let userId = settings.chat?.userId || '';

    let refreshIntervalId = null;
    let isActive = true;

    // Track latest message per room
    let lastEventIds = {};

    // Store room names per room ID
    let roomNameCache = {};

    // Prevent duplicate bot replies
    const processedEvents = new Set();

    // Track open/closed state of rooms (default: open = true)
    let roomOpenState = {};

    // =====================================================
    // SETTINGS CHECK
    // =====================================================

    function hasValidCredentials() {
        return Boolean(accessToken && userId);
    }

    // =====================================================
    // TOKEN CHECK
    // =====================================================
    
    async function isTokenValid() {
        if (!accessToken) return false;
        
        try {
            const res = await fetch(`${homeserver}/_matrix/client/v3/account/whoami`, {
                headers: { Authorization: `Bearer ${accessToken}` },
                cache: 'no-store'
            });
            return res.ok;
        } catch {
            return false;
        }
    }

    // =====================================================
    // MATRIX HELPERS
    // =====================================================

    function parseMatrixIdentifier(input) {
        if (!input) return null;
        try {
            const decoded = decodeURIComponent(input.trim());
            const matrixTo = decoded.match(/#\/([#!][^?]+)/);
            if (matrixTo) return matrixTo[1];
            return decoded;
        } catch {
            return input;
        }
    }

    async function resolveRoom(roomInput) {
        if (!isActive) return null;
        if (!roomInput || !roomInput.trim()) return null;
        
        let identifier = roomInput.trim();
        
        // Extract room ID from Element URL
        const elementUrlMatch = identifier.match(/\/#\/room\/(![^:]+:[^\s?&]+)/);
        if (elementUrlMatch) {
            identifier = elementUrlMatch[1];
        }
        
        // If it's already a room ID (!room:server)
        if (identifier.startsWith('!')) {
            return identifier;
        }

        // If it's an alias (#room:server)
        if (identifier.startsWith('#')) {
            try {
                const encodedAlias = encodeURIComponent(identifier);
                const url = `${homeserver}/_matrix/client/v3/directory/room/${encodedAlias}`;
                
                const res = await fetch(url, {
                    headers: { Authorization: `Bearer ${accessToken}` }
                });
                
                if (!res.ok) return null;
                const data = await res.json();
                return data.room_id;
            } catch (err) {
                return null;
            }
        }
        
        return null;
    }

    async function getRoomName(roomId) {
        if (roomNameCache[roomId]) return roomNameCache[roomId];
        
        try {
            const res = await fetch(
                `${homeserver}/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/state/m.room.name`,
                { headers: { Authorization: `Bearer ${accessToken}` } }
            );
            
            if (res.ok) {
                const data = await res.json();
                if (data.name) {
                    roomNameCache[roomId] = data.name;
                    return data.name;
                }
            }
        } catch (e) {}
        
        const shortId = roomId.substring(1, 13);
        roomNameCache[roomId] = shortId;
        return shortId;
    }

    async function joinRoom(roomId) {
        if (!isActive) return false;
        
        try {
            const res = await fetch(
                `${homeserver}/_matrix/client/v3/join/${encodeURIComponent(roomId)}`,
                {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            return res.ok || res.status === 403;
        } catch (err) {
            return false;
        }
    }

    async function fetchMessages(roomId) {
        if (!isActive) return null;
        
        try {
            const res = await fetch(
                `${homeserver}/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/messages?dir=b&limit=50`,
                { headers: { Authorization: `Bearer ${accessToken}` } }
            );
            if (!res.ok) return null;
            return await res.json();
        } catch (err) {
            return null;
        }
    }

    async function sendMessage(roomId, message) {
        if (!isActive) return null;
        
        const txnId = Date.now();
        try {
            const res = await fetch(
                `${homeserver}/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/send/m.room.message/${txnId}`,
                {
                    method: 'PUT',
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ msgtype: 'm.text', body: message })
                }
            );
            if (!res.ok) return null;
            return await res.json();
        } catch {
            return null;
        }
    }

    // =====================================================
    // BOT COMMANDS
    // =====================================================

    async function handleBotCommands(roomId, messages) {
        if (!isActive) return;
        
        for (const msg of messages) {
            if (!msg?.event_id) continue;
            if (processedEvents.has(msg.event_id)) continue;
            processedEvents.add(msg.event_id);
            if (msg.sender === userId) continue;
            const body = msg.content?.body?.trim();
            if (!body) continue;

            if (body === '!ping') {
                await sendMessage(roomId, 'pong');
            } else if (body.startsWith('!echo ')) {
                await sendMessage(roomId, body.substring(6));
            } else if (body === '!help') {
                await sendMessage(roomId, ['Available commands:', '!ping', '!echo <text>', '!help'].join('\n'));
            } else if (body === '!time') {
                await sendMessage(roomId, `Server time: ${new Date().toLocaleString()}`);
            } else if (body === '!rooms') {
                const configuredRooms = roomUrls.filter(Boolean).map(r => `• ${r}`).join('\n');
                await sendMessage(roomId, `Configured rooms:\n${configuredRooms || 'None'}`);
            }
        }
    }

    // =====================================================
    // ROOM FETCH
    // =====================================================

    async function fetchRoom(roomUrl, roomIndex) {
        if (!isActive) return { messages: [], roomName: null, error: null };
        
        try {
            const roomId = await resolveRoom(roomUrl);
            if (!roomId) {
                return { messages: [], roomName: 'Invalid Room', error: 'Could not resolve room' };
            }
            
            await joinRoom(roomId);
            
            const roomName = await getRoomName(roomId);
            
            const data = await fetchMessages(roomId);
            if (!data) {
                return { messages: [], roomName, error: 'Could not fetch messages' };
            }
            
            // Process ALL messages, no filtering
            const messages = (data.chunk || [])
                .filter(msg => {
                    // Only include actual message types, not room state changes
                    return msg.type === 'm.room.message' || msg.type === 'm.room.encrypted';
                })
                .map(msg => {
                    let body = '';
                    
                    if (msg.type === 'm.room.encrypted') {
                        body = '🔒 Encrypted message';
                    } else if (msg.content?.body) {
                        body = msg.content.body;
                    } else {
                        return null; // Skip empty messages
                    }
                    
                    return {
                        event_id: msg.event_id,
                        sender: msg.sender,
                        origin_server_ts: msg.origin_server_ts,
                        content: { body: body }
                    };
                })
                .filter(msg => msg !== null); // Remove skipped messages
            
            await handleBotCommands(roomId, messages);
            return { messages, roomName, error: null };
        } catch (error) {
            return { messages: [], roomName: null, error: error.message };
        }
    }

    // =====================================================
    // NEW MESSAGE CHECK
    // =====================================================

    function checkForNewActivity(roomIndex, messages) {
        if (!messages?.length) return false;
        const latest = messages[0];
        if (!latest?.event_id) return false;
        const latestId = latest.event_id;
        if (lastEventIds[roomIndex] && lastEventIds[roomIndex] !== latestId) {
            lastEventIds[roomIndex] = latestId;
            return true;
        }
        if (!lastEventIds[roomIndex]) lastEventIds[roomIndex] = latestId;
        return false;
    }

    // =====================================================
    // UI HELPERS
    // =====================================================

    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));
    }

    function formatTime(ts) {
        if (!ts) return '';
        const date = new Date(ts);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    function getSenderName(event) {
        const sender = event.sender || '';
        const match = sender.match(/@([^:]+):/);
        return match ? match[1] : sender;
    }

    // =====================================================
    // SHOW TOKEN EXPIRED MESSAGE
    // =====================================================

    function showTokenExpiredMessage() {
        isActive = false;
        content.innerHTML = `
            <div class="chat-error" style="background: #fff5f5; border: 1px solid #cc0000; padding: 20px; border-radius: 12px; text-align: center;">
                <i class="fa-solid fa-key" style="font-size: 2rem; color: #cc0000; margin-bottom: 12px; display: block;"></i>
                <strong>🔑 Matrix Access Token Expired</strong>
                <p style="margin-top: 12px; margin-bottom: 16px;">
                    Your Matrix access token is no longer valid.<br>
                    Please generate a new one in Element → Settings → Help & About → Access Token.
                </p>
                <button onclick="window.location.href='settings.html?args=chat'" class="settings-link-btn">
                    <i class="fa-solid fa-gear"></i> Update Token in Settings
                </button>
            </div>
        `;
    }

    // =====================================================
    // FETCH ALL ROOMS
    // =====================================================

    async function fetchAllRooms() {
        if (!isActive) return;
        
        const validRooms = roomUrls.filter(r => r?.trim());

        if (!validRooms.length) {
            content.innerHTML = `
                <div class="module-empty">
                    <p>No chat rooms configured.</p>
                    <button id="chatSettingsBtn" class="settings-link-btn" style="margin-top:12px;">
                        <i class="fa-solid fa-gear"></i> Configure in Settings
                    </button>
                </div>
            `;
            const settingsBtn = content.querySelector('#chatSettingsBtn');
            if (settingsBtn) settingsBtn.onclick = () => location.href = 'settings.html?args=chat';
            return;
        }

        if (!hasValidCredentials()) {
            content.innerHTML = `
                <div class="module-empty">
                    <i class="fa-regular fa-message"></i>
                    <p>Matrix chat not configured.</p>
                    <button id="chatSettingsBtn" class="settings-link-btn" style="margin-top:12px;">
                        <i class="fa-solid fa-gear"></i> Configure in Settings
                    </button>
                </div>
            `;
            const settingsBtn = content.querySelector('#chatSettingsBtn');
            if (settingsBtn) settingsBtn.onclick = () => location.href = 'settings.html?args=chat';
            return;
        }

        content.innerHTML = `<div class="chat-loading"><i class="fa-solid fa-spinner fa-spin"></i> Loading Matrix rooms...</div>`;

        const results = [];

        for (let i = 0; i < roomUrls.length; i++) {
            const roomUrl = roomUrls[i];
            if (!roomUrl?.trim()) continue;

            const { messages, roomName, error } = await fetchRoom(roomUrl, i);
            const hasNew = checkForNewActivity(i, messages);

            results.push({
                index: i,
                url: roomUrl,
                messages: messages || [],
                roomName: roomName || (error ? 'Error' : `Room ${i + 1}`),
                hasNew,
                error
            });
        }

        renderChat(results);
    }

    // =====================================================
    // TOGGLE ROOM (open/close)
    // =====================================================
    
    function toggleRoom(roomIndex) {
        roomOpenState[roomIndex] = !roomOpenState[roomIndex];
        const messagesDiv = document.getElementById(`chat-msgs-${roomIndex}`);
        const toggleBtn = document.querySelector(`.chat-toggle-msgs[data-room="${roomIndex}"]`);
        if (messagesDiv) {
            messagesDiv.style.display = roomOpenState[roomIndex] ? 'block' : 'none';
        }
        if (toggleBtn) {
            toggleBtn.textContent = roomOpenState[roomIndex] ? '▲' : '▼';
        }
    }

    // =====================================================
    // RENDER
    // =====================================================

    function renderChat(results) {
        let html = `<div class="chat-rooms-wrapper"><div class="chat-rooms-list">`;

        for (const room of results) {
            const messages = room.messages || [];
            const isOpen = roomOpenState[room.index] !== false;
            const toggleIcon = isOpen ? '▲' : '▼';

            html += `
                <div class="chat-room-card ${room.hasNew ? 'has-new' : ''}">
                    <div class="chat-room-header" data-room="${room.index}" style="cursor: pointer; min-height: 60px;">
                        <div class="chat-room-name">
                            <i class="fa-regular fa-comment"></i>
                            ${escapeHtml(room.roomName)}
                            ${room.hasNew ? '<span class="new-badge">New!</span>' : ''}
                            ${room.error ? '<span class="error-badge">Error</span>' : ''}
                        </div>
                        <button class="chat-toggle-msgs" data-room="${room.index}" style="min-width: 48px; min-height: 48px; font-size: 1.2rem; cursor: pointer; border-radius: 12px; background: #f1f5f9; border: 1px solid #cbd5e1;">${toggleIcon}</button>
                    </div>
                    <div class="chat-room-messages" id="chat-msgs-${room.index}" style="display: ${isOpen ? 'block' : 'none'};">
            `;

            if (room.error) {
                html += `<div class="chat-error">⚠️ ${escapeHtml(room.error)}</div>`;
            } else if (messages.length === 0) {
                html += `<div class="chat-empty">💬 No messages yet</div>`;
            } else {
                for (const msg of messages.slice(0, 20)) {
                    const body = msg.content?.body || 'No message content';
                    const sender = getSenderName(msg);
                    const time = formatTime(msg.origin_server_ts);
                    
                    html += `
                        <div class="chat-message" style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                            <div class="chat-message-header" style="margin-bottom: 4px;">
                                <span class="chat-sender"><strong>${escapeHtml(sender)}</strong></span>
                                <span class="chat-time" style="margin-left: 12px; font-size: 0.75rem; color: #94a3b8;">${escapeHtml(time)}</span>
                            </div>
                            <div class="chat-body" style="font-size: 0.85rem;">${escapeHtml(body.substring(0, 500))}</div>
                        </div>
                    `;
                }
            }

            html += `</div></div>`;
        }

        html += `</div></div><div style="display:flex; gap:12px; margin-top:16px;">
            <button id="chatRefreshBtn" class="chat-refresh-btn" style="flex:1; padding: 14px; font-size: 1rem; font-weight: bold;">⟳ Refresh</button>
        </div>`;

        content.innerHTML = html;

        // Add click handlers to the entire header
        document.querySelectorAll('.chat-room-header').forEach(header => {
            const roomIdx = header.dataset.room;
            if (roomIdx !== undefined) {
                header.addEventListener('click', (e) => {
                    if (e.target.classList.contains('chat-toggle-msgs')) {
                        return;
                    }
                    toggleRoom(parseInt(roomIdx));
                });
            }
        });
        
        // Toggle button click handler
        document.querySelectorAll('.chat-toggle-msgs').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const idx = parseInt(btn.dataset.room);
                toggleRoom(idx);
            });
        });

        // Refresh button
        const refreshBtn = document.getElementById('chatRefreshBtn');
        if (refreshBtn) refreshBtn.addEventListener('click', fetchAllRooms);

        if (window.refreshDashboardLayout) window.refreshDashboardLayout();
    }

    // =====================================================
    // START – Check token once
    // =====================================================

    async function startRefresh() {
        if (processedEvents.size > 5000) processedEvents.clear();
        
        if (hasValidCredentials()) {
            const valid = await isTokenValid();
            if (!valid) {
                showTokenExpiredMessage();
                return;
            }
        }
        
        fetchAllRooms();
        if (refreshIntervalId) clearInterval(refreshIntervalId);
        refreshIntervalId = setInterval(fetchAllRooms, refreshSeconds * 1000);
    }

    startRefresh();

    return () => {
        isActive = false;
        if (refreshIntervalId) clearInterval(refreshIntervalId);
    };
}