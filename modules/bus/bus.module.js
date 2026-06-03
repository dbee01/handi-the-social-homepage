/*
 * Copyright (c) 2026 Handi Homepage
 * This file is part of HandiHomepage and released under the GNU General Public License v3.0.
 */
// modules/bus/bus.module.js
import { loadSettings } from '../../js/core/settings.js';

export default async function initBus(container) {
    const pinBtn = container.querySelector('.pin-btn');
    container.innerHTML = '';
    if (pinBtn) container.prepend(pinBtn);

    const title = document.createElement('div');
    title.className = 'panel-title';
    title.innerHTML = '<i class="fa-solid fa-bus"></i> BUS TRACKER';
    container.appendChild(title);

    const content = document.createElement('div');
    content.className = 'bus-content';
    container.appendChild(content);

    let refreshInterval = null;
    let isServerDown = false;
    let currentStopIndex = 0;
    let stopsDataCache = null;

    const settings = loadSettings();
    const savedRouteIds = settings.bus?.routeIds || '223';
    const savedStopIds = settings.bus?.stopIds || '8380B246051,8370B2420501';
    const routeId = savedRouteIds.split(',')[0].trim();
    const stopIds = savedStopIds.split(',').map(id => id.trim()).join(',');

    function buildStaticStructure() {
        content.innerHTML = `
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
            <button class="bus-refresh-btn">Refresh Times</button>
        `;
        
        const refreshBtn = content.querySelector('.bus-refresh-btn');
        if (refreshBtn) refreshBtn.addEventListener('click', () => fetchBusData());
        
        const switchBtn = document.getElementById('busSwitchBtn');
        if (switchBtn) {
            switchBtn.addEventListener('click', () => {
                if (stopsDataCache && stopsDataCache.stops && stopsDataCache.stops.length >= 2) {
                    currentStopIndex = currentStopIndex === 0 ? 1 : 0;
                    renderCurrentStop();
                }
            });
        }
    }

    function renderCurrentStop() {
        if (!stopsDataCache || !stopsDataCache.stops || stopsDataCache.stops.length === 0) {
            return;
        }
        
        if (currentStopIndex >= stopsDataCache.stops.length) {
            currentStopIndex = 0;
        }
        
        const stop = stopsDataCache.stops[currentStopIndex];
        if (!stop) return;
        
        const containerDiv = content.querySelector('.bus-current-stop');
        if (!containerDiv) return;
        
        // Update the footnote based on THIS stop's realtime_data flag
        const footnoteSpan = content.querySelector('.bus-footnote');
        if (footnoteSpan) {
            footnoteSpan.textContent = stop.realtime_data ? '🔴 Real‑time data' : '📅 Scheduled times';
        }
        
        const buses = stop.buses && stop.buses.length > 0 ? stop.buses.slice(0, 3) : [];
        
        containerDiv.innerHTML = `
            <div class="bus-stop-card">
                <h3 class="bus-stop-title">📍 ${escapeHtml(stop.stop_name)}</h3>
                <div class="bus-direction">→ ${escapeHtml(stop.direction)}</div>
                <div class="bus-buses-list">
                    ${buses.length === 0 ? 
                        '<div class="bus-no-buses">⚠️ No upcoming buses</div>' :
                        buses.map(bus => `
                            <div class="bus-item">
                                <span class="bus-route">Route ${bus.route}</span>
                                <span class="bus-arrival ${bus.realtime ? 'realtime-arrival' : 'scheduled-arrival'}">${bus.arrival_text}</span>
                            </div>
                        `).join('')
                    }
                </div>
            </div>
        `;
    }

    function renderBusData(data) {
        if (!data.stops || data.stops.length === 0) {
            content.innerHTML = '<div class="bus-no-data">No bus data available</div>';
            if (window.refreshDashboardLayout) window.refreshDashboardLayout();
            return;
        }

        stopsDataCache = data;
        
        if (currentStopIndex >= data.stops.length) {
            currentStopIndex = 0;
        }

        // Update timestamp (don't set global footnote here)
        const timeSpan = content.querySelector('.bus-time');
        if (timeSpan) timeSpan.textContent = new Date(data.last_updated).toLocaleTimeString();
        
        // Render the current stop (this will set the correct footnote per stop)
        renderCurrentStop();
        
        if (window.refreshDashboardLayout) window.refreshDashboardLayout();
    }

    async function fetchBusData() {
        if (isServerDown) return;
        const timeSpan = content.querySelector('.bus-time');
        if (timeSpan) timeSpan.textContent = 'Loading...';
        try {
            const url = `/api/bus-realtime?route=${encodeURIComponent(routeId)}&stops=${encodeURIComponent(stopIds)}&refresh=true`;
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            if (!data.stops) throw new Error('Invalid response');
            isServerDown = false;
            renderBusData(data);
            if (!refreshInterval) startAutoRefresh();
        } catch (err) {
            console.error('Bus fetch error:', err);
            showErrorMessage(err.message);
            isServerDown = true;
            if (refreshInterval) {
                clearInterval(refreshInterval);
                refreshInterval = null;
            }
        }
    }

    function showErrorMessage(errorMsg) {
        content.innerHTML = `
            <div class="bus-offline">
                <i class="fa-solid fa-exclamation-triangle"></i> Bus data error
                <div class="bus-offline-desc">${escapeHtml(errorMsg)}</div>
                <button class="bus-retry-btn">Retry</button>
            </div>
        `;
        const retryBtn = content.querySelector('.bus-retry-btn');
        if (retryBtn) retryBtn.addEventListener('click', () => {
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
        if (!str) return '';
        return str.replace(/[&<>]/g, m => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;' }[m]));
    }

    buildStaticStructure();
    fetchBusData();
    startAutoRefresh();
}