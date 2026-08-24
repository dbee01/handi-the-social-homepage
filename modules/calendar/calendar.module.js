/*
 * Copyright (c) 2026 Handi Homepage
 * This file is part of HandiHomepage and is released under the GNU General Public License v3.0.
 * See the LICENSE file in the repository root for full details.
 */

// modules/calendar/calendar.module.js
import { loadSettings } from "../../js/core/settings.js";

export default async function initCalendar(container) {
  var t =
    window.t ||
    function (k, e) {
      return e || k;
    };
  const pinBtn = container.querySelector(".pin-btn");
  container.innerHTML = "";
  if (pinBtn) container.prepend(pinBtn);

  const title = document.createElement("div");
  title.className = "panel-title";
  var name =
    window.LANG && window.LANG.modules && window.LANG.modules.calendar
      ? window.LANG.modules.calendar.name
      : "CALENDAR";
  title.innerHTML = '<i class="fa-regular fa-calendar"></i> ' + name;
  container.appendChild(title);

  const content = document.createElement("div");
  content.className = "calendar-content";
  container.appendChild(content);

  const settings = loadSettings();

  // Load existing calendar URL - preserve existing if new input is blank
  let calendarUrl = "";
  let notificationMinutes = 30;
  let alertsEnabled = true;

  if (settings.calendar) {
    // Only use the stored URL if it exists and is not empty
    calendarUrl = settings.calendar.url || "";
    notificationMinutes = settings.calendar.notificationMinutes || 15;
  }

  // Load alerts toggle state (default: ON)
  try {
    var savedAlerts = localStorage.getItem("calendarAlerts");
    alertsEnabled = savedAlerts !== null ? savedAlerts === "true" : true;
  } catch (e) {}

  function saveAlertsState() {
    try { localStorage.setItem("calendarAlerts", alertsEnabled ? "true" : "false"); } catch (e) {}
  }

  let refreshIntervalId = null;
  let alertCheckInterval = null;
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

  // Parse iCal (ICS) format with recurrence expansion
  function parseICS(icsText) {
    const events = [];
    const rawEvents = [];
    const lines = icsText.split(/\r?\n/);
    let currentEvent = null;
    let inEvent = false;

    // First pass: collect all VEVENT data (including raw rule strings)
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (line === "BEGIN:VEVENT") {
        inEvent = true;
        currentEvent = {};
      } else if (line === "END:VEVENT") {
        if (currentEvent && currentEvent.summary) {
          rawEvents.push(currentEvent);
        }
        inEvent = false;
        currentEvent = null;
      } else if (inEvent && line) {
        const colonIndex = line.indexOf(":");
        if (colonIndex > 0) {
          const rawKey = line.substring(0, colonIndex);
          // Extract the base property name (before any semicolons with params)
          const key = rawKey.split(";")[0];
          const params = rawKey.substring(key.length); // e.g. ";TZID=Europe/Dublin"
          let value = line.substring(colonIndex + 1);

          while (i + 1 < lines.length && lines[i + 1].startsWith(" ")) {
            value += lines[i + 1].trim();
            i++;
          }

          // Extract TZID parameter if present
          let tzid = null;
          const tzidMatch = params.match(/TZID=([^;]+)/);
          if (tzidMatch) tzid = tzidMatch[1];

          switch (key) {
            case "SUMMARY":
              currentEvent.summary = safeDecode(
                value.replace(/\\,/g, ",").replace(/\\;/g, ";"),
              );
              break;
            case "DTSTART":
              currentEvent.start = parseICalDate(value, tzid);
              currentEvent._dtstartRaw = tzid
                ? `;TZID=${tzid}:${value}`
                : `:${value}`;
              currentEvent._tzid = currentEvent._tzid || tzid;
              break;
            case "DTEND":
              currentEvent.end = parseICalDate(value, tzid);
              currentEvent._dtendRaw = tzid
                ? `;TZID=${tzid}:${value}`
                : `:${value}`;
              currentEvent._tzid = currentEvent._tzid || tzid;
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
            case "RRULE":
              currentEvent.rruleStr = value;
              break;
            case "EXDATE":
              if (!currentEvent.exdateStrs) currentEvent.exdateStrs = [];
              currentEvent.exdateStrs.push(value);
              break;
            case "RDATE":
              if (!currentEvent.rdateStrs) currentEvent.rdateStrs = [];
              currentEvent.rdateStrs.push(value);
              break;
          }
        }
      }
    }

    // Second pass: expand recurring events using rrule.js
    for (const ev of rawEvents) {
      if (ev.rruleStr && window.rrule && window.rrule.RRule) {
        try {
          const RRule = window.rrule.RRule;
          // Feed rrule.js a UTC-based DTSTART so timezone is not double-handled.
          // Use our already-correctly-parsed start date to compute the UTC DTSTART
          // string in rrule.js's expected format (no TZID).
          const utcStart = ev.start;
          const utcStr =
            utcStart.getUTCFullYear() +
            String(utcStart.getUTCMonth() + 1).padStart(2, "0") +
            String(utcStart.getUTCDate()).padStart(2, "0") +
            "T" +
            String(utcStart.getUTCHours()).padStart(2, "0") +
            String(utcStart.getUTCMinutes()).padStart(2, "0") +
            String(utcStart.getUTCSeconds()).padStart(2, "0") +
            "Z";
          const rruleStr = "DTSTART:" + utcStr + "\nRRULE:" + ev.rruleStr;
          const rule = RRule.fromString(rruleStr);

          // Compute a reasonable end date for expansion (next 6 months)
          const untilDate = new Date();
          untilDate.setMonth(untilDate.getMonth() + 6);

          const occurrences = rule.between(new Date(0), untilDate, true);

          if (occurrences.length <= 1) {
            // Only the original date, no real recurrence — push as-is
            events.push(ev);
          } else {
            const duration =
              ev.end && ev.start
                ? ev.end.getTime() - ev.start.getTime()
                : 3600000; // default 1 hour

            for (const occDate of occurrences) {
              const expanded = {
                summary: ev.summary,
                description: ev.description,
                location: ev.location,
                uid: ev.uid + "_" + occDate.getTime(),
                start: new Date(occDate),
                end: new Date(occDate.getTime() + duration),
                _recurring: true,
              };
              events.push(expanded);
            }
          }
        } catch (e) {
          console.warn("Failed to expand recurring event:", ev.summary, e);
          events.push(ev);
        }
      } else {
        events.push(ev);
      }
    }

    return events;
  }

  function parseICalDate(dateStr, tzid) {
    if (!dateStr) return null;
    let clean = dateStr.replace(/Z$/, "");

    if (clean.includes("T")) {
      const year = parseInt(clean.substring(0, 4));
      const month = parseInt(clean.substring(4, 6)) - 1;
      const day = parseInt(clean.substring(6, 8));
      const hour = parseInt(clean.substring(9, 11));
      const minute = parseInt(clean.substring(11, 13));
      const second = parseInt(clean.substring(13, 15)) || 0;

      if (dateStr.endsWith("Z") && !tzid) {
        // Calendar providers emit UTC — subtract 1h so local display matches event time
        return new Date(Date.UTC(year, month, day, hour - 1, minute, second));
      } else if (tzid) {
        // Use the browser's Intl API to compute the UTC offset of the target timezone
        // at the given date, then convert the local time to UTC
        try {
          const localIso = `${String(year).padStart(4, "0")}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:${String(second).padStart(2, "0")}`;
          // Get the UTC offset of the target timezone at this moment
          const offsetDate = new Date(
            Date.UTC(year, month, day, hour, minute, second),
          );
          const formatter = new Intl.DateTimeFormat("en-CA", {
            timeZone: tzid,
            timeZoneName: "longOffset",
          });
          const formatted = formatter.format(offsetDate);
          const offsetMatch = formatted.match(/([+-]\d{2}:?\d{2})/);
          let offsetMinutes = 0;
          if (offsetMatch) {
            const m = offsetMatch[1].match(/([+-])(\d{2}):?(\d{2})/);
            if (m) {
              offsetMinutes =
                (m[1] === "+" ? 1 : -1) *
                (parseInt(m[2]) * 60 + (parseInt(m[3]) || 0));
            }
          }
          // local time = UTC + offsetMinutes, so UTC = local - offsetMinutes
          const utcMs =
            Date.UTC(year, month, day, hour, minute, second) -
            offsetMinutes * 60000;
          return new Date(utcMs);
        } catch (e) {
          console.warn(
            "Failed to parse TZID date, falling back to local:",
            dateStr,
            tzid,
            e,
          );
          return new Date(year, month, day, hour, minute, second);
        }
      } else {
        // No TZID, no Z — treat as local
        return new Date(year, month, day, hour, minute, second);
      }
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


  function formatSyncTime() {
    if (!lastSyncTime) return "Never";
    return lastSyncTime.toLocaleTimeString();
  }

  // Alert audio context (lazy-initialized on user interaction)
  let alertAudioCtx = null;
  let alertOsc = null;
  let alertGain = null;

  function initAlertAudio() {
    if (alertAudioCtx) return alertAudioCtx;
    try {
      alertAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      console.warn("AudioContext not available for calendar alerts");
      return null;
    }
    return alertAudioCtx;
  }

  function startAlertBeep() {
    const ctx = initAlertAudio();
    if (!ctx) return;
    // Resume if suspended (needed after browser autoplay policy)
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
    // Create a beeping oscillator: 880Hz square wave, pulsing for 10 seconds
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.value = 880;
    gain.gain.value = 0.15;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();

    // Pulse: alternate on/off every 500ms for 10 seconds
    const startTime = ctx.currentTime;
    const beepDuration = 10;
    for (let t = 0; t < beepDuration; t += 0.5) {
      const isOn = Math.floor(t / 0.5) % 2 === 0;
      gain.gain.setValueAtTime(isOn ? 0.15 : 0, startTime + t);
    }
    gain.gain.setValueAtTime(0, startTime + beepDuration);
    osc.stop(startTime + beepDuration);

    alertOsc = osc;
    alertGain = gain;

    // Clean up references after beep ends
    setTimeout(
      () => {
        try {
          osc.stop();
        } catch (e) {
          /* already stopped */
        }
        alertOsc = null;
        alertGain = null;
      },
      (beepDuration + 0.5) * 1000,
    );
  }

  function stopAlertBeep() {
    if (alertOsc) {
      try {
        alertOsc.stop();
      } catch (e) {
        /* already stopped */
      }
      alertOsc = null;
    }
    if (alertGain) {
      alertGain.disconnect();
      alertGain = null;
    }
  }

  // Screen flash element (red flashing overlay until dismissed)
  let flashOverlay = null;
  let flashInterval = null;
  let flashDismissHandler = null;
  const FLASH_COLORS = ["rgba(220, 0, 0, 0.25)", "rgba(220, 0, 0, 0.50)"];

  function startScreenFlash() {
    // Create or reuse a red flash overlay
    if (!flashOverlay) {
      flashOverlay = document.createElement("div");
      flashOverlay.id = "calendar-alert-flash";
      flashOverlay.style.cssText = `
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        pointer-events: auto;
        z-index: 9999;
        transition: none;
        opacity: 1;
      `;
      document.body.appendChild(flashOverlay);
    }

    // Rapid red flashing
    let colorIndex = 0;
    if (flashInterval) clearInterval(flashInterval);
    flashOverlay.style.background = FLASH_COLORS[0];
    flashInterval = setInterval(() => {
      colorIndex = 1 - colorIndex;
      flashOverlay.style.background = FLASH_COLORS[colorIndex];
    }, 400);

    // Dismiss on any touch/click on the overlay
    if (flashDismissHandler) {
      flashOverlay.removeEventListener("click", flashDismissHandler);
      flashOverlay.removeEventListener("touchstart", flashDismissHandler);
    }
    flashDismissHandler = (e) => {
      e.preventDefault();
      clearAlert();
    };
    flashOverlay.addEventListener("click", flashDismissHandler);
    flashOverlay.addEventListener("touchstart", flashDismissHandler);
  }

  function stopScreenFlash() {
    if (flashInterval) {
      clearInterval(flashInterval);
      flashInterval = null;
    }
    if (flashDismissHandler && flashOverlay) {
      flashOverlay.removeEventListener("click", flashDismissHandler);
      flashOverlay.removeEventListener("touchstart", flashDismissHandler);
      flashDismissHandler = null;
    }
    if (flashOverlay) {
      flashOverlay.style.opacity = "0";
      flashOverlay.style.background = "none";
      flashOverlay.style.pointerEvents = "none";
    }
  }

  function triggerAlert(title, body) {
    // 1. System notification
    if ("Notification" in window) {
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

    // 2. Audio beep for 10 seconds
    try {
      startAlertBeep();
    } catch (e) {
      console.warn("Alert beep error:", e);
    }

    // 3. Red screen flash until dismissed
    try {
      startScreenFlash();
    } catch (e) {
      console.warn("Alert flash error:", e);
    }
  }

  function clearAlert() {
    stopAlertBeep();
    stopScreenFlash();
  }

  function checkForUpcomingEvents(events) {
    if (!alertsEnabled) return;
    const now = new Date();
    for (const event of events) {
      if (isUpcoming(event, notificationMinutes)) {
        const eventId = event.uid || event.summary + event.start?.toString();
        if (!notifiedEventIds.has(eventId)) {
          notifiedEventIds.add(eventId);
          const startTime = new Date(event.start);
          const diffMs = startTime - now;
          const diffMinutes = Math.round(diffMs / (1000 * 60));
          const minStr =
            diffMinutes >= 60
              ? `${Math.floor(diffMinutes / 60)}h ${diffMinutes % 60}m`
              : `${diffMinutes} min`;
          triggerAlert(
            "📅 Upcoming Event",
            `${event.summary} starting in ${minStr}`,
          );
        }
      }
    }
  }

  async function fetchCalendar() {
    if (!calendarUrl || calendarUrl.trim() === "") {
      content.innerHTML =
        `
        <div class="module-empty">
          <i class="fa-solid fa-calendar-days"></i>
          <p>` +
        t("d_noCalendar", "No calendar configured.") +
        `</p>
          <div style="margin-top:12px;display:flex;gap:8px;justify-content:center;flex-wrap:wrap;">
            <input id="calendarUrlInput" type="text" placeholder="` +
        t("d_pasteIcal", "Paste iCal URL...") +
        `" style="padding:8px 12px;border-radius:8px;border:2px solid #cbd5e1;font-size:0.95rem;min-width:240px;">
            <button id="calendarSaveBtn" class="settings-link-btn">
              <i class="fa-solid fa-check"></i> ${t("d_save", "Save")}
            </button>
          </div>
        </div>
      `;
      var urlInput = content.querySelector("#calendarUrlInput");
      var saveBtn = content.querySelector("#calendarSaveBtn");
      if (saveBtn && urlInput) {
        saveBtn.onclick = function () {
          var val = urlInput.value.trim();
          if (!val) return;
          var settings = loadSettings();
          if (!settings.calendar) settings.calendar = {};
          settings.calendar.url = val;
          localStorage.setItem("handiSettings", JSON.stringify(settings));
          calendarUrl = val;
          initCalendar(container);
        };
      }
      return;
    }

    content.innerHTML =
      '<div class="calendar-loading"><i class="fa-solid fa-spinner fa-spin"></i> ' +
      t("d_loadingCalendar", "Loading calendar...") +
      "</div>";

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

      // Store events on content for periodic re-check (every 30s)
      content._allEvents = allEvents;

      renderCalendar(todayEvents, tomorrowEvents, allEvents.length);
    } catch (err) {
      console.error("Calendar fetch error:", err);
      content.innerHTML = `
                <div class="calendar-error">
                    <i class="fa-solid fa-exclamation-triangle"></i>
                    <p>${t("d_calendarFailed", "Failed to load calendar.")}</p>
                    <small>${escapeHtml(err.message)}</small>
                    <button id="calendarRetryBtn" class="calendar-retry-btn">${t("d_retry", "Retry")}</button>
                </div>
            `;
      const retryBtn = content.querySelector("#calendarRetryBtn");
      if (retryBtn) retryBtn.addEventListener("click", () => fetchCalendar());
    }
  }

  function renderCalendar(events, tomorrowEvents, totalEvents) {
    content._allEvents = null;

    var html = "";
    html += '<div class="calendar-today-header">';
    html +=
      '<span><i class="fa-regular fa-sun"></i> ' +
      t("d_todaysEvents", "Today's Events") +
      "</span>";
    html += '</div><div style="display:flex;align-items:center;gap:8px;justify-content:center;">';
    html +=
      '<button id="calendarAlertToggle" class="calendar-refresh-btn" style="font-size:0.85rem;' +
      (alertsEnabled ? 'color:#fff;' : '') +
      '">' +
      (alertsEnabled ? '🔔 ' + t("d_on", "Alerts On") : '🔕 ' + t("d_off", "Alerts Off")) +
      '</button>';
    html += '</div>';

    if (events.length === 0) {
      html += '<div class="calendar-empty">';
      html += '<i class="fa-regular fa-calendar-check"></i>';
      html +=
        '<p style="margin-top:12px;">' +
        t("d_noEventsToday", "No events scheduled for today.") +
        "</p>";

      if (tomorrowEvents.length > 0) {
        html +=
          "<p>📅 " +
          t("d_youHave", "You have") +
          " " +
          tomorrowEvents.length +
          " " +
          t("d_eventsTomorrow", "event(s) tomorrow.") +
          "</p>";
      }

      html += "</div>";
    } else {
      html += '<div class="calendar-events-list">';
      for (var i = 0; i < events.length; i++) {
        var event = events[i];
        var startDate = event.start ? new Date(event.start) : null;
        var endDate = event.end ? new Date(event.end) : null;
        var timeOpts = { hour: "2-digit", minute: "2-digit" };
        var timeStr = "";
        if (startDate) {
          timeStr = startDate.toLocaleTimeString([], timeOpts);
          if (endDate && endDate > startDate) {
            timeStr += " - " + endDate.toLocaleTimeString([], timeOpts);
          }
        }
        html += '<div class="calendar-event-card">';
        html += '<div class="calendar-event-time">';
        html += '<i class="fa-regular fa-clock"></i> ' + escapeHtml(timeStr || "Time TBD");
        html += "</div>";
        html += '<div class="calendar-event-details">';
        html +=
          '<p class="calendar-event-title">' +
          escapeHtml(decodeEntities(event.summary || t("d_untitledEvent", "Untitled Event"))) +
          "</p>";
        if (event.location)
          html +=
            '<p class="calendar-event-location"><i class="fa-solid fa-location-dot"></i> ' +
            escapeHtml(decodeEntities(event.location)) +
            "</p>";
        if (event.description)
          html +=
            '<p class="calendar-event-desc">' +
            escapeHtml(decodeEntities(event.description.substring(0, 100))) +
            (event.description.length > 100 ? "…" : "") +
            "</p>";
        html += "</div>";
        html += "</div>";
      }
      html += "</div>";
    }

    html += '<div class="calendar-sync-info">';
    html += "<span>";
    html +=
      '<i class="fa-regular fa-clock"></i> ' +
      t("d_lastSynced", "Last synced:") +
      " " +
      formatSyncTime();
    if (totalEvents > 0)
      html +=
        " | " + totalEvents + " " + t("d_totalEvents", "total events in feed");
    html += "</span>";
    html += '<div style="display:flex;gap:8px;justify-content:center;">';
    html +=
      '<button id="calendarChangeUrlBtn" class="calendar-refresh-btn" style="font-size:0.8rem;">🔗 ' +
      t("d_changeUrl", "Change URL") +
      "</button>";
    html +=
      '<button id="calendarRefreshBtn" class="calendar-refresh-btn">⟳ ' +
      t("d_refresh", "Refresh") +
      "</button>";
    html += "</div>";
    html += "</div>";

    content.innerHTML = html;

    const refreshBtn = document.getElementById("calendarRefreshBtn");
    if (refreshBtn) refreshBtn.addEventListener("click", () => fetchCalendar());

    const changeUrlBtn = document.getElementById("calendarChangeUrlBtn");
    if (changeUrlBtn)
      changeUrlBtn.addEventListener("click", function () {
        var settings = loadSettings();
        if (settings.calendar) settings.calendar.url = "";
        localStorage.setItem("handiSettings", JSON.stringify(settings));
        calendarUrl = "";
        initCalendar(container);
      });

    if (window.refreshDashboardLayout) window.refreshDashboardLayout();

    // Alert toggle handler
    var alertToggle = document.getElementById("calendarAlertToggle");
    if (alertToggle) {
      alertToggle.addEventListener("click", function () {
        alertsEnabled = !alertsEnabled;
        saveAlertsState();
        renderCalendar(events, tomorrowEvents, totalEvents);
        if (alertsEnabled && content._allEvents) {
          checkForUpcomingEvents(content._allEvents);
          startAlertInterval();
        } else {
          stopAlertInterval();
          clearAlert();
        }
      });
    }
  }

  function startAlertInterval() {
    if (alertCheckInterval) clearInterval(alertCheckInterval);
    alertCheckInterval = setInterval(() => {
      const allEvents = content._allEvents;
      if (allEvents) checkForUpcomingEvents(allEvents);
    }, 30 * 1000);
  }

  function stopAlertInterval() {
    if (alertCheckInterval) {
      clearInterval(alertCheckInterval);
      alertCheckInterval = null;
    }
  }

  function startRefresh() {
    if (refreshIntervalId) clearInterval(refreshIntervalId);
    fetchCalendar();
    refreshIntervalId = setInterval(fetchCalendar, 15 * 60 * 1000);
    if (alertsEnabled) startAlertInterval();
  }

  function escapeHtml(str) {
    if (!str) return "";
    return str.replace(
      /[&<>]/g,
      (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[m],
    );
  }

  // Resolve HTML entities (e.g. &#225; -> á) in event text so accented
  // characters render properly after the escapeHtml() step. Idempotent.
  function decodeEntities(str) {
    if (!str) return "";
    var d = document.createElement("div");
    d.innerHTML = str;
    return d.textContent || d.innerText || "";
  }

  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission();
  }

  startRefresh();

  return () => {
    if (refreshIntervalId) clearInterval(refreshIntervalId);
    stopAlertInterval();
    clearAlert();
  };
}
