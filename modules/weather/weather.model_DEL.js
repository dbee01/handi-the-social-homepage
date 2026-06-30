// modules/weather/weather.model.js

export default class WeatherModel {
  async fetch() {
    // Coordinates for Cork (or change to your desired location)
    const lat = 51.8985; 
    const lon = -8.4756;
    
    // Fetch current weather + weather code (for forecast icon/text) + wind
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&timezone=auto`;
    
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Weather API failed: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Map WMO weather codes to readable text
      const weatherCodes = {
        0: "Clear sky",
        1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
        45: "Fog", 48: "Depositing rime fog",
        51: "Light drizzle", 53: "Moderate drizzle", 55: "Dense drizzle",
        61: "Slight rain", 63: "Moderate rain", 65: "Heavy rain",
        71: "Slight snow", 73: "Moderate snow", 75: "Heavy snow",
        95: "Thunderstorm", 96: "Thunderstorm with hail"
      };

      const code = data.current_weather.weathercode;
      const condition = weatherCodes[code] || "Unknown";

      return {
        temperature: data.current_weather.temperature,
        condition: condition, // e.g., "Partly Cloudy"
        area: "Cork",         // Hardcoded area
        icon: this.getIcon(code)
      };  

    } catch (error) {
      console.error("Weather Model Fetch Error:", error);
      throw error;
    }
  }

  getIcon(code) {
    // Simple mapping to FontAwesome icons
    if (code <= 1) return "fa-sun";
    if (code <= 3) return "fa-cloud-sun";
    if (code === 45 || code === 48) return "fa-smog";
    if (code >= 51 && code <= 67) return "fa-cloud-rain";
    if (code >= 71 && code <= 77) return "fa-snowflake";
    if (code >= 95) return "fa-bolt";
    return "fa-cloud";
  }
}