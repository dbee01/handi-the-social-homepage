/*
 * Copyright (c) 2026 Handi Homepage
 * This file is part of HandiHomepage and is released under the GNU General Public License v3.0.
 * See the LICENSE file in the repository root for full details.
 */

// modules/events/events.module.js
// EVENTS — "What's on" near an approximate location. The dashboard tile shows
// one event at a time (image, date/venue/price, linked title, description)
// with left/right arrows, exactly like the News carousel so it stays familiar
// for elderly users. Settings holds the free-text location + event type.
import { loadSettings } from "../../js/core/settings.js";

const REFRESH_MINUTES = 30;

// Event type keys shown by the Settings dropdown -> human label used in the
// dashboard source bar. Keep in sync with the option values in settings.html
// and the slug map in server.js.
const TYPE_LABELS = {
  "": "All types",
  music: "Festivals & live music",
  arts: "Arts & theatre",
  film: "Film & media",
  food: "Food & drink",
  community: "Community & culture",
  family: "Family & education",
  sports: "Sports & fitness",
  seasonal: "Seasonal & holiday",
  charity: "Charity & causes",
  travel: "Travel & outdoor",
};

// "music,food" -> "Festivals & live music + Food & drink" (source bar).
function typeLabel(type) {
  return String(type || "")
    .split(",")
    .map(function (k) {
      k = (k || "").trim();
      return TYPE_LABELS[k] || k;
    })
    .filter(Boolean)
    .join(" + ");
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str).replace(/[&<>"']/g, function (m) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m];
  });
}

