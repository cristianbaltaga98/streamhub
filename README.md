# StreamHub

A desktop app that searches every torrent tracker at once through **Prowlarr** (or Jackett), tags each result by **audio/subtitle language** (Russian, English, Japanese, Romanian, Multi), and streams the pick in a built-in player — or hands it to **VLC / Infuse** for AirPlay to your TV.

```
StreamHub  ──>  Prowlarr / Jackett API  ──>  1337x · RuTracker · Nyaa.si · …
   │
   ├── built-in WebTorrent streaming player (mp4 / webm)
   └── "Send to VLC / Infuse"  ──>  AirPlay to Apple TV
```

## Stack
- **Electron** desktop shell (macOS)
- **React + TypeScript + Vite** frontend (electron-vite)
- **Express + WebTorrent** embedded backend (search proxy + range-streaming)
- **Prowlarr** indexer aggregator via Docker

## 1. Bring up Prowlarr

```bash
docker compose up -d
```

Open **http://localhost:9696**, then:
1. Settings ▸ General ▸ Security → copy the **API Key**.
2. Indexers ▸ Add Indexer → add **1337x**, **Nyaa.si**, and **RuTracker** (RuTracker needs your account username/password). FlareSolverr (also started by compose, on `:8191`) handles Cloudflare-protected trackers — set its URL in Prowlarr ▸ Settings ▸ Indexers.

## 2. Run the app

```bash
npm install
npm run dev
```

Open **Settings (⚙)** in the app, paste your Prowlarr URL + API key, Save. Search away.

Build a distributable `.dmg`:

```bash
npm run dist   # output in release/
```

## Language filtering
`src/shared/parse.ts` parses scene-naming conventions on each title:
- **Russian**: `RUS`, `Dub`, `DVO/MVO`, `Multi`, groups like *LostFilm, AlexFilm, NewStudio*.
- **English**: `ENG`, `Dual Audio`, `Multi-Subs`, `Softsubs`.
- **Original + subs (anime)**: `VOSTFR`, `Subbed`, `Dual Audio`, `.mkv` multi-track, groups like *SubsPlease, Erai-raws*.

Use the language chips under the search bar to filter.

## Playback & AirPlay
- **mp4 / webm** → plays inline.
- **mkv** (most anime / RU releases, multi-track subs) → Chromium can't decode it, so use **Open in VLC** or **Open in Infuse** — both stream the same local URL and cast to Apple TV via AirPlay. Or mirror the whole Mac screen from Control Center.

## Legal note
StreamHub is a search/playback frontend. It ships **no** indexers or content; you supply your own Prowlarr instance and trackers, and are responsible for what you access. RuTracker requires your own account.
