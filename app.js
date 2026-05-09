// app.js
import initNews from "./modules/news/news.module.js";
import initEnergy from "./modules/energy/energy.module.js";
import initAI from "./modules/ai/ai.module.js";
import initWeather from "./modules/weather/weather.module.js";
import initMastodon from "./modules/mastodon/mastodon.module.js";
import initRadio from "./modules/radio/radio.module.js"; 
import initSpotify from "./modules/spotify/spotify.module.js";  // Add this
import initEmergency from "./modules/emergency/emergency.module.js";  // Add this
import initBus from "./modules/bus/bus.module.js"; 
import initGallery from "./modules/gallery/gallery.module.js";  
import initRadio from "./modules/radio/radio.module.js";
import initLocalPlayer from "./modules/local-player/local-player.module.js";
import initFriendlyPhone from "./modules/friendly-phone/friendly-phone.module.js";  // Add thi
import initLayoutSystem from "./modules/ui/layout-system.js";

// Global flag to track layout initialization
window.layoutSystemInitialized = false;

document.addEventListener("DOMContentLoaded", () => {
  console.log("🚀 App initializing...");
  
  // Check if dependencies are loaded
  if (typeof Packery === 'undefined') {
    console.error("❌ Packery not loaded! Check script includes.");
  } else {
    console.log("✅ Packery loaded");
  }
  
  if (typeof Sortable === 'undefined') {
    console.error("❌ SortableJS not loaded! Check script includes.");
  } else {
    console.log("✅ SortableJS loaded");
  }
  
  // Initialize all modules with proper error handling
  try {
    const musicElement = document.getElementById("music-player");
    if (musicElement) {
      initLocalPlayer(musicElement);
      console.log("✅ Local music player module initialized");
    } else {
      console.warn("⚠️ Local music player element not found");
    }
  } catch (error) {
    console.error("Error initializing local music player:", error);
  }

// Initialize all modules with proper error handling
  try {
    const radioElement = document.getElementById("radio");
    if (radioElement) {
      initNews(radioElement);
      console.log("✅ Radio module initialized");
    } else {
      console.warn("⚠️ Radio element not found");
    }
  } catch (error) {
    console.error("Error initializing radio:", error);
  }
  
  // Initialize all modules with proper error handling
  try {
    const newsElement = document.getElementById("news");
    if (newsElement) {
      initNews(newsElement);
      console.log("✅ News module initialized");
    } else {
      console.warn("⚠️ News element not found");
    }
  } catch (error) {
    console.error("Error initializing news:", error);
  }


  
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
    console.error("Error initializing energy:", error);
  }
  
  try {
    const weatherElement = document.getElementById("weather");
    if (weatherElement) {
      initWeather(weatherElement);
      console.log("✅ Weather module initialized");
    } else {
      console.warn("⚠️ Weather element not found");
    }
  } catch (error) {
    console.error("Error initializing weather:", error);
  }
  
  try {
    const mastodonElement = document.getElementById("mastodon");
    if (mastodonElement) {
      initMastodon(mastodonElement);
      console.log("✅ Mastodon module initialized");
    } else {
      console.warn("⚠️ Mastodon element not found");
    }
  } catch (error) {
    console.error("Error initializing mastodon:", error);
  }
  
  try {
    const aiElement = document.getElementById("aiBtn");
    if (aiElement) {
      initAI(aiElement);
      console.log("✅ AI module initialized");
    } else {
      console.warn("⚠️ AI element not found");
    }
  } catch (error) {
    console.error("Error initializing AI:", error);
  }
  

  try {
    const radioElement = document.getElementById("radio");
    if (radioElement) {    
      initRadio(radioElement);
      console.log("✅ Radio module initialized");
    } else {
      console.warn("⚠️ Radio element not found");
    }
  } catch (error) {
    console.error("Error initializing Radio:", error);
  }

// spotify initialization
  try {
    const spotifyElement = document.getElementById("spotify");
    if (spotifyElement) {    
      initSpotify(spotifyElement);
      console.log("✅ Spotify module initialized");
    } else {
      console.warn("⚠️ Spotify element not found");
    }
  } catch (error) {
    console.error("Error initializing Spotify:", error);
  } 

  // emergency initialization
  try {
    const emergencyElement = document.getElementById("emergency");
    if (emergencyElement) {    
      initEmergency(emergencyElement);
      console.log("✅ Emergency module initialized");
    } else {
      console.warn("⚠️ Emergency element not found");
    }
  } catch (error) {
    console.error("Error initializing Emergency module:", error);
  }

// bus initialization
  try {
    const busElement = document.getElementById("bus");
    if (busElement) {    
      initBus(busElement);
      console.log("✅ Bus module initialized");
    } else {
      console.warn("⚠️ Bus element not found");
    }
  } catch (error) {
    console.error("Error initializing Bus module:", error);
  }  

// gallery initialization
  try {
    const galleryElement = document.getElementById("gallery");
    if (galleryElement) {    
      initGallery(galleryElement);
      console.log("✅ Gallery module initialized");
    } else {
      console.warn("⚠️ Gallery element not found");
    }
  } catch (error) {
    console.error("Error initializing Gallery module:", error);
  }

  // friendly phone initialization
  try {
    const phoneElement = document.getElementById("friendly-phone");
    if (phoneElement) {    
      initFriendlyPhone(phoneElement);
      console.log("✅ Friendly Phone module initialized");
    } else {
      console.warn("⚠️ Friendly Phone element not found");
    }
  } catch (error) {
    console.error("Error initializing Friendly Phone module:", error);
  }

  // Initialize Layout System (Packery + SortableJS + Pin System)
  // Give a small delay to ensure all content is rendered
  setTimeout(() => {
    try {
      initLayoutSystem();
      window.layoutSystemInitialized = true;
      console.log("✅ Layout system initialized");
    } catch (error) {
      console.error("❌ Error initializing layout system:", error);
    }
  }, 100);
  
  // Add search functionality
  initializeSearch();
  
  // Add resize handler to fix layout on window resize
  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      if (window.layoutSystemInitialized && window.packeryInstance) {
        window.packeryInstance.layout();
        console.log("Layout refreshed after resize");
      }
    }, 250);
  });
  
  console.log("🎉 App initialization complete");
});

