#!/usr/bin/env bash
# Create iCloud Drive inbox folder and optionally symlink video_ops/inbox → iCloud.
set -euo pipefail

VIDEO_OPS_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ICLOUD_INBOX="$HOME/Library/Mobile Documents/com~apple~CloudDocs/TurnOutdoor/inbox"
APP_ICLOUD_INBOX="$HOME/Library/Mobile Documents/iCloud~com~turnlang~outdoorteleprompter/Documents/outdoor-inbox"
LOCAL_INBOX="$VIDEO_OPS_ROOT/inbox"

mkdir -p "$ICLOUD_INBOX"
echo "Created iCloud inbox: $ICLOUD_INBOX"

if [[ -d "$(dirname "$APP_ICLOUD_INBOX")" ]]; then
  mkdir -p "$APP_ICLOUD_INBOX"
  echo "Created app iCloud inbox: $APP_ICLOUD_INBOX"
else
  echo "App iCloud container not synced yet (install dev build + tap Process once on iPhone)."
fi

if [[ -e "$LOCAL_INBOX" && ! -L "$LOCAL_INBOX" ]]; then
  echo "Local inbox already exists at $LOCAL_INBOX (not a symlink)."
  echo "Agent watches BOTH folders when iCloud inbox exists."
else
  rm -f "$LOCAL_INBOX"
  ln -sf "$ICLOUD_INBOX" "$LOCAL_INBOX"
  echo "Symlinked $LOCAL_INBOX → $ICLOUD_INBOX"
fi

cat <<EOF

iPhone setup (dev build):
  1. Install: cd ios-teleprompter && npm run build:ios:device
  2. Film → tap Process when done
  3. Close the app — iOS syncs to Mac automatically

Fallback (Expo Go / manual):
  Files → iCloud Drive → TurnOutdoor → inbox (save video + JSON from Library)

EOF
