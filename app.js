import initNews from "./modules/news/news.module.js";
import initEnergy from "./modules/energy/energy.module.js";
import initAI from "./modules/ai/ai.module.js";
import initWeather from "./modules/weather/weather.module.js";
import initMastodon from "./modules/mastodon/mastodon.module.js";
// import initPinSystem from "./modules/ui/pin-system.js"; // No longer needed directly
import initLayoutSystem from "./modules/ui/layout-system.js";

document.addEventListener("DOMContentLoaded", () => {
  // Initialize Modules
  initNews(document.getElementById("news"));
  initEnergy(
    document.getElementById("grid"),
    document.getElementById("carbon-val"),
    document.getElementById("carbon-msg")
  );
  initWeather(document.getElementById("weather"));
  initMastodon(document.getElementById("mastodon"));
  initAI(document.getElementById("aiBtn"));

  // Initialize Layout System (Packery + Draggable + Pin)
  initLayoutSystem();
});