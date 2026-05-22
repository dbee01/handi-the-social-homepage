// modules/calendar/calendar.module.js
import { loadSettings } from '../../js/core/settings.js';

export default async function initCalendar(container) {
    const pinBtn = container.querySelector('.pin-btn');
    container.innerHTML = '';
    if (pinBtn) container.prepend(pinBtn);

    const title = document.createElement('div');
    title.className = 'panel-title';
    title.innerHTML = '<i class="fa-regular fa-calendar"></i> CALENDAR';
    container.appendChild(title);

    const content = document.createElement('div');
    content.className = 'calendar-content';
    container.appendChild(content);

    const settings = loadSettings();
    const calendarUrl = settings.calendar?.url || '';
    const notificationMinutes = settings.calendar?.notificationMinutes || 30;
    
    let refreshIntervalId = null;
    let notifiedEventIds = new Set(); // Track which events we've already notified about

    // Parse iCal (ICS) format
    function parseICS(icsText) {
        const events = [];
        const lines = icsText.split(/\r?\n/);
        let currentEvent = null;
        let inEvent = false;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            if (line === 'BEGIN:VEVENT') {
                inEvent = true;
                currentEvent = {};
            } else if (line === 'END:VEVENT') {
                if (currentEvent && currentEvent.summary) {
                    events.push(currentEvent);
                }
                inEvent = false;
                currentEvent = null;
            } else if (inEvent && line) {
                // Parse key:value pairs
                const colonIndex = line.indexOf(':');
                if (colonIndex > 0) {
                    const key = line.substring(0, colonIndex);
                    let value = line.substring(colonIndex + 1);
                    
                    // Handle multiline values (they start with space)
                    while (i + 1 < lines.length && lines[i + 1].startsWith(' ')) {
                        value += lines[i + 1].trim();
                        i++;
                    }
                    
                    switch(key) {
                        case 'SUMMARY':
                            currentEvent.summary = decodeURIComponent(value.replace(/\\,/g, ',').replace(/\\;/g, ';'));
                            break;
                        case 'DTSTART':
                            currentEvent.start = parseICalDate(value);
                            break;
                        case 'DTEND':
                            currentEvent.end = parseICalDate(value);
                            break;
                        case 'DESCRIPTION':
                            currentEvent.description = decodeURIComponent(value.replace(/\\n/g, '\n'));
                            break;
                        case 'LOCATION':
                            currentEvent.location = decodeURIComponent(value);
                            break;
                        case 'UID':
                            currentEvent.uid = value;
                            break;
                    }
                }
            }
        }
        return events;
    }

    // Parse iCal date format (YYYYMMDDTHHMMSSZ or YYYYMMDD)
    function parseICalDate(dateStr) {
        if (!dateStr) return null;
        // Remove timezone 'Z' if present and treat as UTC
        let clean = dateStr.replace(/Z$/, '');
        
        if (clean.includes('T')) {
            // Full date + time: 20240521T143000
            const year = parseInt(clean.substring(0, 4));
            const month = parseInt(clean.substring(4, 6)) - 1;
            const day = parseInt(clean.substring(6, 8));
            const hour = parseInt(clean.substring(9, 11));
            const minute = parseInt(clean.substring(11, 13));
            const second = parseInt(clean.substring(13, 15)) || 0;
            return new Date(Date.UTC(year, month, day, hour, minute, second));
        } else {
            // All-day event: 20240521
            const year = parseInt(clean.substring(0, 4));
            const month = parseInt(clean.substring(4, 6)) - 1;
            const day = parseInt(clean.substring(6, 8));
            return new Date(year, month, day);
        }
    }

    // Check if an event is happening today
    function isToday(date) {
        if (!date) return false;
        const today = new Date();
        return date.getDate() === today.getDate() &&
               date.getMonth() === today.getMonth() &&
               date.getFullYear() === today.getFullYear();
    }

    // Check if an event is upcoming within notification window
    function isUpcoming(event, minutesThreshold) {
        if (!event.start) return false;
        const now = new Date();
        const eventTime = event.start;
        const diffMs = eventTime - now;
        const diffMinutes = diffMs / (1000 * 60);
        return diffMinutes > 0 && diffMinutes <= minutesThreshold;
    }

    // Format time for display
    function formatEventTime(event) {
        if (!event.start) return 'Time TBD';
        
        const start = event.start;
        const options = { hour: '2-digit', minute: '2-digit' };
        
        if (event.end && event.end > event.start) {
            return `${start.toLocaleTimeString([], options)} - ${event.end.toLocaleTimeString([], options)}`;
        }
        return start.toLocaleTimeString([], options);
    }

    // Format date for display
    function formatEventDate(date) {
        if (!date) return '';
        const options = { month: 'short', day: 'numeric' };
        return date.toLocaleDateString([], options);
    }

    // Send browser notification
    function sendNotification(title, body) {
        if (!('Notification' in window)) return;
        
        if (Notification.permission === 'granted') {
            new Notification(title, { body, icon: '/favicon.ico' });
        } else if (Notification.permission !== 'denied') {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    new Notification(title, { body, icon: '/favicon.ico' });
                }
            });
        }
    }

    // Check for upcoming events and send notifications
    function checkForUpcomingEvents(events) {
        for (const event of events) {
            if (isUpcoming(event, notificationMinutes)) {
                const eventId = event.uid || event.summary + event.start?.toString();
                if (!notifiedEventIds.has(eventId)) {
                    notifiedEventIds.add(eventId);
                    sendNotification('📅 Upcoming Event', `${event.summary} starts in ${notificationMinutes} minutes!`);
                }
            }
        }
    }

    async function fetchCalendar() {
        if (!calendarUrl || calendarUrl.trim() === '') {
            content.innerHTML = `
                <div class="module-empty">
                    <i class="fa-regular fa-calendar-circle-plus"></i>
                    <p>No calendar configured.</p>
                    <button id="calendarSettingsBtn" class="settings-link-btn">
                        <i class="fa-solid fa-gear"></i> Add Calendar in Settings
                    </button>
                </div>
            `;
            const settingsBtn = content.querySelector('#calendarSettingsBtn');
            if (settingsBtn) settingsBtn.onclick = () => location.href = 'settings.html?args=calendar';
            return;
        }

        content.innerHTML = '<div class="calendar-loading"><i class="fa-solid fa-spinner fa-spin"></i> Loading calendar...</div>';

        try {
            const response = await fetch(calendarUrl);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const icsText = await response.text();
            const allEvents = parseICS(icsText);
            
            // Filter today's events
            const todayEvents = allEvents.filter(event => isToday(event.start));
            // Sort by start time
            todayEvents.sort((a, b) => (a.start || 0) - (b.start || 0));
            
            // Check for upcoming events (for notifications)
            checkForUpcomingEvents(allEvents);
            
            renderCalendar(todayEvents);
        } catch (err) {
            console.error('Calendar fetch error:', err);
            content.innerHTML = `
                <div class="calendar-error">
                    <i class="fa-solid fa-exclamation-triangle"></i>
                    <p>Failed to load calendar.</p>
                    <small>${escapeHtml(err.message)}</small>
                    <button id="calendarRetryBtn" class="calendar-retry-btn">Retry</button>
                </div>
            `;
            const retryBtn = content.querySelector('#calendarRetryBtn');
            if (retryBtn) retryBtn.addEventListener('click', () => fetchCalendar());
        }
    }

    function renderCalendar(events) {
        if (events.length === 0) {
            content.innerHTML = `
                <div class="calendar-empty">
                    <i class="fa-regular fa-calendar-check"></i>
                    <p>No events scheduled for today.</p>
                    <div class="calendar-notification-info">
                        <i class="fa-regular fa-bell"></i> You'll be notified ${notificationMinutes} minutes before events.
                    </div>
                </div>
            `;
            return;
        }

        let html = `
            <div class="calendar-today-header">
                <i class="fa-regular fa-sun"></i> Today's Events
                <span class="calendar-notification-badge">🔔 ${notificationMinutes} min warning</span>
            </div>
            <div class="calendar-events-list">
        `;

        for (const event of events) {
            const timeStr = formatEventTime(event);
            const dateStr = formatEventDate(event.start);
            
            html += `
                <div class="calendar-event-card">
                    <div class="calendar-event-time">
                        <i class="fa-regular fa-clock"></i> ${escapeHtml(timeStr)}
                    </div>
                    <div class="calendar-event-details">
                        <div class="calendar-event-title">${escapeHtml(event.summary || 'Untitled Event')}</div>
                        ${event.location ? `<div class="calendar-event-location"><i class="fa-solid fa-location-dot"></i> ${escapeHtml(event.location)}</div>` : ''}
                        ${event.description ? `<div class="calendar-event-desc">${escapeHtml(event.description.substring(0, 100))}${event.description.length > 100 ? '…' : ''}</div>` : ''}
                    </div>
                </div>
            `;
        }

        html += `
            </div>
            <button id="calendarRefreshBtn" class="calendar-refresh-btn">⟳ Refresh</button>
        `;

        content.innerHTML = html;
        
        const refreshBtn = document.getElementById('calendarRefreshBtn');
        if (refreshBtn) refreshBtn.addEventListener('click', () => fetchCalendar());
        
        if (window.refreshDashboardLayout) window.refreshDashboardLayout();
    }

    function startRefresh() {
        if (refreshIntervalId) clearInterval(refreshIntervalId);
        fetchCalendar();
        // Refresh every 5 minutes to check for upcoming events
        refreshIntervalId = setInterval(fetchCalendar, 5 * 60 * 1000);
    }

    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/[&<>]/g, m => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;' }[m]));
    }

    // Request notification permission on load
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }

    startRefresh();
    return () => {
        if (refreshIntervalId) clearInterval(refreshIntervalId);
    };
}