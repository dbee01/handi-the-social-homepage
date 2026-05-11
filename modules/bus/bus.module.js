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
  panelTitle.innerHTML = '<i class="fa-solid fa-bus"></i> Real-Time Bus Tracker';
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

  // Configuration - SET THESE VALUES in settings or directly here
  let API_URL = ''; // Set this in settings or directly: 'https://api.nationaltransport.ie/gtfsr/v2/gtfsr?format=json'
  let API_KEY = ''; // Set your API key here if needed
  let ENABLED = false; // Set to true when API is configured

  // Load settings from localStorage
  function loadBusSettings() {
    try {
      const saved = localStorage.getItem('pleie_settings');
      if (saved) {
        const settings = JSON.parse(saved);
        if (settings.bus) {
          API_URL = settings.bus.apiUrl || '';
          API_KEY = settings.bus.apiKey || '';
          if (API_URL && API_URL.trim() !== '') {
            ENABLED = true;
          }
        }
      }
    } catch(e) {
      console.error("Error loading bus settings:", e);
    }
  }

  // Function to fetch real-time bus data
  async function fetchBusData() {
    if (!ENABLED || !API_URL) {
      return { error: 'not_configured', message: 'Bus API not configured. Click Settings (gear icon) → Bus Module to configure.' };
    }
    
    try {
      const headers = {};
      if (API_KEY) {
        headers['Ocp-Apim-Subscription-Key'] = API_KEY;
      }
      
      const response = await fetch(API_URL, { headers });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return processRealTimeData(data);
      
    } catch (error) {
      console.error('Bus API Error:', error);
      return { error: 'api_error', message: error.message };
    }
  }

  // Process real-time GTFS-RT data
  function processRealTimeData(data) {
    if (!data || !data.entity) {
      return { error: 'no_data', message: 'No bus data available' };
    }
    
    const stops = {}; // Will be populated from settings or API
    
    // This is a template - you'll need to configure which stops to show
    // For now, return empty result
    return {
      stops: [],
      lastUpdated: new Date(),
      needsConfiguration: true
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

  // Render bus data
  function renderBusData(result) {
    busContainer.innerHTML = '';
    
    if (result.error === 'not_configured') {
      busContainer.innerHTML = `
        <div style="text-align: center; padding: 40px; color: var(--term-amber);">
          <i class="fa-solid fa-gear"></i> ${result.message}
          <div style="margin-top: 15px; font-size: 0.8rem;">
            <button onclick="window.location.href='settings.html'" style="background: var(--term-green); color: #000; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">
              <i class="fa-solid fa-sliders-h"></i> Go to Settings
            </button>
          </div>
        </div>
      `;
      return;
    }
    
    if (result.error === 'api_error') {
      busContainer.innerHTML = `
        <div style="text-align: center; padding: 40px; color: var(--term-red);">
          <i class="fa-solid fa-exclamation-triangle"></i> API Error: ${result.message}
          <div style="margin-top: 10px; font-size: 0.8rem;">Check your API URL and key in Settings</div>
        </div>
      `;
      return;
    }
    
    if (!result.stops || result.stops.length === 0) {
      busContainer.innerHTML = `
        <div style="text-align: center; padding: 40px; color: var(--term-dim);">
          <i class="fa-solid fa-bus"></i> No bus stops configured.
          <div style="margin-top: 10px; font-size: 0.8rem;">Configure stops in Settings → Bus Module</div>
        </div>
      `;
      return;
    }
    
    // Last updated timestamp
    if (result.lastUpdated) {
      const lastUpdated = document.createElement('div');
      lastUpdated.style.cssText = `
        font-size: 0.7rem;
        color: var(--term-dim);
        text-align: right;
        margin-bottom: 10px;
        padding: 5px;
        border-bottom: 1px solid var(--panel-border);
      `;
      lastUpdated.innerHTML = `<i class="fa-solid fa-sync-alt"></i> Updated: ${result.lastUpdated.toLocaleTimeString()}`;
      busContainer.appendChild(lastUpdated);
    }
    
    // Display each stop
    result.stops.forEach(stop => {
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
      
      if (!stop.buses || stop.buses.length === 0) {
        busList.innerHTML = `
          <div style="text-align: center; padding: 20px; color: var(--term-dim);">
            <i class="fa-solid fa-clock"></i> No upcoming buses
          </div>
        `;
      } else {
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
          const statusColor = bus.delay > 60 ? 'var(--term-red)' : (bus.delay < -60 ? 'var(--term-amber)' : 'var(--term-green)');
          
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
                ${bus.delay === 0 ? 'On Time' : (bus.delay > 0 ? `+${Math.floor(bus.delay / 60)} min` : `${Math.floor(bus.delay / 60)} min`)}
              </div>
            </div>
          `;
          
          busList.appendChild(busItem);
        });
      }
      
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
  
  // Load settings and fetch data
  loadBusSettings();
  const initialData = await fetchBusData();
  renderBusData(initialData);
  
  // Auto-refresh every 60 seconds (only if enabled)
  let refreshInterval;
  if (ENABLED) {
    refreshInterval = setInterval(async () => {
      const newData = await fetchBusData();
      renderBusData(newData);
    }, 60000);
  }
  
  // Listen for settings changes
  window.addEventListener('settingsChanged', () => {
    loadBusSettings();
    if (refreshInterval) clearInterval(refreshInterval);
    if (ENABLED) {
      refreshInterval = setInterval(async () => {
        const newData = await fetchBusData();
        renderBusData(newData);
      }, 60000);
    }
    fetchBusData().then(renderBusData);
  });
}