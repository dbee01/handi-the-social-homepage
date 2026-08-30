/*
 * Copyright (c) 2026 Handi Homepage
 * This file is part of HandiHomepage and is released under the GNU General Public License v3.0.
 * See the LICENSE file in the repository root for full details.
 */
// js/core/settings.js

// Default settings for all modules
const DEFAULT_SETTINGS = {
  enabledModules: {
    gallery: false,
    bus: false,
    music: false,
    news: false,
    mastodon: false,
    radio: false,
    emergency: false,
    phone: false,
    chat: false,
    calendar: false,
  },
  gallery: { slideSpeed: 3000, autoStart: true, pixelfedUrl: "" },
  music: { volume: 100, shuffle: false, streamUrl: "" },
  radio: { defaultCountry: "", volume: 100, soundLock: false, streamUrl: "" },
  news: {
    rssUrl: "https://www.thejournal.ie/feed/",
    refreshInterval: 15,
    maxArticles: 10,
  },
  sports: { leagueIds: "357" },
  newsletter: { feedUrl: "" },
  flip: { profileUrl: "", topicUrl: "" },
  mastodon: { instanceUrl: "https://mastodon.ie", limit: 4 },
  live_bus: { routeIds: "", stopIds: "" },
  phone: { contacts: [], autoDialDelay: 10 },
  emergency: { contacts: [], checkInterval: 5 },
  chat: {
    rooms: ["#the-ple-room-ireland:matrix.org"],
    refreshInterval: 30,
    homeserver: "https://matrix.org",
    password: "",
    userId: "bigboyfoolish@matrix.org",
  },
  weather: { location: "Cork", country: "IE" },
  calendar: { url: "", notificationMinutes: 15 },
  cast: { volume: 100, soundLock: false, streamUrl: "" },
};

export function loadSettings() {
  const saved = localStorage.getItem("handiSettings");
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      return mergeDeep(DEFAULT_SETTINGS, parsed);
    } catch (e) {
      console.error("Failed to parse settings", e);
    }
  }
  // Return a fresh copy of defaults
  return JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
}

export function saveSettings(settings) {
  localStorage.setItem("handiSettings", JSON.stringify(settings));
  window.dispatchEvent(
    new CustomEvent("settingsChanged", { detail: settings }),
  );
}

function mergeDeep(target, source) {
  const output = { ...target };
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach((key) => {
      if (isObject(source[key]) && key in target) {
        output[key] = mergeDeep(target[key], source[key]);
      } else {
        output[key] = source[key];
      }
    });
  }
  return output;
}

function isObject(item) {
  return item && typeof item === "object" && !Array.isArray(item);
}
