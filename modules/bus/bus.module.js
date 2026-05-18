/*
 * Copyright (c) 2026 Handi Homepage
 * This file is part of HandiHomepage and is released under the GNU General Public License v3.0.
 * See the LICENSE file in the repository root for full details.
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

    const settings = loadSettings();
    const savedRouteIds = settings.bus?.routeIds || '30';
    const savedStopIds = settings.bus?.stopIds || '330061,240161';
    const routeId = savedRouteIds.split(',')[0].trim();
    const stopIds = savedStopIds.split(',').map(id => id.trim()).join(',');

    // Build static structure once
    function buildStaticStructure() {
        content.innerHTML = `
            <div class="bus-timestamp">
                <i class="fa-solid fa-sync-alt"></i> <span class="bus-time">--:--:--</span>
                <span class="bus-footnote"></span>
            </div>
            <div class="bus-stops-container"></div>
            <button class="bus-refresh-btn">Refresh Times</button>
        `;
        const refreshBtn = content.querySelector('.bus-refresh-btn');
        refreshBtn.addEventListener('click', () => fetchBusData());
    }

    // Create stop cards (only once)
    function createStopCards(stopsData) {
        const containerDiv = content.querySelector('.bus-stops-container');
        containerDiv.innerHTML = '';
        for (const stop of stopsData) {
            const card = document.createElement('div');
            card.className = 'bus-stop-card';
            card.dataset.stopName = stop.stop_name;
            card.innerHTML = `
                <h3 class="bus-stop-title">📍 ${escapeHtml(stop.stop_name)}</h3>
                <div class="bus-direction">→ ${escapeHtml(stop.direction)}</div>
                <div class="bus-buses-list"></div>
            `;
            containerDiv.appendChild(card);
        }
    }

    // Update existing cards with new bus times
    function updateStopCards(stopsData) {
        const cards = content.querySelectorAll('.bus-stop-card');
        for (let i = 0; i < cards.length; i++) {
            const stop = stopsData[i];
            if (!stop) continue;
            const busesList = cards[i].querySelector('.bus-buses-list');
            const buses = stop.buses.slice(0, 2);
            if (!buses || buses.length === 0) {
                busesList.innerHTML = '<div class="bus-no-buses">No upcoming buses</div>';
            } else {
                busesList.innerHTML = buses.map(bus => `
                    <div class="bus-item">
                        <span class="bus-route">Route ${bus.route}</span>
                        <span class="bus-arrival">${bus.arrival_text}</span>
                    </div>
                `).join('');
            }
        }
    }

    function renderBusData(data) {
        if (!data.stops || data.stops.length === 0) {
            content.innerHTML = '<div class="bus-no-data">No bus data available</div>';
            if (window.refreshDashboardLayout) window.refreshDashboardLayout();
            return;
        }

        const isRealtime = data.stops.some(stop => stop.realtime_data === true);
        const footnote = isRealtime ? 'Real‑time data' : 'Scheduled times';

        const timeSpan = content.querySelector('.bus-time');
        if (timeSpan) timeSpan.textContent = new Date(data.last_updated).toLocaleTimeString();
        const footnoteSpan = content.querySelector('.bus-footnote');
        if (footnoteSpan) footnoteSpan.textContent = footnote;

        if (content.querySelectorAll('.bus-stop-card').length === 0) {
            createStopCards(data.stops);
        } else {
            updateStopCards(data.stops);
        }
        if (window.refreshDashboardLayout) window.refreshDashboardLayout();
    }

    async function fetchBusData() {
        if (isServerDown) return;
        const timeSpan = content.querySelector('.bus-time');
        if (timeSpan) timeSpan.textContent = 'Loading...';
        try {
            const url = `/api/bus-realtime?route=${encodeURIComponent(routeId)}&stops=${encodeURIComponent(stopIds)}`;
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