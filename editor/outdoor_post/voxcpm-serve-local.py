#!/usr/bin/env python3
"""Local VoxCPM voice-clone HTTP server for npm run outdoor:all.

  python3 voxcpm-serve-local.py --serve --port 8791
  GET  /health
  GET  /logs?limit=200   recent stderr (model load, tqdm progress, HTTP access)
  POST /clone  {
    "text": "Hello from my cloned voice.",
    "referenceAudioPath": "/path/to/ref.wav",
    "promptText": "optional transcript of reference for ultimate clone",
    "outputPath": "optional .wav under video_ops",
    "cfgValue": DEFAULT_CFG_VALUE,
    "inferenceTimesteps": DEFAULT_INFERENCE_TIMESTEPS,
    "seed": 42
  }
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import tempfile
import threading
import time
import uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib.parse import parse_qs, urlparse

MODEL_NAME = os.environ.get("VOXCPM_MODEL", "openbmb/VoxCPM2")
DEFAULT_CFG_VALUE = float(os.environ.get("VOXCPM_CFG_VALUE", "2.0"))
DEFAULT_INFERENCE_TIMESTEPS = int(os.environ.get("VOXCPM_INFERENCE_TIMESTEPS", "10"))
REFERENCE_MAX_SECONDS = float(os.environ.get("VOXCPM_REFERENCE_MAX_SECONDS", "0"))
VIDEO_OPS_ROOT = Path(
    os.environ.get("VIDEO_OPS_ROOT", Path(__file__).resolve().parents[2])
).resolve()
DEFAULT_OUTPUT_DIR = VIDEO_OPS_ROOT / ".cache" / "voxcpm-output"

_model = None
_model_lock = threading.RLock()
_loaded = False
_load_error: str | None = None
_device_label = "unknown"

_ref_wav_cache: dict[str, Path] = {}
_warmed_reference_wav: str | None = None
_ref_wav_lock = threading.Lock()

LOG_BUFFER_MAX_LINES = 500
LOG_BUFFER_MAX_CHARS = 50_000
_log_lock = threading.Lock()
_log_text = ""
_stderr_installed = False


class _StderrCapture:
    def __init__(self, original: Any) -> None:
        self._original = original

    def write(self, text: str) -> None:
        self._original.write(text)
        self._original.flush()
        if not text:
            return
        global _log_text
        with _log_lock:
            if "\r" in text and "\n" not in text:
                last_nl = _log_text.rfind("\n")
                prefix = _log_text[: last_nl + 1] if last_nl >= 0 else ""
                _log_text = prefix + text.split("\r")[-1]
            else:
                normalized = text.replace("\r\n", "\n").replace("\r", "\n")
                _log_text += normalized
            if len(_log_text) > LOG_BUFFER_MAX_CHARS:
                _log_text = _log_text[-LOG_BUFFER_MAX_CHARS:]

    def flush(self) -> None:
        self._original.flush()

    def __getattr__(self, name: str) -> Any:
        return getattr(self._original, name)


def install_stderr_capture() -> None:
    global _stderr_installed
    if _stderr_installed:
        return
    sys.stderr = _StderrCapture(sys.stderr)
    _stderr_installed = True


def read_log_snapshot(limit: int = 200) -> dict[str, Any]:
    capped = max(1, min(limit, LOG_BUFFER_MAX_LINES))
    with _log_lock:
        lines = _log_text.split("\n")
        while lines and lines[-1] == "":
            lines.pop()
        trimmed = lines[-capped:]
        text = "\n".join(trimmed)
    return {"lines": trimmed, "text": text, "lineCount": len(trimmed)}


def resolve_device() -> str:
    requested = os.environ.get("VOXCPM_DEVICE", "auto").strip().lower()
    if requested not in ("auto", "cpu", "mps", "cuda"):
        return requested
    if requested != "auto":
        return requested
    try:
        import torch

        if torch.cuda.is_available():
            return "cuda"
        if hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
            return "mps"
    except Exception:
        pass
    return "cpu"


def allowed_input_path(raw: str) -> Path:
    path = Path(raw).expanduser().resolve()
    if not path.is_file():
        raise ValueError(f"Reference audio not found: {path}")
    allowed_roots = [
        VIDEO_OPS_ROOT,
        Path.home() / "Movies",
        Path.home() / "index-tts",
        Path.home() / "VoxCPM",
    ]
    for root in allowed_roots:
        root_resolved = root.resolve()
        if path == root_resolved or str(path).startswith(str(root_resolved) + os.sep):
            return path
    raise ValueError(f"Reference audio must live under video_ops, ~/Movies, ~/index-tts, or ~/VoxCPM")


def allowed_output_path(raw: str | None) -> Path:
    if raw:
        path = Path(raw).expanduser().resolve()
        if path.suffix.lower() not in (".wav", ".flac"):
            raise ValueError("outputPath must end with .wav or .flac")
        if not str(path).startswith(str(VIDEO_OPS_ROOT) + os.sep):
            raise ValueError("outputPath must be inside VIDEO_OPS_ROOT")
        path.parent.mkdir(parents=True, exist_ok=True)
        return path
    DEFAULT_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    return DEFAULT_OUTPUT_DIR / f"clone-{int(time.time())}-{uuid.uuid4().hex[:8]}.wav"


def trim_reference_wav(path: Path, max_seconds: float) -> Path:
    if max_seconds <= 0:
        return path
    import hashlib

    stat = path.stat()
    cache_key = f"{path.resolve()}:{stat.st_mtime_ns}:{stat.st_size}:{max_seconds}"
    digest = hashlib.sha256(cache_key.encode("utf-8")).hexdigest()[:16]
    temp_dir = DEFAULT_OUTPUT_DIR / "_refs"
    temp_dir.mkdir(parents=True, exist_ok=True)
    trimmed = temp_dir / f"{path.stem}-trim-{digest}-{int(max_seconds)}s.wav"
    if trimmed.is_file():
        return trimmed
    import subprocess

    cmd = [
        "ffmpeg",
        "-y",
        "-i",
        str(path),
        "-t",
        f"{max_seconds:.3f}",
        "-ac",
        "1",
        "-ar",
        "16000",
        str(trimmed),
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise ValueError(
            f"Could not trim reference audio ({path.name}): {(result.stderr or result.stdout).strip()}"
        )
    return trimmed


def ensure_wav_reference(path: Path) -> Path:
    wav_path = path
    if path.suffix.lower() not in (".wav", ".flac"):
        cache_key = str(path.resolve())
        with _ref_wav_lock:
            cached = _ref_wav_cache.get(cache_key)
            if cached is not None and cached.is_file():
                wav_path = cached
            else:
                import subprocess

                temp_dir = DEFAULT_OUTPUT_DIR / "_refs"
                temp_dir.mkdir(parents=True, exist_ok=True)
                digest = f"{path.stat().st_mtime_ns}-{path.stat().st_size}"
                out_path = temp_dir / f"{path.stem}-{digest}.wav"
                if not out_path.is_file():
                    cmd = [
                        "ffmpeg",
                        "-y",
                        "-i",
                        str(path),
                        "-ac",
                        "1",
                        "-ar",
                        "16000",
                        str(out_path),
                    ]
                    result = subprocess.run(cmd, capture_output=True, text=True)
                    if result.returncode != 0:
                        raise ValueError(
                            f"Could not decode reference audio ({path.name}): {(result.stderr or result.stdout).strip()}"
                        )
                with _ref_wav_lock:
                    _ref_wav_cache[cache_key] = out_path
                wav_path = out_path
    return trim_reference_wav(wav_path, REFERENCE_MAX_SECONDS)


def warm_reference_voice(reference_wav: str) -> None:
    global _warmed_reference_wav
    if _warmed_reference_wav == reference_wav:
        return
    load_model()
    assert _model is not None
    sys.stderr.write(f"[voxcpm] Warming reference-conditioned voice ({reference_wav})…\n")
    sys.stderr.flush()
    _model.generate(
        text="Voice warm up.",
        reference_wav_path=reference_wav,
        cfg_value=DEFAULT_CFG_VALUE,
        inference_timesteps=DEFAULT_INFERENCE_TIMESTEPS,
    )
    _warmed_reference_wav = reference_wav
    sys.stderr.write("[voxcpm] Reference voice warm-up done\n")
    sys.stderr.flush()


def load_model() -> None:
    global _model, _loaded, _load_error, _device_label
    with _model_lock:
        if _model is not None:
            return
        if _load_error is not None:
            raise RuntimeError(_load_error)
        try:
            from voxcpm import VoxCPM

            _device_label = resolve_device()
            local_only = os.environ.get("HF_HUB_OFFLINE", "").strip() == "1"
            load_kwargs: dict[str, Any] = {"load_denoiser": False}
            if local_only:
                load_kwargs["local_files_only"] = True
            sys.stderr.write(
                f"[voxcpm] Loading {MODEL_NAME} on {_device_label} (first run downloads weights)…\n"
            )
            sys.stderr.flush()
            _model = VoxCPM.from_pretrained(MODEL_NAME, **load_kwargs)
            _loaded = True
            sys.stderr.write(f"[voxcpm] Model ready on {_device_label}\n")
        except Exception as error:
            _load_error = str(error)
            raise


def synthesize_clone(payload: dict[str, Any]) -> dict[str, Any]:
    text = str(payload.get("text", "")).strip()
    if not text:
        raise ValueError('Expected non-empty "text"')

    reference_path_raw = payload.get("referenceAudioPath")
    prompt_text = payload.get("promptText")
    prompt_wav_raw = payload.get("promptWavPath")
    output_raw = payload.get("outputPath")

    reference_path = (
        str(ensure_wav_reference(allowed_input_path(str(reference_path_raw))))
        if reference_path_raw
        else None
    )
    prompt_wav_path = (
        str(ensure_wav_reference(allowed_input_path(str(prompt_wav_raw))))
        if prompt_wav_raw
        else None
    )
    output_path = allowed_output_path(str(output_raw) if output_raw else None)

    default_timesteps = DEFAULT_INFERENCE_TIMESTEPS
    default_cfg = DEFAULT_CFG_VALUE
    cfg_value = float(payload.get("cfgValue", default_cfg))
    inference_timesteps = int(payload.get("inferenceTimesteps", default_timesteps))
    seed = payload.get("seed")
    seed_value = int(seed) if seed is not None else None

    load_model()
    assert _model is not None

    import soundfile as sf

    cfg_value = max(1.0, min(3.0, cfg_value))
    generate_kwargs: dict[str, Any] = {
        "text": text,
        "cfg_value": cfg_value,
        "inference_timesteps": max(4, min(30, inference_timesteps)),
    }
    if seed_value is not None:
        generate_kwargs["seed"] = seed_value

    if prompt_wav_path and prompt_text:
        generate_kwargs["prompt_wav_path"] = prompt_wav_path
        generate_kwargs["prompt_text"] = str(prompt_text)
        if reference_path:
            generate_kwargs["reference_wav_path"] = reference_path
    elif reference_path:
        with _model_lock:
            warm_reference_voice(reference_path)
        generate_kwargs["reference_wav_path"] = reference_path
    else:
        raise ValueError(
            'Provide "referenceAudioPath" (controllable clone) or '
            '"promptWavPath" + "promptText" (ultimate clone)'
        )

    started = time.time()
    # One model instance cannot safely generate concurrently (MPS/CUDA).
    with _model_lock:
        wav = _model.generate(**generate_kwargs)
    sample_rate = int(getattr(_model.tts_model, "sample_rate", 48000))
    sf.write(str(output_path), wav, sample_rate)
    duration_seconds = len(wav) / sample_rate if sample_rate else 0.0

    return {
        "ok": True,
        "path": str(output_path),
        "sampleRate": sample_rate,
        "durationSeconds": round(duration_seconds, 3),
        "elapsedSeconds": round(time.time() - started, 2),
        "device": _device_label,
        "model": MODEL_NAME,
    }


class VoxCPMHandler(BaseHTTPRequestHandler):
    def log_message(self, format: str, *args: Any) -> None:
        sys.stderr.write("[voxcpm] " + (format % args) + "\n")
        sys.stderr.flush()

    def _send_json(self, status: int, payload: dict[str, Any]) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        route = parsed.path.rstrip("/")
        if route == "/health":
            self._send_json(
                200,
                {
                    "ok": True,
                    "model": MODEL_NAME,
                    "loaded": _loaded,
                    "device": _device_label if _loaded else resolve_device(),
                    "loadError": _load_error,
                },
            )
            return
        if route == "/logs":
            query = parse_qs(parsed.query)
            raw_limit = query.get("limit", ["200"])[0]
            try:
                limit = int(raw_limit)
            except ValueError:
                limit = 200
            self._send_json(200, {"ok": True, **read_log_snapshot(limit)})
            return
        self._send_json(404, {"error": "not found"})

    def do_POST(self) -> None:
        if self.path.rstrip("/") != "/clone":
            self._send_json(404, {"error": "not found"})
            return
        length = int(self.headers.get("Content-Length", "0"))
        raw = self.rfile.read(length).decode("utf-8")
        try:
            payload = json.loads(raw)
            result = synthesize_clone(payload)
            self._send_json(200, result)
        except Exception as error:
            self._send_json(400, {"error": str(error)})


def run_server(host: str, port: int) -> None:
    install_stderr_capture()
    if os.environ.get("VOXCPM_EAGER_LOAD", "").strip() == "1":
        load_model()
    server = ThreadingHTTPServer((host, port), VoxCPMHandler)
    sys.stderr.write(
        f"[voxcpm] listening on http://{host}:{port} model={MODEL_NAME} device={resolve_device()}\n"
    )
    server.serve_forever()


def main() -> None:
    parser = argparse.ArgumentParser(description="Local VoxCPM voice clone server")
    parser.add_argument("--serve", action="store_true", help="Run local HTTP server")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8791)
    args = parser.parse_args()

    if args.serve:
        run_server(args.host, args.port)
        return

    raw = sys.stdin.read()
    if not raw.strip():
        raise SystemExit('Expected JSON on stdin, e.g. {"text":"Hi","referenceAudioPath":"ref.wav"}')
    payload = json.loads(raw)
    print(json.dumps(synthesize_clone(payload), ensure_ascii=False))


if __name__ == "__main__":
    main()
