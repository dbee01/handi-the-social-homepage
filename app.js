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

// Global flag to track layout initialization
window.layoutSystemInitialized = false;

/**
 * Initialize a module safely.
 */
function safeInit(name, elementId, initFn, ...args) {
  try {
    const element = document.getElementById(elementId);

    if (!element) {
      console.warn(`⚠️ ${name} element (#${elementId}) not found`);
      return;
    }

    initFn(element, ...args);
    console.log(`✅ ${name} module initialized`);
  } catch (error) {
    console.error(`Error initializing ${name}:`, error);
  }
}

/**
 * Responsive layout:
 * - Mobile/tablet (<=768px): disable Packery and use a simple vertical stack.
 * - Desktop: enable Packery layout system.
 */
function initResponsiveLayout() {
  const grid = document.getElementById("grid");
  if (!grid) return;

  // MOBILE / TABLET
  if (window.innerWidth <= 768) {
    console.log("📱 Mobile layout enabled");

    // Destroy existing Packery instance
    if (window.packeryInstance) {
      try {
        window.packeryInstance.destroy();
      } catch (error) {
        console.warn("Could not destroy Packery:", error);
      }
      window.packeryInstance = null;
    }

    // Remove Packery inline styles from grid
    grid.removeAttribute("style");
    grid.classList.add("mobile-layout");

    // Reset every panel/grid item
    const items = grid.querySelectorAll(".grid-item, .panel");

    items.forEach((item) => {
      item.removeAttribute("style");

      item.style.position = "static";
      item.style.width = "100%";
      item.style.maxWidth = "100%";
      item.style.left = "auto";
      item.style.top = "auto";
      item.style.right = "auto";
      item.style.transform = "none";
      item.style.margin = "0 0 12px 0";
      item.style.boxSizing = "border-box";
    });

    window.layoutSystemInitialized = true;
    return;
  }

  // DESKTOP
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

  // Enter key
  searchInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      performSearch();
    }
  });

  // Search icon click
  const searchIcon = document.querySelector(
    ".search-wrapper i.fa-arrow-right"
  );

  if (searchIcon) {
    searchIcon.addEventListener("click", performSearch);
  }
}

/**
 * Main application initialization
 */
document.addEventListener("DOMContentLoaded", () => {
  console.log("🚀 App initializing...");

  // Dependency checks
  if (typeof Packery === "undefined") {
    console.warn("⚠️ Packery not loaded");
  } else {
    console.log("✅ Packery loaded");
  }

  if (typeof Sortable === "undefined") {
    console.warn("⚠️ SortableJS not loaded");
  } else {
    console.log("✅ SortableJS loaded");
  }

  // Initialize modules
  safeInit("Local Music Player", "music-player", initLocalPlayer);
  safeInit("Radio", "radio", initRadio);
  safeInit("News", "news", initNews);

  // Energy module needs additional elements
  try {
    const gridElement = document.getElementById("grid");
    const carbonValElement = document.getElementById("carbon-val");
    const carbonMsgElement = document.getElementById("carbon-msg");

    if (gridElement && carbonValElement && carbonMsgElement) {
      initEnergy(gridElement, carbonValElement, carbonMsgElement);
      console.log("✅ Energy module initialized");
    } else {
      console.warn("⚠️ Energy elements not found");
    }
  } catch (error) {
    console.error("Error initializing Energy:", error);
  }

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

  // Initialize responsive layout after content has rendered
  setTimeout(initResponsiveLayout, 300);

  // Reinitialize layout on resize
  let resizeTimeout;

  window.addEventListener("resize", () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(initResponsiveLayout, 250);
  });

  // Reinitialize layout on device rotation
  window.addEventListener("orientationchange", () => {
    setTimeout(initResponsiveLayout, 300);
  });

  console.log("🎉 App initialization complete");
});

// Export for debugging
window.appVersion = "1.0.0";

window.appModules = {
  news: initNews,
  energy: initEnergy,
  ai: initAI,
  weather: initWeather,
  mastodon: initMastodon,
  radio: initRadio,
  spotify: initSpotify,
  emergency: initEmergency,
  bus: initBus,
  gallery: initGallery,
  localPlayer: initLocalPlayer,
  friendlyPhone: initFriendlyPhone,
  layout: initLayoutSystem,
};
