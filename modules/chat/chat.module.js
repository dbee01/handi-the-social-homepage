/*
 * Copyright (c) 2026 Handi Homepage
 * Matrix Chat Module + Lightweight Bot
 * Pure fetch() implementation — no SDKs, no external libs
 */

// modules/chat/chat.module.js

import { loadSettings, saveSettings } from '../../js/core/settings.js';

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
    // MATRIX HELPERS
    // =====================================================

    function parseMatrixIdentifier(input) {
        if (!input) return null;

        try {
            const decoded = decodeURIComponent(input.trim());

            const matrixTo = decoded.match(/#\/([#!][^?]+)/);

            if (matrixTo) {
                return matrixTo[1];
            }

            return decoded;
        } catch {
            return input;
        }
    }

    async function resolveRoom(roomInput) {
        const identifier = parseMatrixIdentifier(roomInput);

        if (!identifier) return null;

        // Already a room ID
        if (identifier.startsWith('!')) {
            return identifier;
        }

        // Room alias
        if (identifier.startsWith('#')) {
            const res = await fetch(
                `${homeserver}/_matrix/client/v3/directory/room/${encodeURIComponent(identifier)}`,
                {
                    headers: {
                        Authorization: `Bearer ${accessToken}`
                    }
                }
            );

            if (!res.ok) {
                throw new Error('Alias resolution failed');
            }

            const data = await res.json();

            return data.room_id;
        }

        return null;
    }

    async function joinRoom(roomId) {
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

        // Ignore already joined/private errors
        if (!res.ok && res.status !== 403) {
            const text = await res.text();

            console.error('Join room failed:', text);
        }
    }

    async function fetchMessages(roomId) {
        const res = await fetch(
            `${homeserver}/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/messages?dir=b&limit=20`,
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`
                }
            }
        );

        if (!res.ok) {
            const text = await res.text();

            throw new Error(`Message fetch failed: ${res.status} ${text}`);
        }

        return await res.json();
    }

    async function sendMessage(roomId, message) {
        const txnId = Date.now();

        const res = await fetch(
            `${homeserver}/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/send/m.room.message/${txnId}`,
            {
                method: 'PUT',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    msgtype: 'm.text',
                    body: message
                })
            }
        );

        if (!res.ok) {
            const text = await res.text();

            throw new Error(`Send failed: ${res.status} ${text}`);
        }

        return await res.json();
    }

    // =====================================================
    // BOT COMMANDS
    // =====================================================

    async function handleBotCommands(roomId, messages) {
        for (const msg of messages) {
            if (!msg?.event_id) continue;

            // Ignore duplicates
            if (processedEvents.has(msg.event_id)) {
                continue;
            }

            processedEvents.add(msg.event_id);

            // Ignore own messages
            if (msg.sender === userId) {
                continue;
            }

            const body = msg.content?.body?.trim();

            if (!body) continue;

            console.log('Bot received:', body);

            // =========================
            // !ping
            // =========================

            if (body === '!ping') {
                await sendMessage(roomId, 'pong');
            }

            // =========================
            // !echo hello
            // =========================

            else if (body.startsWith('!echo ')) {
                const text = body.substring(6);

                await sendMessage(roomId, text);
            }

            // =========================
            // !help
            // =========================

            else if (body === '!help') {
                await sendMessage(
                    roomId,
                    [
                        'Available commands:',
                        '!ping',
                        '!echo <text>',
                        '!help'
                    ].join('\n')
                );
            }

            // =========================
            // !time
            // =========================

            else if (body === '!time') {
                await sendMessage(
                    roomId,
                    `Server time: ${new Date().toLocaleString()}`
                );
            }

            // =========================
            // !rooms
            // =========================

            else if (body === '!rooms') {
                const configuredRooms = roomUrls
                    .filter(Boolean)
                    .map(r => `• ${r}`)
                    .join('\n');

                await sendMessage(
                    roomId,
                    `Configured rooms:\n${configuredRooms || 'None'}`
                );
            }
        }
    }

    // =====================================================
    // ROOM FETCH
    // =====================================================

    async function fetchRoom(roomUrl) {
        try {
            const roomId = await resolveRoom(roomUrl);

            if (!roomId) {
                return {
                    error: 'Invalid room ID or alias',
                    messages: []
                };
            }

            await joinRoom(roomId);

            const data = await fetchMessages(roomId);

            const messages = (data.chunk || [])
                .filter(msg => msg.type === 'm.room.message')
                .map(msg => ({
                    event_id: msg.event_id,
                    sender: msg.sender,
                    origin_server_ts: msg.origin_server_ts,
                    content: msg.content
                }));

            // Run bot command handler
            await handleBotCommands(roomId, messages);

            return {
                roomId,
                messages,
                error: null
            };
        } catch (err) {
            console.error('Matrix room error:', err);

            return {
                error: err.message || 'Unknown error',
                messages: []
            };
        }
    }

    // =====================================================
    // NEW MESSAGE CHECK
    // =====================================================

    function checkForNewActivity(roomIndex, messages) {
        if (!messages?.length) {
            return false;
        }

        const latest = messages[0];

        if (!latest?.event_id) {
            return false;
        }

        const latestId = latest.event_id;

        if (
            lastEventIds[roomIndex] &&
            lastEventIds[roomIndex] !== latestId
        ) {
            lastEventIds[roomIndex] = latestId;

            return true;
        }

        if (!lastEventIds[roomIndex]) {
            lastEventIds[roomIndex] = latestId;
        }

        return false;
    }

    // =====================================================
    // UI HELPERS
    // =====================================================

    function escapeHtml(str) {
        if (!str) return '';

        return str.replace(/[&<>]/g, m => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;'
        }[m]));
    }

    function formatTime(ts) {
        if (!ts) return '';

        const date = new Date(ts);

        return date.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    function getSenderName(event) {
        const sender = event.sender || '';

        const match = sender.match(/^@([^:]+):/);

        return match ? match[1] : sender;
    }

    function extractRoomName(roomUrl) {
        try {
            const parsed = parseMatrixIdentifier(roomUrl);

            if (!parsed) {
                return 'Room';
            }

            if (parsed.startsWith('#')) {
                return parsed
                    .split(':')[0]
                    .replace(/^#/, '');
            }

            return parsed.substring(0, 20);
        } catch {
            return 'Room';
        }
    }

    // =====================================================
    // FETCH ALL ROOMS
    // =====================================================

    async function fetchAllRooms() {
        const validRooms = roomUrls.filter(r => r?.trim());

        if (!validRooms.length) {
            content.innerHTML = `
                <div class="module-empty">
                    <p>No chat rooms configured.</p>

                    <button
                        id="chatSettingsBtn"
                        class="settings-link-btn"
                        style="margin-top:12px;"
                    >
                        <i class="fa-solid fa-gear"></i>
                        Configure in Settings
                    </button>
                </div>
            `;

            const settingsBtn =
                content.querySelector('#chatSettingsBtn');

            if (settingsBtn) {
                settingsBtn.onclick = () => {
                    location.href = 'settings.html?args=chat';
                };
            }

            return;
        }

        if (!hasValidCredentials()) {
            content.innerHTML = `
                <div class="chat-error">
                    <strong>Matrix login required</strong>

                    <div style="margin-top:10px;">
                        Add your homeserver, access token,
                        and user ID in Settings → Chat
                    </div>
                </div>
            `;

            return;
        }

        content.innerHTML = `
            <div class="chat-loading">
                <i class="fa-solid fa-spinner fa-spin"></i>
                Loading Matrix rooms...
            </div>
        `;

        const results = [];

        for (let i = 0; i < roomUrls.length; i++) {
            const roomUrl = roomUrls[i];

            if (!roomUrl?.trim()) continue;

            const roomData = await fetchRoom(roomUrl);

            const hasNew = checkForNewActivity(
                i,
                roomData.messages
            );

            results.push({
                index: i,
                url: roomUrl,
                data: roomData,
                hasNew
            });
        }

        renderChat(results);
    }

    // =====================================================
    // RENDER
    // =====================================================

    function renderChat(results) {
        let html = `
            <div class="chat-rooms-wrapper">
                <div class="chat-rooms-list">
        `;

        for (const room of results) {
            const roomName = extractRoomName(room.url);

            const roomData = room.data;

            const messages = roomData?.messages || [];

            const hasError = roomData?.error;

            html += `
                <div class="chat-room-card ${room.hasNew ? 'has-new' : ''}">
                    <div class="chat-room-header">
                        <div class="chat-room-name">
                            <i class="fa-regular fa-comment"></i>

                            ${escapeHtml(roomName)}

                            ${room.hasNew
                                ? '<span class="new-badge">New!</span>'
                                : ''
                            }
                        </div>

                        <button
                            class="chat-toggle-msgs"
                            data-room="${room.index}"
                        >
                            ▼
                        </button>
                    </div>

                    <div
                        class="chat-room-messages"
                        id="chat-msgs-${room.index}"
                        style="display:none;"
                    >
            `;

            if (hasError) {
                html += `
                    <div class="chat-error">
                        ⚠️ ${escapeHtml(roomData.error)}
                    </div>
                `;
            } else if (messages.length) {
                for (const msg of messages.slice(0, 10)) {
                    const body =
                        msg.content?.body || 'Message';

                    html += `
                        <div class="chat-message">
                            <span class="chat-sender">
                                ${escapeHtml(getSenderName(msg))}
                            </span>

                            <span class="chat-time">
                                ${escapeHtml(
                                    formatTime(msg.origin_server_ts)
                                )}
                            </span>

                            <div class="chat-body">
                                ${escapeHtml(body.substring(0, 250))}
                            </div>
                        </div>
                    `;
                }
            } else {
                html += `
                    <div class="chat-empty">
                        No messages
                    </div>
                `;
            }

            html += `
                    </div>
                </div>
            `;
        }

        html += `
                </div>
            </div>

            <div
                style="
                    display:flex;
                    gap:12px;
                    margin-top:16px;
                "
            >
                <button
                    id="chatRefreshBtn"
                    class="chat-refresh-btn"
                    style="flex:1;"
                >
                    ⟳ Refresh
                </button>
        `;

        // Only show Update Settings button if NOT logged in or no credentials
        if (!hasValidCredentials()) {
            html += `
                <button
                    id="chatUpdateSettingsBtn"
                    class="chat-update-btn"
                    style="
                        flex:1;
                        background:#0047cc;
                        color:white;
                        border:none;
                        border-radius:12px;
                        padding:10px;
                        cursor:pointer;
                    "
                >
                    <i class="fa-solid fa-gear"></i>
                    Update Settings
                </button>
            `;
        }

        html += `
            </div>
        `;

        content.innerHTML = html;

        // Toggle messages
        document
            .querySelectorAll('.chat-toggle-msgs')
            .forEach(btn => {
                btn.addEventListener('click', () => {
                    const idx = btn.dataset.room;

                    const el =
                        document.getElementById(
                            `chat-msgs-${idx}`
                        );

                    if (!el) return;

                    const visible =
                        el.style.display === 'block';

                    el.style.display =
                        visible ? 'none' : 'block';

                    btn.textContent =
                        visible ? '▼' : '▲';
                });
            });

        // Refresh button
        const refreshBtn =
            document.getElementById('chatRefreshBtn');

        if (refreshBtn) {
            refreshBtn.addEventListener(
                'click',
                fetchAllRooms
            );
        }

        // Update settings button (only if present in DOM)
        const updateBtn =
            document.getElementById(
                'chatUpdateSettingsBtn'
            );

        if (updateBtn) {
            updateBtn.addEventListener('click', () => {
                const freshSettings = loadSettings();

                roomUrls =
                    freshSettings.chat?.rooms ||
                    ['', '', ''];

                refreshSeconds =
                    freshSettings.chat?.refreshInterval ||
                    30;

                homeserver =
                    freshSettings.chat?.homeserver ||
                    'https://matrix.org';

                accessToken =
                    freshSettings.chat?.accessToken || '';

                userId =
                    freshSettings.chat?.userId || '';

                lastEventIds = {};

                if (refreshIntervalId) {
                    clearInterval(refreshIntervalId);
                }

                startRefresh();
            });
        }

        if (window.refreshDashboardLayout) {
            window.refreshDashboardLayout();
        }
    }

    // =====================================================
    // REFRESH LOOP
    // =====================================================

    function startRefresh() {
        // Prevent memory leak
        if (processedEvents.size > 5000) {
            processedEvents.clear();
        }

        fetchAllRooms();

        if (refreshIntervalId) {
            clearInterval(refreshIntervalId);
        }

        refreshIntervalId = setInterval(
            fetchAllRooms,
            refreshSeconds * 1000
        );
    }

    startRefresh();

    return () => {
        if (refreshIntervalId) {
            clearInterval(refreshIntervalId);
        }
    };
}