// "2026-09-07" -> "7 Sep 2026"
function prettyDateOnly(iso) {
  if (!iso) return "";
  var d = new Date(iso.length <= 10 ? iso + "T00:00:00" : iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-IE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// Date key (YYYY-MM-DD) of an instant expressed in a given timezone.
function dateKey(utcIso, tz) {
  var d = new Date(utcIso);
  if (isNaN(d.getTime())) return "";
  try {
    return d.toLocaleDateString("en-CA", { timeZone: tz || "Europe/Dublin" });
  } catch (e) {
    return d.toISOString().slice(0, 10);
  }
}

// Human "when" string for an event. Prefers the enriched UTC start (exact time
// in the venue timezone); falls back to the browse-list date when there was no
// API enrichment.
function prettyWhen(ev) {
  var utc = ev.start && ev.start.utc;
  var tz = (ev.start && ev.start.timezone) || "Europe/Dublin";
  var endUtc = ev.end && ev.end.utc;
  if (utc) {
    var d = new Date(utc);
    if (!isNaN(d.getTime())) {
      var startKey = dateKey(utc, tz);
      var endKey = endUtc ? dateKey(endUtc, tz) : startKey;
      if (endKey && endKey !== startKey) {
        return (
          prettyDateOnly(startKey) + " – " + prettyDateOnly(endKey)
        );
      }
      try {
        return d.toLocaleString("en-IE", {
          timeZone: tz,
          weekday: "short",
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        });
      } catch (e) {
        return prettyDateOnly(startKey);
      }
    }
  }
  var local = ev.start && ev.start.local;
  if (local) {
    if (endUtc && endUtc !== local) {
      return prettyDateOnly(local) + " – " + prettyDateOnly(endUtc);
    }
    return prettyDateOnly(local);
  }
  return "";
}

function venueLabel(ev) {
  var parts = [];
  if (ev.venueName) parts.push(ev.venueName);
  if (ev.venueCity && ev.venueCity !== ev.venueName) parts.push(ev.venueCity);
  return parts.join(", ");
}

export default async function initEvents(container) {
  const t =
    window.t ||
    function (k, e) {
      return e || k;
    };

  const pinBtn = container.querySelector(".pin-btn");
  container.innerHTML = "";
  if (pinBtn) container.prepend(pinBtn);

  const title = document.createElement("div");
  title.className = "panel-title";
  var modName =
    window.LANG && window.LANG.modules && window.LANG.modules.events
      ? window.LANG.modules.events.name
      : "Events";
  title.innerHTML = '<i class="fa-solid fa-calendar-days"></i> ' + modName;
  container.appendChild(title);

  const content = document.createElement("div");
  content.className = "events-content";
  container.appendChild(content);

  const parentItem = container.closest(".dashboard-item");
  if (parentItem) parentItem.dataset.module = "events";

  let location = "";
  let type = "";
  let distance = "";
  try {
    const s = loadSettings();
    location = String((s.events && s.events.location) || "").trim();
    type = String((s.events && s.events.type) || "").trim();
    distance = String((s.events && s.events.distance) || "").trim();
  } catch (e) {}

  let refreshIntervalId = null;

  function showEmpty(icon, message) {
    content.innerHTML =
      '<div class="module-empty"><i class="' +
      icon +
      '"></i><p>' +
      escapeHtml(message) +
      "</p></div>";
  }

  if (!location) {
    content.innerHTML =
      '<div class="module-empty">' +
      '<i class="fa-solid fa-calendar-days"></i><p>' +
      escapeHtml(
        t(
          "d_eventsConfigure",
          "Set your approximate location in Settings to see events near you.",
        ),
      ) +
      "</p>" +
      '<button id="eventsSettingsBtn" class="settings-link-btn">' +
      '<i class="fa-solid fa-gear"></i> ' +
      escapeHtml(t("d_eventsOpenSettings", "Open Settings")) +
      "</button></div>";
    const settingsBtn = content.querySelector("#eventsSettingsBtn");
    if (settingsBtn)
      settingsBtn.onclick = function () {
        window.location.href = "settings.html?args=events";
      };
    return function () {};
  }

  async function fetchEvents() {
    try {
      content.innerHTML =
        '<div class="news-loading"><i class="fa-solid fa-spinner fa-spin"></i> ' +
        escapeHtml(t("d_loading", "Loading...")) +
        "</div>";
      const resp = await fetch(
        "/api/events?location=" +
          encodeURIComponent(location) +
          "&type=" +
          encodeURIComponent(type) +
          "&distance=" +
          encodeURIComponent(distance) +
          "&limit=30",
      );
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        if (data && data.error === "not_configured") {
          showEmpty(
            "fa-solid fa-triangle-exclamation",
            t("d_eventsNoKey", "Events are not set up on this site yet."),
          );
          return;
        }
        throw new Error("HTTP " + resp.status);
      }
      const events = Array.isArray(data.events) ? data.events : [];
      renderEvents(events);
      window.logEvent(2, "events_load", {
        location: location,
        type: type,
        count: events.length,
      });
    } catch (err) {
      console.error("Events fetch error:", err);
      window.logEvent(1, "events_error", {
        location: location,
        type: type,
        error: err.message,
      });
      showEmpty(
        "fa-solid fa-triangle-exclamation",
        t("d_error", "Could not load events. Try again in a moment."),
      );
    }
  }

  function renderEvents(events) {
    if (!events.length) {
      showEmpty(
        "fa-solid fa-calendar-xmark",
        t("d_eventsEmpty", "No events found near you just yet."),
      );
      return;
    }
    content.innerHTML = "";

    // Source bar: location · type + change button (Mastodon/News style).
    const sourceBar = document.createElement("div");
    sourceBar.style.cssText =
      "display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;";
    sourceBar.innerHTML =
      "<small style=\"opacity:0.7;\">" +
      escapeHtml(location) +
      (type ? " · " + escapeHtml(typeLabel(type)) : "") +
      (distance ? " · within " + escapeHtml(distance) + " km" : "") +
      "</small>" +
      '<button id="eventsChange" style="background:none;border:none;cursor:pointer;font-size:0.85rem;opacity:0.6;color:inherit;" title="' +
      escapeHtml(t("d_changeSource", "Change location or type")) +
      '"><i class="fa-solid fa-gear"></i> ' +
      escapeHtml(t("d_changeSource", "Settings")) +
      "</button>";
    const changeBtn = sourceBar.querySelector("#eventsChange");
    if (changeBtn)
      changeBtn.onclick = function () {
        window.location.href = "settings.html?args=events";
      };
    content.appendChild(sourceBar);

    // Carousel: single event at a time with ‹ › arrows + position counter.
    let currentIndex = 0;

    const carousel = document.createElement("div");
    carousel.style.cssText = "display:flex;align-items:center;gap:8px;width:100%;";

    const leftBtn = document.createElement("button");
    leftBtn.className = "news-carousel-btn";
    leftBtn.textContent = "‹";
    leftBtn.style.cssText =
      "flex-shrink:0;width:40px;height:40px;border-radius:50%;border:1px solid #cbd5e1;" +
      "background:#fff;cursor:pointer;font-size:1.4rem;line-height:1;color:#334155;";
    leftBtn.setAttribute("aria-label", t("d_scrollLeft", "Previous event"));

    const view = document.createElement("div");
    view.className = "news-post-view";
    view.style.cssText = "flex:1;min-width:0;";

    const rightBtn = document.createElement("button");
    rightBtn.className = "news-carousel-btn";
    rightBtn.textContent = "›";
    rightBtn.style.cssText = leftBtn.style.cssText;
    rightBtn.setAttribute("aria-label", t("d_scrollRight", "Next event"));

    carousel.appendChild(leftBtn);
    carousel.appendChild(view);
    carousel.appendChild(rightBtn);
    content.appendChild(carousel);

    function renderOne() {
      const ev = events[currentIndex];
      if (!ev) {
        view.innerHTML = "";
        return;
      }
      const when = prettyWhen(ev);
      const where = venueLabel(ev);
      const price = ev.price || "";
      const metaBits = [];
      if (when) metaBits.push('<span style="white-space:nowrap;">' + escapeHtml(when) + "</span>");
      if (where) metaBits.push("<span>" + escapeHtml(where) + "</span>");
      const meta =
        metaBits.length > 0
          ? '<div style="display:flex;justify-content:center;flex-wrap:wrap;gap:6px 14px;font-size:0.9rem;opacity:0.9;">' +
            metaBits.join("") +
            "</div>"
          : "";
      const priceBadge = price
        ? '<span style="display:inline-block;margin:0 auto;padding:4px 14px;border-radius:999px;font-weight:700;font-size:0.95rem;color:#fff;background:color-mix(in srgb, var(--topbar-accent, #0047cc) 85%, #000);">' +
          escapeHtml(price) +
          "</span>"
        : "";
      const desc = String(ev.description || "")
        .replace(/\s+/g, " ")
        .trim();
      const descText = desc.length > 320 ? desc.slice(0, 320).replace(/\s+\S*$/, "") + "…" : desc;
      view.innerHTML = `
        <div class="news-article" style="margin-bottom:0;padding:16px;border-radius:12px;display:flex;flex-direction:column;gap:12px;text-align:center;">
          <img class="news-image" src="${escapeHtml(ev.image || "/images/noimage.svg")}" alt="" loading="lazy" style="width:100%;height:var(--media-height);object-fit:${ev.image ? "contain" : "cover"};border-radius:8px;display:block;background:#f1f5f9;" onerror="this.onerror=null;this.src='/images/noimage.svg';this.style.objectFit='cover';">
          ${meta}
          ${priceBadge}
          <h3 style="margin:0;line-height:1.25;font-size:var(--font-size);"><a href="${escapeHtml(ev.url || "#")}" target="_blank" rel="noopener noreferrer">${escapeHtml(ev.name || "")}</a></h3>
          ${descText ? '<p style="margin:0;line-height:1.35;font-size:var(--font-size);">' + escapeHtml(descText) + "</p>" : ""}
          <div style="font-size:0.85rem;opacity:0.65;">${(currentIndex + 1)} / ${events.length}</div>
        </div>
      `;
    }

    function go(dir) {
      currentIndex =
        (currentIndex + dir + events.length) % events.length;
      renderOne();
    }

    leftBtn.addEventListener("click", function () {
      go(-1);
    });
    rightBtn.addEventListener("click", function () {
      go(1);
    });

    renderOne();
    if (window.refreshDashboardLayout) window.refreshDashboardLayout();
  }

  function startRefresh() {
    if (refreshIntervalId) clearInterval(refreshIntervalId);
    fetchEvents();
    refreshIntervalId = setInterval(fetchEvents, REFRESH_MINUTES * 60 * 1000);
  }

  startRefresh();

  return function () {
    if (refreshIntervalId) clearInterval(refreshIntervalId);
  };
}