// Search functionality
function initializeSearch() {
  const searchInput = document.getElementById('searchInput');
  const searchEngine = document.getElementById('searchEngine');
  
  if (!searchInput || !searchEngine) {
    console.warn("⚠️ Search elements not found");
    return;
  }
  
  // Search on Enter key
  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      performSearch();
    }
  });
  
  // Optional: Add click handler for search icon
  const searchIcon = document.querySelector('.search-wrapper i.fa-arrow-right');
  if (searchIcon) {
    searchIcon.addEventListener('click', performSearch);
  }
  
  function performSearch() {
    const query = searchInput.value.trim();
    if (!query) return;
    
    const engine = searchEngine.value;
    let searchUrl = '';
    
    switch(engine) {
      case 'google':
        searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
        break;
      case 'duckduckgo':
        searchUrl = `https://duckduckgo.com/?q=${encodeURIComponent(query)}`;
        break;
      case 'brave':
        searchUrl = `https://search.brave.com/search?q=${encodeURIComponent(query)}`;
        break;
      case 'proton':
        searchUrl = `https://search.proton.me/?q=${encodeURIComponent(query)}`;
        break;
      default:
        searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    }
    
    window.open(searchUrl, '_blank');
    searchInput.value = '';
  }
}

// Export for debugging
window.appVersion = '1.0.0';
window.appModules = {
  news: initNews,
  energy: initEnergy,
  ai: initAI,
  weather: initWeather,
  mastodon: initMastodon,
  layout: initLayoutSystem
};
