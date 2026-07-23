# Offline install (Expo + EAS)

## The Apple constraint (read this first)

| Goal | Paid Apple Developer ($99/yr)? | Mac? | Fully offline after setup? |
|------|----------------------------------|------|----------------------------|
| **Real iPhone** standalone app | **Yes** — Apple requires it for any `.ipa` on device | No (EAS cloud build) | Yes |
| **iOS Simulator** via EAS | **No** | Yes (Xcode Simulator) | Yes |
| **Android phone** APK via EAS | **No** | No | Yes |
| **Expo Go** on iPhone | **No** | Dev machine on same Wi‑Fi | No (needs dev server) |

Apple does not allow installing a custom app on a physical iPhone without signing. EAS cannot bypass that. A **free Apple ID** only works when building from **Xcode on a Mac** (7‑day certs, not supported by EAS for device installs).

So without the paid Apple account, your realistic options are:

1. **Keep using Expo Go** (`npm start`) while developing — free, real iPhone, but needs your computer on the network.
2. **EAS simulator build** — free Apple-wise, but only runs in Mac Simulator (not outdoor filming on phone).
3. **EAS Android APK** — free, install on an Android phone, works offline.
4. **Pay Apple Developer** — then use `npm run build:ios:device` for a real offline iPhone app.

---

## Path A — Real iPhone, offline, no Mac (needs paid Apple)

### 1. Expo account (free)

```bash
npm install -g eas-cli
eas login
```

### 2. Link project

```bash
cd video_ops/ios-teleprompter
eas init
```

### 3. Register iPhone + build

```bash
eas device:create
npm run build:ios:device
```

Install the `.ipa` from the EAS build page.

---

## Path B — No paid Apple, real iPhone (Expo Go)

```bash
cd video_ops/ios-teleprompter
npm install
npm start
```

Scan QR with **Expo Go**. Phone and computer must be on the same network. Scripts and takes still work offline once the bundle has loaded, but you cannot close the dev server entirely.

---

## Path C — No paid Apple, EAS iOS Simulator (Mac only)

```bash
npm install -g eas-cli
eas login
cd video_ops/ios-teleprompter
eas init
npm run build:ios
```

Download the `.tar.gz`, extract, open in **Xcode → Simulator**. No Apple Developer fee. Camera works in Simulator but this is not a phone in your pocket.

---

## Path D — No paid Apple, real phone via Android APK

If you have an Android device:

```bash
npm run build:android
```

Download the `.apk` from EAS and install (allow “unknown sources”). Fully offline after install. Same teleprompter UI and scripts.

---

## Runtime (all standalone builds)

- All 12 scripts are bundled in the app
- Takes and prefs stay on device storage
- No API calls while filming

## Troubleshooting

- **“No team associated with your Apple account”** — you need the paid Apple Developer Program for `build:ios:device`, or use Path B/C/D instead.
- **Simulator build** — requires a Mac with Xcode to run the `.app`.
- **Camera black screen** — check system privacy permissions for the app.
