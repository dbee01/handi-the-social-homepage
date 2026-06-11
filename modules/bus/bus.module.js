// modules/bus/bus.module.js
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
  let isServerDown = false;
  let currentStopIndex = 0;
  let stopsDataCache = null;
  let currentTabIndex = 0;

  const settings = loadSettings();
  const savedRouteIds = settings.live_bus?.routeIds || "223";
  const savedStopIds = settings.live_bus?.stopIds || "242051,242081";

  // Parse route/stop pairs: routes and stops are comma-separated.
  // Stops for each route are separated by comma; routes map to stop groups positionally.
  // e.g. routeIds = "223,220", stopIds = "242051,242081,246671,232111"
  // means route 223 uses "242051,242081" and route 220 uses "246671,232111"
  const routeList = savedRouteIds
    .split(",")
    .map((r) => r.trim())
    .filter(Boolean);
  const stopIdList = savedStopIds
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  // Build tab configs: calculate how many stops per route
  const tabs = [];
  if (routeList.length === 1) {
    // Single route — all stop IDs belong to it
    tabs.push({ route: routeList[0], stops: stopIdList.join(",") });
  } else {
    // Multiple routes — distribute stop IDs evenly across routes
    const stopsPerRoute = Math.max(
      1,
      Math.floor(stopIdList.length / routeList.length),
    );
    for (let i = 0; i < routeList.length; i++) {
      const start = i * stopsPerRoute;
      const end =
        i === routeList.length - 1 ? stopIdList.length : start + stopsPerRoute;
      const routeStops = stopIdList.slice(start, end);
      if (routeStops.length > 0) {
        tabs.push({ route: routeList[i], stops: routeStops.join(",") });
      }
    }
  }

  const activeTab = tabs[currentTabIndex] || tabs[0];

  function buildStaticStructure() {
    // Build tab bar if multiple tabs
    let tabsHtml = "";
    if (tabs.length > 1) {
      tabsHtml =
        '<div class="bus-tabs" style="display:flex;gap:6px;margin-bottom:10px;flex-wrap:wrap;">';
      tabs.forEach((tab, i) => {
        const active =
          i === currentTabIndex
            ? 'style="background:#0047cc;color:white;"'
            : 'style="background:#eaf2ff;color:#0047cc;"';
        tabsHtml += `<button class="bus-tab-btn" data-tab-index="${i}" ${active}>Route ${tab.route}</button>`;
      });
      tabsHtml += "</div>";
    }

    content.innerHTML = `
      ${tabsHtml}
      <div class="bus-timestamp">
        <i class="fa-solid fa-sync-alt"></i> <span class="bus-time">--:--:--</span>
        <span class="bus-footnote"></span>
      </div>
      <div class="bus-current-stop"></div>
      <div class="bus-switch-container">
        <button class="bus-switch-btn" id="busSwitchBtn">
          <i class="fa-solid fa-arrow-right-arrow-left"></i> Switch Direction
        </button>
      </div>
    `;

    // Wire up tab buttons
    content.querySelectorAll(".bus-tab-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = parseInt(btn.dataset.tabIndex);
        if (idx !== currentTabIndex) {
          currentTabIndex = idx;
          stopsDataCache = null;
          buildStaticStructure();
          fetchBusData();
        }
      });
    });

    const switchBtn = document.getElementById("busSwitchBtn");
    if (switchBtn) {
      switchBtn.addEventListener("click", () => {
        if (
          stopsDataCache &&
          stopsDataCache.stops &&
          stopsDataCache.stops.length >= 2
        ) {
          currentStopIndex = currentStopIndex === 0 ? 1 : 0;
          renderCurrentStop();
        }
      });
    }
  }

  function renderCurrentStop() {
    if (
      !stopsDataCache ||
      !stopsDataCache.stops ||
      stopsDataCache.stops.length === 0
    ) {
      return;
    }

    if (currentStopIndex >= stopsDataCache.stops.length) {
      currentStopIndex = 0;
    }

    const stop = stopsDataCache.stops[currentStopIndex];
    if (!stop) return;

    const containerDiv = content.querySelector(".bus-current-stop");
    if (!containerDiv) return;

    const footnoteSpan = content.querySelector(".bus-footnote");
    if (footnoteSpan) {
      if (stop.realtime_data && stop.mixed_data) {
        footnoteSpan.textContent = "🚌 Live & 🚏 Scheduled";
      } else if (stop.realtime_data) {
        footnoteSpan.textContent = "🚌 Live times";
      } else {
        footnoteSpan.textContent = "🚏 Scheduled times";
      }
    }

    const buses =
      stop.buses && stop.buses.length > 0 ? stop.buses.slice(0, 3) : [];

    containerDiv.innerHTML = `
      <div class="bus-stop-card">
        <h3 class="bus-stop-title">📍 ${escapeHtml(stop.stop_name)}</h3>
        <div class="bus-direction">→ ${escapeHtml(stop.direction)}</div>
        <div class="bus-buses-list">
          ${
            buses.length === 0
              ? '<div class="bus-no-buses">⚠️ No upcoming buses</div>'
              : buses
                  .map(
                    (bus) => `
                  <div class="bus-item">
                    <span class="bus-route">Route ${bus.route}</span>
                    <span class="bus-icon ${bus.realtime ? "bus-icon-live" : "bus-icon-scheduled"}">${bus.realtime ? "🚌" : "🚏"}</span>
                    <span class="bus-arrival ${bus.realtime ? "realtime-arrival" : "scheduled-arrival"}">${bus.arrival_text}</span>
                    <div class="bus-trip-id" style="font-size:0.65rem;color:#64748b;margin-top:2px;">trip=${escapeHtml(bus.trip_id || "")} start=${escapeHtml(bus.start_time || "")} date=${escapeHtml(bus.start_date || "")} delay=${escapeHtml(String(bus.delay ?? ""))} arr=${escapeHtml(String(bus.arrival_time || ""))} src=${escapeHtml(bus.source || "")}</div>
                  </div>
                `,
                  )
                  .join("")
          }
        </div>
      </div>
    `;
  }

  function renderBusData(data) {
    if (!data.stops || data.stops.length === 0) {
      content.innerHTML =
        '<div class="bus-no-data">No bus data available</div>';
      if (window.refreshDashboardLayout) window.refreshDashboardLayout();
      return;
    }

    stopsDataCache = data;

    if (currentStopIndex >= data.stops.length) {
      currentStopIndex = 0;
    }

    const timeSpan = content.querySelector(".bus-time");
    if (timeSpan)
      timeSpan.textContent = new Date(data.last_updated).toLocaleTimeString();

    renderCurrentStop();

    if (window.refreshDashboardLayout) window.refreshDashboardLayout();
  }

  async function fetchBusData() {
    if (isServerDown) return;
    const timeSpan = content.querySelector(".bus-time");
    if (timeSpan) timeSpan.textContent = "Loading...";
    const tab = tabs[currentTabIndex] || tabs[0];
    if (!tab) return;
    try {
      const url = `/api/bus-realtime?route=${encodeURIComponent(tab.route)}&stops=${encodeURIComponent(tab.stops)}&refresh=true`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (!data.stops) throw new Error("Invalid response");
      isServerDown = false;
      renderBusData(data);
      if (!refreshInterval) startAutoRefresh();
    } catch (err) {
      console.error("Bus fetch error:", err);
      showErrorMessage(err.message);
      isServerDown = true;
      if (refreshInterval) {
        clearInterval(refreshInterval);
        refreshInterval = null;
      }
    }
  }

  function showErrorMessage(errorMsg) {
    let tabsHtml = "";
    if (tabs.length > 1 && content.querySelector(".bus-tabs")) {
      tabsHtml = content.querySelector(".bus-tabs").outerHTML;
    } else if (tabs.length > 1) {
      tabsHtml =
        '<div class="bus-tabs" style="display:flex;gap:6px;margin-bottom:10px;flex-wrap:wrap;">';
      tabs.forEach((tab, i) => {
        const active =
          i === currentTabIndex
            ? 'style="background:#0047cc;color:white;"'
            : 'style="background:#eaf2ff;color:#0047cc;"';
        tabsHtml += `<button class="bus-tab-btn" data-tab-index="${i}" ${active}>Route ${tab.route}</button>`;
      });
      tabsHtml += "</div>";
    }
    content.innerHTML = `
      ${tabsHtml}
      <div class="bus-offline">
        <i class="fa-solid fa-exclamation-triangle"></i> Bus data error
        <div class="bus-offline-desc">${escapeHtml(errorMsg)}</div>
        <button class="bus-retry-btn">Retry</button>
      </div>
    `;

    content.querySelectorAll(".bus-tab-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = parseInt(btn.dataset.tabIndex);
        if (idx !== currentTabIndex) {
          currentTabIndex = idx;
          stopsDataCache = null;
          isServerDown = false;
          buildStaticStructure();
          fetchBusData();
        }
      });
    });

    const retryBtn = content.querySelector(".bus-retry-btn");
    if (retryBtn)
      retryBtn.addEventListener("click", () => {
        isServerDown = false;
        fetchBusData();
      });
    if (window.refreshDashboardLayout) window.refreshDashboardLayout();
  }

  function startAutoRefresh() {
    if (refreshInterval) clearInterval(refreshInterval);
    refreshInterval = setInterval(fetchBusData, 60000);
  }

  function escapeHtml(str) {
    if (!str) return "";
    return str.replace(
      /[&<>]/g,
      (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[m],
    );
  }

  buildStaticStructure();
  fetchBusData();
}
