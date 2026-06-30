// ple/lang/ga.js — Irish (Gaeilge)
var LANG = {
  brandName: "Handi Homepage",
  instructions: "Treoracha",

  tipUnlock:
    "Díghlasáil fuaim: brúigh an glas dearg chun rialuithe a dhíghlasáil",
  tipMute: "Ciúnaigh: brúigh an cainteoir chun gach fuaim a chiúnú",
  tipSettings: "Socruithe: brúigh an deilbhín socruithe chun cumrú",
  tipSafeSearch: "Cuardach sábháilte: cuardaigh i dtimpeallacht phríobháideach",
  tipStayAwake:
    "Fan i do dhúiseacht: brúigh an ghrian chun an scáileán a choinneáil ar siúl",
  tipHelp: "Cabhair: brúigh an cnaipe 'i' chun eolas a fháil",

  selectTheme: "\uD83C\uDFA8 Roghnaigh do théama",
  themeEssential: "Riachtanach",
  themeEssentialDesc: "Ardchodarsnacht &amp; cló mór",
  themeTechie: "Teicniúil",
  themeTechieDesc: "Teirminéal fosfair glas",
  themeBlossom: "Bláth",
  themeBlossomDesc: "Bándearga boga &amp; gorma éadroma",
  themeCampus: "Campas",
  themeCampusDesc: "Buí láidir &amp; dubh",

  selectModules: "\uD83D\uDD27 Roghnaigh do mhodúil",
  freeModules: "\uD83C\uDD93 MODÚIL SAOR IN AISCE",
  premiumModules: "\uD83D\uDC8E MODÚIL PREAMHAIM",

  consentText:
    'Glacaim leis an <a href="https://handihomepage.com/privacy">bPolasaí Príobháideachais</a> agus na <a href="https://handihomepage.com/terms">Téarmaí &amp; Coinníollacha</a>',

  btnReset: "\u27F3 Athshocraigh",
  btnPremium: "\u2B50 Cuir Préimh leis (triail 30 lá)",
  btnSubmit: "\u2713 Cuir isteach",
  btnAdd: "\u2717",
  btnRemove: "\u2713",
  btnDisabled: "\u2014",
  labelPremium: "PRÉIMH",

  alertConsentModules:
    "\u26A0\uFE0F Glac leis an bPolasaí Príobháideachais chun modúil Préimhe a bhainistiú.",
  alertConsentReset:
    "\u26A0\uFE0F Glac leis an bPolasaí Príobháideachais chun athshocrú.",
  alertConsentApply:
    "\u26A0\uFE0F Glac leis an bPolasaí Príobháideachais chun cur i bhfeidhm.",
  alertResetDone:
    '\u2713 Athshocrú críochnaithe! Cliceáil "Cuir isteach" chun sábháil.',

  modules: {
    gallery: { name: "Gailearaí", desc: "Grianghraif" },
    music: { name: "Seinnteoir", desc: "Do sheinmliostaí" },
    radio: { name: "Raidió", desc: "Stáisiúin raidió" },
    news: { name: "Nuacht", desc: "Príomhcheannlínte" },
    social: { name: "Sóisialta", desc: "Fotha Mastodon" },
    calendar: { name: "Féilire", desc: "Meabhrúcháin" },
    chat: { name: "Comhrá", desc: "Teachtaireachtaí" },
    phone: { name: "Fón", desc: "Glaonna saor in aisce" },
    live_bus: { name: "Bus Beo", desc: "Amanna bus" },
    emergency_alert: { name: "Suíomh", desc: "Roinn suíomh" },
    weather: { name: "Aimsir", desc: "Réamhaisnéis" },
  },

  d_loading: "Á lódáil...",
  d_noData: "Gan sonraí ar fáil.",
  d_error: "Theip ar an lódáil.",
  d_retry: "Bain triail eile as",
  d_changeSource: "Athraigh foinse",
  d_changeServer: "Athraigh freastalaí",
  d_chooseAnother: "Roghnaigh foinse eile",
  d_scrollUp: "Scrollaigh Suas",
  d_scrollDown: "Scrollaigh Síos",
  d_selectFeed: "Roghnaigh foinse nuachta",
  d_selectServer: "Roghnaigh freastalaí Mastodon",
  d_selectCountry: "Roghnaigh tír",
  d_browseStations: "Roghnaigh tír thuas chun stáisiúin a bhrabhsáil",
  d_configureNews: "Cumraigh eilimint NUACHT",
  d_configureSocial: "Cumraigh eilimint SHÓISIALTA",
  d_uploadImages: "Uaslódáil Íomhánna",
  d_addImages: "Cuir Íomhánna Leis",
  d_noImages: "Gan íomhánna sa ghailearaí.",
  d_fullScreen: "Lánscáileán",
  d_pause: "Sos",
  d_play: "Seinn",
  d_pasteIcal: "Greamaigh URL iCal...",
  d_save: "Sábháil",
  d_changeUrl: "Athraigh URL",
  d_refresh: "Athnuaigh",
  d_noCalendar: "Gan féilire cumraithe.",
  d_todaysEvents: "Imeachtaí an Lae Inniu",
  d_minWarning: "nóim rabhadh",
  d_noEventsToday: "Gan imeachtaí sceidealaithe inniu.",
  d_eventsTomorrow: "imeacht(í) amárach.",
  d_lastSynced: "Sioncronaithe go deireanach:",
  d_totalEvents: "imeacht san iomlán",
  d_untitledEvent: "Imeacht Gan Teideal",
  d_noStation: "Gan stáisiún á sheinm",
  d_radioLockedShort: "Raidió faoi ghlas",

  d_radioLocked: "Tá an raidió faoi ghlas – díghlasáil chun seinm",
  d_connecting: "Ag nascadh le",
  d_nowPlaying: "Á sheinm anois:",
  d_paused: "Sos:",
  d_playbackFailed: "Theip ar an tseinm",
  d_streamUnavailable: "Sruth ar fáil",
  d_cannotPlay: "Ní féidir an stáisiún seo a sheinm",
  d_tryAnotherServer: "Failed to load",
  d_untitled: "Gan teideal",
  d_tryAnother: "Bain triail as foinse eile.",
  d_ready: "Réidh",
  d_ready: "Réidh",
  d_playing: "Á sheinm...",
  d_paused: "Sos",
  d_locked: "Faoi ghlas",
  d_playerLocked: "Seinnteoir faoi ghlas",
  d_musicLoadFailed: "Theip ar lódáil ceoil.",
  d_musicStorageBlocked: "Storage blocked",
  d_noMusic: "Gan ceol.",
  d_addMusicSettings: "Cuir Ceol leis i Socruithe",
  d_playbackAborted: "Seinm curtha ar ceal",
  d_networkError: "Earráid líonra",
  d_fileCorrupted: "Comhad truaillithe",
  d_formatNotSupported: "Formáid gan tacaíocht",
  d_unknownError: "Earráid anaithnid",
  d_cannotPlayFile: "Ní féidir comhad a sheinm",
  d_cannotResume: "Ní féidir leanúint",
  d_noContacts: "Gan teagmhálacha.",
  d_addContacts: "Cuir Teagmhálacha Leis",
  d_selectdevices: "Roghnaigh Gléasanna",
  d_microphone: "Micreafón",
  d_speaker: "Callaire",
  d_camera: "Ceamara",
  d_cancel: "Cealaigh",
  d_apply: "Cuir i bhfeidhm",
  d_yourmicrophoneismuted: "Tá do mhicreafón ciúnaithe",
  d_default: "Réamhshocrú",
  d_applyingdevices: "Gléasanna á gcur i bhfeidhm...",
  d_devicesupdated: "Gléasanna nuashonraithe",
  d_deviceswitchfailed: "Theip ar athrú gléis",
  d_share: null
d_send: null
d_locationShared: null
d_location: null
d_time: null
d_noTrustedContacts: null
d_locate: null
d_mobileOnly: null
d_shareLocked: null
d_shareConfirm: null
d_shareCancelled: null
d_gettingLocation: null
d_geolocationUnsupported: null
d_locationNotIreland: null
d_notIreland: null
d_impreciseGps: null
d_sendAnyway: null
d_shareCancelledInaccurate: null
d_sendingTo: null
d_contacts: null
d_sent: null
d_failed: null
d_viewOnOsm: null
d_sendFailed: null
d_permissionDenied: null
d_positionUnavailable: null
d_timeout: null
d_ringing: "Ag bualadh...",
  d_caregiver: "Cúramóir",
  d_invalidFile: "Comhad neamhbhailí",
  d_dateUnknown: "Dáta anaithnid",

  
  d_customizeDashboard: "Saincheap an Deais",
  d_freeTrial: "Tosaigh triail saor in aisce (gan cárta creidmheasa)",
};
