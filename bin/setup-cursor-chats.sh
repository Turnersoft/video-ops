#!/usr/bin/env bash
# Setup check for Cursor Remote (Deno + agent CLI).
set -euo pipefail

echo "[setup-cursor-chats] Cursor Remote — mobile history + prompts"

missing=0
for cmd in deno agent sqlite3; do
  if command -v "$cmd" >/dev/null 2>&1; then
    echo "  ok: $cmd"
  else
    echo "  missing: $cmd" >&2
    missing=1
  fi
done

if [[ "$missing" -ne 0 ]]; then
  echo "[setup-cursor-chats] Install Deno, Cursor agent CLI, and sqlite3." >&2
  exit 1
fi

echo "[setup-cursor-chats] Ready. Run: npm run cursor-chats"
