#!/usr/bin/env bash
# Start mobile Cursor Remote — chat history + agent prompts over Tailscale / LAN.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PORT="${CURSOR_REMOTE_PORT:-${CURSOR_CHATS_PORT:-5055}}"
HOST="${CURSOR_REMOTE_HOST:-${CURSOR_CHATS_HOST:-0.0.0.0}}"
BUNDLED_TAILSCALE_MAC_IP="${OUTDOOR_TAILSCALE_HOST:-100.66.185.67}"

if ! command -v agent >/dev/null 2>&1; then
  echo "[cursor-remote] 'agent' CLI not found. Install Cursor Agent or set PATH." >&2
  exit 1
fi

if ! command -v deno >/dev/null 2>&1; then
  echo "[cursor-remote] deno not found." >&2
  exit 1
fi

if lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "[cursor-remote] Port $PORT already in use — stopping previous cursor-remote"
  pkill -f "bin/cursor-remote/server.ts" 2>/dev/null || true
  pkill -f "cursor-view/.venv/bin/python server.py" 2>/dev/null || true
  sleep 0.5
  if lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
    echo "[cursor-remote] Port $PORT still busy. Kill the process or set CURSOR_REMOTE_PORT." >&2
    lsof -nP -iTCP:"$PORT" -sTCP:LISTEN 2>/dev/null || true
    exit 1
  fi
fi

resolve_tailscale_ip() {
  if [[ -n "${OUTDOOR_TAILSCALE_HOST:-}" ]]; then
    echo "$OUTDOOR_TAILSCALE_HOST"
    return
  fi
  local candidates=(
    "tailscale"
    "/Applications/Tailscale.app/Contents/MacOS/Tailscale"
    "/usr/local/bin/tailscale"
    "/opt/homebrew/bin/tailscale"
  )
  local bin
  for bin in "${candidates[@]}"; do
    if command -v "$bin" >/dev/null 2>&1 || [[ -x "$bin" ]]; then
      local ip
      ip="$("$bin" ip -4 2>/dev/null | head -n1 | tr -d '[:space:]' || true)"
      if [[ "$ip" == 100.* ]]; then
        echo "$ip"
        return
      fi
    fi
  done
  local from_if
  from_if="$(ifconfig 2>/dev/null | awk '/inet 100\./ { print $2; exit }' || true)"
  if [[ "$from_if" == 100.* ]]; then
    echo "$from_if"
    return
  fi
  echo "$BUNDLED_TAILSCALE_MAC_IP"
}

TS_IP="$(resolve_tailscale_ip)"

echo "[cursor-remote] Bind: ${HOST}:${PORT}"
echo ""
echo "  Mac:      http://127.0.0.1:${PORT}"
echo "  iPhone:   http://${TS_IP}:${PORT}  (Tailscale)"
echo ""
echo "  Browse all chats by workspace · send prompts via local agent CLI"
echo "  Privacy Mode (Legacy) OK — runs on your Mac, no Cursor cloud remote"
echo ""

export CURSOR_REMOTE_PORT="$PORT"
export CURSOR_REMOTE_HOST="$HOST"
exec deno run --allow-all "$ROOT/bin/cursor-remote/server.ts"
