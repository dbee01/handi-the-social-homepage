// js/modules/bus.js
import { loadSettings } from '../../js/core/settings.js';
import { saveMusic } from '../../js/core/storage.js';

export async function initBus(container) {
    const settings = loadSettings();
    const busSettings = settings.bus || {};
    
    container.innerHTML = `
        <div class="panel-title"><i class="fa-solid fa-bus"></i> BUS TRACKER</div>
        <div id="bus-content" style="padding:10px;">Loading...</div>
    `;
    
    const content = container.querySelector('#bus-content');
    
    async function fetchData() {
        try {
            const res = await fetch('http://localhost:3001/api/bus-realtime');
            const data = await res.json();
            
            if (!data.success) throw new Error(data.error);
            
            const isRealtime = data.stops.some(s => s.realtime_data === true);
            
            content.innerHTML = `
                <div style="font-size:0.7rem;color:#666;text-align:right;">Updated: ${new Date(data.last_updated).toLocaleTimeString()}</div>
                <div style="background:rgba(0,0,0,0.5);border-radius:6px;padding:8px;margin:10px 0;text-align:center;border-left:3px solid ${isRealtime ? '#00ff41' : '#ffb000'}">
                    <i class="${isRealtime ? 'fa-solid fa-satellite-dish' : 'fa-regular fa-calendar-alt'}" style="color:${isRealtime ? '#00ff41' : '#ffb000'}"></i>
                    <span style="color:${isRealtime ? '#00ff41' : '#ffb000'};font-size:0.75rem;">${isRealtime ? 'LIVE Real-Time' : 'Scheduled Times'}</span>
                </div>
                ${data.stops.map(stop => `
                    <div style="background:#0a0a0a;border:1px solid #1f1f1f;border-radius:8px;padding:15px;margin-bottom:15px;">
                        <h3 style="color:#00ffff;">📍 ${stop.stop_name}</h3>
                        <div style="color:#666;font-size:0.8rem;">→ ${stop.direction}</div>
                        ${stop.buses.length === 0 ? '<div style="color:#666;text-align:center;padding:20px;">No upcoming buses</div>' :
                            stop.buses.map(b => `
                                <div style="display:flex;justify-content:space-between;padding:10px;background:#000;border-radius:4px;margin-top:10px;border-left:3px solid ${b.minutes_away <= 5 ? '#ff4444' : (b.minutes_away <= 15 ? '#ffb000' : '#00ff41')}">
                                    <span style="color:#00ff41;">Route ${b.route}</span>
                                    <span style="color:#00ffff;font-weight:bold;">${b.arrival_text}</span>
                                </div>
                            `).join('')}
                    </div>
                `).join('')}
                <button id="bus-refresh" style="width:100%;padding:10px;background:#1f1f1f;border:1px solid #00ff41;color:#00ff41;border-radius:4px;cursor:pointer;">Refresh</button>
            `;
            document.getElementById('bus-refresh')?.addEventListener('click', fetchData);
        } catch(e) {
            content.innerHTML = `<div style="color:#ff3333;text-align:center;">Error: ${e.message}</div>`;
        }
    }
    
    fetchData();
    setInterval(fetchData, 60000);
}