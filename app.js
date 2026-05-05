if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/service-worker.js");
}

import initNews from "./modules/news/news.module.js";
import initEnergy from "./modules/energy/energy.module.js";
import initAI from "./modules/ai/ai.module.js";
import initWeather from "./modules/weather/weather.module.js";
import initMastodon from "./modules/mastodon/mastodon.module.js";

document.addEventListener("DOMContentLoaded", () => {
  initNews(document.getElementById("news"));
  initEnergy(
    document.getElementById("grid"),
    document.getElementById("carbon-val"),
    document.getElementById("carbon-msg")
  );
  initWeather(document.getElementById("weather"));
  initMastodon(document.getElementById("mastodon"));
  initAI(document.getElementById("aiBtn"));
});
