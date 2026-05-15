// modules/bus/bus.module.js
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

    async function fetchBusData() {
        if (isServerDown) return; // avoid retry spam
        content.innerHTML = '<div class="bus-loading"><i class="fa-solid fa-spinner fa-spin"></i> Loading bus times...</div>';
        try {
            const response = await fetch('/api/bus-realtime');
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            isServerDown = false;
            renderBusData(data);
            // ensure auto-refresh is running
            if (!refreshInterval) startAutoRefresh();
        } catch (err) {
            console.warn('Bus server unreachable – displaying offline message');
            showOfflineMessage();
            isServerDown = true;
            if (refreshInterval) {
                clearInterval(refreshInterval);
                refreshInterval = null;
            }
        }
    }

    function showOfflineMessage() {
        content.innerHTML = `
            <div class="bus-offline">
                <i class="fa-solid fa-server"></i> Bus service offline
                <div class="bus-offline-desc">Unable to reach the bus server. Please try later.</div>
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

    function renderBusData(data) {
        if (!data.stops || data.stops.length === 0) {
            content.innerHTML = '<div class="bus-no-data">No bus data available</div>';
            return;
        }

        const isRealtime = data.stops.some(stop => stop.realtime_data === true);
        const footnote = isRealtime ? 'Real‑time data' : 'Scheduled times (GTFS)';

        let html = `
            <div class="bus-timestamp">
                <i class="fa-solid fa-sync-alt"></i> ${new Date(data.last_updated).toLocaleTimeString()}
                <span class="bus-footnote">${footnote}</span>
            </div>
        `;

        for (const stop of data.stops) {
            const buses = stop.buses.slice(0, 2);
            html += `
                <div class="bus-stop-card">
                    <h3 class="bus-stop-title">📍 ${escapeHtml(stop.stop_name)}</h3>
                    <div class="bus-direction">→ ${escapeHtml(stop.direction)}</div>
                    ${buses.length === 0 ? '<div class="bus-no-buses">No upcoming buses</div>' :
                        buses.map(bus => `
                            <div class="bus-item">
                                <span class="bus-route">Route ${bus.route}</span>
                                <span class="bus-arrival">${bus.arrival_text}</span>
                            </div>
                        `).join('')
                    }
                </div>
            `;
        }
        html += `<button class="bus-refresh-btn">Refresh</button>`;
        content.innerHTML = html;
        const refreshBtn = content.querySelector('.bus-refresh-btn');
        if (refreshBtn) refreshBtn.addEventListener('click', fetchBusData);
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

    fetchBusData();
    startAutoRefresh();
}
