// js/core/module-registry.js
// Single source of truth for all modules across dashboard, settings, and selector.
// =============================================================================

window.HANDI_MODULES = [
  // ─── Free modules ──────────────────────────────────────────────────────
  {
    id: "gallery",
    name: "Gallery",
    icon: "🖼️",
    desc: "Photos & memories",
    tier: "free",
    defaultEnabled: true,
    settingsConfig: { speed: 8000, autoStart: true },
  },
  {
    id: "music",
    name: "Music Player",
    icon: "🎵",
    desc: "Your playlists",
    tier: "free",
    defaultEnabled: true,
    settingsConfig: { volume: 100, shuffle: false },
  },
  {
    id: "radio",
    name: "Radio",
    icon: "📻",
    desc: "Internet radio stations",
    tier: "free",
    defaultEnabled: true,
    settingsConfig: { defaultStation: "0", volume: 100 },
  },
  {
    id: "news",
    name: "News",
    icon: "📰",
    desc: "Top headlines",
    tier: "free",
    defaultEnabled: true,
    settingsConfig: { rssUrl: "", refresh: 15, maxArticles: 4 },
  },
  {
    id: "social",
    name: "Social",
    icon: "🐘",
    desc: "Mastodon feed",
    tier: "free",
    defaultEnabled: true,
    settingsConfig: { instance: "https://mastodon.ie", limit: 4 },
  },
  {
    id: "calendar",
    name: "Calendar",
    icon: "📅",
    desc: "Events & reminders",
    tier: "free",
    defaultEnabled: true,
    settingsConfig: { url: "", notificationMinutes: 30 },
  },
  {
    id: "phone",
    name: "SIM Phone",
    icon: "📞",
    desc: "SIM-based phone calls",
    tier: "free",
    defaultEnabled: true,
    settingsConfig: { contacts: [], autoDialDelay: 10 },
  },
  {
    id: "chat",
    name: "Chat",
    icon: "💬",
    desc: "Matrix messaging",
    tier: "free",
    defaultEnabled: true,
    settingsConfig: {
      homeserver: "https://matrix.org",
      accessToken: "",
      userId: "",
      rooms: [],
      refreshInterval: 30,
    },
  },

  // ─── Premium modules ───────────────────────────────────────────────────
  {
    id: "live_bus",
    name: "Live Bus Tracker",
    icon: "🚌📍",
    desc: "Real-time transit & routes",
    tier: "premium",
    defaultEnabled: true,
    settingsConfig: { routeIds: "", stopIds: "" },
  },
  {
    id: "webrtc",
    name: "Free Calls",
    icon: "📱",
    desc: "Free VoIP & international calls",
    tier: "premium",
    defaultEnabled: false,
    settingsConfig: {
      baseUrl: "",
      apiKey: "",
      appId: "",
      callerId: "",
    },
  },
  {
    id: "emergency_alert",
    name: "Location Share",
    icon: "📍",
    desc: "Share your location with trusted contacts",
    tier: "premium",
    defaultEnabled: true,
    settingsConfig: { contacts: [] },
  },
  {
    id: "click_to_call",
    name: "Click to Call",
    icon: "📞",
    desc: "Call any phone number via Infobip",
    tier: "premium",
    defaultEnabled: true,
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

// Helper: get enabledModules defaults
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
