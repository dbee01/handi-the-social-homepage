![alt text](http://handihomepage.com/wp-content/uploads/2026/05/3deviceWebsiteMockup.jpg)

# HandiHomepage
### Your Safe Home on the Web...

> Designed for novice, elderly and afficionado Web users - our free, open source and easy-to-use homepage gives you a photo gallery, a music player, radio streaming and much more - all on your homepage. Your personal info never leaves your computer. Make Handi Homepage your homepage today!

**[handihomepage.com](https://handihomepage.com)**

---

## Features

### Free Modules
| Module | Description |
|---|---|
| 📸 **Gallery** | Photo slideshow with lightbox |
| 🎵 **Music Player** | MP3 playlist with visualiser |
| 📻 **Radio** | 10 Irish internet radio stations |
| 📰 **News** | RSS feed reader (2 articles visible) |
| 🐘 **Social** | Mastodon trending links |
| 📅 **Calendar** | Proton Calendar ICS integration |
| 💬 **Chat** | Matrix messaging with auto-login |

### Premium Modules
| Module | Description |
|---|---|
| 📞 **Phone** | One-tap SIM, video & VoIP calling with contact photos |
| 🚌 **Live Bus** | Real-time Irish bus tracker (3 routes) |
| 📍 **Location Share** | SMS emergency location sharing via Infobip |

### Dashboard Features
- Drag-and-drop module layout (Packery)
- Pin modules to top
- Light/dark theme toggle
- Elderly-friendly high-contrast theme
- Module lock buttons (prevent accidental changes)
- Module info popups with usage instructions
- Subscription-based premium modules (Stripe)

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Vanilla JS (ES modules), Vite for dev/HMR |
| **Backend** | Node.js + Express |
| **Database** | IndexedDB (client-side), SQLite (GTFS) |
| **Chat** | Matrix via `matrix-js-sdk` |
| **Calls** | Infobip RTC (WebRTC) |
| **SMS** | Infobip API |
| **Bus data** | NTA GTFS-RT (protobuf) |
| **Payments** | Stripe subscriptions |

---

## Getting Started

### Prerequisites

- **Node.js** 22+ (required for Vite 8)
- npm

### Install

```bash
git clone https://codeberg.org/handi/ple.git
cd ple
cp .env.example .env    # edit with your API keys
npm install
```

### Development

```bash
# Terminal 1 — API server (port 8080)
npm start

# Terminal 2 — Vite dev server with HMR (port 5173)
npm run dev
```

Vite proxies `/api/*` to the Express server. Open `http://localhost:5173`.

### Production

```bash
npm start                 # Express on port 8080
# or with PM2:
pm2 start server.js --name handi
```

---

## Environment Variables

Copy `.env.example` to `.env`:

| Variable | Required | Description |
|---|---|---|
| `PORT` | No | Server port (default: 8080) |
| `BUS_API_KEY` | For bus | NTA GTFS-RT API key |
| `INFOBIP_API_KEY` | For emergency | Infobip SMS API key |
| `INFOBIP_BASE_URL` | For emergency | Infobip API host |
| `STRIPE_SECRET_KEY` | For premium | Stripe secret key |

---

## Project Structure

```
ple/
├── server.js              # Express API server
├── app.js                 # App entry
├── vite.config.js         # Vite dev proxy
├── package.json
├── .env.example
├── index.html             # Dashboard
├── settings.html          # Settings page
├── selector.html          # Dashboard module selector
├── css/
│   ├── base.css           # Variables, reset
│   ├── layout.css         # Grid, responsive, module layouts
│   ├── theme.css          # Dark theme
│   ├── elderly.css        # High-contrast elderly theme
│   └── vendor/            # Font Awesome 7
├── js/
│   └── core/              # Shared JS modules
│       ├── module-registry.js   # Module definitions & MMR
│       ├── module-buttons.js    # Lock, pin, info controls
│       ├── settings.js          # Settings load/save
│       ├── storage.js           # IndexedDB helpers
│       └── ...
├── modules/
│   ├── gallery/           # Photo slideshow
│   ├── music/             # MP3 player
│   ├── radio/             # Internet radio
│   ├── news/              # RSS reader
│   ├── mastodon/          # Social media
│   ├── calendar/          # ICS calendar
│   ├── chat/              # Matrix messaging
│   ├── friendly-phone/    # Phone contacts & calling
│   ├── bus/               # Live bus tracker
│   ├── emergency/         # Location sharing
│   └── click-to-call/     # WebRTC calling
└── images/
```

---

## License

GNU General Public License v3.0 — see [LICENCE.txt](LICENCE.txt).
