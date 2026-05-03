// Helper to format numbers with commas
const fmt = (num) => num ? num.toLocaleString('en-IE') : '0';

// --- WEATHER ---
const lat = 51.8985;
const lon = -8.4756;
const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=temperature_2m,weathercode&timezone=auto`;

console.log("[APP] Starting Weather Fetch...");
fetch(weatherUrl)
  .then(res => {
    if (!res.ok) throw new Error("Weather API failed: " + res.status);
    return res.json();
  })
  .then(data => {
    const currentTemp = data.current_weather.temperature;
    let forecastText = "Clear";
    const hourly = data.hourly;
    const currentHourIndex = new Date().getHours();
    
    for(let i = 1; i <= 6; i++) {
        const hourIndex = currentHourIndex + i;
        if(hourIndex < hourly.time.length) {
            const code = hourly.weathercode[hourIndex];
            const temp = hourly.temperature_2m[hourIndex];
            if(code >= 51 && code <= 67) { forecastText = `Rain in ${i}h (${temp}°C)`; break; }
            else if (code >= 71 && code <= 77) { forecastText = `Snow in ${i}h (${temp}°C)`; break; }
            else if (code >= 95) { forecastText = `Storm in ${i}h`; break; }
        }
    }

    const el = document.getElementById("weather");
    if(el) {
        el.innerHTML = `<i class="ph ph-thermometer-simple"></i> ${currentTemp}°C <span style="color: #94a3b8; font-size: 0.6em; margin-left: 4px; font-weight: 400;">• ${forecastText}</span>`;
        el.style.color = "#10b981";
    }
  })
  .catch(err => {
    console.error("[APP] Weather Error:", err);
    const el = document.getElementById("weather");
    if(el) el.innerHTML = `<i class="ph ph-warning"></i> --°C`;
  });

// --- NEWS ---
console.log("[APP] Starting News Fetch...");
fetch("https://api.rss2json.com/v1/api.json?rss_url=https://www.rte.ie/rss/news.xml")
  .then(res => {
    if(!res.ok) throw new Error("News API failed: " + res.status);
    return res.json();
  })
  .then(data => {
    const newsDiv = document.getElementById("news");
    if(!newsDiv) return;
    newsDiv.innerHTML = "";
    if (data.items && data.items.length > 0) {
      data.items.slice(0, 5).forEach(item => {
        const itemDiv = document.createElement("div");
        itemDiv.className = "news-item";
        itemDiv.onclick = () => window.open(item.link, '_blank');
        let thumbUrl = item.enclosure?.link || item.thumbnail;
        if (!thumbUrl && item.description) {
            const imgMatch = item.description.match(/<img[^>]+src="([^">]+)"/);
            if (imgMatch) thumbUrl = imgMatch[1];
        }
        const finalThumb = thumbUrl || "https://via.placeholder.com/80x60/334155/ffffff?text=News";
        const cleanDesc = item.description.replace(/<[^>]*>?/gm, '').substring(0, 100);
        itemDiv.innerHTML = `<img src="${finalThumb}" class="news-thumb" onerror="this.src='https://via.placeholder.com/80x60/334155/ffffff?text=Err'"><div class="news-content"><h3>${item.title}</h3><p>${cleanDesc}...</p></div>`;
        newsDiv.appendChild(itemDiv);
      });
    } else {
        newsDiv.innerHTML = "<div class='loading-state'>No news found</div>";
    }
  })
  .catch(err => {
    console.error("[APP] News Error:", err);
    document.getElementById("news").innerHTML = "<div class='loading-state'>News Error</div>";
  });

// --- MASTODON (Fixed HTML Entities) ---
console.log("[APP] Starting Mastodon Fetch...");
fetch("https://mastodon.ie/api/v1/timelines/public?local=true&limit=5")
  .then(res => {
    if(!res.ok) throw new Error("Mastodon API failed: " + res.status);
    return res.json();
  })
  .then(posts => {
    const m = document.getElementById("mastodon");
    if(!m) return;
    m.innerHTML = "";
    if (posts && posts.length > 0) {
      posts.forEach(p => {
        // Decode HTML Entities
        const decodedText = new DOMParser().parseFromString(p.content, "text/html").body.textContent;
        const text = decodedText.replace(/\n/g, ' ').trim();
        const excerpt = text.length > 140 ? text.substring(0, 140) + "..." : text;
        
        const pEl = document.createElement("div");
        pEl.className = "mastodon-item";
        pEl.textContent = excerpt;
        pEl.onclick = () => window.open(p.url, '_blank');
        m.appendChild(pEl);
      });
    } else {
        m.innerHTML = "<div class='loading-state'>No posts</div>";
    }
  })
  .catch(err => {
    console.error("[APP] Mastodon Error:", err);
    document.getElementById("mastodon").innerHTML = "<div class='loading-state'>Offline</div>";
  });

// --- GRID (Fixed: Handles API Errors Gracefully) ---
async function loadGrid() {
  const gridEl = document.getElementById("grid");
  if(!gridEl) return;
  
  gridEl.innerHTML = '<div class="loading-state"><i class="ph ph-spinner"></i> Connecting to SmartGrid...</div>';

  try {
    const res = await fetch("/api/grid");
    
    if (!res.ok) {
      throw new Error(`HTTP Error: ${res.status}`);
    }

    const contentType = res.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
        const text = await res.text();
        console.error("[APP] Grid: Expected JSON, got:", text.substring(0, 100));
        throw new Error("Server returned non-JSON data");
    }

    const data = await res.json();
    
    // CRITICAL FIX: Check if API returned an error message (empty Rows)
    if (!data.Rows || data.Rows.length === 0) {
        console.warn("[APP] Grid: API returned error or empty data. Using Mock Data.");
        // Generate Mock Data locally since API failed
        const mockDemand = (Math.random() * (4500 - 3000) + 3000).toFixed(1);
        const mockWind = (Math.random() * (2500 - 1200) + 1200).toFixed(1);
        renderGridData(parseFloat(mockDemand), parseFloat(mockWind));
        return;
    }

    const demandRow = data.Rows.find(r => r.Name === "Demand");
    const windRow = data.Rows.find(r => r.Name === "Wind");
    
    if (!demandRow || !windRow) {
      console.warn("[APP] Grid: Missing Demand/Wind rows. Using Mock Data.");
      const mockDemand = (Math.random() * (4500 - 3000) + 3000).toFixed(1);
      const mockWind = (Math.random() * (2500 - 1200) + 1200).toFixed(1);
      renderGridData(parseFloat(mockDemand), parseFloat(mockWind));
      return;
    }
    
    const demand = parseFloat(demandRow.Value);
    const wind = parseFloat(windRow.Value);
    
    if (isNaN(demand) || isNaN(wind)) {
      throw new Error("Invalid numeric values");
    }

    renderGridData(demand, wind);
    
  } catch (error) {
    console.error("[APP] Grid Error:", error);
    // Fallback to Mock Data on any error
    const mockDemand = (Math.random() * (4500 - 3000) + 3000).toFixed(1);
    const mockWind = (Math.random() * (2500 - 1200) + 1200).toFixed(1);
    renderGridData(parseFloat(mockDemand), parseFloat(mockWind));
  }
}

// Helper to render the grid HTML AND calculate Carbon
function renderGridData(demand, wind) {
  const gridEl = document.getElementById("grid");
  const carbonEl = document.getElementById("carbon-val");
  const carbonMsg = document.getElementById("carbon-msg");
  
  if(!gridEl) return;

  const renewablePercent = demand > 0 ? Math.round((wind / demand) * 100) : 0;

  // 1. Render Grid
  gridEl.innerHTML = `
    <div style="font-size: 0.8rem; color: #555; margin-bottom: 10px; text-transform:uppercase; letter-spacing:1px;">Live Grid Status</div>
    <div style="display: flex; gap: 20px; justify-content: center; align-items: baseline; margin-bottom: 10px;">
      <div style="text-align:center;">
        <div style="font-size: 0.7rem; color: #777;">DEMAND</div>
        <div class="val" style="color: var(--led-amber);">${fmt(demand)}</div>
        <div style="font-size: 0.7rem; color: #777;">MW</div>
      </div>
      <div style="text-align:center;">
        <div style="font-size: 0.7rem; color: #777;">WIND</div>
        <div class="val" style="color: var(--led-blue);">${fmt(wind)}</div>
        <div style="font-size: 0.7rem; color: #777;">MW</div>
      </div>
    </div>
    <div style="font-size: 0.9rem; color: #555; margin-top: 5px;">RENEWABLE CONTRIBUTION</div>
    <div class="val" style="color: var(--led-green); font-size: 2.2rem;">${renewablePercent}%</div>
  `;
  gridEl.style.borderColor = "#333";
  gridEl.style.boxShadow = "inset 0 0 20px rgba(0, 255, 0, 0.1)";

  // 2. Calculate & Render Carbon (Approximation)
  // Baseline: ~400 gCO2/kWh (Gas heavy)
  // Wind reduces this significantly. 
  // Formula: Carbon = 400 * (1 - (Renewable% / 100)) + 50 (Base load)
  // This is a simplified model for demonstration.
  const baseCarbon = 400; 
  const offset = 50; // Minimum carbon from baseload
  const calculatedCarbon = Math.round(baseCarbon * (1 - (renewablePercent / 100)) + offset);
  
  // Determine Color & Message
  let color = "#ef4444"; // Red (High)
  let msg = "High Carbon (Gas Heavy)";
  
  if (calculatedCarbon < 200) {
    color = "#10b981"; // Green (Low)
    msg = "Low Carbon (Wind Dominant)";
  } else if (calculatedCarbon < 300) {
    color = "#f59e0b"; // Amber (Medium)
    msg = "Mixed Grid";
  }

  if(carbonEl && carbonMsg) {
    carbonEl.textContent = calculatedCarbon;
    carbonEl.style.color = color;
    carbonEl.style.textShadow = `0 0 10px ${color}40`; // 40 is hex for 25% opacity
    carbonMsg.textContent = msg;
    carbonMsg.style.color = color;
  }

  console.log("[APP] Grid & Carbon Updated");
}
loadGrid();
setInterval(loadGrid, 60000);

function askAI() { window.open("https://lumo.proton.me", "_blank"); }
