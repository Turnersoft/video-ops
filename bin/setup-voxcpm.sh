#!/usr/bin/env bash
# One-time (idempotent) setup for local VoxCPM voice cloning used by npm run outdoor:all.
set -euo pipefail

VOXCPM_ROOT="${VOXCPM_ROOT:-$HOME/VoxCPM}"
PYENV_FALLBACK="${HOME}/.pyenv/versions/3.10.12/bin/python"
PYTHON="${VOXCPM_SETUP_PYTHON:-}"

if [[ -z "$PYTHON" ]]; then
  if [[ -x "$PYENV_FALLBACK" ]]; then
    PYTHON="$PYENV_FALLBACK"
  elif command -v python3.10 >/dev/null 2>&1 && python3.10 --version >/dev/null 2>&1; then
    PYTHON="python3.10"
  elif command -v python3.11 >/dev/null 2>&1 && python3.11 --version >/dev/null 2>&1; then
    PYTHON="python3.11"
  else
    echo "[setup-voxcpm] Python 3.10–3.12 not found — pyenv install 3.10.12" >&2
    exit 1
  fi
fi

mkdir -p "$VOXCPM_ROOT"

if [[ ! -d "$VOXCPM_ROOT/.venv" ]]; then
  echo "[setup-voxcpm] Creating venv at $VOXCPM_ROOT/.venv ($PYTHON)"
  "$PYTHON" -m venv "$VOXCPM_ROOT/.venv"
else
  echo "[setup-voxcpm] Venv present at $VOXCPM_ROOT/.venv"
fi

VENV_PY="$VOXCPM_ROOT/.venv/bin/python"
PIP="$VOXCPM_ROOT/.venv/bin/pip"

echo "[setup-voxcpm] Installing voxcpm + soundfile (downloads PyTorch + HF weights on first clone request)"
"$PIP" install --upgrade pip wheel
"$PIP" install "voxcpm" "soundfile" "numpy"

echo "[setup-voxcpm] Ready: $VENV_PY"
"$VENV_PY" -c "import voxcpm; print('[setup-voxcpm] voxcpm import ok')"

echo "[setup-voxcpm] Optional: git clone https://github.com/OpenBMB/VoxCPM for app.py / LoRA web UI"
