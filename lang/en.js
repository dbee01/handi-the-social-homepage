/*
 * Copyright (c) 2026 Handi Homepage
 * This file is part of HandiHomepage and is released under the GNU General Public License v3.0.
 * See the LICENSE file in the repository root for full details.
 */

// ple/lang/en.js — English language strings
var LANG = {
  // Header
  brandName: "Handi Homepage",
  instructions: "Instructions",
  instructionsText: 'Configure your private personal homepage here. Click the <i class="fa-solid fa-circle-info" style="color: #000"></i> help button on each homepage element (next screen) to learn more.',
  sitePackHint: "Do you have a Site Pack? Scroll to bottom of page. Remember to click the checkbox at the bottom of the page to proceed.",

  // Help tips
  tipUnlock: "Unlock sound: press the red lock icon to unlock module controls",
  tipMute: "Mute all: press the speaker icon to silence all dashboard sound",
  tipSettings: "Settings: press the settings icon to configure the dashboard",
  tipSafeSearch:
    "Safe search: enter a search term to find content in a privacy-friendly environment",
  tipStayAwake: "Stay awake: press the sun icon to keep the screen awake",
  tipHelp: "Help: press the 'i' info button to get the info on any element",

  // Theme selector
  selectTheme: "\uD83C\uDFA8 Select your theme",
  selectLanguage: "<i class='fa-solid fa-language'></i> Select your language",
  themeEssential: "Essential",
  themeEssentialDesc: "High contrast &amp; large type",
  themeTechie: "Techie",
  themeTechieDesc: "Green phosphor terminal",
  themeBlossom: "Blossom",
  themeBlossomDesc: "Soft pinks &amp; light blues",
  themeCampus: "Campus",
  themeCampusDesc: "Bold yellow &amp; black",

  // Element selector
  selectModules: "\uD83D\uDD27 Select your elements",
  freeModules: "\uD83C\uDD93 FREE ELEMENTS",
  premiumModules: "\uD83D\uDC8E PREMIUM ELEMENTS",

  // Consent
  consentText:
    'I agree to the <a href="https://handihomepage.com/privacy">Privacy Policy</a> and <a href="https://handihomepage.com/terms">Terms &amp; Conditions</a>',

  // Buttons
  btnReset: "\u27F3 Reset",
  btnPremium: "<i class='fa-solid fa-star'></i> Add Premium (7 day trial)",
  btnSubmit: "\u2713 Submit",
  btnSitePack: "\uD83D\uDCE6 Load Site Pack",
  btnAdd: "\u2717",
  btnRemove: "\u2713",
  btnDisabled: "\u2014",
  labelPremium: "PREMIUM",

  // Alerts
  alertConsentModules:
    "\u26A0\uFE0F Please accept the Privacy Policy to add or remove Premium elements.",
  alertConsentReset: "\u26A0\uFE0F Please accept the Privacy Policy to reset.",
  alertConsentApply: "\u26A0\uFE0F Please accept the Privacy Policy to apply.",
  alertResetDone:
    '\u2713 Reset complete! Click "Apply to dashboard" to save changes.',

  // Element names
  modules: {
    gallery: { name: "Gallery", desc: "Photos" },
    music: { name: "Player", desc: "Your playlists" },
        cast: { name: "Cast", desc: "Podcast player" },
        radio: { name: "Radio", desc: "Radio stations" },
    news: { name: "News", desc: "Top headlines" },
    social: { name: "Social", desc: "Mastodon feed" },
    calendar: { name: "Calendar", desc: "Reminders" },
    chat: { name: "Chat", desc: "Messaging" },
    phone: { name: "Phone", desc: "Free calls" },
    live_bus: { name: "Live Bus", desc: "Bus times" },
    emergency_alert: { name: "Location", desc: "Share location" },
    weather: { name: "Weather", desc: "Forecast" },
    task: { name: "Tasks", desc: "To-do list" },
    support: { name: "Support", desc: "Support links" },
    llm: { name: "LLM", desc: "Private AI chat" },
  },

  // Dashboard component strings
  d_loading: "Loading...",
  d_noData: "No data available.",
  d_error: "Failed to load.",
  d_retry: "Retry",
  d_changeSource: "Change source",
  d_changeServer: "Change server",
  d_chooseAnother: "Choose another source",
  d_scrollUp: "Scroll Up",
  d_scrollDown: "Scroll Down",
  d_selectFeed: "Select a news source",
  d_selectServer: "Select a Mastodon server",
  d_selectCountry: "Select country",
  d_browseStations: "Select a country above to browse stations",
  d_configureNews: "Configure NEWS element",
  d_configureSocial: "Configure SOCIAL element",
  d_uploadImages: "Load Images",
  d_imagesLoaded: "images loaded",
  d_musicLoaded: "music files loaded",
  d_addImages: "Add Images",
  d_noImages: "No images in gallery.",
  d_fullScreen: "Full Screen",
  d_pause: "Pause",
  d_play: "Play",
  d_pasteIcal: "Paste iCal URL...",
  d_save: "Save",
  d_changeUrl: "Change URL",
  d_refresh: "Refresh",
  d_noCalendar: "No calendar configured.",
  d_todaysEvents: "Today's Events",
  d_minWarning: "min warning",
  d_on: "Alerts On",
  d_off: "Alerts Off",
  d_noEventsToday: "No events scheduled for today.",
  d_eventsTomorrow: "event(s) tomorrow.",
  d_lastSynced: "Last synced:",
  d_totalEvents: "total events in feed",
  d_untitledEvent: "Untitled Event",
  d_noStation: "No station playing",
  d_radioLocked: "Radio is locked – unlock to play",
  d_radioLockedShort: "Radio locked",
  d_connecting: "Connecting to",
  d_nowPlaying: "Now playing:",
  d_paused: "Paused:",
  d_playbackFailed: "Playback failed",
  d_streamUnavailable: "Stream unavailable",
  d_cannotPlay: "Cannot play this station",
  d_tryAnother: "Try another source.",
  d_tryAnotherServer: "Failed to load. Try another server.",
  d_untitled: "Untitled",
  d_chooseServer: "Choose another server",
  d_dateUnknown: "Date unknown",

  // Music player
  d_ready: "Ready",
  d_playing: "...playing",
  d_paused: "Paused",
  d_locked: "Locked",
  d_playerLocked: "Player locked – unlock to play",
  d_musicLoadFailed: "Failed to load music library.",
  d_musicStorageBlocked:
    'Your browser blocks storage. Check Firefox settings → Privacy → make sure "Never remember history" is OFF.',
  d_noMusic: "No music loaded.",
  d_addMusicSettings: "Add Music in Settings",
  d_loadMusic: "Load Music",
  d_playbackAborted: "Playback aborted",
  d_networkError: "Network error",
  d_fileCorrupted: "File corrupted or unsupported format",
  d_formatNotSupported: "Format not supported",
  d_unknownError: "Unknown error",
  d_cannotPlayFile: "Cannot play file",
  d_cannotPlayStream: "Cannot play live stream",
  d_cannotResume: "Cannot resume",
  d_invalidFile: "Invalid file",

  // Phone
  d_noContacts: "No contacts saved.",
  d_addContacts: "Add Contacts in Settings",
  d_caregiver: "Caregiver",

  // Click-to-call
  d_selectDevices: "Select Devices",
  d_microphone: "Microphone",
  d_speaker: "Speaker",
  d_camera: "Camera",
  d_cancel: "Cancel",
  d_apply: "Apply",
  d_micMuted: "Your microphone is muted",
  d_default: "Default",
  d_applyingDevices: "Applying devices...",
  d_devicesUpdated: "Devices updated",
  d_deviceSwitchFailed: "Device switch failed",
  d_ringing: "Ringing...",

  // Emergency / Location
  d_share: "SHARE",
  d_send: "Send",
  d_locationShared: "Someone shared their location with you.",
  d_location: "Location",
  d_time: "Time",
  d_noTrustedContacts: "No trusted contacts saved.",
  d_locate: "LOCATE",
  d_mobileOnly: "mobile only",
  d_shareLocked: "Share button is locked – unlock to activate.",
  d_shareConfirm:
    "Share your location? This will send your current location to your trusted contacts.",
  d_shareCancelled: "Share cancelled.",
  d_gettingLocation: "Getting your location (please allow precise location)...",
  d_geolocationUnsupported: "Geolocation is not supported by your browser.",
  d_locationNotIreland: "The location we received",
  d_notIreland: "does not appear to be in Ireland.",
  d_impreciseGps:
    "This may be because your browser could not get a precise GPS fix",
  d_sendAnyway: "Do you still want to send your location?",
  d_shareCancelledInaccurate: "Share cancelled – location inaccurate.",
  d_sendingTo: "Location obtained. Sending to",
  d_contacts: "contact(s)...",
  d_sent: "Location sent to",
  d_failed: "Failed:",
  d_viewOnOsm: "View shared location on OpenStreetMap",
  d_sendFailed: "Failed to send location. Check network or contact numbers.",
  d_permissionDenied:
    "Location permission denied. Please allow precise location in your browser settings.",
  d_positionUnavailable:
    "Location information unavailable. Please check your GPS or try again.",
  d_timeout:
    "Location request timed out. Please move to an area with better GPS signal.",
  d_unknownGeoError: "Unknown geolocation error.",

  // Chat
  d_new: "New!",
  d_errorLabel: "Error",
  d_noMessages: "No messages yet",
  d_refresh: "Refresh",
  d_configureSettings: "Configure in Settings",
  d_loadingMatrix: "Loading Matrix rooms...",
  d_matrixNotConfigured: "Matrix chat not configured.",
  d_noChatRooms: "No chat rooms configured.",
  d_invalidRoom: "Invalid Room",
  d_couldNotResolveRoom: "Could not resolve room",
  d_encryptedMessage: "🔒 Encrypted message",

  // Calendar
  d_noCalendar: "No calendar configured.",
  d_save: "Save",
  d_loadingCalendar: "Loading calendar...",
  d_calendarFailed: "Failed to load calendar.",
  d_youHave: "You have",
  d_untitledEvent: "Untitled Event",

  // Bus
  d_noBusRoutes: "No bus routes configured.",
  d_departure: "Departure",
  d_return: "Return",
  d_changeDirection: "Change Direction",
  d_noUpcoming: "No upcoming",
  d_live: "Live",
  d_scheduled: "Scheduled",
  d_due: "Due",

  // Task
    d_tasks: "Tasks",
    d_taskTitle: "Task title",
    d_taskDesc: "Description (optional)",
    d_noLabel: "No label",
    d_labelName: "Label name",
    d_addSubtask: "Add subtask",
    d_addTask: "Add Task",
    d_noTasks: "No tasks yet",
    d_subtask: "Subtask",
    d_delete: "Delete",
    d_edit: "Edit",
    d_updateTask: "Update Task",
    d_taskDeleted: "Task deleted",
    d_undo: "Undo",

    // LLM
    d_llm: "AI",
    d_llmSelect: "Select model...",
    d_llmLoad: "Load",
    d_llmLoaded: "Loaded",
    d_llmClear: "Clear chat",
    d_llmEmpty: "Load a model and start chatting.",
    d_llmPlaceholder: "Ask something...",
    d_llmSend: "Send",
    d_llmDownloading: "Downloading",
    d_llmFailed: "No compatible GPU found. WebGPU requires Chrome 113+ or Edge 113+. Visit webgpureport.org to check your browser.",
    d_llmNoWebgpu: "WebGPU not available. Requires Chrome 113+ or Edge 113+.",
    d_llmYou: "You",
      d_llmHelpTitle: "Private AI Chat",
      d_llmHelpBody: "Downloads an LLM to your browser. Runs 100% on your device — no data leaves your computer. Requires WebGPU (Chrome/Edge). First load downloads ~600MB-2GB.",
      d_llmHelpOk: "Got it",

      d_noCast: "Load your podcasts here",
        d_loadCast: "Load Podcasts",
        d_castLoadFailed: "Failed to load podcast library.",
                d_castStorageBlocked: 'Your browser blocks storage. Check Firefox settings → Privacy → make sure "Never remember history" is OFF.',

                // Support
                d_configureSupport: "Configure in Settings.",
                d_noSupport: "No support links configured.",

        // Weather
  d_weatherDisabled: "Weather module disabled.",
  d_enableWeather: "Enable in Settings → Weather",
  d_loadingWeather: "Loading weather...",
  d_notFound: "not found",
  d_noWeatherData: "No weather data available",
  d_weatherFailed: "Failed to load weather",
  weather_0: "☀️ Clear",
  weather_1: "🌤️ Clear",
  weather_2: "⛅ Cloudy",
  weather_3: "☁️ Overcast",
  weather_45: "🌫️ Fog",
  weather_48: "🌫️ Fog",
  weather_51: "🌧️ Drizzle",
  weather_53: "🌧️ Drizzle",
  weather_55: "🌧️ Drizzle",
  weather_61: "🌧️ Light rain",
  weather_63: "🌧️ Rain",
  weather_65: "🌧️ Heavy rain",
  weather_71: "🌨️ Light snow",
  weather_73: "🌨️ Snow",
  weather_75: "🌨️ Heavy snow",
  weather_80: "🌧️ Showers",
  weather_81: "🌧️ Showers",
  weather_82: "🌧️ Heavy showers",
  weather_85: "🌨️ Snow showers",
  weather_86: "🌨️ Heavy Snow",
  weather_95: "⛈️ Thunderstorm",

  // Settings
  s_settings: "Settings",
  s_resetAll: "Reset All",
  s_saveExit: "Save & Exit",
  s_freeElements: "Free Elements",
  s_weatherLocation: "Weather Location",
  s_location: "Location",
  s_country: "Country",
  s_detectLocation: "Detect My Location",
  s_slideshowSpeed: "Slideshow speed",
  s_autoStart: "Auto-start",
  s_yes: "Yes",
  s_no: "No",
  s_gallery: "Gallery",
  s_loadImages: "Load Images",
  s_musicPlayer: "Music Player",
  s_defaultVolume: "Default volume",
  s_defaultShuffle: "Default shuffle",
  s_off: "Off",
  s_on: "On",
  s_loadMusic: "Load Music",
  s_radio: "Radio",
  s_defaultCountryFilter: "Default Country Filter",
  s_selectCountry: "-- Select country --",
  s_news: "News",
  s_rssFeed: "RSS Feed",
  s_defaultPageSelector: "— Default (page selector) —",
  s_refreshMinutes: "Refresh interval (minutes)",
  s_maxArticles: "Max articles",
  s_socialMedia: "Social Media",
  s_mastodonServer: "Mastodon Server",
  s_trendingLimit: "Trending limit",
  s_chatMatrix: "Chat (Matrix)",
  s_homeserver: "Homeserver",
  s_username: "Username",
  s_password: "Password",
  s_room: "Room",
  s_refreshInterval: "Refresh interval",
  s_premiumElements: "Premium Elements",
  s_liveBusTracker: "Live Bus Tracker",
  s_route: "Route",
  s_busRoute: "Bus Route",
  s_departureStop: "Departure Stop",
  s_selectRoute: "-- Select Route --",
  s_destinationStop: "Destination Stop",
  s_route3Optional: "Route 3 (optional)",
  s_phone: "Phone",
  s_premium: "Premium",
  s_contacts: "Contacts",
  s_add: "Add",
  s_locationShare: "Location Share",
  s_locationShareNote:
      "Location sharing is configured per contact in the Phone module above",
    s_support: "Support",
    s_supportImage: "Image",
    s_supportLoadImage: "Upload Image",
    s_supportTitle: "Image Title",
    s_supportLink: "Link URL",
    s_supportDesc: "Description (max 300 words)",
  s_calendar: "Calendar",
  s_calendarIcsLink: "Calendar ICS Link",
  s_notificationTime: "Notification time",
  s_getIcsLink:
    'Get ICS link from Proton Calendar → Settings → Calendars → "Link for viewing"',
  s_freeTrial: "✨ Try Premium",

  // Module help texts
  h_gallery:
    "<strong>📸 Gallery</strong><br><br>• Upload images in <strong>Settings → Gallery</strong>.<br>• Use <strong>Prev / Next</strong> to browse, <strong>Play/Pause</strong> for slideshow.<br>• Click <strong>Full Screen Gallery</strong> to open the lightbox.<br>• Image filenames appear as captions – use names like <code>my+lovely+horse.jpg</code> for readability.",
  h_live_bus:
    "<strong>🚌 Live Bus</strong><br><br>• Shows real‑time arrival times for your chosen stop.<br>• Configure routes and stops in <strong>Settings → Live Bus Tracker</strong>.<br>• Click <strong>Refresh Times</strong> to update manually.<br>• Use <strong>Switch Direction</strong> to toggle between stops.",
  h_music:
    "<strong>🎵 Music Player</strong><br><br>• Upload MP3 files in <strong>Settings → Music Player</strong>.<br>• Click a track to play – the visualiser responds to sound.<br>• Use <strong>Prev / Next</strong> and the <strong>lock</strong> to prevent accidental changes.<br>• File extensions (e.g., .mp3) are hidden for cleaner display.",
  h_news:
    "<strong>📰 News</strong><br><br>• Fetches the latest headlines from your chosen RSS feed.<br>• Change the feed in <strong>Settings → News</strong>.<br>• Use the <strong>▲ / ▼</strong> buttons to scroll through articles.<br>• Click any headline to read the full story on the source website.",
  h_social:
    "<strong>🐘 Social</strong><br><br>• Shows trending links from your Mastodon feed.<br>• Change the instance in <strong>Settings → Social</strong>.<br>• Use <strong>▲ / ▼</strong> to scroll through posts.<br>• Click any link to open it in a new tab.",
  h_radio:
    "<strong>📻 Radio</strong><br><br>• Choose from international radio stations.<br>• Click a station to start streaming – may take a few seconds.<br>• The synthesiser animates while playing.<br>• Use the <strong>lock</strong> (🔒) to disable accidental station changes.",
  h_emergency_alert:
    "<strong>📍 Location Alert</strong><br><br><strong>📱 Mobile phones only.</strong><br>• Sends an SMS with your GPS location to trusted contacts.<br>• Requires GPS and mobile network (not available on desktop/tablet).<br>• Add contacts in <strong>Settings → Location Share</strong>.<br>• Unlock the button (🔓) then press <strong>SHARE</strong> to send.<br>• Test with your own number first to ensure it works.",
  h_phone:
    "<strong>📞 Friendly Phone</strong><br><br>• One‑tap calling to your saved contacts.<br>• Add contacts with photos in <strong>Settings → Friendly Phone</strong>.<br>• The module is <strong>locked by default</strong> – unlock to enable calls.<br>• Photos help identify contacts at a glance.",
  h_chat:
    "<strong>💬 Chat (Matrix)</strong><br><br>• Create your own Matrix account at <a href='https://app.element.io' target='_blank' rel='noopener'>Element Matrix</a> to start private family or friend chat rooms.<br>• Add room URLs, access token, user ID in <strong>Settings → Chat</strong>.<br>• The module checks for new messages every 30 seconds.<br>• Click the room header to expand and view messages.<br>• New message notifications appear as a red badge.",
  h_calendar:
      "<strong>📅 Calendar (Proton ICS)</strong><br><br>• Shows today's events from your Proton Calendar.<br>• Get your ICS link from Proton Calendar → Settings → Calendars → 'Share with anyone' → 'Create link'.<br>• Paste the ICS link in <strong>Settings → Calendar</strong>.<br><br><strong>🔔 Alerts:</strong><br>• Notifications are set in your calendar app — e.g. 2 notifications on a calendar event = two alerts on this dashboard.<br>• Toggle alerts On/Off using the button at the top of the calendar.<br><br><strong>⚠️ Important limitations (Proton, not this module):</strong><br>• The ICS feed updates <strong>every 4–16 hours</strong> – new events take time to appear.<br>• Recurring events may not appear correctly.<br><br><strong>💡 Tips:</strong><br>• If an event doesn't appear, wait a few hours and try again.",

    h_llm:
        "<strong>🧠 Private AI (LLM)</strong><br><br>• Downloads a language model directly to your browser.<br>• <strong>100% private</strong> — no data ever leaves your device.<br>• Pick a model and click <strong>Load</strong> — first download is ~600MB–2GB.<br>• <strong>Requires WebGPU</strong> (Chrome/Edge 113+, Vivaldi with <code>#enable-unsafe-webgpu</code> flag).<br>• Once loaded, chat runs entirely offline on your GPU.<br>• Use <strong>Clear</strong> to reset the conversation.<br>• Chat history saved locally (last 100 messages).",

      h_task:
        "<strong>📋 Tasks</strong><br><br>• Create tasks with titles, descriptions, and colour labels.<br>• Add subtasks within each task.<br>• Check off completed tasks to remove them.<br>• Use the ✎ icon to edit a task, ✖ to delete.<br>• Deleted tasks can be undone for 5 seconds.<br>• All data is saved locally in your browser.",

      h_cast:
              "<strong>🎙️ Cast (Podcasts)</strong><br><br>• Upload podcast audio files (250MB limit per file).<br>• Use the lock icon to unlock, then click a track to play.<br>• Use ⏮ ⏭ buttons to navigate between tracks.<br>• The visualiser animates while playing.<br>• Podcasts are stored locally in your browser.",

            h_support:
              "<strong>🤝 Support</strong><br><br>• The Support element contains an image or video upload.<br>• The link can be to your website, shop, donation page, ticket supplier etc.<br>• Configure in <strong>Settings → Support</strong>.<br>• Upload an image or video (stored as data URL).<br>• Add a title, external URL link, and description.<br>• All data is saved locally in your browser.",

    h_modalTitle: "Module Help",
  h_gotIt: "Got it",
  h_noHelp: "No specific help available.",
  h_helpButton: "Help",
  h_helpAria: "Help for this module",
  h_pinToTop: "Pin to top",
  h_unpin: "Unpin",

  // Footer
  d_customizeDashboard: "Customize Dashboard",
  d_buildOwnPack: "Build Your Own Handi-Pack",
  d_freeTrial: "✨ Try Premium",
};
