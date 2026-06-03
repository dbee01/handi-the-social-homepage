// modules/calendar/calendar.module.js
import { loadSettings } from "../../js/core/settings.js";

export default async function initCalendar(container) {
  const pinBtn = container.querySelector(".pin-btn");
  container.innerHTML = "";
  if (pinBtn) container.prepend(pinBtn);

  const title = document.createElement("div");
  title.className = "panel-title";
  title.innerHTML = '<i class="fa-regular fa-calendar"></i> CALENDAR';
  container.appendChild(title);

  const content = document.createElement("div");
  content.className = "calendar-content";
  container.appendChild(content);

  const settings = loadSettings();

  // Load existing calendar URL - preserve existing if new input is blank
  let calendarUrl = "";
  let notificationMinutes = 30;

  if (settings.calendar) {
    // Only use the stored URL if it exists and is not empty
    calendarUrl = settings.calendar.url || "";
    notificationMinutes = settings.calendar.notificationMinutes || 30;
  }

  let refreshIntervalId = null;
  let notifiedEventIds = new Set();
  let lastSyncTime = null;

  // Safe text decode (handles invalid URI sequences gracefully)
  function safeDecode(str) {
    if (!str) return "";
    try {
      return decodeURIComponent(str);
    } catch (e) {
      return str;
    }
  }

  // Parse iCal (ICS) format
  function parseICS(icsText) {
    const events = [];
    const lines = icsText.split(/\r?\n/);
    let currentEvent = null;
    let inEvent = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (line === "BEGIN:VEVENT") {
        inEvent = true;
        currentEvent = {};
      } else if (line === "END:VEVENT") {
        if (currentEvent && currentEvent.summary) {
          events.push(currentEvent);
        }
        inEvent = false;
        currentEvent = null;
      } else if (inEvent && line) {
        const colonIndex = line.indexOf(":");
        if (colonIndex > 0) {
          const key = line.substring(0, colonIndex);
          let value = line.substring(colonIndex + 1);

          while (i + 1 < lines.length && lines[i + 1].startsWith(" ")) {
            value += lines[i + 1].trim();
            i++;
          }

          switch (key) {
            case "SUMMARY":
              currentEvent.summary = safeDecode(
                value.replace(/\\,/g, ",").replace(/\\;/g, ";"),
              );
              break;
            case "DTSTART":
              currentEvent.start = parseICalDate(value);
              break;
            case "DTEND":
              currentEvent.end = parseICalDate(value);
              break;
            case "DESCRIPTION":
              currentEvent.description = safeDecode(
                value.replace(/\\n/g, "\n"),
              );
              break;
            case "LOCATION":
              currentEvent.location = safeDecode(value);
              break;
            case "UID":
              currentEvent.uid = value;
              break;
          }
        }
      }
    }
    return events;
  }

  function parseICalDate(dateStr) {
    if (!dateStr) return null;
    let clean = dateStr.replace(/Z$/, "");

    if (clean.includes("T")) {
      const year = parseInt(clean.substring(0, 4));
      const month = parseInt(clean.substring(4, 6)) - 1;
      const day = parseInt(clean.substring(6, 8));
      const hour = parseInt(clean.substring(9, 11));
      const minute = parseInt(clean.substring(11, 13));
      const second = parseInt(clean.substring(13, 15)) || 0;
      return new Date(Date.UTC(year, month, day, hour, minute, second));
    } else {
      const year = parseInt(clean.substring(0, 4));
      const month = parseInt(clean.substring(4, 6)) - 1;
      const day = parseInt(clean.substring(6, 8));
      return new Date(year, month, day);
    }
  }

  function isToday(date) {
    if (!date) return false;
    const today = new Date();
    const eventDate = new Date(date);
    return (
      eventDate.getDate() === today.getDate() &&
      eventDate.getMonth() === today.getMonth() &&
      eventDate.getFullYear() === today.getFullYear()
    );
  }

  function isTomorrow(date) {
    if (!date) return false;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const eventDate = new Date(date);
    return (
      eventDate.getDate() === tomorrow.getDate() &&
      eventDate.getMonth() === tomorrow.getMonth() &&
      eventDate.getFullYear() === tomorrow.getFullYear()
    );
  }

  function isUpcoming(event, minutesThreshold) {
    if (!event.start) return false;
    const now = new Date();
    const eventTime = new Date(event.start);
    const diffMs = eventTime - now;
    const diffMinutes = diffMs / (1000 * 60);
    return diffMinutes > 0 && diffMinutes <= minutesThreshold;
  }

  function formatEventTime(event) {
    if (!event.start) return "Time TBD";

    const start = new Date(event.start);
    const options = { hour: "2-digit", minute: "2-digit" };

    if (event.end) {
      const end = new Date(event.end);
      if (end > start) {
        return `${start.toLocaleTimeString([], options)} - ${end.toLocaleTimeString([], options)}`;
      }
    }
    return start.toLocaleTimeString([], options);
  }

  function formatSyncTime() {
    if (!lastSyncTime) return "Never";
    return lastSyncTime.toLocaleTimeString();
  }

  function sendNotification(title, body) {
    if (!("Notification" in window)) return;

    if (Notification.permission === "granted") {
      new Notification(title, { body, icon: "/images/favicon.png" });
    } else if (Notification.permission !== "denied") {
      Notification.requestPermission().then((permission) => {
        if (permission === "granted") {
          new Notification(title, { body, icon: "/images/favicon.png" });
        }
      });
    }
  }

  function checkForUpcomingEvents(events) {
    for (const event of events) {
      if (isUpcoming(event, notificationMinutes)) {
        const eventId = event.uid || event.summary + event.start?.toString();
        if (!notifiedEventIds.has(eventId)) {
          notifiedEventIds.add(eventId);
          sendNotification(
            "📅 Upcoming Event",
            `${event.summary} starts in ${notificationMinutes} minutes!`,
          );
        }
      }
    }
  }

  async function fetchCalendar() {
    if (!calendarUrl || calendarUrl.trim() === "") {
      content.innerHTML = `
                <div class="module-empty">
                    <i class="fa-regular fa-calendar-circle-plus"></i>
                    <p>No calendar configured.</p>
                    <button id="calendarSettingsBtn" class="settings-link-btn">
                        <i class="fa-solid fa-gear"></i> Add Calendar in Settings
                    </button>
                </div>
            `;
      const settingsBtn = content.querySelector("#calendarSettingsBtn");
      if (settingsBtn)
        settingsBtn.onclick = () =>
          (location.href = "settings.html?args=calendar");
      return;
    }

    content.innerHTML =
      '<div class="calendar-loading"><i class="fa-solid fa-spinner fa-spin"></i> Loading calendar...</div>';

    try {
      const encodedUrl = encodeURIComponent(calendarUrl);
      const proxyUrl = `/api/calendar-proxy?url=${encodedUrl}`;

      const response = await fetch(proxyUrl);

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const icsText = await response.text();

      if (!icsText.includes("BEGIN:VCALENDAR")) {
        throw new Error("Invalid calendar data received");
      }

      const allEvents = parseICS(icsText);

      // Filter today's events
      const todayEvents = allEvents.filter((event) => isToday(event.start));
      const tomorrowEvents = allEvents.filter((event) =>
        isTomorrow(event.start),
      );
      todayEvents.sort(
        (a, b) => new Date(a.start || 0) - new Date(b.start || 0),
      );

      lastSyncTime = new Date();

      checkForUpcomingEvents(allEvents);

      renderCalendar(todayEvents, tomorrowEvents, allEvents.length);
    } catch (err) {
      console.error("Calendar fetch error:", err);
      content.innerHTML = `
                <div class="calendar-error">
                    <i class="fa-solid fa-exclamation-triangle"></i>
                    <p>Failed to load calendar.</p>
                    <small>${escapeHtml(err.message)}</small>
                    <button id="calendarRetryBtn" class="calendar-retry-btn">Retry</button>
                </div>
            `;
      const retryBtn = content.querySelector("#calendarRetryBtn");
      if (retryBtn) retryBtn.addEventListener("click", () => fetchCalendar());
    }
  }

  function renderCalendar(events, tomorrowEvents, totalEvents) {
    let html = `
            <div class="calendar-today-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; padding: 8px 12px; background: #eaf2ff; border-radius: 12px;">
                <span><i class="fa-regular fa-sun"></i> Today's Events</span>
                <span class="calendar-notification-badge" style="background: #0047cc; color: white; padding: 4px 8px; border-radius: 20px; font-size: 0.7rem;">🔔 ${notificationMinutes} min warning</span>
            </div>
        `;

    if (events.length === 0) {
      html += `
                <div class="calendar-empty" style="text-align: center; padding: 30px; background: white; border-radius: 16px; border: 1px solid #e2e8f0;">
                    <i class="fa-regular fa-calendar-check" style="font-size: 2rem; color: #0047cc;"></i>
                    <p style="margin-top: 12px;">No events scheduled for today.</p>
            `;

      if (tomorrowEvents.length > 0) {
        html += `<p style="margin-top: 8px; font-size: 0.8rem; color: #64748b;">📅 You have ${tomorrowEvents.length} event(s) tomorrow.</p>`;
      }

      html += `</div>`;
    } else {
      html += `<div class="calendar-events-list" style="max-height: 450px; overflow-y: auto;">`;
      for (const event of events) {
        const timeStr = formatEventTime(event);
        html += `
                    <div class="calendar-event-card" style="display: flex; gap: 16px; background: white; border: 2px solid #cbd5e1; border-radius: 16px; padding: 16px; margin-bottom: 12px;">
                        <div class="calendar-event-time" style="min-width: 100px; font-weight: 600; color: #0047cc;">
                            <i class="fa-regular fa-clock"></i> ${escapeHtml(timeStr)}
                        </div>
                        <div class="calendar-event-details" style="flex: 1;">
                            <div class="calendar-event-title" style="font-weight: 700; font-size: 1rem;">${escapeHtml(event.summary || "Untitled Event")}</div>
                            ${event.location ? `<div class="calendar-event-location" style="font-size: 0.8rem; color: #64748b; margin-top: 4px;"><i class="fa-solid fa-location-dot"></i> ${escapeHtml(event.location)}</div>` : ""}
                            ${event.description ? `<div class="calendar-event-desc" style="font-size: 0.8rem; color: #475569; margin-top: 6px;">${escapeHtml(event.description.substring(0, 100))}${event.description.length > 100 ? "…" : ""}</div>` : ""}
                        </div>
                    </div>
                `;
      }
      html += `</div>`;
    }

    // Sync info and refresh button
    html += `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 12px; padding: 8px 4px;">
                <span style="font-size: 0.7rem; color: #64748b;">
                    <i class="fa-regular fa-clock"></i> Last synced: ${formatSyncTime()}
                    ${totalEvents > 0 ? ` | ${totalEvents} total events in feed` : ""}
                </span>
                <button id="calendarRefreshBtn" class="calendar-refresh-btn" style="padding: 8px 16px; background: #f8fafc; border: 2px solid #cbd5e1; border-radius: 12px; cursor: pointer; font-weight: 600;">
                    ⟳ Refresh
                </button>
            </div>
        `;

    content.innerHTML = html;

    const refreshBtn = document.getElementById("calendarRefreshBtn");
    if (refreshBtn) refreshBtn.addEventListener("click", () => fetchCalendar());

    if (window.refreshDashboardLayout) window.refreshDashboardLayout();
  }

  function startRefresh() {
    if (refreshIntervalId) clearInterval(refreshIntervalId);
    fetchCalendar();
    // Refresh every 15 minutes (Proton ICS can take hours to update)
    refreshIntervalId = setInterval(fetchCalendar, 15 * 60 * 1000);
  }

  function escapeHtml(str) {
    if (!str) return "";
    return str.replace(
      /[&<>]/g,
      (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[m],
    );
  }

  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission();
  }

  startRefresh();
  return () => {
    if (refreshIntervalId) clearInterval(refreshIntervalId);
  };
}
