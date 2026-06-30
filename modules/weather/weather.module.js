/*
 * Copyright (c) 2026 Handi Homepage
 * This file is part of HandiHomepage and is released under the GNU General Public License v3.0.
 * See the LICENSE file in the repository root for full details.
 */
// modules/weather/weather.module.js
import { loadSettings } from "../../js/core/settings.js";

export default async function initWeather(container) {
  var t =
    window.t ||
    function (k, e) {
      return e || k;
    };
  const pinBtn = container.querySelector(".pin-btn");
  container.innerHTML = "";
  if (pinBtn) container.prepend(pinBtn);

  const title = document.createElement("div");
  title.className = "panel-title";
  var name =
    window.LANG && window.LANG.modules && window.LANG.modules.weather
      ? window.LANG.modules.weather.name
      : "WEATHER";
  title.innerHTML = '<i class="fa-solid fa-cloud-sun"></i> ' + name;
  container.appendChild(title);

  const content = document.createElement("div");
  content.className = "weather-content";
  container.appendChild(content);

  let weatherInterval = null;

  function escapeHtml(str) {
    if (!str) return "";
    return str.replace(
      /[&<>]/g,
      (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[m],
    );
  }

  function getWeatherDescription(code) {
    var desc = t("weather_" + code, "");
    if (desc) return desc;
    const codes = {
      0: "☀️ Clear",
      1: "🌤️ Clear",
      2: "⛅ Cloudy",
      3: "☁️ Overcast",
      45: "🌫️ Fog",
      48: "🌫️ Fog",
      51: "🌧️ Drizzle",
      53: "🌧️ Drizzle",
      55: "🌧️ Drizzle",
      61: "🌧️ Light rain",
      63: "🌧️ Rain",
      65: "🌧️ Heavy rain",
      71: "🌨️ Light snow",
      73: "🌨️ Snow",
      75: "🌨️ Heavy snow",
      80: "🌧️ Showers",
      81: "🌧️ Showers",
      82: "🌧️ Heavy showers",
      85: "🌨️ Snow showers",
      86: "🌨️ Heavy Snow",
      95: "⛈️ Thunderstorm",
    };
    return codes[code] || "🌡️ Unknown";
  }

  async function getCoordinates(location, countryCode) {
    const query = `${location}, ${countryCode}`;
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&addressdetails=1`;
    try {
      const response = await fetch(url, {
        headers: { "User-Agent": "HandiHomepage/1.0" },
      });
      const data = await response.json();
      if (data && data.length > 0) {
        return {
          lat: parseFloat(data[0].lat),
          lon: parseFloat(data[0].lon),
          displayName: data[0].display_name,
        };
      }
      return null;
    } catch (err) {
      console.error("Geocoding error:", err);
      return null;
    }
  }

  async function updateWeather() {
    // Check if weather module is enabled in settings
    const settings = loadSettings();
    const isEnabled = settings.enabledModules?.weather !== false;

    // If module is toggled OFF, show disabled message and don't fetch
    if (!isEnabled) {
      content.innerHTML = `
                <div class="weather-disabled">
                    <i class="fa-solid fa-cloud-sun"></i>
                    <p>" + t("d_weatherDisabled", "Weather module disabled.") + "</p>
                    <small>" + t("d_enableWeather", "Enable in Settings → Weather") + "</small>
                </div>
            `;
      if (window.refreshDashboardLayout) window.refreshDashboardLayout();
      return;
    }

    const locationName = settings.weather?.location || "Cork";
    const countryCode = settings.weather?.country || "IE";

    content.innerHTML =
      '<div class="weather-loading"><i class="fa-solid fa-spinner fa-spin"></i> " + t("d_loadingWeather", "Loading weather...") + "</div>';

    try {
      const coords = await getCoordinates(locationName, countryCode);
      if (!coords) {
        content.innerHTML = `<div class="weather-error">⚠️ Location "${escapeHtml(locationName)}" " + t("d_notFound", "not found") + "</div>`;
        return;
      }

      const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current_weather=true&timezone=auto`;
      const weatherRes = await fetch(weatherUrl);
      const weatherData = await weatherRes.json();

      if (weatherData.current_weather) {
        const temp = Math.round(weatherData.current_weather.temperature);
        const weatherCode = weatherData.current_weather.weathercode;
        const outlook = getWeatherDescription(weatherCode);

        let displayLocation = locationName;
        if (coords.displayName) {
          const parts = coords.displayName.split(",");
          displayLocation = parts[0];
        }

        content.innerHTML = `
                    <div class="weather-display">
                        <div class="weather-location">📍 ${escapeHtml(displayLocation)}</div>
                        <div class="weather-temp">🌡️ ${temp}°C</div>
                        <div class="weather-outlook">${outlook}</div>
                    </div>
                `;
      } else {
        content.innerHTML = `<div class="weather-error">⚠️ " + t("d_noWeatherData", "No weather data available") + "</div>`;
      }
    } catch (err) {
      console.error("Weather fetch error:", err);
      content.innerHTML = `<div class="weather-error">⚠️ " + t("d_weatherFailed", "Failed to load weather") + "</div>`;
    }

    if (window.refreshDashboardLayout) window.refreshDashboardLayout();
  }

  function startWeatherUpdates() {
    if (weatherInterval) clearInterval(weatherInterval);
    updateWeather(); // This will check the toggle state
    weatherInterval = setInterval(updateWeather, 30 * 60 * 1000);
  }

  startWeatherUpdates();

  return () => {
    if (weatherInterval) clearInterval(weatherInterval);
  };
}
