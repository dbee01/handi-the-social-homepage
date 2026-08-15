
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
    id: "gallery",
    name: "Gallery",
    icon: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>',
    desc: "Photos",
    tier: "free",
    defaultEnabled: 1,
    settingsConfig: { speed: 8000, autoStart: true },
  },
  {
    id: "music",
    name: "Player",
    icon: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>',
    desc: "Your playlists",
    tier: "free",
    defaultEnabled: 0,
    settingsConfig: { volume: 100, shuffle: false, soundLock: false },
  },
  {
    id: "radio",
    name: "Radio",
    icon: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M6 7V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v3"/><circle cx="7" cy="14" r="1"/><circle cx="12" cy="14" r="1"/><circle cx="17" cy="14" r="1"/></svg>',
    desc: "Radio stations",
    tier: "free",
    defaultEnabled: 0,
    settingsConfig: { defaultStation: "0", volume: 100, soundLock: false },
  },
  {
    id: "news",
    name: "News",
    icon: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 22h16a2 2 0 0 0 2-2V6l-5-4H6a2 2 0 0 0-2 2v16z"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>',
    desc: "Top headlines",
    tier: "free",
    defaultEnabled: 1,
    settingsConfig: { rssUrl: "", refresh: 15, maxArticles: 10 },
  },
  {
    id: "social",
    name: "Social",
    icon: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M16 12v1a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.5 7.7"/></svg>',
    desc: "Mastodon feed",
    tier: "free",
    defaultEnabled: 1,
    settingsConfig: { instance: "https://mastodon.ie", limit: 3 },
  },
  {
    id: "calendar",
    name: "Calendar",
    icon: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
    desc: "Reminders",
    tier: "free",
    defaultEnabled: 0,
    settingsConfig: { url: "", notificationMinutes: 30 },
  },
  {
    id: "chat",
    name: "Chat",
    icon: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H8l-5 5V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
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
    id: "task",
    name: "Tasks",
    icon: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M9 12h6M9 16h6"/></svg>',
    desc: "To-do list",
    tier: "free",
    defaultEnabled: 1,
    settingsConfig: {},
  },
      // ─── Premium modules ───────────────────────────────────────────────────
  {
    id: "llm",
    name: "LLM",
    icon: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="7" width="10" height="10" rx="1"/><path d="M9 1v4M15 1v4M9 19v4M15 19v4M1 9h4M1 15h4M19 9h4M19 15h4"/></svg>',
    desc: "Private AI chat",
    tier: "premium",
    defaultEnabled: 3,
    settingsConfig: {},
  },


  {
    id: "cast",
        name: "Cast",
        icon: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M19 10v1a7 7 0 0 1-14 0v-1"/><line x1="12" y1="18" x2="12" y2="22"/></svg>',
        desc: "Podcast player",
        tier: "premium",
        defaultEnabled: 0,
        settingsConfig: { volume: 100, soundLock: false },
  },

  {
    id: "phone",
    name: "Phone",
    icon: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg>',
    desc: "Free calls",
    tier: "premium",
    defaultEnabled: 0,
    settingsConfig: { contacts: [] },
  },
  {
    id: "live_bus",
    name: "Bus times (Ireland)",
    icon: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="16" height="14" rx="2"/><path d="M4 10h16"/><circle cx="8" cy="18" r="1.5"/><circle cx="16" cy="18" r="1.5"/></svg>',
    desc: "Bus times (Ireland)",
    tier: "premium",
    defaultEnabled: 2,
    settingsConfig: { routeIds: "", stopIds: "" },
  },
  {
    id: "emergency_alert",
    name: "Location",
    icon: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7-5.5-7-11a7 7 0 0 1 14 0c0 5.5-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>',
    desc: "Share location",
    tier: "premium",
    defaultEnabled: 3,
    settingsConfig: { contacts: [] },
  },
  {
    id: "support",
    name: "Support",
    icon: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7-4.35-9.5-8.5C.5 9 2 5 5.5 5c2 0 3.5 1 4.5 2.5C11 6 12.5 5 14.5 5 18 5 19.5 9 17.5 12.5 15 16.65 12 21 12 21z"/></svg>',
    desc: "Support link with image and description",
    tier: "premium",
    defaultEnabled: 2,
    settingsConfig: { imageUrl: "", imageTitle: "", linkUrl: "", description: "" },
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
