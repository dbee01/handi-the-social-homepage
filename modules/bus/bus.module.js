// modules/bus/bus.module.js
export default async function initBus(container) {
    // Preserve pin button
    const pinBtn = container.querySelector('.pin-btn');
    container.innerHTML = '';
    if (pinBtn) container.prepend(pinBtn);

    // Panel title
    const title = document.createElement('div');
    title.className = 'panel-title';
    title.innerHTML = '<i class="fa-solid fa-bus"></i> BUS TRACKER';
    container.appendChild(title);

    const content = document.createElement('div');
    content.style.cssText = 'padding: 10px;';
    container.appendChild(content);

    // ----- FULL fetchBusData function -----
    async function fetchBusData() {
        // Show loading spinner
        content.innerHTML = '<div style="text-align:center; padding:40px;"><i class="fa-solid fa-spinner fa-spin"></i> Loading bus times...</div>';

        try {
            const response = await fetch('http://localhost:3001/api/bus-realtime');
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            renderBusData(data);
        } catch (err) {
            console.error('Bus server unreachable:', err);
            // Display offline message with a retry button
            content.innerHTML = `
                <div style="text-align:center; padding:30px; color:#ffb000;">
                    <i class="fa-solid fa-server"></i> Bus server offline
                    <div style="font-size:0.8rem; margin-top:8px;">Start node server.js on port 3001</div>
                    <button id="busRetry" style="margin-top:12px; padding:6px 12px; background:#1f1f1f; border:1px solid #00ff41; color:#00ff41; border-radius:4px; cursor:pointer;">Retry</button>
                </div>
            `;
            const retryBtn = document.getElementById('busRetry');
            if (retryBtn) retryBtn.addEventListener('click', fetchBusData);
        }
    }

    function renderBusData(data) {
        if (!data.stops || data.stops.length === 0) {
            content.innerHTML = '<div style="text-align:center; color:#888;">No bus data available</div>';
            return;
        }

        const isRealtime = data.stops.some(stop => stop.realtime_data === true);
        const footnote = isRealtime ? 'Real‑time data' : 'Scheduled times (GTFS)';

        let html = `
            <div style="font-size:0.7rem; color:#666; text-align:right; margin-bottom:8px;">
                <i class="fa-solid fa-sync-alt"></i> ${new Date(data.last_updated).toLocaleTimeString()}
                <span style="margin-left:8px; opacity:0.7;">${footnote}</span>
            </div>
        `;

        for (const stop of data.stops) {
            const buses = stop.buses.slice(0, 2); // show only first 2
            html += `
                <div style="background:#0a0a0a; border:1px solid #333; border-radius:8px; padding:10px 12px; margin-bottom:12px;">
                    <h3 style="color:#00ffff; margin:0 0 4px 0; font-size:1rem;">📍 ${escapeHtml(stop.stop_name)}</h3>
                    <div style="color:#666; font-size:0.75rem; margin-bottom:8px;">→ ${escapeHtml(stop.direction)}</div>
                    ${buses.length === 0 ? '<div style="color:#888; font-size:0.75rem;">No upcoming buses</div>' :
                        buses.map(bus => `
                            <div style="display:flex; justify-content:space-between; align-items:center; padding:6px 0; border-bottom:1px solid #222;">
                                <span style="font-size:0.85rem;">Route ${bus.route}</span>
                                <span style="color:#00ff41; font-weight:bold; font-size:0.9rem;">${bus.arrival_text}</span>
                            </div>
                        `).join('')
                    }
                </div>
            `;
        }
        html += `<button id="busRefresh" style="width:100%; padding:8px; background:#1f1f1f; border:1px solid #00ff41; color:#00ff41; border-radius:4px; cursor:pointer; margin-top:5px;">Refresh</button>`;
        content.innerHTML = html;
        const refreshBtn = document.getElementById('busRefresh');
        if (refreshBtn) refreshBtn.addEventListener('click', fetchBusData);
    }

    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/[&<>]/g, m => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;' }[m]));
    }

    // Initial fetch and auto-refresh every 60 seconds
    fetchBusData();
    setInterval(fetchBusData, 60000);
}