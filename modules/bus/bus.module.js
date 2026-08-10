/*
 * Copyright (c) 2026 Handi Homepage
 * This file is part of HandiHomepage and is released under the GNU General Public License v3.0.
 * See the LICENSE file in the repository root for full details.
 */

// modules/bus/bus.module.js
// Bus Tracker v2 — realtime arrivals from GTFS-RT TripUpdates + Vehicles.
// Supports up to 3 routes, each with departure/destination stops, tabbed UI.
import { loadSettings } from "../../js/core/settings.js";

export default async function initBus(container) {
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
    window.LANG && window.LANG.modules && window.LANG.modules.live_bus
      ? window.LANG.modules.live_bus.name
      : "BUS";
  title.innerHTML = '<i class="fa-solid fa-bus"></i> ' + name;
  container.appendChild(title);

  const content = document.createElement("div");
  content.className = "bus-content";
  container.appendChild(content);

  let refreshInterval = null;
  let currentTabIndex = 0;
  let routesData = [];
  let showingDeparture = true; // true = departure visible, false = return visible

  const settings = loadSettings();

  for (let i = 1; i <= 3; i++) {
    const routeId = settings.live_bus?.[`route${i}_id`];
    const depStop = settings.live_bus?.[`route${i}_departure_stop`];
    const retStop = settings.live_bus?.[`route${i}_return_stop`];
    if (routeId && depStop) {
      routesData.push({
        route_id: routeId,
        route_short: settings.live_bus?.[`route${i}_short`] || routeId,
        departure_stop_id: depStop,
        departure_stop_name:
          settings.live_bus?.[`route${i}_departure_name`] || depStop,
        return_stop_id: retStop || depStop,
        return_stop_name:
          settings.live_bus?.[`route${i}_return_name`] || retStop || depStop,
      });
    }
  }

  if (routesData.length === 0 && settings.live_bus?.routeIds) {
    const oldRoutes = (settings.live_bus.routeIds || "")
      .split(",")
      .map((r) => r.trim())
      .filter(Boolean);
    const oldStops = (settings.live_bus.stopIds || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (oldRoutes.length > 0 && oldStops.length >= 2) {
      routesData.push({
        route_id: oldRoutes[0],
        route_short: oldRoutes[0],
        departure_stop_id: oldStops[0],
        departure_stop_name: oldStops[0],
        return_stop_id: oldStops[1] || oldStops[0],
        return_stop_name: oldStops[1] || oldStops[0],
      });
    }
  }

  if (routesData.length === 0) {
    content.innerHTML = `
      <div class="module-empty">
        <i class="fa-solid fa-bus"></i>
        <p>${t("d_noBusRoutes", "No bus routes configured.")}</p>
        <button class="bus-settings-btn settings-link-btn">
          <i class="fa-solid fa-gear"></i> ${t("d_configureSettings", "Configure in Settings")}
        </button>
      </div>`;
    content
      .querySelector(".bus-settings-btn")
      ?.addEventListener("click", () => {
        location.href = "settings.html?args=bus";
      });
    return;
  }

  function getRoute() {
    return routesData[currentTabIndex];
  }

  // Inject styles once
  if (!document.getElementById("bus-live-style")) {
    const style = document.createElement("style");
    style.id = "bus-live-style";
    style.textContent = `
      .bus-item { padding:4px 0; font-size:0.9rem; }
      .bus-no-buses { color:#64748b; font-size:0.85rem; }
      .bus-icon-live {
        display: inline-block;
        animation: busShake 0.6s ease-in-out infinite;
      }
      @keyframes busShake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-2px) rotate(-2deg); }
        75% { transform: translateX(2px) rotate(2deg); }
      }
      .bus-direction-hidden { display: none; }
    `;
    document.head.appendChild(style);
  }

  function renderUI() {
    const r = getRoute();

    let tabsHtml = "";
    if (routesData.length > 1) {
      tabsHtml =
        '<div class="bus-tabs" style="display:flex;gap:6px;margin-bottom:10px;flex-wrap:wrap;">';
      routesData.forEach((route, i) => {
        const active =
          i === currentTabIndex
            ? 'style="background:#0047cc;color:white;"'
            : 'style="background:#eaf2ff;color:#0047cc;"';
        tabsHtml += `<button class="bus-tab-btn" data-tab-index="${i}" ${active}>Route ${route.route_short}</button>`;
      });
      tabsHtml += "</div>";
    }

    const depVisible = showingDeparture ? "" : "bus-direction-hidden";
    const retVisible = showingDeparture ? "bus-direction-hidden" : "";

    content.innerHTML =
      `
      ${tabsHtml}
      <div class="bus-timestamp">
        <i class="fa-solid fa-sync-alt"></i> <span class="bus-time">--:--:--</span>
        <span class="bus-footnote">Route ` +
      r.route_short +
      `</span>
      </div>
      <div class="bus-direction ` +
      depVisible +
      `" id="bus-direction-dep">
        <h4 class="bus-stop-label">📍 ` +
      t("d_departure", "Departure") +
      `</h4>
        <div class="bus-stop-name">` +
      escapeHtml(r.departure_stop_name) +
      `</div>
        <div class="bus-departures"></div>
      </div>
      <div class="bus-direction ` +
      retVisible +
      `" id="bus-direction-ret">
        <h4 class="bus-stop-label">📍 ` +
      t("d_return", "Return") +
      `</h4>
        <div class="bus-stop-name">` +
      escapeHtml(r.return_stop_name) +
      `</div>
        <div class="bus-returns"></div>
      </div>
      <div class="bus-switch-container"></div>
    `;

    // Build switch button via DOM (bypasses innerHTML event issues)
    const switchContainer = content.querySelector(".bus-switch-container");
    if (switchContainer) {
      const btn = document.createElement("button");
      btn.className = "bus-switch-btn";
      btn.innerHTML =
        '<i class="fa-solid fa-arrow-right-arrow-left"></i>' +
        t("d_changeDirection", "Change Direction");
      btn.addEventListener("click", () => {
        showingDeparture = !showingDeparture;
        const depDiv = document.getElementById("bus-direction-dep");
        const retDiv = document.getElementById("bus-direction-ret");
        if (depDiv) depDiv.classList.toggle("bus-direction-hidden");
        if (retDiv) retDiv.classList.toggle("bus-direction-hidden");
      });
      switchContainer.appendChild(btn);
    }

    content.querySelectorAll(".bus-tab-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = parseInt(btn.dataset.tabIndex);
        if (idx !== currentTabIndex) {
          currentTabIndex = idx;
          showingDeparture = true;
          renderUI();
          fetchBusData();
        }
      });
    });
  }

  // Render a bus list into a container
  function renderBusList(selector, data) {
    const list = content.querySelector(selector);
    if (!list) return;

    if (!data || data.length === 0) {
      list.innerHTML =
        '<div class="bus-no-buses">' +
        t("d_noUpcoming", "No upcoming") +
        "</div>";
      return;
    }

    list.innerHTML = data
      .map((d) => {
        const arrivalText =
          d.arrival_text ||
          (d.minutes_away <= 1
            ? t("d_due", "Due")
            : `${d.minutes_away} min${d.minutes_away !== 1 ? "s" : ""}`);

        let etaStr = "--:--:--";
        if (d.arrival_time != null && typeof d.arrival_time === "number") {
          const eta = new Date(d.arrival_time * 1000);
          etaStr = eta.toLocaleTimeString("en-IE", {
            timeZone: "Europe/Dublin",
            hour12: false,
          });
        } else if (
          typeof d.arrival_time === "string" &&
          d.arrival_time !== ""
        ) {
          etaStr = d.arrival_time;
        } else if (d.minutes_away != null) {
          const eta = new Date(Date.now() + d.minutes_away * 60000);
          etaStr = eta.toLocaleTimeString("en-IE", {
            timeZone: "Europe/Dublin",
            hour12: false,
          });
        }

        const isLive = d.realtime === true;
        const label = isLive
          ? '<span style="font-size:1.12rem;color:#16a34a;font-weight:600;">' +
            t("d_live", "Live") +
            ' <span class="bus-icon-live" style="font-size:1.12rem;">🚌</span></span>'
          : '<span style="font-size:1.12rem;color:#f59e0b;font-weight:600;">🚏 ' +
            t("d_scheduled", "Scheduled") +
            "</span>";

        return `
          <div class="bus-item">
            ${label}
            <span>${arrivalText}</span>
            <span class="bus-eta">${etaStr}</span>
          </div>`;
      })
      .join("");
  }

  async function fetchBusData() {
    const timeSpan = content.querySelector(".bus-time");
    if (timeSpan) timeSpan.textContent = "" + t("d_loading", "Loading...") + "";

    const route = getRoute();
    if (!route) return;

    try {
      // Fetch both stops in one call
      const stopIds = [route.departure_stop_id];
      if (route.return_stop_id !== route.departure_stop_id) {
        stopIds.push(route.return_stop_id);
      }
      const rtUrl = `/api/bus-realtime?route=${encodeURIComponent(route.route_short)}&stops=${encodeURIComponent(stopIds.join(","))}`;
      const rtRes = await fetch(rtUrl);
      const rtData = rtRes.ok ? await rtRes.json() : null;

      if (rtData && rtData.stops && rtData.stops.length > 0) {
        if (timeSpan) timeSpan.textContent = new Date().toLocaleTimeString();
        const depStop = rtData.stops.find(
          (s) => s.stop_id === route.departure_stop_id,
        );
        const retStop = rtData.stops.find(
          (s) => s.stop_id === route.return_stop_id,
        );
        const depBuses = depStop?.buses || [];
        const retBuses = retStop?.buses || [];
        if (depBuses.length > 0 || retBuses.length > 0) {
          renderBusList(".bus-departures", depBuses);
          renderBusList(".bus-returns", retBuses);
        } else {
          await fetchScheduledFallback(route, timeSpan);
        }
      } else {
        await fetchScheduledFallback(route, timeSpan);
      }

      if (!refreshInterval) {
        refreshInterval = setInterval(fetchBusData, 60000);
      }
      if (window.refreshDashboardLayout) window.refreshDashboardLayout();
    } catch (err) {
      console.error("Bus fetch error:", err);
      await fetchScheduledFallback(route, timeSpan);
    }
  }

  async function fetchScheduledFallback(route, timeSpan) {
    try {
      const fetchOne = async (stopId) => {
        const url = `/api/bus/v2/departures?route_id=${encodeURIComponent(route.route_id)}&stop_id=${encodeURIComponent(stopId)}&limit=3`;
        const res = await fetch(url);
        const data = res.ok ? await res.json() : { departures: [] };
        return (data.departures || []).map((d) => ({
          minutes_away: d.minutes_away,
          arrival_text:
            d.minutes_away <= 1
              ? t("d_due", "Due")
              : `${d.minutes_away} min${d.minutes_away !== 1 ? "s" : ""}`,
          arrival_time: d.arrival_time,
          delay: d.delay_seconds || null,
          source: "schedule",
          realtime: false,
          headsign: d.headsign || null,
          vehicle_id: null,
        }));
      };

      const [depBuses, retBuses] = await Promise.all([
        fetchOne(route.departure_stop_id),
        route.return_stop_id !== route.departure_stop_id
          ? fetchOne(route.return_stop_id)
          : Promise.resolve([]),
      ]);

      if (timeSpan) timeSpan.textContent = new Date().toLocaleTimeString();
      renderBusList(".bus-departures", depBuses);
      renderBusList(".bus-returns", retBuses);
    } catch (e) {
      console.error("Scheduled fallback error:", e);
      if (timeSpan) timeSpan.textContent = t("d_error", "Error");
    }
  }

  function escapeHtml(str) {
    if (!str) return "";
    return str.replace(
      /[&<>]/g,
      (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[m],
    );
  }

  renderUI();
  fetchBusData();
}
