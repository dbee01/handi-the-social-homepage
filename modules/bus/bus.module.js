// modules/bus/bus.module.js
// Bus Tracker v2 — realtime arrivals from GTFS scheduled data.
// Supports up to 3 routes, each with departure/destination stops, tabbed UI.
import { loadSettings } from "../../js/core/settings.js";

export default async function initBus(container) {
  const pinBtn = container.querySelector(".pin-btn");
  container.innerHTML = "";
  if (pinBtn) container.prepend(pinBtn);

  const title = document.createElement("div");
  title.className = "panel-title";
  title.innerHTML = '<i class="fa-solid fa-bus"></i> BUS TRACKER';
  container.appendChild(title);

  const content = document.createElement("div");
  content.className = "bus-content";
  container.appendChild(content);

  let refreshInterval = null;
  let currentTabIndex = 0;
  let routesData = [];

  const settings = loadSettings();

  // Parse saved route configs
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

  // Fallback to old format
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
        <p>No bus routes configured.</p>
        <button class="bus-settings-btn settings-link-btn">
          <i class="fa-solid fa-gear"></i> Configure in Settings
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

    content.innerHTML = `
      ${tabsHtml}
      <div class="bus-timestamp">
        <i class="fa-solid fa-sync-alt"></i> <span class="bus-time">--:--:--</span>
        <span class="bus-footnote">Route ${r.route_short}</span>
      </div>
      <div class="bus-stops-grid" style="display:flex;flex-direction:column;gap:12px;">
        <div class="bus-stop-col" style="flex:1;">
          <h4 class="bus-stop-label">📍 Departure</h4>
          <div class="bus-stop-name">${escapeHtml(r.departure_stop_name)}</div>
          <div class="bus-departures"></div>
        </div>
        <!--
        <div class="bus-stop-col" style="flex:1;">
          <h4 class="bus-stop-label">📍 Destination</h4>
          <div class="bus-stop-name">${escapeHtml(r.return_stop_name)}</div>
          <div class="bus-destinations"></div>
        </div>
        -->
      </div>
      <div class="bus-switch-container">
        <button class="bus-switch-btn" id="busSwitchBtn">
          <i class="fa-solid fa-arrow-right-arrow-left"></i> Change Direction
        </button>
      </div>
    `;

    content.querySelectorAll(".bus-tab-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = parseInt(btn.dataset.tabIndex);
        if (idx !== currentTabIndex) {
          currentTabIndex = idx;
          renderUI();
          fetchBusData();
        }
      });
    });

    const switchBtn = document.getElementById("busSwitchBtn");
    if (switchBtn) {
      switchBtn.addEventListener("click", () => {
        // Swap departure and destination stops
        const r = getRoute();
        const tmpId = r.departure_stop_id;
        const tmpName = r.departure_stop_name;
        r.departure_stop_id = r.return_stop_id;
        r.departure_stop_name = r.return_stop_name;
        r.return_stop_id = tmpId;
        r.return_stop_name = tmpName;
        renderUI();
        fetchBusData();
      });
    }
  }

  function renderDepartures(depData) {
    const depList = content.querySelector(".bus-departures");

    const footnoteSpan = content.querySelector(".bus-footnote");
    if (footnoteSpan) {
      footnoteSpan.textContent = `Route ${getRoute().route_short}`;
    }

    if (!depList) return;
    // Inject live-icon pulse animation if not already present
    if (!document.getElementById("bus-live-style")) {
      const style = document.createElement("style");
      style.id = "bus-live-style";
      style.textContent = `
        .bus-icon-live {
          display:inline-block;
          animation: busPulse 1.5s ease-in-out infinite;
        }
        @keyframes busPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.15); }
        }
      `;
      document.head.appendChild(style);
    }

    depList.innerHTML =
      depData.length === 0
        ? '<div class="bus-no-buses" style="color:#64748b;font-size:0.85rem;">No upcoming</div>'
        : depData
            .map(
              (d) => `
            <div class="bus-item" style="padding:4px 0;font-size:0.9rem;">
              <span class="bus-icon bus-icon-scheduled" style="font-size:1.12rem;color:#f59e0b;font-weight:600;">🚏 Scheduled</span>
              <span class="bus-arrival scheduled-arrival">
              ${d.minutes_away} min <small style="color:#64748b;">(${d.arrival_time})</small>
            </span>
          </div>
        `,
            )
            .join("");
  }

  async function fetchBusData() {
    const timeSpan = content.querySelector(".bus-time");
    if (timeSpan) timeSpan.textContent = "Loading...";

    const route = getRoute();
    if (!route) return;

    try {
      // Fetch departure stop times
      const depUrl = `/api/bus/v2/departures?route_id=${encodeURIComponent(route.route_id)}&stop_id=${encodeURIComponent(route.departure_stop_id)}&limit=3`;
      const depRes = await fetch(depUrl);
      const depData = depRes.ok ? await depRes.json() : { departures: [] };

      if (timeSpan) timeSpan.textContent = new Date().toLocaleTimeString();
      renderDepartures(depData.departures || []);

      if (!refreshInterval) {
        refreshInterval = setInterval(fetchBusData, 60000);
      }
      if (window.refreshDashboardLayout) window.refreshDashboardLayout();
    } catch (err) {
      console.error("Bus fetch error:", err);
      if (timeSpan) timeSpan.textContent = "Error";
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
