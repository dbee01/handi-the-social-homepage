
/*
 * Copyright (c) 2026 Handi Homepage
 * This file is part of HandiHomepage and is released under the GNU General Public License v3.0.
 * See the LICENSE file in the repository root for full details.
 */

// js/core/module-registry.js
// Single source of truth for all modules across dashboard, settings, and selector.
//
// defaultEnabled values:
//   0 = Off      — Not displayed on dashboard, toggleable in selector
//   1 = On       — Displayed on dashboard, toggleable in selector
//   2 = Disabled — Admin-only, greyed out, not toggleable by user
//   3 = Hidden   — Completely hidden from selector, dashboard, and settings
// =============================================================================

window.HANDI_MODULES = [
  // ─── Free modules ──────────────────────────────────────────────────────
  {
    id: "cast",
    name: "Cast",
    icon: '<i class="fa-solid fa-podcast"></i>',
    desc: "Podcast player",
    tier: "free",
    defaultEnabled: 0,
    settingsConfig: { volume: 100, soundLock: false, streamUrl: "" },
  },
  {
    id: "flip",
    name: "Flip",
    icon: '<i class="fa-solid fa-right-left"></i>',
    desc: "Flipboard feeds",
    tier: "free",
    defaultEnabled: 0,
    settingsConfig: { profileUrl: "", topicUrl: "" },
  },
  {
    id: "social",
    name: "Social",
    icon: '<i class="fa-solid fa-at"></i>',
    desc: "Mastodon feed",
    tier: "free",
    defaultEnabled: 1,
    settingsConfig: { instance: "https://mastodon.ie", limit: 3 },
  },
  {
    id: "chat",
    name: "Chat",
    icon: '<i class="fa-solid fa-comments"></i>',
    desc: "Messaging",
    tier: "free",
    defaultEnabled: 0,
    settingsConfig: {
      homeserver: "https://matrix.org",
      accessToken: "",
      userId: "",
      rooms: [],
      refreshInterval: 30,
    },
  },
  {
    id: "music",
    name: "Player",
    icon: '<i class="fa-solid fa-music"></i>',
    desc: "Your playlists",
    tier: "free",
    defaultEnabled: 0,
    settingsConfig: { volume: 100, shuffle: false, soundLock: false, streamUrl: "" },
  },
  {
    id: "gallery",
    name: "Gallery",
    icon: '<i class="fa-solid fa-images"></i>',
    desc: "Photos",
    tier: "free",
    defaultEnabled: 1,
    settingsConfig: { speed: 8000, autoStart: true, pixelfedUrl: "" },
  },
  {
    id: "radio",
    name: "Radio",
    icon: '<i class="fa-solid fa-radio"></i>',
    desc: "Radio stations",
    tier: "free",
    defaultEnabled: 0,
    settingsConfig: { defaultStation: "0", volume: 100, soundLock: false, streamUrl: "" },
  },
  {
    id: "news",
    name: "News",
    icon: '<i class="fa-solid fa-newspaper"></i>',
    desc: "Top headlines",
    tier: "free",
    defaultEnabled: 1,
    settingsConfig: { rssUrl: "", refresh: 15, maxArticles: 10 },
  },
  {
    id: "sports",
    name: "Sports",
    icon: '<i class="fa-solid fa-futbol"></i>',
    desc: "Live football scores & key events",
    tier: "free",
    defaultEnabled: 0,
    settingsConfig: {},
  },

  // ─── Premium modules ───────────────────────────────────────────────────
  {
    id: "phone",
    name: "Phone",
    icon: '<i class="fa-solid fa-phone"></i>',
    desc: "Free calls",
    tier: "premium",
    defaultEnabled: 0,
    settingsConfig: { contacts: [] },
  },
  {
    id: "live_bus",
    name: "Bus times (Ireland)",
    icon: '<i class="fa-solid fa-bus"></i>',
    desc: "Bus times (Ireland)",
    tier: "premium",
    defaultEnabled: 2,
    settingsConfig: { routeIds: "", stopIds: "" },
  },
  {
    id: "calendar",
    name: "Calendar",
    icon: '<i class="fa-solid fa-calendar"></i>',
    desc: "Reminders",
    tier: "premium",
    defaultEnabled: 0,
    settingsConfig: { url: "", notificationMinutes: 30 },
  },
  {
    id: "task",
    name: "Tasks",
    icon: '<i class="fa-solid fa-list-check"></i>',
    desc: "To-do list",
    tier: "premium",
    defaultEnabled: 1,
    settingsConfig: {},
  },
  {
    id: "llm",
    name: "LLM",
    icon: '<i class="fa-solid fa-brain"></i>',
    desc: "Private AI chat",
    tier: "premium",
    defaultEnabled: 0,
    settingsConfig: {},
  },
  {
    id: "support",
    name: "Support",
    icon: '<i class="fa-solid fa-hand-holding-heart"></i>',
    desc: "Support link with image and description",
    tier: "premium",
    defaultEnabled: 1,
    settingsConfig: { imageUrl: "", imageTitle: "", linkUrl: "", description: "" },
  },
  {
    id: "emergency_alert",
    name: "Location",
    icon: '<i class="fa-solid fa-location-dot"></i>',
    desc: "Share location",
    tier: "premium",
    defaultEnabled: 3,
    settingsConfig: { contacts: [] },
  },
];

