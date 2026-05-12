// modules/bus/bus.module.js

export default async function initBus(container) {
    if (!container) {
        console.error("Bus Module: Container not found");
        return;
    }

    const pinBtn = container.querySelector('.pin-btn');
    container.innerHTML = '';
    if (pinBtn) container.prepend(pinBtn);

    const panelTitle = document.createElement('div');
    panelTitle.className = 'panel-title';
    panelTitle.innerHTML = '<i class="fa-solid fa-bus"></i> BUS TRACKER';
    container.appendChild(panelTitle);

    const busContainer = document.createElement('div');
    busContainer.style.cssText = 'padding: 10px;';
    container.appendChild(busContainer);

    async function fetchBusData() {
        busContainer.innerHTML = '<div style="text-align:center;padding:40px;"><i class="fa-solid fa-spinner fa-spin"></i> Loading bus times...</div>';
        
        try {
            const response = await fetch('http://localhost:3001/api/bus-realtime');
            const data = await response.json();
            
            if (!data.success) throw new Error(data.error);
            
            // Determine if using real-time or scheduled data
            const isRealtime = data.stops.some(stop => stop.realtime_data === true);
            const statusIcon = isRealtime ? 'fa-solid fa-satellite-dish' : 'fa-regular fa-calendar-alt';
            const statusText = isRealtime ? 'LIVE Real-Time Data' : 'Scheduled Times (No live data)';
            const statusColor = isRealtime ? '#00ff41' : '#ffb000';
            
            busContainer.innerHTML = `
                <div style="font-size:0.7rem;color:#666;text-align:right;margin-bottom:10px;">
                    <i class="fa-solid fa-sync-alt"></i> Updated: ${new Date(data.last_updated).toLocaleTimeString()}
                </div>
                <div style="background:rgba(0,0,0,0.5);border-radius:6px;padding:8px 12px;margin-bottom:15px;text-align:center;border-left:3px solid ${statusColor};">
                    <i class="${statusIcon}" style="color:${statusColor};margin-right:8px;"></i>
                    <span style="color:${statusColor};font-size:0.75rem;font-weight:bold;">${statusText}</span>
                    ${!isRealtime ? '<div style="color:#666;font-size:0.65rem;margin-top:4px;">Real-time data unavailable - showing timetable</div>' : ''}
                </div>
                ${data.stops.map(stop => {
                    const hasRealtime = stop.buses.some(b => b.realtime === true);
                    return `
                    <div style="background:#0a0a0a;border:1px solid #1f1f1f;border-radius:8px;padding:15px;margin-bottom:15px;">
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                            <h3 style="color:#00ffff;margin:0;">📍 ${stop.stop_name}</h3>
                            ${hasRealtime ? '<span style="background:#00ff41;color:#000;font-size:0.6rem;padding:2px 6px;border-radius:4px;font-weight:bold;">LIVE</span>' : '<span style="background:#ffb000;color:#000;font-size:0.6rem;padding:2px 6px;border-radius:4px;">SCHEDULED</span>'}
                        </div>
                        <div style="color:#666;font-size:0.8rem;margin-bottom:15px;">→ ${stop.direction}</div>
                        ${stop.buses.length === 0 ? 
                            '<div style="color:#666;text-align:center;padding:20px;">No upcoming buses</div>' : 
                            `<div style="display:flex;flex-direction:column;gap:10px;">
                                ${stop.buses.map(bus => {
                                    const mins = bus.minutes_away;
                                    let color = '#00ff41';
                                    let bgOpacity = '0.05';
                                    if (mins <= 5) {
                                        color = '#ff4444';
                                        bgOpacity = '0.15';
                                    } else if (mins <= 15) {
                                        color = '#ffb000';
                                        bgOpacity = '0.1';
                                    }
                                    return `
                                        <div style="display:flex;justify-content:space-between;align-items:center;padding:12px;background:#000;border-radius:4px;border-left:3px solid ${color};background:rgba(${color === '#ff4444' ? '255,68,68' : (color === '#ffb000' ? '255,176,0' : '0,255,65')},${bgOpacity})">
                                            <div>
                                                <div style="font-weight:bold;color:#00ff41;font-size:1rem;">Route ${bus.route}</div>
                                                ${bus.scheduled ? '<div style="font-size:0.65rem;color:#ffb000;"><i class="fa-regular fa-clock"></i> Timetable</div>' : '<div style="font-size:0.65rem;color:#00ff41;"><i class="fa-solid fa-waveform"></i> Live tracking</div>'}
                                            </div>
                                            <div style="text-align:right;">
                                                <div style="color:${color};font-weight:bold;font-size:1.2rem;">${bus.arrival_text}</div>
                                            </div>
                                        </div>
                                    `;
                                }).join('')}
                            </div>`
                        }
                    </div>
                `}).join('')}
                <button id="refreshBusBtn" style="width:100%;padding:12px;background:#1f1f1f;border:1px solid #00ff41;color:#00ff41;border-radius:4px;cursor:pointer;margin-top:10px;font-family:monospace;">
                    <i class="fa-solid fa-rotate-right"></i> Refresh
                </button>
            `;
            
            document.getElementById('refreshBusBtn')?.addEventListener('click', fetchBusData);
            
        } catch (error) {
            console.error('Fetch error:', error);
            busContainer.innerHTML = `
                <div style="text-align:center;padding:40px;color:#ff3333;">
                    <i class="fa-solid fa-exclamation-triangle"></i> Error: ${error.message}
                </div>
                <button id="retryBusBtn" style="width:100%;padding:12px;background:#1f1f1f;border:1px solid #00ff41;color:#00ff41;border-radius:4px;cursor:pointer;margin-top:10px;">
                    <i class="fa-solid fa-rotate-right"></i> Retry
                </button>
            `;
            document.getElementById('retryBusBtn')?.addEventListener('click', fetchBusData);
        }
    }
    
    fetchBusData();
    setInterval(fetchBusData, 60000);
}