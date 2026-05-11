// app.js

import initNews from "./modules/news/news.module.js";
import initEnergy from "./modules/energy/energy.module.js";
import initAI from "./modules/ai/ai.module.js";
import initWeather from "./modules/weather/weather.module.js";
import initMastodon from "./modules/mastodon/mastodon.module.js";
import initSpotify from "./modules/spotify/spotify.module.js";
import initEmergency from "./modules/emergency/emergency.module.js";
import initBus from "./modules/bus/bus.module.js";
import initGallery from "./modules/gallery/gallery.module.js";
import initRadio from "./modules/radio/radio.module.js";
import initLocalPlayer from "./modules/local-player/local-player.module.js";
import initFriendlyPhone from "./modules/friendly-phone/friendly-phone.module.js";
import initLayoutSystem from "./modules/ui/layout-system.js";

window.layoutSystemInitialized = false;

// Store module init functions for refresh
const moduleInits = {
  'local-player': initLocalPlayer,
  'gallery': initGallery,
  'emergency': initEmergency,
  'bus': initBus,
  'friendly-phone': initFriendlyPhone,
  'radio': initRadio,
  'news': initNews,
  'mastodon': initMastodon
};

/**
 * Initialize a module safely
 */
function safeInit(name, moduleId, initFn, ...args) {
  try {
    const dashboardItem = document.getElementById(moduleId);
    if (!dashboardItem) {
      console.warn(`⚠️ ${name} element (#${moduleId}) not found`);
      return;
    }
    
    const container = dashboardItem.querySelector('.module-content');
    if (!container) {
      console.warn(`⚠️ ${name} .module-content not found inside #${moduleId}`);
      return;
    }
    
    initFn(container, ...args);
    console.log(`✅ ${name} module initialized`);
  } catch (error) {
    console.error(`Error initializing ${name}:`, error);
  }
}

/**
 * Refresh a specific module
 */
function refreshModule(moduleId) {
  const dashboardItem = document.getElementById(moduleId);
  if (!dashboardItem) return;
  
  // Only refresh if visible
  if (!dashboardItem.classList.contains('visible') && dashboardItem.style.display !== 'block') {
    return;
  }
  
  const container = dashboardItem.querySelector('.module-content');
  if (!container) return;
  
  const initFn = moduleInits[moduleId];
  if (initFn) {
    console.log(`🔄 Refreshing module: ${moduleId}`);
    // Clear container
    container.innerHTML = '';
    // Re-initialize
    initFn(container);
  }
}

/**
 * Refresh all visible modules
 */
function refreshAllModules() {
  console.log('🔄 Refreshing all visible modules...');
  const moduleIds = ['local-player', 'gallery', 'emergency', 'bus', 'friendly-phone', 'radio', 'news', 'mastodon'];
  
  moduleIds.forEach(moduleId => {
    setTimeout(() => {
      refreshModule(moduleId);
    }, 50);
  });
}

/**
 * Responsive layout
 */
function initResponsiveLayout() {
  const grid = document.getElementById("dashboard-grid");
  if (!grid) return;

  if (window.innerWidth <= 800) {
    console.log("📱 Mobile layout enabled");

    if (window.packeryInstance) {
      try {
        window.packeryInstance.destroy();
      } catch (error) {
        console.warn("Could not destroy Packery:", error);
      }
      window.packeryInstance = null;
    }

    grid.removeAttribute("style");
    grid.classList.add("mobile-layout");

    const items = grid.querySelectorAll(".dashboard-item");
    items.forEach((item) => {
      item.removeAttribute("style");
      item.style.position = "static";
      item.style.width = "100%";
      item.style.maxWidth = "100%";
      item.style.margin = "0 0 12px 0";
      item.style.boxSizing = "border-box";
    });

    window.layoutSystemInitialized = true;
    return;
  }

  console.log("🖥️ Desktop layout enabled");
  grid.classList.remove("mobile-layout");

  try {
    initLayoutSystem();
    window.layoutSystemInitialized = true;
    console.log("✅ Layout system initialized");
  } catch (error) {
    console.error("❌ Error initializing layout system:", error);
  }
}

/**
 * Search functionality
 */
function initializeSearch() {
  const searchInput = document.getElementById("searchInput");
  const searchEngine = document.getElementById("searchEngine");

  if (!searchInput || !searchEngine) {
    console.warn("⚠️ Search elements not found");
    return;
  }

  function performSearch() {
    const query = searchInput.value.trim();
    if (!query) return;

    const engine = searchEngine.value;
    let searchUrl = "";

    switch (engine) {
      case "google":
        searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
        break;
      case "duckduckgo":
        searchUrl = `https://duckduckgo.com/?q=${encodeURIComponent(query)}`;
        break;
      case "brave":
        searchUrl = `https://search.brave.com/search?q=${encodeURIComponent(query)}`;
        break;
      case "proton":
        searchUrl = `https://search.proton.me/?q=${encodeURIComponent(query)}`;
        break;
      default:
        searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    }

    window.open(searchUrl, "_blank");
    searchInput.value = "";
  }

  searchInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      performSearch();
    }
  });

  const searchIcon = document.querySelector(".search-wrapper i.fa-arrow-right");
  if (searchIcon) {
    searchIcon.addEventListener("click", performSearch);
  }
}

/**
 * Main application initialization
 */
document.addEventListener("DOMContentLoaded", () => {
  console.log("🚀 App initializing...");

  // Initialize all modules
  safeInit("Local Music Player", "local-player", initLocalPlayer);
  safeInit("Radio", "radio", initRadio);
  safeInit("News", "news", initNews);
  safeInit("Weather", "weather", initWeather);
  safeInit("Mastodon", "mastodon", initMastodon);
  safeInit("AI", "aiBtn", initAI);
  safeInit("Spotify", "spotify", initSpotify);
  safeInit("Emergency", "emergency", initEmergency);
  safeInit("Bus", "bus", initBus);
  safeInit("Gallery", "gallery", initGallery);
  safeInit("Friendly Phone", "friendly-phone", initFriendlyPhone);

  // Initialize search
  initializeSearch();

  // Initialize responsive layout
  setTimeout(initResponsiveLayout, 300);

  let resizeTimeout;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(initResponsiveLayout, 250);
  });

  window.addEventListener("orientationchange", () => {
    setTimeout(initResponsiveLayout, 300);
  });

  console.log("🎉 App initialization complete");
});

// Listen for settings changes and refresh modules
window.addEventListener('settingsChanged', (event) => {
  console.log('📢 Settings changed, refreshing modules...');
  refreshAllModules();
});

window.appVersion = "1.0.0";
window.refreshAllModules = refreshAllModules;