// Helper: get only free modules
window.HANDI_FREE_MODULES = function () {
  return window.HANDI_MODULES.filter((m) => m.tier === "free");
};

// Helper: get only premium modules
window.HANDI_PREMIUM_MODULES = function () {
  return window.HANDI_MODULES.filter((m) => m.tier === "premium");
};

// Helper: get enabledModules defaults (returns numeric 0/1/2 from registry)
window.HANDI_ENABLED_DEFAULTS = function () {
  const obj = {};
  for (const m of window.HANDI_MODULES) {
    obj[m.id] = m.defaultEnabled;
  }
  return obj;
};

// Helper: get settingsConfig defaults for loadSettings()
window.HANDI_SETTINGS_DEFAULTS = function () {
  const obj = {};
  for (const m of window.HANDI_MODULES) {
    obj[m.id] = m.settingsConfig;
  }
  return obj;
};

// Helper: get an array of all module IDs
window.HANDI_MODULE_IDS = function () {
  return window.HANDI_MODULES.map((m) => m.id);
};

// Helper: get module lookup by id
window.HANDI_MODULE_BY_ID = function (id) {
  return window.HANDI_MODULES.find((m) => m.id === id);
};

// =============================================================================
// Master Module Record (MMR)
// =============================================================================
// The MMR is the live source of truth stored in localStorage under the key
// "handiMasterModules". Each module is tracked with a 3-state value:
//   0 = off      -- not displayed, selectable in selector
//   1 = on       -- displayed on the dashboard
//   2 = disabled -- blocked, greyed out everywhere, cannot be selected (admin only)
//
// On first load the MMR is seeded directly from each module's defaultEnabled
// value in the registry (already 0, 1, or 2).

const MMR_KEY = "handiMasterModules";

window.MMR_OFF = 0;
window.MMR_ON = 1;
window.MMR_DISABLED = 2;
window.MMR_HIDDEN = 3; // completely hidden — not shown in selector, dashboard, or settings

// getMMR() -- reads the live MMR, seeding from registry defaults if absent
window.getMMR = function () {
  try {
    const raw = localStorage.getItem(MMR_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (parsed) {
      // Merge any new modules from the registry that aren't in the MMR yet
      let changed = false;
      for (const m of window.HANDI_MODULES) {
        if (!(m.id in parsed)) {
          parsed[m.id] = m.defaultEnabled;
          changed = true;
        }
      }
      if (changed) {
        localStorage.setItem(MMR_KEY, JSON.stringify(parsed));
      }
      return parsed;
    }
  } catch (e) {
    /* fall through */
  }
  // First load -- seed directly from registry defaultEnabled (0/1/2)
  const seed = {};
  for (const m of window.HANDI_MODULES) {
    seed[m.id] = m.defaultEnabled;
  }
  localStorage.setItem(MMR_KEY, JSON.stringify(seed));
  return seed;
};

// saveMMR(obj) -- persists the full MMR to localStorage
window.saveMMR = function (obj) {
  try {
    localStorage.setItem(MMR_KEY, JSON.stringify(obj));
    return true;
  } catch (e) {
    return false;
  }
};

// resetMMR() -- resets the MMR to registry defaults (re-reads defaultEnabled)
window.resetMMR = function () {
  const defaults = {};
  for (const m of window.HANDI_MODULES) {
    defaults[m.id] = m.defaultEnabled;
  }
  localStorage.setItem(MMR_KEY, JSON.stringify(defaults));
  return defaults;
};
