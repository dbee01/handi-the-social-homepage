/*
 * Copyright (c) 2026 Handi Homepage
 * This file is part of HandiHomepage and is released under the GNU General Public License v3.0.
 * See the LICENSE file in the repository root for full details.
 */

// modules/radio/radio.module.js – international radio stations with country filter
import { loadSettings } from "../../js/core/settings.js";

// Small HTML escaper for feed metadata rendered into the module.
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Pull channel-level feed metadata (title, thumbnail, description, author,
// website link) out of an iTunes-compatible RSS/Atom feed.
function parseRadioInfo(doc) {
  function firstText(selector) {
    const el = doc.querySelector(selector);
    return el ? (el.textContent || "").trim() : "";
  }
  function firstTagText(tagName) {
    const el = doc.getElementsByTagName(tagName)[0];
    return el ? (el.textContent || "").trim() : "";
  }
  var title = firstText("channel > title") || firstText("feed > title") || "";
  var image = "";
  var itunesImage = doc.getElementsByTagName("itunes:image")[0];
  if (itunesImage) image = (itunesImage.getAttribute("href") || "").trim();
  if (!image) image = firstText("channel > image > url");
  var description =
    firstTagText("itunes:summary") ||
    firstTagText("itunes:subtitle") ||
    firstText("channel > description") ||
    "";
  var author = firstTagText("itunes:author") || "";
  var link = firstText("channel > link") || firstText("feed > link") || "";
  return {
    title: title,
    image: image,
    description: description,
    author: author,
    link: link,
  };
}

// If `url` is an RSS/Atom radio feed, parse its entries (title + audio
// enclosure) into station rows. Returns [] when it isn't a feed, so plain
// audio stream URLs keep working through the live-stream path below.
async function fetchRadioFeed(url) {
  try {
    // Safety net: never block the module render on a slow/hanging proxy.
    // Live stream URLs are rejected server-side (415) within milliseconds,
    // but a misbehaving relay shouldn't stall the UI for minutes.
    const ctrl = new AbortController();
    const timer = setTimeout(function () {
      ctrl.abort();
    }, 8000);
    let resp;
    try {
      resp = await fetch("/api/feed?url=" + encodeURIComponent(url), {
        signal: ctrl.signal,
      });
    } finally {
      clearTimeout(timer);
    }
    if (!resp.ok) return { info: null, tracks: [] };
    const doc = new DOMParser().parseFromString(await resp.text(), "text/xml");
    if (doc.querySelector("parsererror")) return { info: null, tracks: [] };
    const items = doc.getElementsByTagName("item");
    const out = [];
    for (let i = 0; i < items.length; i++) {
      const enclosures = items[i].getElementsByTagName("enclosure");
      if (!enclosures.length) continue;
      const audioUrl = (enclosures[0].getAttribute("url") || "").trim();
      if (!audioUrl) continue;
      const titles = items[i].getElementsByTagName("title");
      out.push({
        name: titles.length
          ? (titles[0].textContent || "").trim()
          : "Episode " + (i + 1),
        url: audioUrl,
        isStream: false,
        isEpisode: true,
      });
    }
    return { info: parseRadioInfo(doc), tracks: out };
  } catch (e) {
    return { info: null, tracks: [] };
  }
}

export default async function initRadio(container) {
  var t =
    window.t ||
    function (k, e) {
      return e || k;
    };

  // International radio stations with country flags
  const STATIONS = [
    {
      flag: "<svg viewBox='0 0 30 20' width='20' height='14'><rect width='10' height='20' fill='#169b62'/><rect x='10' width='10' height='20' fill='#fff'/><rect x='20' width='10' height='20' fill='#ff883e'/></svg>",
      name: "RTÉ Radio 1",
      url: "https://25553.live.streamtheworld.com/RTE_1_INT.mp3?tdsdk=rte",
    },
    { flag: "<svg viewBox='0 0 30 20' width='20' height='14'><rect width='10' height='20' fill='#169b62'/><rect x='10' width='10' height='20' fill='#fff'/><rect x='20' width='10' height='20' fill='#ff883e'/></svg>", name: "Today FM", url: "https://edgex.audioxi.com/TD" },
    { flag: "<svg viewBox='0 0 30 20' width='20' height='14'><rect width='10' height='20' fill='#169b62'/><rect x='10' width='10' height='20' fill='#fff'/><rect x='20' width='10' height='20' fill='#ff883e'/></svg>", name: "Newstalk", url: "https://edgex.audioxi.com/NT" },
    {
      flag: "<svg viewBox='0 0 30 20' width='20' height='14'><rect width='10' height='20' fill='#169b62'/><rect x='10' width='10' height='20' fill='#fff'/><rect x='20' width='10' height='20' fill='#ff883e'/></svg>",
      name: "RTÉ Lyric FM",
      url: "https://29083.live.streamtheworld.com/RTE_LYRIC_FM.mp3?tdsdk=rte",
    },
    {
      flag: "<svg viewBox='0 0 30 20' width='20' height='14'><rect width='10' height='20' fill='#169b62'/><rect x='10' width='10' height='20' fill='#fff'/><rect x='20' width='10' height='20' fill='#ff883e'/></svg>",
      name: "RTÉ 2FM",
      url: "https://27793.live.streamtheworld.com/RTE_2FM_INT.mp3?tdsdk=rte",
    },
    {
      flag: "<svg viewBox='0 0 30 20' width='20' height='14'><rect width='10' height='20' fill='#169b62'/><rect x='10' width='10' height='20' fill='#fff'/><rect x='20' width='10' height='20' fill='#ff883e'/></svg>",
      name: "Cork 96FM",
      url: "https://onic.cork.live.stream.broadcasting.news/stream-96fm",
    },
    {
      flag: "<svg viewBox='0 0 30 20' width='20' height='14'><rect width='30' height='20' fill='#012169'/><path d='M0 0l30 20M30 0L0 20' stroke='#fff' stroke-width='4'/><path d='M0 0l30 20M30 0L0 20' stroke='#c8102e' stroke-width='2'/><line x1='15' y1='0' x2='15' y2='20' stroke='#fff' stroke-width='6'/><line x1='0' y1='10' x2='30' y2='10' stroke='#fff' stroke-width='6'/><line x1='15' y1='0' x2='15' y2='20' stroke='#c8102e' stroke-width='3'/><line x1='0' y1='10' x2='30' y2='10' stroke='#c8102e' stroke-width='3'/></svg>",
      name: "Heart UK",
      url: "https://media-ssl.musicradio.com/HeartUK",
    },
    {
      flag: "<svg viewBox='0 0 30 20' width='20' height='14'><rect width='30' height='20' fill='#012169'/><path d='M0 0l30 20M30 0L0 20' stroke='#fff' stroke-width='4'/><path d='M0 0l30 20M30 0L0 20' stroke='#c8102e' stroke-width='2'/><line x1='15' y1='0' x2='15' y2='20' stroke='#fff' stroke-width='6'/><line x1='0' y1='10' x2='30' y2='10' stroke='#fff' stroke-width='6'/><line x1='15' y1='0' x2='15' y2='20' stroke='#c8102e' stroke-width='3'/><line x1='0' y1='10' x2='30' y2='10' stroke='#c8102e' stroke-width='3'/></svg>",
      name: "Smooth Radio UK",
      url: "https://media-ssl.musicradio.com/SmoothUK",
    },
    {
      flag: "<svg viewBox='0 0 30 20' width='20' height='14'><rect width='30' height='20' fill='#012169'/><path d='M0 0l30 20M30 0L0 20' stroke='#fff' stroke-width='4'/><path d='M0 0l30 20M30 0L0 20' stroke='#c8102e' stroke-width='2'/><line x1='15' y1='0' x2='15' y2='20' stroke='#fff' stroke-width='6'/><line x1='0' y1='10' x2='30' y2='10' stroke='#fff' stroke-width='6'/><line x1='15' y1='0' x2='15' y2='20' stroke='#c8102e' stroke-width='3'/><line x1='0' y1='10' x2='30' y2='10' stroke='#c8102e' stroke-width='3'/></svg>",
      name: "LBC UK",
      url: "https://media-ssl.musicradio.com/LBCUK",
    },
    {
      flag: "<svg viewBox='0 0 30 20' width='20' height='14'><rect width='30' height='20' fill='#012169'/><path d='M0 0l30 20M30 0L0 20' stroke='#fff' stroke-width='4'/><path d='M0 0l30 20M30 0L0 20' stroke='#c8102e' stroke-width='2'/><line x1='15' y1='0' x2='15' y2='20' stroke='#fff' stroke-width='6'/><line x1='0' y1='10' x2='30' y2='10' stroke='#fff' stroke-width='6'/><line x1='15' y1='0' x2='15' y2='20' stroke='#c8102e' stroke-width='3'/><line x1='0' y1='10' x2='30' y2='10' stroke='#c8102e' stroke-width='3'/></svg>",
      name: "Capital FM London",
      url: "https://media-ssl.musicradio.com/Capital",
    },
    {
      flag: "<svg viewBox='0 0 30 20' width='20' height='14'><rect width='10' height='20' fill='#002395'/><rect x='10' width='10' height='20' fill='#fff'/><rect x='20' width='10' height='20' fill='#ed2939'/></svg>",
      name: "France Inter",
      url: "https://stream.radiofrance.fr/franceinter/franceinter.m3u8",
    },
    {
      flag: "<svg viewBox='0 0 30 20' width='20' height='14'><rect width='10' height='20' fill='#002395'/><rect x='10' width='10' height='20' fill='#fff'/><rect x='20' width='10' height='20' fill='#ed2939'/></svg>",
      name: "France Info",
      url: "https://stream.radiofrance.fr/franceinfo/franceinfo.m3u8",
    },
    {
      flag: "<svg viewBox='0 0 30 20' width='20' height='14'><rect width='10' height='20' fill='#002395'/><rect x='10' width='10' height='20' fill='#fff'/><rect x='20' width='10' height='20' fill='#ed2939'/></svg>",
      name: "FIP",
      url: "https://stream.radiofrance.fr/fip/fip.m3u8",
    },
    {
      flag: "<svg viewBox='0 0 30 20' width='20' height='14'><rect width='10' height='20' fill='#002395'/><rect x='10' width='10' height='20' fill='#fff'/><rect x='20' width='10' height='20' fill='#ed2939'/></svg>",
      name: "NRJ",
      url: "https://scdn.nrjaudio.fm/fr/30001/mp3_128.mp3",
    },
    {
      flag: "<svg viewBox='0 0 30 20' width='20' height='14'><rect width='30' height='6.67' fill='#000'/><rect y='6.67' width='30' height='6.67' fill='#d00'/><rect y='13.34' width='30' height='6.66' fill='#fc0'/></svg>",
      name: "Deutschlandfunk",
      url: "https://st01.sslstream.dlf.de/dlf/01/128/mp3/stream.mp3",
    },
    {
      flag: "<svg viewBox='0 0 30 20' width='20' height='14'><rect width='30' height='6.67' fill='#000'/><rect y='6.67' width='30' height='6.67' fill='#d00'/><rect y='13.34' width='30' height='6.66' fill='#fc0'/></svg>",
      name: "WDR 2",
      url: "https://wdr-wdr2-rheinland.icecastssl.wdr.de/wdr/wdr2/rheinland/mp3/128/stream.mp3",
    },
    {
      flag: "<svg viewBox='0 0 30 20' width='20' height='14'><rect width='30' height='6.67' fill='#000'/><rect y='6.67' width='30' height='6.67' fill='#d00'/><rect y='13.34' width='30' height='6.66' fill='#fc0'/></svg>",
      name: "Radio Eins",
      url: "https://dispatcher.rndfnk.com/rbb/radioeins/live/mp3/mid",
    },
    {
      flag: "<svg viewBox='0 0 30 20' width='20' height='14'><rect width='30' height='6.67' fill='#000'/><rect y='6.67' width='30' height='6.67' fill='#d00'/><rect y='13.34' width='30' height='6.66' fill='#fc0'/></svg>",
      name: "Bayern 1",
      url: "https://dispatcher.rndfnk.com/br/br1/obb/mp3/mid",
    },
    {
      flag: "<svg viewBox='0 0 30 20' width='20' height='14'><rect width='30' height='5' fill='#c60b1e'/><rect y='5' width='30' height='10' fill='#ffc400'/><rect y='15' width='30' height='5' fill='#c60b1e'/></svg>",
      name: "RNE Radio 1",
      url: "https://dispatcher.rndfnk.com/crtve/rne1/main/mp3/high",
    },
    {
      flag: "<svg viewBox='0 0 30 20' width='20' height='14'><rect width='30' height='5' fill='#c60b1e'/><rect y='5' width='30' height='10' fill='#ffc400'/><rect y='15' width='30' height='5' fill='#c60b1e'/></svg>",
      name: "Cadena SER",
      url: "https://playerservices.streamtheworld.com/api/livestream-redirect/CADENASER.mp3",
    },
    {
      flag: "<svg viewBox='0 0 30 20' width='20' height='14'><rect width='30' height='5' fill='#c60b1e'/><rect y='5' width='30' height='10' fill='#ffc400'/><rect y='15' width='30' height='5' fill='#c60b1e'/></svg>",
      name: "Los 40 Principales",
      url: "https://playerservices.streamtheworld.com/api/livestream-redirect/LOS40.mp3",
    },
    {
      flag: "<svg viewBox='0 0 30 20' width='20' height='14'><rect width='10' height='20' fill='#009246'/><rect x='10' width='10' height='20' fill='#fff'/><rect x='20' width='10' height='20' fill='#ce2b37'/></svg>",
      name: "Rai Radio 1",
      url: "https://icestreaming.rai.it/1.mp3",
    },
    {
      flag: "<svg viewBox='0 0 30 20' width='20' height='14'><rect width='10' height='20' fill='#009246'/><rect x='10' width='10' height='20' fill='#fff'/><rect x='20' width='10' height='20' fill='#ce2b37'/></svg>",
      name: "Rai Radio 2",
      url: "https://icestreaming.rai.it/2.mp3",
    },
    {
      flag: "<svg viewBox='0 0 30 20' width='20' height='14'><rect width='10' height='20' fill='#009246'/><rect x='10' width='10' height='20' fill='#fff'/><rect x='20' width='10' height='20' fill='#ce2b37'/></svg>",
      name: "Radio Deejay",
      url: "https://4c4b867c89244861ac216426883d1ad0.msvdn.net/radiodeejay/radiodeejay/master.m3u8",
    },
    {
      flag: "<svg viewBox='0 0 30 20' width='20' height='14'><rect width='10' height='20' fill='#009246'/><rect x='10' width='10' height='20' fill='#fff'/><rect x='20' width='10' height='20' fill='#ce2b37'/></svg>",
      name: "Radio 105",
      url: "https://icecast.unitedradio.it/Radio105.mp3",
    },
    {
      flag: "<svg viewBox='0 0 30 20' width='20' height='14'><rect width='30' height='6.67' fill='#ae1c28'/><rect y='6.67' width='30' height='6.67' fill='#fff'/><rect y='13.34' width='30' height='6.66' fill='#21468b'/></svg>",
      name: "NPO Radio 1",
      url: "https://icecast.omroep.nl/radio1-bb-mp3",
    },
    {
      flag: "<svg viewBox='0 0 30 20' width='20' height='14'><rect width='30' height='6.67' fill='#ae1c28'/><rect y='6.67' width='30' height='6.67' fill='#fff'/><rect y='13.34' width='30' height='6.66' fill='#21468b'/></svg>",
      name: "NPO Radio 2",
      url: "https://icecast.omroep.nl/radio2-bb-mp3",
    },
    {
      flag: "<svg viewBox='0 0 30 20' width='20' height='14'><rect width='30' height='6.67' fill='#ae1c28'/><rect y='6.67' width='30' height='6.67' fill='#fff'/><rect y='13.34' width='30' height='6.66' fill='#21468b'/></svg>",
      name: "NPO 3FM",
      url: "https://icecast.omroep.nl/3fm-bb-mp3",
    },
    {
      flag: "<svg viewBox='0 0 30 20' width='20' height='14'><rect width='30' height='6.67' fill='#ae1c28'/><rect y='6.67' width='30' height='6.67' fill='#fff'/><rect y='13.34' width='30' height='6.66' fill='#21468b'/></svg>",
      name: "Radio 538",
      url: "https://playerservices.streamtheworld.com/api/livestream-redirect/RADIO538.mp3",
    },
    {
      flag: "<svg viewBox='0 0 30 20' width='20' height='14'><rect width='30' height='10' fill='#fff'/><rect y='10' width='30' height='10' fill='#dc143c'/></svg>",
      name: "RMF24",
      url: "https://rs202-krk.rmfstream.pl/RMF24",
    },
    {
      flag: "<svg viewBox='0 0 30 20' width='20' height='14'><rect width='30' height='10' fill='#fff'/><rect y='10' width='30' height='10' fill='#dc143c'/></svg>",
      name: "Meloradio",
      url: "https://playerservices.streamtheworld.com/api/livestream-redirect/MELORADIO.mp3",
    },
    {
      flag: "<svg viewBox='0 0 30 20' width='20' height='14'><rect width='30' height='10' fill='#fff'/><rect y='10' width='30' height='10' fill='#dc143c'/></svg>",
      name: "RMF FM",
      url: "https://rs202-krk.rmfstream.pl/RMFFM48",
    },
    {
      flag: "<svg viewBox='0 0 30 20' width='20' height='14'><rect width='30' height='10' fill='#fff'/><rect y='10' width='30' height='10' fill='#dc143c'/></svg>",
      name: "Radio Zet",
      url: "https://playerservices.streamtheworld.com/api/livestream-redirect/RADIO_ZET.mp3",
    },
    {
      flag: "<svg viewBox='0 0 30 20' width='20' height='14'><rect width='12' height='20' fill='#006600'/><rect x='12' width='18' height='20' fill='#f00'/><circle cx='12' cy='10' r='4' fill='#fc0' stroke='#000' stroke-width='.5'/></svg>",
      name: "Observador",
      url: "https://playerservices.streamtheworld.com/api/livestream-redirect/OBSERVADOR.mp3",
    },
    {
      flag: "<svg viewBox='0 0 30 20' width='20' height='14'><rect width='12' height='20' fill='#006600'/><rect x='12' width='18' height='20' fill='#f00'/><circle cx='12' cy='10' r='4' fill='#fc0' stroke='#000' stroke-width='.5'/></svg>",
      name: "M80 Rádio",
      url: "https://playerservices.streamtheworld.com/api/livestream-redirect/M80RADIO.mp3",
    },
    {
      flag: "<svg viewBox='0 0 30 20' width='20' height='14'><rect width='12' height='20' fill='#006600'/><rect x='12' width='18' height='20' fill='#f00'/><circle cx='12' cy='10' r='4' fill='#fc0' stroke='#000' stroke-width='.5'/></svg>",
      name: "RFM",
      url: "https://playerservices.streamtheworld.com/api/livestream-redirect/RFM.mp3",
    },
    {
      flag: "<svg viewBox='0 0 30 20' width='20' height='14'><rect width='30' height='20' fill='#006aa7'/><line x1='10' y1='0' x2='10' y2='20' stroke='#fecc00' stroke-width='4'/><line x1='0' y1='8' x2='30' y2='12' stroke='#fecc00' stroke-width='4'/></svg>",
      name: "Sveriges Radio P1",
      url: "https://live1.sr.se/p1-mp3-96",
    },
    {
      flag: "<svg viewBox='0 0 30 20' width='20' height='14'><rect width='30' height='20' fill='#006aa7'/><line x1='10' y1='0' x2='10' y2='20' stroke='#fecc00' stroke-width='4'/><line x1='0' y1='8' x2='30' y2='12' stroke='#fecc00' stroke-width='4'/></svg>",
      name: "Sveriges Radio P3",
      url: "https://live1.sr.se/p3-mp3-96",
    },
    {
      flag: "<svg viewBox='0 0 30 20' width='20' height='14'><rect width='30' height='20' fill='#006aa7'/><line x1='10' y1='0' x2='10' y2='20' stroke='#fecc00' stroke-width='4'/><line x1='0' y1='8' x2='30' y2='12' stroke='#fecc00' stroke-width='4'/></svg>",
      name: "Sveriges Radio P2",
      url: "https://live1.sr.se/p2-mp3-96",
    },
    {
      flag: "<svg viewBox='0 0 30 20' width='20' height='14'><rect width='30' height='20' fill='#006aa7'/><line x1='10' y1='0' x2='10' y2='20' stroke='#fecc00' stroke-width='4'/><line x1='0' y1='8' x2='30' y2='12' stroke='#fecc00' stroke-width='4'/></svg>",
      name: "Sveriges Radio P4 Stockholm",
      url: "https://live1.sr.se/p4sth-mp3-96",
    },
    {
      flag: "<svg viewBox='0 0 30 20' width='20' height='14'><rect width='30' height='20' fill='#ef2b2d'/><line x1='8' y1='0' x2='8' y2='20' stroke='#fff' stroke-width='4'/><line x1='0' y1='8' x2='30' y2='12' stroke='#fff' stroke-width='4'/><line x1='10' y1='0' x2='10' y2='20' stroke='#002868' stroke-width='2'/><line x1='0' y1='9' x2='30' y2='11' stroke='#002868' stroke-width='2'/></svg>",
      name: "NRK P1",
      url: "https://lyd.nrk.no/nrk_radio_p1_ostlandssendingen_mp3_h",
    },
    {
      flag: "<svg viewBox='0 0 30 20' width='20' height='14'><rect width='30' height='20' fill='#ef2b2d'/><line x1='8' y1='0' x2='8' y2='20' stroke='#fff' stroke-width='4'/><line x1='0' y1='8' x2='30' y2='12' stroke='#fff' stroke-width='4'/><line x1='10' y1='0' x2='10' y2='20' stroke='#002868' stroke-width='2'/><line x1='0' y1='9' x2='30' y2='11' stroke='#002868' stroke-width='2'/></svg>",
      name: "NRK P3",
      url: "https://lyd.nrk.no/nrk_radio_p3_mp3_h",
    },
    {
      flag: "<svg viewBox='0 0 30 20' width='20' height='14'><rect width='30' height='20' fill='#ef2b2d'/><line x1='8' y1='0' x2='8' y2='20' stroke='#fff' stroke-width='4'/><line x1='0' y1='8' x2='30' y2='12' stroke='#fff' stroke-width='4'/><line x1='10' y1='0' x2='10' y2='20' stroke='#002868' stroke-width='2'/><line x1='0' y1='9' x2='30' y2='11' stroke='#002868' stroke-width='2'/></svg>",
      name: "Radio Norge",
      url: "https://live-bauerno.sharp-stream.com/radionorge_no_mp3",
    },
    {
      flag: "<svg viewBox='0 0 30 20' width='20' height='14'><rect width='30' height='1.54' fill='#b22234'/><rect y='1.54' width='30' height='1.54' fill='#fff'/><rect y='3.08' width='30' height='1.54' fill='#b22234'/><rect y='4.62' width='30' height='1.54' fill='#fff'/><rect y='6.15' width='30' height='1.54' fill='#b22234'/><rect y='7.69' width='30' height='1.54' fill='#fff'/><rect y='9.23' width='30' height='1.54' fill='#b22234'/><rect y='10.77' width='30' height='1.54' fill='#fff'/><rect y='12.31' width='30' height='1.54' fill='#b22234'/><rect y='13.85' width='30' height='1.54' fill='#fff'/><rect y='15.38' width='30' height='1.54' fill='#b22234'/><rect y='16.92' width='30' height='1.54' fill='#fff'/><rect y='18.46' width='30' height='1.54' fill='#b22234'/><rect width='10' height='10.77' fill='#3c3b6e'/></svg>",
      name: "NPR 24",
      url: "https://npr-ice.streamguys1.com/live.mp3",
    },
    {
      flag: "<svg viewBox='0 0 30 20' width='20' height='14'><rect width='30' height='1.54' fill='#b22234'/><rect y='1.54' width='30' height='1.54' fill='#fff'/><rect y='3.08' width='30' height='1.54' fill='#b22234'/><rect y='4.62' width='30' height='1.54' fill='#fff'/><rect y='6.15' width='30' height='1.54' fill='#b22234'/><rect y='7.69' width='30' height='1.54' fill='#fff'/><rect y='9.23' width='30' height='1.54' fill='#b22234'/><rect y='10.77' width='30' height='1.54' fill='#fff'/><rect y='12.31' width='30' height='1.54' fill='#b22234'/><rect y='13.85' width='30' height='1.54' fill='#fff'/><rect y='15.38' width='30' height='1.54' fill='#b22234'/><rect y='16.92' width='30' height='1.54' fill='#fff'/><rect y='18.46' width='30' height='1.54' fill='#b22234'/><rect width='10' height='10.77' fill='#3c3b6e'/></svg>",
      name: "KEXP Seattle",
      url: "https://kexp-mp3-128.streamguys1.com/kexp128.mp3",
    },
    {
      flag: "<svg viewBox='0 0 30 20' width='20' height='14'><rect width='30' height='1.54' fill='#b22234'/><rect y='1.54' width='30' height='1.54' fill='#fff'/><rect y='3.08' width='30' height='1.54' fill='#b22234'/><rect y='4.62' width='30' height='1.54' fill='#fff'/><rect y='6.15' width='30' height='1.54' fill='#b22234'/><rect y='7.69' width='30' height='1.54' fill='#fff'/><rect y='9.23' width='30' height='1.54' fill='#b22234'/><rect y='10.77' width='30' height='1.54' fill='#fff'/><rect y='12.31' width='30' height='1.54' fill='#b22234'/><rect y='13.85' width='30' height='1.54' fill='#fff'/><rect y='15.38' width='30' height='1.54' fill='#b22234'/><rect y='16.92' width='30' height='1.54' fill='#fff'/><rect y='18.46' width='30' height='1.54' fill='#b22234'/><rect width='10' height='10.77' fill='#3c3b6e'/></svg>",
      name: "WNYC New York",
      url: "https://fm939.wnyc.org/wnycfm-web",
    },
    {
      flag: "<svg viewBox='0 0 30 20' width='20' height='14'><rect width='30' height='20' fill='#f00'/><rect x='7.5' width='15' height='20' fill='#fff'/><path d='M15 3l1.5 4.5h5l-4 3 1.5 4.5-4-3-4 3 1.5-4.5-4-3h5z' fill='#f00'/></svg>",
      name: "NewsTalk 1010 Toronto",
      url: "https://playerservices.streamtheworld.com/api/livestream-redirect/CFRBAM.mp3",
    },
    {
      flag: "<svg viewBox='0 0 30 20' width='20' height='14'><rect width='30' height='20' fill='#f00'/><rect x='7.5' width='15' height='20' fill='#fff'/><path d='M15 3l1.5 4.5h5l-4 3 1.5 4.5-4-3-4 3 1.5-4.5-4-3h5z' fill='#f00'/></svg>",
      name: "CKUA Edmonton",
      url: "https://ckua.streamon.fm/stream/CKUA-48k.aac",
    },
    {
      flag: "<svg viewBox='0 0 30 20' width='20' height='14'><rect width='30' height='20' fill='#f00'/><rect x='7.5' width='15' height='20' fill='#fff'/><path d='M15 3l1.5 4.5h5l-4 3 1.5 4.5-4-3-4 3 1.5-4.5-4-3h5z' fill='#f00'/></svg>",
      name: "CJAD 800 Montréal",
      url: "https://playerservices.streamtheworld.com/api/livestream-redirect/CJADAM.mp3",
    },
    {
      flag: "<svg viewBox='0 0 30 20' width='20' height='14'><rect width='30' height='20' fill='#00008b'/><circle cx='15' cy='10' r='4' fill='#fff'/><circle cx='13' cy='9' r='.8' fill='#00008b'/><circle cx='17' cy='9' r='.8' fill='#00008b'/><circle cx='15' cy='11' r='.6' fill='#00008b'/></svg>",
      name: "ABC Radio Sydney",
      url: "https://live-radio01.mediahubaustralia.com/2LRW/mp3/",
    },
    {
      flag: "<svg viewBox='0 0 30 20' width='20' height='14'><rect width='30' height='20' fill='#00008b'/><circle cx='15' cy='10' r='4' fill='#fff'/><circle cx='13' cy='9' r='.8' fill='#00008b'/><circle cx='17' cy='9' r='.8' fill='#00008b'/><circle cx='15' cy='11' r='.6' fill='#00008b'/></svg>",
      name: "triple j",
      url: "https://live-radio01.mediahubaustralia.com/2TJW/mp3/",
    },
    {
      flag: "<svg viewBox='0 0 30 20' width='20' height='14'><rect width='30' height='20' fill='#00008b'/><circle cx='15' cy='10' r='4' fill='#fff'/><circle cx='13' cy='9' r='.8' fill='#00008b'/><circle cx='17' cy='9' r='.8' fill='#00008b'/><circle cx='15' cy='11' r='.6' fill='#00008b'/></svg>",
      name: "ABC Classic",
      url: "https://live-radio01.mediahubaustralia.com/2FMW/mp3/",
    },
    {
      flag: "<svg viewBox='0 0 30 20' width='20' height='14'><rect width='30' height='20' fill='#00008b'/><circle cx='15' cy='10' r='4' fill='#fff'/><circle cx='13' cy='9' r='.8' fill='#00008b'/><circle cx='17' cy='9' r='.8' fill='#00008b'/><circle cx='15' cy='11' r='.6' fill='#00008b'/></svg>",
      name: "RNZ National",
      url: "https://stream-ice.radionz.co.nz/national.mp3",
    },
    {
      flag: "<svg viewBox='0 0 30 20' width='20' height='14'><rect width='30' height='20' fill='#00008b'/><circle cx='15' cy='10' r='4' fill='#fff'/><circle cx='13' cy='9' r='.8' fill='#00008b'/><circle cx='17' cy='9' r='.8' fill='#00008b'/><circle cx='15' cy='11' r='.6' fill='#00008b'/></svg>",
      name: "RNZ Concert",
      url: "https://stream-ice.radionz.co.nz/concert.mp3",
    },
    {
      flag: "<svg viewBox='0 0 30 20' width='20' height='14'><rect width='30' height='20' fill='#00008b'/><circle cx='15' cy='10' r='4' fill='#fff'/><circle cx='13' cy='9' r='.8' fill='#00008b'/><circle cx='17' cy='9' r='.8' fill='#00008b'/><circle cx='15' cy='11' r='.6' fill='#00008b'/></svg>",
      name: "RNZ Pacific",
      url: "https://stream-ice.radionz.co.nz/international.mp3",
    },
  ];

  var flagToCountry = {
    "<svg viewBox='0 0 30 20' width='20' height='14'><rect width='10' height='20' fill='#169b62'/><rect x='10' width='10' height='20' fill='#fff'/><rect x='20' width='10' height='20' fill='#ff883e'/></svg>": "Ireland",
    "<svg viewBox='0 0 30 20' width='20' height='14'><rect width='30' height='20' fill='#012169'/><path d='M0 0l30 20M30 0L0 20' stroke='#fff' stroke-width='4'/><path d='M0 0l30 20M30 0L0 20' stroke='#c8102e' stroke-width='2'/><line x1='15' y1='0' x2='15' y2='20' stroke='#fff' stroke-width='6'/><line x1='0' y1='10' x2='30' y2='10' stroke='#fff' stroke-width='6'/><line x1='15' y1='0' x2='15' y2='20' stroke='#c8102e' stroke-width='3'/><line x1='0' y1='10' x2='30' y2='10' stroke='#c8102e' stroke-width='3'/></svg>": "United Kingdom",
    "<svg viewBox='0 0 30 20' width='20' height='14'><rect width='10' height='20' fill='#002395'/><rect x='10' width='10' height='20' fill='#fff'/><rect x='20' width='10' height='20' fill='#ed2939'/></svg>": "France",
    "<svg viewBox='0 0 30 20' width='20' height='14'><rect width='30' height='6.67' fill='#000'/><rect y='6.67' width='30' height='6.67' fill='#d00'/><rect y='13.34' width='30' height='6.66' fill='#fc0'/></svg>": "Germany",
    "<svg viewBox='0 0 30 20' width='20' height='14'><rect width='30' height='5' fill='#c60b1e'/><rect y='5' width='30' height='10' fill='#ffc400'/><rect y='15' width='30' height='5' fill='#c60b1e'/></svg>": "Spain",
    "<svg viewBox='0 0 30 20' width='20' height='14'><rect width='10' height='20' fill='#009246'/><rect x='10' width='10' height='20' fill='#fff'/><rect x='20' width='10' height='20' fill='#ce2b37'/></svg>": "Italy",
    "<svg viewBox='0 0 30 20' width='20' height='14'><rect width='30' height='6.67' fill='#ae1c28'/><rect y='6.67' width='30' height='6.67' fill='#fff'/><rect y='13.34' width='30' height='6.66' fill='#21468b'/></svg>": "Netherlands",
    "<svg viewBox='0 0 30 20' width='20' height='14'><rect width='30' height='10' fill='#fff'/><rect y='10' width='30' height='10' fill='#dc143c'/></svg>": "Poland",
    "<svg viewBox='0 0 30 20' width='20' height='14'><rect width='12' height='20' fill='#006600'/><rect x='12' width='18' height='20' fill='#f00'/><circle cx='12' cy='10' r='4' fill='#fc0' stroke='#000' stroke-width='.5'/></svg>": "Portugal",
    "<svg viewBox='0 0 30 20' width='20' height='14'><rect width='30' height='20' fill='#006aa7'/><line x1='10' y1='0' x2='10' y2='20' stroke='#fecc00' stroke-width='4'/><line x1='0' y1='8' x2='30' y2='12' stroke='#fecc00' stroke-width='4'/></svg>": "Sweden",
    "<svg viewBox='0 0 30 20' width='20' height='14'><rect width='30' height='20' fill='#ef2b2d'/><line x1='8' y1='0' x2='8' y2='20' stroke='#fff' stroke-width='4'/><line x1='0' y1='8' x2='30' y2='12' stroke='#fff' stroke-width='4'/><line x1='10' y1='0' x2='10' y2='20' stroke='#002868' stroke-width='2'/><line x1='0' y1='9' x2='30' y2='11' stroke='#002868' stroke-width='2'/></svg>": "Norway",
    "<svg viewBox='0 0 30 20' width='20' height='14'><rect width='30' height='1.54' fill='#b22234'/><rect y='1.54' width='30' height='1.54' fill='#fff'/><rect y='3.08' width='30' height='1.54' fill='#b22234'/><rect y='4.62' width='30' height='1.54' fill='#fff'/><rect y='6.15' width='30' height='1.54' fill='#b22234'/><rect y='7.69' width='30' height='1.54' fill='#fff'/><rect y='9.23' width='30' height='1.54' fill='#b22234'/><rect y='10.77' width='30' height='1.54' fill='#fff'/><rect y='12.31' width='30' height='1.54' fill='#b22234'/><rect y='13.85' width='30' height='1.54' fill='#fff'/><rect y='15.38' width='30' height='1.54' fill='#b22234'/><rect y='16.92' width='30' height='1.54' fill='#fff'/><rect y='18.46' width='30' height='1.54' fill='#b22234'/><rect width='10' height='10.77' fill='#3c3b6e'/></svg>": "United States",
    "<svg viewBox='0 0 30 20' width='20' height='14'><rect width='30' height='20' fill='#f00'/><rect x='7.5' width='15' height='20' fill='#fff'/><path d='M15 3l1.5 4.5h5l-4 3 1.5 4.5-4-3-4 3 1.5-4.5-4-3h5z' fill='#f00'/></svg>": "Canada",
    "<svg viewBox='0 0 30 20' width='20' height='14'><rect width='30' height='20' fill='#00008b'/><circle cx='15' cy='10' r='4' fill='#fff'/><circle cx='13' cy='9' r='.8' fill='#00008b'/><circle cx='17' cy='9' r='.8' fill='#00008b'/><circle cx='15' cy='11' r='.6' fill='#00008b'/></svg>": "Australia",
    "<svg viewBox='0 0 30 20' width='20' height='14'><rect width='30' height='20' fill='#00008b'/><circle cx='15' cy='10' r='4' fill='#fff'/><circle cx='13' cy='9' r='.8' fill='#00008b'/><circle cx='17' cy='9' r='.8' fill='#00008b'/><circle cx='15' cy='11' r='.6' fill='#00008b'/></svg>": "New Zealand",
  };

  var countries = [],
    seen = {};
  STATIONS.forEach(function (s) {
    if (!seen[s.flag]) {
      seen[s.flag] = true;
      countries.push({ flag: s.flag, name: flagToCountry[s.flag] || s.flag });
    }
  });

  // Header
  const headerRow = document.createElement("div");
  headerRow.className = "radio-header-row";
  const title = document.createElement("div");
  title.className = "panel-title";
  title.innerHTML =
    '<i class="fa-solid fa-radio"></i> ' +
    t(
      "modules.radio.name",
      window.LANG && window.LANG.modules && window.LANG.modules.radio
        ? window.LANG.modules.radio.name
        : "RADIO",
    );
  headerRow.appendChild(title);

  const headerActions = document.createElement("div");
  headerActions.className = "radio-header-actions";
  const lockToggle = document.createElement("button");
  lockToggle.className = "radio-lock-toggle";
  var saved = localStorage.getItem("radioLocked"),
    regCfg =
      (window.HANDI_MODULE_BY_ID &&
        window.HANDI_MODULE_BY_ID("radio")?.settingsConfig?.soundLock) ??
      true,
    isLocked = saved !== null ? saved === "true" : regCfg;
  function updateLockIcon() {
    lockToggle.innerHTML = isLocked
      ? '<i class="fa-solid fa-lock"></i>'
      : '<i class="fa-solid fa-lock-open"></i>';
  }
  updateLockIcon();
  headerActions.appendChild(lockToggle);
  var pinBtn = container.querySelector(".pin-btn");
  if (pinBtn) headerActions.appendChild(pinBtn);
  headerRow.appendChild(headerActions);
  container.innerHTML = "";
  container.appendChild(headerRow);

  var content = document.createElement("div");
  content.className = "radio-content";
  container.appendChild(content);

  var storedFlag = "";
  try {
    var rs = loadSettings();
    storedFlag =
      (rs.radio && rs.radio.defaultCountry) ||
      localStorage.getItem("handiRadioCountry") ||
      "";
  } catch (e) {}

  var streamUrl = "";
  try {
    streamUrl = (
      (loadSettings().radio && loadSettings().radio.streamUrl) ||
      ""
    ).trim();
  } catch (e) {}

  // Hosts that IP/geo-block many server and residential IPs (rte.ie and the
  // streaming.broadcast.radio mirrors) are played via the server relay proxy
  // (/api/stream); every other stream plays straight from the browser. Keep
  // in sync with BLOCKED_DIRECT_HOSTS in server.js.
  function isProxiedHost(url) {
    try {
      var host = new URL(url).hostname.toLowerCase();
      return (
        host === "rte.ie" ||
        host.endsWith(".rte.ie") ||
        host === "streaming.broadcast.radio" ||
        host.endsWith(".streaming.broadcast.radio")
      );
    } catch (e) {
      return false;
    }
  }

  // A handi-pack `radio` URL may point at an RSS/Atom feed: parse it so its
  // title / thumbnail / description and entries are shown just like Cast.
  // Only handi-pack-supplied URLs are parsed as feeds (tracked via
  // `handiRadioPackFeed`); manually-entered stream URLs stay plain streams.
  var packFeedUrl = "";
  try {
    packFeedUrl = localStorage.getItem("handiRadioPackFeed") || "";
  } catch (e) {}
  var radioInfo = null;
  var feedTracks = [];
  if (streamUrl && packFeedUrl && streamUrl === packFeedUrl) {
    var radioFeed = await fetchRadioFeed(streamUrl);
    feedTracks = radioFeed.tracks || [];
    if (feedTracks.length) radioInfo = radioFeed.info || null;
  }

  var selectedFlag = storedFlag;
  // If stored as country code, convert to SVG flag
  if (storedFlag && storedFlag.length === 2 && storedFlag.indexOf("<") === -1) {
    var codeToName = { ie: "Ireland", gb: "United Kingdom", fr: "France", de: "Germany", es: "Spain", it: "Italy", nl: "Netherlands", pl: "Poland", pt: "Portugal", se: "Sweden", no: "Norway", us: "United States", ca: "Canada", au: "Australia", nz: "New Zealand" };
    var name = codeToName[storedFlag];
    if (name) {
      for (var f in flagToCountry) {
        if (flagToCountry[f] === name) { selectedFlag = f; break; }
      }
    }
  }

  // Build country dropdown (pre-select saved value)
  var countryOptions = '<option value="">' +
    t("d_selectCountry", "— Select country —") +
    "</option>" +
    countries
      .map(function (c) {
        var sel = c.flag === storedFlag ? ' selected' : '';
        return (
          '<option value="' +
          c.flag +
          '"' + sel + '>' +
          c.flag +
          " " +
          c.name +
          "</option>"
        );
      })
      .join("");

  // Feed info card (title, thumbnail, description, …) above the player.
  var radioInfoHtml = "";
  if (radioInfo && (radioInfo.title || radioInfo.image)) {
    radioInfoHtml =
      '<div class="radio-info" style="display:flex;gap:12px;align-items:flex-start;margin:0 0 10px;padding:12px;border-radius:10px;border:1px solid color-mix(in srgb, var(--topbar-accent, #0047cc) 25%, transparent);background:color-mix(in srgb, var(--topbar-accent, #0047cc) 5%, transparent);">' +
      (radioInfo.image
        ? '<img src="' + escapeHtml(radioInfo.image) + '" alt="" loading="lazy" style="width:88px;height:88px;border-radius:8px;object-fit:cover;flex-shrink:0;" onerror="this.style.display=\'none\'"/>'
        : "") +
      '<div style="min-width:0;flex:1;">' +
      (radioInfo.title
        ? '<div style="font-weight:700;font-size:1.05rem;line-height:1.3;">' +
          escapeHtml(radioInfo.title) +
          "</div>"
        : "") +
      (radioInfo.author
        ? '<div style="font-size:0.85rem;opacity:0.7;margin-top:2px;">' +
          escapeHtml(radioInfo.author) +
          "</div>"
        : "") +
      (radioInfo.description
        ? '<div style="font-size:0.9rem;line-height:1.4;opacity:0.85;margin-top:6px;"><span id="radioDesc">' +
          escapeHtml(
            radioInfo.description.length > 180
              ? radioInfo.description
                  .slice(0, 180)
                  .replace(/\s+\S*$/, "") + "…"
              : radioInfo.description,
          ) +
          "</span>" +
          (radioInfo.description.length > 180
            ? ' <a href="#" id="radioDescMore" style="font-weight:700;white-space:nowrap;">' +
              t("d_more", "More") +
              "</a>"
            : "") +
          "</div>"
        : "") +
      (radioInfo.link
        ? '<a href="' +
          escapeHtml(radioInfo.link) +
          '" target="_blank" rel="noopener" style="display:inline-block;margin-top:8px;font-size:0.9rem;font-weight:700;">' +
          t("d_radioWebsite", "Website") +
          " ↗</a>"
        : "") +
      "</div></div>";
  }

  content.innerHTML =
    radioInfoHtml +
      '<div class="radio-country-list" style="display:flex;flex-wrap:wrap;gap:4px;justify-content:center;margin-bottom:8px;">' +
      countries.map(function (c) {
        var cls = c.flag === selectedFlag ? ' radio-country-item active' : 'radio-country-item';
        return '<button class="' + cls + '" data-flag="' + c.flag + '" style="display:flex;align-items:center;gap:4px;padding:4px 8px;border-radius:6px;border:1px solid #cbd5e1;cursor:pointer;background:none;font-size:0.85rem;">' + c.flag + '<span>' + c.name + '</span></button>';
      }).join("") +
      '</div><div class="radio-top-bar"><canvas id="radio-synth" class="radio-synth"></canvas></div><div class="radio-now-playing" id="now-playing">' +
      t("d_noStation", "No station playing") +
      '</div><div class="radio-scroll-wrapper"><button id="radio-up" class="radio-scroll-btn">▲</button><div id="stations-list" class="radio-list"></div><button id="radio-down" class="radio-scroll-btn">▼</button></div><div class="radio-error" id="radio-error"></div>';

    var countryBtns = content.querySelectorAll(".radio-country-item");
    var list = content.querySelector("#stations-list");
    var nowPlaying = content.querySelector("#now-playing"),
      error = content.querySelector("#radio-error");
    var up = content.querySelector("#radio-up"),
      down = content.querySelector("#radio-down");
    var synthCanvas = content.querySelector("#radio-synth");
    if (synthCanvas) synthCanvas.style.display = "none";

    // "More" link — inline at the end of the preview text. Expands to the
    // full description (capped at 500 characters), "Less" collapses back.
    var descEl = content.querySelector("#radioDesc");
    var descMoreEl = content.querySelector("#radioDescMore");
    if (descEl && descMoreEl && radioInfo && radioInfo.description) {
      var fullDesc = radioInfo.description;
      var previewDesc =
        fullDesc.length > 180
          ? fullDesc.slice(0, 180).replace(/\s+\S*$/, "") + "…"
          : fullDesc;
      var clampedDesc =
        fullDesc.length > 500
          ? fullDesc.slice(0, 500).replace(/\s+\S*$/, "") + "…"
          : fullDesc;
      var moreText = t("d_more", "More"),
        lessText = t("d_less", "Less");
      descMoreEl.addEventListener("click", function (e) {
        e.preventDefault();
        if (descMoreEl.textContent === lessText) {
          descEl.textContent = previewDesc;
          descMoreEl.textContent = moreText;
        } else {
          descEl.textContent = clampedDesc;
          descMoreEl.textContent = lessText;
        }
      });
    }

    countryBtns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        selectedFlag = this.getAttribute("data-flag");
                // Store country code instead of SVG
                var cName = flagToCountry[selectedFlag] || "";
                var nameToCode = { Ireland: "ie", "United Kingdom": "gb", France: "fr", Germany: "de", Spain: "es", Italy: "it", Netherlands: "nl", Poland: "pl", Portugal: "pt", Sweden: "se", Norway: "no", "United States": "us", Canada: "ca", Australia: "au", "New Zealand": "nz" };
                try { localStorage.setItem("handiRadioCountry", nameToCode[cName] || ""); } catch (e) {}
        stopPlayback(true);
        renderStations();
        countryBtns.forEach(function (b) { b.classList.remove("active"); b.style.background = ""; });
        this.classList.add("active");
      });
    });

  var currentAudio = null,
    stopVisualiser = null,
    activeStationItem = null,
    activeStationName = null;

  function addStationRow(url, name, flagHtml) {
    var d = document.createElement("div");
    d.className = "radio-station";
    d.style.cssText = "display:flex;align-items:center;gap:8px;";
    var fs = document.createElement("span");
    fs.style.fontSize = "1.2rem";
    fs.innerHTML = flagHtml || '<i class="fa-solid fa-tower-broadcast"></i>';
    var pi = document.createElement("span");
    pi.className = "radio-play-btn";
    pi.innerHTML = '<i class="fa-solid fa-play"></i>';
    var ns = document.createElement("span");
    ns.textContent = name;
    ns.style.flex = "1";
    d.appendChild(fs);
    d.appendChild(pi);
    d.appendChild(ns);
    d.addEventListener("click", function (e) {
      if (e.target.closest(".radio-lock-toggle, .pin-btn")) return;
      playStation(url, name, d, pi);
    });
    d.stationData = { url: url, name: name, element: d, playBtn: pi };
    list.appendChild(d);
  }

  function renderStations() {
    list.innerHTML = "";
    if (streamUrl) {
      if (feedTracks.length) {
        feedTracks.forEach(function (tr, i) {
          addStationRow(
            tr.url,
            tr.name || t("d_episode", "Episode ") + (i + 1),
            '<i class="fa-solid fa-tower-broadcast"></i>',
          );
        });
      } else {
        addStationRow(
          streamUrl,
          t("d_liveStream", "Live Stream"),
          '<i class="fa-solid fa-tower-broadcast"></i>',
        );
      }
    }
    if (!selectedFlag) {
      if (!streamUrl) {
        list.innerHTML =
          '<div class="module-empty" style="padding:20px;text-align:center;"><i class="fa-solid fa-radio"></i><p>' +
          t("d_browseStations", "Select a country above to browse stations") +
          "</p></div>";
        nowPlaying.innerText = t("d_noStation", "No station playing");
      }
      return;
    }
    STATIONS.filter(function (s) {
      return s.flag === selectedFlag;
    }).forEach(function (station) {
      addStationRow(station.url, station.name, station.flag);
    });
  }
  renderStations();

    function applyGlobalMute(muted) {
    if (currentAudio) currentAudio.muted = muted;
  }
  window.addEventListener("globalMuteToggle", function (e) {
    applyGlobalMute(e.detail.muted);
  });
  applyGlobalMute(localStorage.getItem("globalMute") === "true");

  function startFakeVisualiser(canvas) {
    if (!canvas) return null;
    canvas.style.display = "block";
    var aid = null,
      ctx = canvas.getContext("2d");
    function rc() {
      var r = canvas.getBoundingClientRect();
      canvas.width = r.width;
      canvas.height = r.height;
    }
    rc();
    window.addEventListener("resize", rc);
    var tm = 0;
    function draw() {
      aid = requestAnimationFrame(draw);
      tm += 0.05;
      var w = canvas.width,
        h = canvas.height;
      if (!w || !h) return;
      ctx.clearRect(0, 0, w, h);
      for (var i = 0, bc = 32, bw = w / bc; i < bc; i++) {
        var bh =
          h *
          Math.min(
            0.9,
            ((Math.sin(tm + i * 0.3) + 1) / 2) * 0.7 + Math.random() * 0.3,
          );
        var hue =
          parseInt(
            getComputedStyle(document.body).getPropertyValue(
              "--music-synth-hue",
            ),
          ) || 200;
        ctx.fillStyle = "hsl(" + hue + ", 80%, 55%)";
        ctx.fillRect(i * bw, h - bh, bw - 1, bh);
      }
    }
    draw();
    return function () {
      cancelAnimationFrame(aid);
      window.removeEventListener("resize", rc);
    };
  }

  function stopVisualiserAndClear() {
    if (stopVisualiser) {
      stopVisualiser();
      stopVisualiser = null;
    }
    if (synthCanvas) {
      var sc = synthCanvas.getContext("2d");
      if (sc) sc.clearRect(0, 0, synthCanvas.width, synthCanvas.height);
      synthCanvas.style.display = "none";
    }
  }

  function stopPlayback(resetIcon) {
    if (currentAudio && typeof currentAudio.pause === "function") {
      try {
        currentAudio.pause();
      } catch (e) {}
      try {
        currentAudio.src = "";
      } catch (e) {}
      currentAudio = null;
    }
    stopVisualiserAndClear();
    nowPlaying.innerText = t("d_noStation", "No station playing");
    error.innerText = "";
    if (resetIcon !== false && activeStationItem) {
      var pb = activeStationItem.querySelector(".radio-play-btn");
      if (pb) {
        pb.innerHTML = '<i class="fa-solid fa-play"></i>';
        pb.classList.remove("playing");
      }
      activeStationItem.classList.remove("active-station");
      activeStationItem = null;
      activeStationName = null;
    }
  }

  function playStation(url, sName, sItem, sBtn) {
    if (isLocked) {
      error.innerText = t("d_radioLocked", "Radio is locked – unlock to play");
      return;
    }
    if (currentAudio && activeStationName === sName && !currentAudio.paused) {
      currentAudio.pause();
      nowPlaying.innerText = "⏸ " + t("d_paused", "Paused:") + " " + sName;
      if (sBtn) {
        sBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
        sBtn.classList.remove("playing");
      }
      stopVisualiserAndClear();
      return;
    }
    if (currentAudio) stopPlayback(true);
    nowPlaying.innerText =
      t("d_connecting", "Connecting to") + " " + sName + "...";
    error.innerText = "";
    try {
      var a = document.createElement("audio");
      // rte.ie streams are IP/geo-blocked for many IPs — play them through
      // the server relay proxy; everything else plays directly.
      a.src = isProxiedHost(url) ? "/api/stream?url=" + encodeURIComponent(url) : url;
      a.muted = localStorage.getItem("globalMute") === "true";
      currentAudio = a;
      var pp = a.play();
      if (pp === undefined) {
        os(a, sName, sItem, sBtn);
      } else {
        pp.then(function () {
          os(a, sName, sItem, sBtn);
        }).catch(function (er) {
          oe(a, er);
        });
      }
      a.onerror = function () {
        oe(a, new Error("Stream error"));
      };
    } catch (err) {
      console.error(err);
      error.innerText = t("d_playbackFailed", "Unable to play stream");
      stopPlayback(true);
    }
    function os(a2, n2, i2, b2) {
      if (a2 !== currentAudio) return;
      nowPlaying.innerText =
        "▶ " + t("d_nowPlaying", "Now playing:") + " " + n2;
      document.querySelectorAll(".radio-station").forEach(function (el) {
        var b = el.querySelector(".radio-play-btn");
        if (b) {
          b.innerHTML = '<i class="fa-solid fa-play"></i>';
          b.classList.remove("playing");
        }
        el.classList.remove("active-station");
      });
      if (b2) {
        b2.innerHTML = '<i class="fa-solid fa-pause"></i>';
        b2.classList.add("playing");
      }
      i2.classList.add("active-station");
      activeStationItem = i2;
      activeStationName = n2;
      if (!isLocked) stopVisualiser = startFakeVisualiser(synthCanvas);
      window.logEvent(2, "radio_play", { station: n2, url: url });
    }
    function oe(a2, err) {
      if (a2 !== currentAudio) return;
      console.warn("Play error:", err);
      var msg = err.message === "Stream error"
        ? t("d_streamUnavailable", "Stream unavailable")
        : t("d_cannotPlay", "Cannot play this station");
      error.innerText = msg;
      nowPlaying.innerText = t("d_playbackFailed", "Playback failed");
      stopPlayback(true);
      window.logEvent(1, "radio_error", { station: activeStationName, url: url, error: msg });
    }
  }

  function applyLockState() {
    if (isLocked) stopPlayback(true);
    list.querySelectorAll(".radio-station").forEach(function (d) {
      d.style.pointerEvents = isLocked ? "none" : "";
      d.style.opacity = isLocked ? "0.6" : "";
    });
    [up, down].forEach(function (b) {
      b.disabled = isLocked;
      b.style.opacity = isLocked ? "0.5" : "";
      b.style.cursor = isLocked ? "not-allowed" : "";
    });
    if (isLocked) {
      stopVisualiserAndClear();
      nowPlaying.innerText = t("d_radioLockedShort", "Radio locked");
      error.innerText = "";
    } else {
      if (activeStationItem && currentAudio && !currentAudio.paused) {
        stopVisualiser = startFakeVisualiser(synthCanvas);
        nowPlaying.innerText =
          "▶ " + t("d_nowPlaying", "Now playing:") + " " + activeStationName;
      } else if (!currentAudio || currentAudio.paused) {
        nowPlaying.innerText = t("d_noStation", "No station playing");
      }
      error.innerText = "";
    }
  }

  lockToggle.addEventListener("click", function (e) {
    e.stopPropagation();
    isLocked = !isLocked;
    localStorage.setItem("radioLocked", isLocked);
    updateLockIcon();
    applyLockState();
  });
  up.addEventListener("click", function () {
    list.scrollBy({ top: -300, behavior: "smooth" });
  });
  down.addEventListener("click", function () {
    list.scrollBy({ top: 300, behavior: "smooth" });
  });
  applyLockState();

  return function () {
    if (currentAudio && typeof currentAudio.pause === "function") {
      try {
        currentAudio.pause();
      } catch (e) {}
      try {
        currentAudio.src = "";
      } catch (e) {}
      currentAudio = null;
    }
    stopVisualiserAndClear();
  };
}
