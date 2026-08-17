#!/usr/bin/env bash
# One-time (idempotent) setup for social-auto-upload (SAU) used by outdoor publish.
set -euo pipefail

SAU_ROOT="${SAU_REPO:-${SAU_ROOT:-$HOME/Documents/company/social-auto-upload}}"
SAU_BIN_DIR="${HOME}/.local/bin"

if ! command -v uv >/dev/null 2>&1; then
  echo "[setup-sau] uv not found — install: https://docs.astral.sh/uv/" >&2
  exit 1
fi

if [[ ! -d "$SAU_ROOT/.git" ]]; then
  echo "[setup-sau] Cloning social-auto-upload into $SAU_ROOT"
  mkdir -p "$(dirname "$SAU_ROOT")"
  git clone https://github.com/dreammis/social-auto-upload.git "$SAU_ROOT"
else
  echo "[setup-sau] Repo present at $SAU_ROOT"
fi

cd "$SAU_ROOT"

if [[ ! -d .venv ]]; then
  echo "[setup-sau] Creating venv"
  uv venv
else
  echo "[setup-sau] Venv present at $SAU_ROOT/.venv"
fi

# shellcheck disable=SC1091
source .venv/bin/activate

echo "[setup-sau] Installing social-auto-upload (registers sau CLI)"
uv pip install -e .

if [[ ! -f conf.py ]]; then
  echo "[setup-sau] Creating conf.py from conf.example.py"
  cp conf.example.py conf.py
fi

if ! patchright install --dry-run chromium >/dev/null 2>&1; then
  echo "[setup-sau] Installing patchright Chromium (may take a few minutes)"
  PLAYWRIGHT_DOWNLOAD_HOST="${PLAYWRIGHT_DOWNLOAD_HOST:-https://npmmirror.com/mirrors/playwright}" \
    patchright install chromium
else
  echo "[setup-sau] patchright Chromium already installed"
fi

mkdir -p "$SAU_BIN_DIR"
ln -sf "$SAU_ROOT/.venv/bin/sau" "$SAU_BIN_DIR/sau"

echo "[setup-sau] Ready: $SAU_BIN_DIR/sau"
sau --help | head -5

echo
echo "[setup-sau] Next: log in per platform (run in your terminal, scan QR when prompted):"
echo "  sau bilibili login --account default"
echo "  sau douyin login --account default"
echo "  sau kuaishou login --account default"
echo "  sau xiaohongshu login --account default"
echo
echo "[setup-sau] Enable live publish in outdoor-ui #/platforms or publish.env:"
echo "  SAU_PUBLISH_MODE=live"
