# Turn Outdoor Teleprompter

Expo iOS app for filming serious scripted content outdoors while keeping the delivery casual.

## Run (development)

**Same Wi‑Fi** (Mac + iPhone):

```bash
cd video_ops/ios-teleprompter
npm install
npm start
```

Scan the QR code with **Expo Go**.

**Any network / outdoor (system ngrok — already installed on this Mac):**

```bash
npm run start:ngrok
```

This starts your Homebrew `ngrok` on Metro `:8081`, then Expo with `EXPO_PACKAGER_PROXY_URL` set to the public URL. On iPhone:

1. Open **Expo Go** → **Enter URL**
2. Paste the `exp://…` line printed in the terminal (also in `outdoor-expo-link.txt`)
3. Leave the Mac terminal running until you finish filming

`npm run start:outdoor` is the same command.

## Offline on iPhone (no Mac after install)

**Important:** installing a standalone app on a **physical iPhone** requires the **paid Apple Developer Program** ($99/year). That is Apple’s rule — EAS builds in the cloud, but signing still needs that membership.

**Without paid Apple**, use one of these instead:

| Option | Command | Real iPhone? | Offline? |
|--------|---------|--------------|----------|
| Expo Go (dev) | `npm start` | Yes | Needs dev Wi‑Fi |
| EAS simulator | `npm run build:ios` | No (Mac Simulator) | Yes |
| EAS Android APK | `npm run build:android` | Android phone | Yes |

With paid Apple + EAS:

```bash
eas device:create
npm run build:ios:device
```

Full comparison: **[OFFLINE_INSTALL.md](./OFFLINE_INSTALL.md)**

## Scripts library

All 12 `script_v2` sets lessons are bundled in `assets/scripts/`. On launch the app seeds them into local storage.

- **Scripts** tab lists every lesson with filmed status (`Not filmed`, `1 take`, `2 takes`, …)
- Tap a script to see past takes with thumbnails
- Tap a take to play it in-app
- **Import** (library only) adds extra JSON scripts via AirDrop / Files

Re-export bundled scripts after editing `animation.json`:

```bash
deno run --allow-all video_ops/outdoor_post/main.ts export-outdoor-script sets-v2-03-proper-subset video_ops/ios-teleprompter/assets/scripts/sets-v2-03-proper-subset.json
```

## Filming UI

Both orientations use **full-screen camera + overlay** (original layout).

- **Portrait:** inside the prompt card, **say text** (60%) stacked above focused **Lean / Turn-Lang** code (40%).
- **Landscape:** detects front-camera edge via orientation (camera right in `LANDSCAPE_LEFT`). **Controls** sit in two columns on the **opposite** edge; **script** uses `flex: 1` for all remaining width. No extra camera-side column — that side stays clear for the live preview.

Controls on both layouts:

- **Prev / Next** on their own row (portrait) or column (landscape) — separate from **Record**
- **Record** on its own row at the top (portrait) or isolated at the top of the control column (landscape)
- **720p** default video resolution — tap the resolution button to cycle `720p → 1080p → 2160p → 480p`
- **Flip**, **Manual/Timed**, **A- / A+**
- **NG**, **+5s**, **+10s** (extends timed auto-advance; shows hold on REC badge)

Import / Share JSON were removed from the filming screen.

## Process → Mac workflow (one tap, app can close)

After you stop recording, tap **Process** (not automatic). The app writes `{takeId}.mp4` + `{takeId}.json` into the app’s **iCloud container** (`outdoor-inbox/`). iOS syncs in the background — you can close the app immediately.

On the Mac, the outdoor agent watches:

`~/Library/Mobile Documents/iCloud~com~turnlang~outdoorteleprompter/Documents/outdoor-inbox`

**Requires a dev build** (Expo Go cannot write to iCloud silently):

```bash
eas device:create   # once
npm run build:ios:device
```

Enable **iCloud → Cloud Documents** for the app in your Apple Developer portal when using EAS.

Fallback when using Expo Go: Process falls back to Mac agent upload (if online) or the manual Files share sheet.

Mac setup:

```bash
cd video_ops && npm run setup:icloud-inbox
```

## Script JSON format

Same shape as `sets-v2-03-proper-subset` outdoor export:

```json
{
  "schemaVersion": 1,
  "id": "sets-v2-03-proper-subset",
  "title": "Proper subset — the concept Lean never defines",
  "mode": "manual",
  "countdownSeconds": 3,
  "slides": [
    {
      "id": "beat-01",
      "title": "Hook",
      "durationSeconds": 25.3,
      "countdownSeconds": 3,
      "body": "Hi friends, Welcome back…",
      "notes": "Lean:\n…\n\nTurn:\n…",
      "leanCode": "optional structured Lean block",
      "turnCode": "optional structured Turn block"
    }
  ]
}
```

- `countdownSeconds` on the script runs before recording starts
- `countdownSeconds` on a slide runs when **Next** advances during a take

## Take metadata

Each take stores video, thumbnail, slide-change timestamps, and NG markers under app document storage. Videos are also saved to the camera roll when permitted.
