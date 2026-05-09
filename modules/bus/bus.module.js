// modules/bus/bus.module.js

export default async function initBus(container) {
  if (!container) {
    console.error("Bus Module: Container not found");
    return;
  }

  // --- PRESERVE PIN BUTTON ---
  const pinBtn = container.querySelector('.pin-btn');
  container.innerHTML = '';
  if (pinBtn) container.prepend(pinBtn);
  // ---------------------------

  // Add panel title
  const panelTitle = document.createElement('div');
  panelTitle.className = 'panel-title';
  panelTitle.innerHTML = '<i class="fa-solid fa-bus"></i> Real-Time Bus Tracker (Route 223)';
  container.appendChild(panelTitle);

  // Create bus container
  const busContainer = document.createElement('div');
  busContainer.className = 'bus-container';
  busContainer.style.cssText = `
    display: flex;
    flex-direction: column;
    gap: 20px;
    padding: 10px;
  `;

  // Loading indicator
  const loadingDiv = document.createElement('div');
  loadingDiv.className = 'bus-loading';
  loadingDiv.style.cssText = `
    text-align: center;
    padding: 40px;
    color: var(--term-dim);
  `;
  loadingDiv.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Fetching real-time bus data...';
  busContainer.appendChild(loadingDiv);
  container.appendChild(busContainer);

  // Function to fetch real-time bus data via proxy
  async function fetchBusData() {
    try {
        // use bus-server.js in root as a proxy to avoid CORS issues and hide API key
        const response = await fetch('http://localhost:3002/api/bus-realtime');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data;
         
    } catch (error) {
      console.error('Bus API Error:', error);
      return getMockBusData();
    }
  }

  // Mock data for demonstration (replace with real API call)
  function getMockBusData() {
    const now = new Date();
    const currentMinute = now.getMinutes();
    
    // Generate realistic next bus times based on current time
    const generateBusTime = (baseMinute) => {
      const busTime = new Date();
      busTime.setMinutes(baseMinute);
      busTime.setSeconds(0);
      if (busTime < now) {
        busTime.setMinutes(baseMinute + 60);
      }
      return busTime;
    };
    
    return {
      stops: [
        {
          name: "Rochestown Rise",
          stopId: "242081",
          direction: "City Centre",
          buses: [
            { scheduled: generateBusTime(currentMinute + 2), delay: 0, status: "On Time" },
            { scheduled: generateBusTime(currentMinute + 17), delay: 120, status: "Delayed" },
            { scheduled: generateBusTime(currentMinute + 32), delay: 0, status: "On Time" }
          ]
        },
        {
          name: "South Mall",
          stopId: "242051",
          direction: "Rochestown",
          buses: [
            { scheduled: generateBusTime(currentMinute + 5), delay: -60, status: "Early" },
            { scheduled: generateBusTime(currentMinute + 22), delay: 0, status: "On Time" },
            { scheduled: generateBusTime(currentMinute + 45), delay: 180, status: "Delayed" }
          ]
        }
      ],
      lastUpdated: new Date()
    };
  }

  // Format time difference
  function getTimeRemaining(busTime) {
    const now = new Date();
    const diffMs = busTime - now;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins <= 0) return "Due";
    if (diffMins === 1) return "1 min";
    return `${diffMins} mins`;
  }

  // Format time string
  function formatTime(date) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  // Get status color
  function getStatusColor(status, delay) {
    if (delay > 60) return 'var(--term-red)';
    if (delay < -60) return 'var(--term-amber)';
    if (delay === 0) return 'var(--term-green)';
    if (delay > 0) return 'var(--term-amber)';
    return 'var(--term-cyan)';
  }

  // Get status icon
  function getStatusIcon(status, delay) {
    if (delay > 60) return '<i class="fa-solid fa-triangle-exclamation"></i>';
    if (delay < -60) return '<i class="fa-solid fa-clock"></i>';
    if (delay === 0) return '<i class="fa-solid fa-check-circle"></i>';
    if (delay > 0) return '<i class="fa-solid fa-clock"></i>';
    return '<i class="fa-solid fa-forward"></i>';
  }

  // Render bus data
  function renderBusData(data) {
    busContainer.innerHTML = '';
    
    if (!data || !data.stops) {
      busContainer.innerHTML = `
        <div style="text-align: center; padding: 40px; color: var(--term-red);">
          <i class="fa-solid fa-exclamation-triangle"></i> Unable to fetch bus data
        </div>
      `;
      return;
    }
    
    // Last updated timestamp
    const lastUpdated = document.createElement('div');
    lastUpdated.style.cssText = `
      font-size: 0.7rem;
      color: var(--term-dim);
      text-align: right;
      margin-bottom: 10px;
      padding: 5px;
      border-bottom: 1px solid var(--panel-border);
    `;
    lastUpdated.innerHTML = `<i class="fa-solid fa-sync-alt"></i> Updated: ${data.lastUpdated.toLocaleTimeString()}`;
    busContainer.appendChild(lastUpdated);
    
    // Display each stop
    data.stops.forEach(stop => {
      const stopCard = document.createElement('div');
      stopCard.style.cssText = `
        background: rgba(0, 0, 0, 0.3);
        border: 1px solid var(--panel-border);
        border-radius: var(--radius);
        padding: 15px;
        margin-bottom: 15px;
      `;
      
      // Stop header
      const stopHeader = document.createElement('div');
      stopHeader.style.cssText = `
        margin-bottom: 15px;
        padding-bottom: 10px;
        border-bottom: 1px solid var(--panel-border);
      `;
      stopHeader.innerHTML = `
        <h3 style="color: var(--term-cyan); margin-bottom: 5px;">
          <i class="fa-solid fa-location-dot"></i> ${stop.name}
        </h3>
        <div style="color: var(--term-dim); font-size: 0.8rem;">
          <i class="fa-solid fa-arrow-right"></i> ${stop.direction}
        </div>
      `;
      stopCard.appendChild(stopHeader);
      
      // Bus times
      const busList = document.createElement('div');
      busList.style.cssText = `
        display: flex;
        flex-direction: column;
        gap: 12px;
      `;
      
      stop.buses.forEach((bus, index) => {
        const busItem = document.createElement('div');
        busItem.style.cssText = `
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px;
          background: rgba(0, 0, 0, 0.5);
          border-radius: var(--radius);
          transition: transform 0.2s;
        `;
        
        const timeRemaining = getTimeRemaining(bus.scheduled);
        const statusColor = getStatusColor(bus.status, bus.delay);
        const statusIcon = getStatusIcon(bus.status, bus.delay);
        
        // Highlight next bus
        if (index === 0) {
          busItem.style.border = `1px solid ${statusColor}`;
          busItem.style.background = `rgba(0, 255, 65, 0.05)`;
        }
        
        busItem.innerHTML = `
          <div style="flex: 1;">
            <div style="font-weight: bold; color: ${statusColor}; font-size: 1.1rem;">
              ${timeRemaining}
            </div>
            <div style="font-size: 0.75rem; color: var(--term-dim);">
              ${formatTime(bus.scheduled)}
            </div>
          </div>
          <div style="text-align: right;">
            <div style="color: ${statusColor}; font-size: 0.85rem;">
              ${statusIcon} ${bus.status}
            </div>
            ${bus.delay !== 0 ? `<div style="font-size: 0.7rem; color: var(--term-dim);">${bus.delay > 0 ? '+' : ''}${Math.floor(bus.delay / 60)} min</div>` : ''}
          </div>
        `;
        
        busList.appendChild(busItem);
      });
      
      stopCard.appendChild(busList);
      busContainer.appendChild(stopCard);
    });
    
    // Add refresh button
    const refreshBtn = document.createElement('button');
    refreshBtn.style.cssText = `
      width: 100%;
      padding: 12px;
      background: var(--panel-bg);
      border: 1px solid var(--panel-border);
      border-radius: var(--radius);
      color: var(--term-green);
      cursor: pointer;
      font-family: var(--font-retro);
      margin-top: 10px;
      transition: all 0.2s;
    `;
    refreshBtn.innerHTML = '<i class="fa-solid fa-rotate-right"></i> Refresh Data';
    refreshBtn.onmouseenter = () => {
      refreshBtn.style.background = 'rgba(0, 255, 65, 0.1)';
      refreshBtn.style.borderColor = 'var(--term-green)';
    };
    refreshBtn.onmouseleave = () => {
      refreshBtn.style.background = 'var(--panel-bg)';
      refreshBtn.style.borderColor = 'var(--panel-border)';
    };
    refreshBtn.onclick = async () => {
      refreshBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Refreshing...';
      refreshBtn.disabled = true;
      const newData = await fetchBusData();
      renderBusData(newData);
      refreshBtn.innerHTML = '<i class="fa-solid fa-rotate-right"></i> Refresh Data';
      refreshBtn.disabled = false;
    };
    busContainer.appendChild(refreshBtn);
  }
  
  // Initial load
  const initialData = await fetchBusData();
  renderBusData(initialData);
  
  // Auto-refresh every 60 seconds
  setInterval(async () => {
    const newData = await fetchBusData();
    renderBusData(newData);
  }, 60000);
}