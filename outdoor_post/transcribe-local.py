#!/usr/bin/env python3
import json
import os
import sys
from pathlib import Path
from typing import Optional


def local_model_dir(model_name: str = "base") -> Optional[str]:
    """Use an already-downloaded faster-whisper snapshot (no HuggingFace network)."""
    repo = f"models--Systran--faster-whisper-{model_name}"
    roots = [
        Path.home() / ".cache" / "huggingface" / "hub" / repo / "snapshots",
        Path.home() / "Library" / "Caches" / "huggingface" / "hub" / repo / "snapshots",
    ]
    for root in roots:
        if not root.is_dir():
            continue
        snapshots = sorted(root.iterdir(), key=lambda path: path.stat().st_mtime, reverse=True)
        for snapshot in snapshots:
            if (snapshot / "model.bin").exists() and (snapshot / "config.json").exists():
                return str(snapshot)
    return None


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit("Usage: transcribe-local.py audio.wav")

    audio_path = sys.argv[1]
    try:
        from faster_whisper import WhisperModel
    except ImportError as error:
        raise SystemExit(
            "faster-whisper is not installed. Run: pip3 install faster-whisper"
        ) from error

    model_name = os.environ.get("WHISPER_MODEL", "base")
    model_path = os.environ.get("WHISPER_MODEL_PATH") or local_model_dir(model_name)
    if model_path:
        model = WhisperModel(model_path, device="cpu", compute_type="int8")
    else:
        # Offline-first: never block cut on HuggingFace SSL / network.
        os.environ.setdefault("HF_HUB_OFFLINE", "1")
        try:
            model = WhisperModel(
                model_name,
                device="cpu",
                compute_type="int8",
                local_files_only=True,
            )
        except TypeError:
            model = WhisperModel(model_name, device="cpu", compute_type="int8")
        except Exception as error:
            raise SystemExit(
                "Local Whisper model not found offline.\n"
                "Once (with network): python3 -c \"from faster_whisper import WhisperModel; WhisperModel('base')\"\n"
                f"Then rerun cut. Detail: {error}"
            ) from error

    segments_iter, _info = model.transcribe(
        audio_path,
        vad_filter=True,
        word_timestamps=True,
    )
    segments = []
    words = []
    for segment in segments_iter:
        text = segment.text.strip()
        if not text:
            continue
        segments.append(
            {
                "start": float(segment.start),
                "end": float(segment.end),
                "text": text,
            }
        )
        for word in segment.words or []:
            token = word.word.strip()
            if not token:
                continue
            words.append(
                {
                    "word": token,
                    "start": float(word.start),
                    "end": float(word.end),
                }
            )
    print(json.dumps({"segments": segments, "words": words}))


if __name__ == "__main__":
    main()
