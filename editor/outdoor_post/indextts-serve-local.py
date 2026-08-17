#!/usr/bin/env python3
"""Local IndexTTS-2 voice-clone HTTP server for npm run outdoor:all.

  python3 indextts-serve-local.py --serve --port 8792
  GET  /health
  POST /clone  {
    "text": "Hello from my cloned voice.",
    "referenceAudioPath": "/path/to/ref.wav",
    "outputPath": "/path/under/video_ops/out.wav"
  }
"""

from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
import threading
import time
import uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any

VIDEO_OPS_ROOT = Path(
    os.environ.get("VIDEO_OPS_ROOT", Path(__file__).resolve().parents[2])
).resolve()
INDEX_TTS_ROOT = Path(
    os.environ.get("INDEX_TTS_ROOT", Path.home() / "index-tts")
).resolve()
DEFAULT_OUTPUT_DIR = VIDEO_OPS_ROOT / ".cache" / "indextts-output"
MODEL_DIR = os.environ.get("INDEX_TTS_MODEL_DIR", str(INDEX_TTS_ROOT / "checkpoints"))
CFG_PATH = os.environ.get("INDEX_TTS_CFG", str(INDEX_TTS_ROOT / "checkpoints" / "config.yaml"))
REFERENCE_MAX_SECONDS = max(
    3.0,
    min(30.0, float(os.environ.get("INDEX_TTS_REFERENCE_MAX_SECONDS", "12"))),
)

_model = None
_model_lock = threading.RLock()
_loaded = False
_load_error: str | None = None
_device_label = "unknown"


def resolve_device() -> str:
    requested = os.environ.get("INDEX_TTS_DEVICE", "auto").strip().lower()
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
        INDEX_TTS_ROOT,
        Path.home() / "VoxCPM",
    ]
    for root in allowed_roots:
        root_resolved = root.resolve()
        if path == root_resolved or str(path).startswith(str(root_resolved) + os.sep):
            return path
    raise ValueError("Reference audio must live under video_ops, ~/Movies, or ~/index-tts")


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
        "22050",
        str(trimmed),
    ]
    subprocess.run(cmd, capture_output=True, check=True)
    return trimmed


def strip_prosody_marks(text: str) -> str:
    cleaned = re.sub(r"\[[a-zA-Z]+\]\s*", "", text)
    cleaned = re.sub(r"(\S+)~(\S+)", r"\1 \2", cleaned)
    return cleaned.strip()


def trim_silence(path: str) -> None:
    tmp = f"{path}.trim.wav"
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-i",
            path,
            "-af",
            "silenceremove=start_periods=1:start_silence=0.05:start_threshold=-45dB:"
            "stop_periods=1:stop_silence=0.08:stop_threshold=-45dB",
            "-c:a",
            "pcm_s16le",
            tmp,
        ],
        capture_output=True,
    )
    if os.path.exists(tmp) and os.path.getsize(tmp) > 512:
        os.replace(tmp, path)
    elif os.path.exists(tmp):
        os.unlink(tmp)


def load_model() -> None:
    global _model, _loaded, _load_error, _device_label
    with _model_lock:
        if _model is not None:
            return
        if _load_error is not None:
            raise RuntimeError(_load_error)
        try:
            if str(INDEX_TTS_ROOT) not in sys.path:
                sys.path.insert(0, str(INDEX_TTS_ROOT))
            from indextts.infer_v2 import IndexTTS2

            _device_label = resolve_device()
            sys.stderr.write(
                f"[indextts] Loading IndexTTS2 on {_device_label} from {MODEL_DIR}…\n"
            )
            sys.stderr.flush()
            _model = IndexTTS2(
                cfg_path=CFG_PATH,
                model_dir=MODEL_DIR,
                use_fp16=False,
                use_cuda_kernel=False,
                use_deepspeed=False,
                device=_device_label,
            )
            _loaded = True
            sys.stderr.write(f"[indextts] Model ready on {_device_label}\n")
            sys.stderr.flush()
        except Exception as error:
            _load_error = str(error)
            raise


def synthesize_clone(payload: dict[str, Any]) -> dict[str, Any]:
    text = strip_prosody_marks(str(payload.get("text", "")))
    if not text:
        raise ValueError('Expected non-empty "text"')

    reference_path_raw = payload.get("referenceAudioPath")
    output_raw = payload.get("outputPath")
    if not reference_path_raw:
        raise ValueError('Expected "referenceAudioPath"')

    reference_path = trim_reference_wav(
        allowed_input_path(str(reference_path_raw)),
        REFERENCE_MAX_SECONDS,
    )
    output_path = allowed_output_path(str(output_raw) if output_raw else None)

    load_model()
    assert _model is not None

    temporary_path = f"{output_path}.{uuid.uuid4().hex}.tmp.wav"
    _model.infer(
        spk_audio_prompt=str(reference_path),
        text=text,
        output_path=temporary_path,
        verbose=False,
    )
    trim_silence(temporary_path)
    os.replace(temporary_path, output_path)
    return {"outputPath": str(output_path)}


class IndexTTSHandler(BaseHTTPRequestHandler):
    def log_message(self, format: str, *args: Any) -> None:
        sys.stderr.write("[indextts] " + (format % args) + "\n")
        sys.stderr.flush()

    def _send_json(self, status: int, payload: dict[str, Any]) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:
        if self.path.split("?", 1)[0] == "/health":
            self._send_json(
                200,
                {
                    "ok": True,
                    "loaded": _loaded,
                    "device": _device_label,
                    "modelDir": MODEL_DIR,
                },
            )
            return
        self._send_json(404, {"error": "not found"})

    def do_POST(self) -> None:
        if self.path.split("?", 1)[0] != "/clone":
            self._send_json(404, {"error": "not found"})
            return
        length = int(self.headers.get("Content-Length", "0") or "0")
        raw = self.rfile.read(length) if length > 0 else b"{}"
        try:
            payload = json.loads(raw.decode("utf-8"))
            if not isinstance(payload, dict):
                raise ValueError("JSON object expected")
            result = synthesize_clone(payload)
            self._send_json(200, result)
        except Exception as error:
            self._send_json(400, {"error": str(error)})


def serve(host: str, port: int) -> None:
    server = ThreadingHTTPServer((host, port), IndexTTSHandler)
    sys.stderr.write(
        f"[indextts] listening on http://{host}:{port} model_dir={MODEL_DIR} device={resolve_device()}\n"
    )
    sys.stderr.flush()
    server.serve_forever()


def main() -> None:
    parser = argparse.ArgumentParser(description="Local IndexTTS voice clone server")
    parser.add_argument("--serve", action="store_true")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8792)
    args = parser.parse_args()
    if args.serve:
        serve(args.host, args.port)
        return
    parser.print_help()


if __name__ == "__main__":
    main()
