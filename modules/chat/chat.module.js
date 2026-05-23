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

    // Prevent duplicate bot replies
    const processedEvents = new Set();

    // =====================================================
    // SETTINGS CHECK
    // =====================================================

    function hasValidCredentials() {
        return Boolean(accessToken && userId);
    }

    // =====================================================
    // TOKEN CHECK – silences the 401 by not logging it
    // =====================================================
    
    async function isTokenValid() {
        if (!accessToken) return false;
        
        // Use a silent fetch with no error logging
        try {
            const res = await fetch(`${homeserver}/_matrix/client/v3/account/whoami`, {
                headers: { Authorization: `Bearer ${accessToken}` },
                // Add cache: 'no-store' to prevent caching issues
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
        
        const identifier = parseMatrixIdentifier(roomInput);
        if (!identifier) return null;
        if (identifier.startsWith('!')) return identifier;

        if (identifier.startsWith('#')) {
            try {
                const res = await fetch(
                    `${homeserver}/_matrix/client/v3/directory/room/${encodeURIComponent(identifier)}`,
                    { headers: { Authorization: `Bearer ${accessToken}` } }
                );
                if (!res.ok) return null;
                const data = await res.json();
                return data.room_id;
            } catch {
                return null;
            }
        }
        return null;
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
        } catch {
            return false;
        }
    }

    async function fetchMessages(roomId) {
        if (!isActive) return null;
        
        try {
            const res = await fetch(
                `${homeserver}/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/messages?dir=b&limit=20`,
                { headers: { Authorization: `Bearer ${accessToken}` } }
            );
            if (!res.ok) return null;
            return await res.json();
        } catch {
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

    async function fetchRoom(roomUrl) {
        if (!isActive) return { messages: [] };
        
        try {
            const roomId = await resolveRoom(roomUrl);
            if (!roomId) return { messages: [] };
            await joinRoom(roomId);
            const data = await fetchMessages(roomId);
            if (!data) return { messages: [] };
            const messages = (data.chunk || [])
                .filter(msg => msg.type === 'm.room.message')
                .map(msg => ({
                    event_id: msg.event_id,
                    sender: msg.sender,
                    origin_server_ts: msg.origin_server_ts,
                    content: msg.content
                }));
            await handleBotCommands(roomId, messages);
            return { messages };
        } catch {
            return { messages: [] };
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
        const match = sender.match(/^@([^:]+):/);
        return match ? match[1] : sender;
    }

    function extractRoomName(roomUrl) {
        try {
            const parsed = parseMatrixIdentifier(roomUrl);
            if (!parsed) return 'Room';
            if (parsed.startsWith('#')) return parsed.split(':')[0].replace(/^#/, '');
            return parsed.substring(0, 20);
        } catch {
            return 'Room';
        }
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

            const roomData = await fetchRoom(roomUrl);
            const hasNew = checkForNewActivity(i, roomData.messages);

            results.push({
                index: i,
                url: roomUrl,
                messages: roomData.messages || [],
                hasNew
            });
        }

        renderChat(results);
    }

    // =====================================================
    // RENDER
    // =====================================================

    function renderChat(results) {
        let html = `<div class="chat-rooms-wrapper"><div class="chat-rooms-list">`;

        for (const room of results) {
            const roomName = extractRoomName(room.url);
            const messages = room.messages || [];

            html += `
                <div class="chat-room-card ${room.hasNew ? 'has-new' : ''}">
                    <div class="chat-room-header">
                        <div class="chat-room-name">
                            <i class="fa-regular fa-comment"></i>
                            ${escapeHtml(roomName)}
                            ${room.hasNew ? '<span class="new-badge">New!</span>' : ''}
                        </div>
                        <button class="chat-toggle-msgs" data-room="${room.index}">▼</button>
                    </div>
                    <div class="chat-room-messages" id="chat-msgs-${room.index}" style="display:none;">
            `;

            if (messages.length) {
                for (const msg of messages.slice(0, 10)) {
                    const body = msg.content?.body || 'Message';
                    html += `
                        <div class="chat-message">
                            <span class="chat-sender">${escapeHtml(getSenderName(msg))}</span>
                            <span class="chat-time">${escapeHtml(formatTime(msg.origin_server_ts))}</span>
                            <div class="chat-body">${escapeHtml(body.substring(0, 250))}</div>
                        </div>
                    `;
                }
            } else {
                html += `<div class="chat-empty">No messages</div>`;
            }

            html += `</div></div>`;
        }

        html += `</div></div><div style="display:flex; gap:12px; margin-top:16px;">
            <button id="chatRefreshBtn" class="chat-refresh-btn" style="flex:1;">⟳ Refresh</button>
        </div>`;

        content.innerHTML = html;

        // Toggle messages
        document.querySelectorAll('.chat-toggle-msgs').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = btn.dataset.room;
                const el = document.getElementById(`chat-msgs-${idx}`);
                if (!el) return;
                const visible = el.style.display === 'block';
                el.style.display = visible ? 'none' : 'block';
                btn.textContent = visible ? '▼' : '▲';
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
        
        // Only check token if we have credentials
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