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

## Run as a home server (Windows PC) + watch on iPhone / TV

This is the recommended setup if your main machine is locked down (corporate DNS/VPN). The Windows PC does all the torrenting on your home network (where P2P works); your iPhone is just a remote + player.

### On the Windows PC (one-time)
1. Install **Node.js 20+**, **Docker Desktop**, and **Git**.
2. `git clone https://github.com/cristianbaltaga98/streamhub && cd streamhub`
3. `docker compose up -d` → open `http://localhost:9696`, add indexers (1337x, Nyaa…), copy the API key.
4. `npm install`
5. `npm run serve`
6. It prints a **Network URL** like `http://192.168.0.111:6868`. Open it in a browser on the PC, go to ⚙ Settings, paste the Prowlarr URL (`http://localhost:9696`) + API key + your TMDB key, Save.

Leave that terminal running (or set it to auto-start). The PC is now your StreamHub server.

### On the iPhone (same Wi-Fi)
- Open the **Network URL** (`http://<PC-ip>:6868`) in Safari → **Share ▸ Add to Home Screen** so it behaves like an app.
- Search, tap a title, tap **Play**.
- mp4/H.264 plays inline with Safari's native **AirPlay** button.
- For mkv/HEVC (most releases): install **Infuse** or **VLC** from the App Store, tap **Open in Infuse/VLC**, then use its **AirPlay** button to send to any AirPlay TV.

### Watch from anywhere (Tailscale)
No port-forwarding, no exposing anything to the public internet.
1. Install **Tailscale** on the Windows PC and the iPhone, sign in to the same account on both.
2. On the PC, note its Tailscale address (e.g. `100.x.y.z`, or the MagicDNS name like `http://my-pc:6868`).
3. With Tailscale on, open `http://<tailscale-ip>:6868` on the iPhone from anywhere (cellular, other Wi-Fi). Same UI, fully private.

### Site-blocks on the home PC
Your UK ISP may still block tracker sites by DNS. The compose file already pins the containers to Cloudflare DNS (`1.1.1.1`) which bypasses most DNS blocks. If a tracker still fails, install a consumer VPN **on the Windows PC** (it's your own machine, not managed) — that also keeps P2P working.

## Troubleshooting

**Search returns nothing / "SSL connection could not be established":** Your DNS is blocking the tracker site (e.g. Cisco Umbrella on a corporate Mac, or UK ISP site-blocks resolve torrent domains to a block page). The compose file pins the containers to Cloudflare/Google DNS (`1.1.1.1`, `8.8.8.8`) to bypass this. If it still fails, the indexer may be in a failure cooldown — wait ~5 min or restart: `docker compose restart`.

**Player shows "0 peers" / streams never start / VLC "can't open":** Your network is blocking BitTorrent (UDP trackers + DHT). This is typical of **corporate VPNs** and locked-down Wi-Fi. Disconnect the work VPN (or use a P2P-friendly consumer VPN). The player's "N peers · X% buffered" line confirms when peers connect.

The catch on corporate machines: the VPN may be needed to bypass DNS site-blocks for *search*, but it blocks *streaming* (UDP). Best combo: clean container DNS (already set) for search + VPN **off** (or a consumer VPN) for streaming.

## Legal note
StreamHub is a search/playback frontend. It ships **no** indexers or content; you supply your own Prowlarr instance and trackers, and are responsible for what you access. RuTracker requires your own account.
