#!/usr/bin/env python3
"""Offline EN→ZH caption translation for outdoor burned subtitles.

CLI (stdin JSON → stdout JSON):
  echo '{"lines":["Hi friends."]}' | python3 translate-captions-local.py

Local HTTP server (started by npm run outdoor:all):
  python3 translate-captions-local.py --serve --port 8790
  POST /translate  {"lines":["..."]}  →  {"lines":["..."]}
  GET  /health     →  {"ok": true}
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any

GLOSSARY_TERMS = sorted(
    [
        "Turn-Lang",
        "Mathlib",
        "Prelude",
        "Set.ext",
        "SetEq",
        "FuncEq",
        "funext",
        "typeclass",
        "instance",
        "Lean",
        "rfl",
        "Nat",
        "Int",
        "Eq",
    ],
    key=len,
    reverse=True,
)


def term_pattern(term: str) -> re.Pattern[str]:
    if re.search(r"[./]", term):
        return re.compile(re.escape(term), re.IGNORECASE)
    return re.compile(rf"\b{re.escape(term)}\b", re.IGNORECASE)

MODEL_NAME = os.environ.get("CAPTION_TRANSLATE_MODEL", "Helsinki-NLP/opus-mt-en-zh")


def protect_terms(text: str) -> tuple[str, dict[str, str]]:
    protected = text
    replacements: dict[str, str] = {}
    for index, term in enumerate(GLOSSARY_TERMS):
        token = f" XKEEP{index}X "
        pattern = term_pattern(term)

        def repl(match: re.Match[str], token: str = token) -> str:
            replacements[token.strip()] = match.group(0)
            return token

        protected = pattern.sub(repl, protected)
    return protected, replacements


def restore_terms(text: str, replacements: dict[str, str]) -> str:
    restored = text
    for token, original in replacements.items():
        restored = restored.replace(token, original)
        restored = restored.replace(token.strip(), original)
    return re.sub(r"\s+", " ", restored).strip()


class CaptionTranslator:
    def __init__(self) -> None:
        self._tokenizer = None
        self._model = None

    def load(self) -> None:
        if self._model is not None:
            return
        try:
            from transformers import MarianMTModel, MarianTokenizer
        except ImportError as error:
            raise SystemExit(
                "transformers is not installed for caption translation.\n"
                "Use IndexTTS venv: export CAPTION_TRANSLATE_PYTHON=~/index-tts/.venv/bin/python\n"
                "Or: pip3 install transformers sentencepiece sacremoses"
            ) from error

        local_only = os.environ.get("HF_HUB_OFFLINE", "").strip() == "1"
        kwargs: dict[str, Any] = {"local_files_only": local_only} if local_only else {}
        self._tokenizer = MarianTokenizer.from_pretrained(MODEL_NAME, **kwargs)
        self._model = MarianMTModel.from_pretrained(MODEL_NAME, **kwargs)
        self._model.eval()

    def translate_line(self, line: str) -> str:
        import torch

        self.load()
        protected, replacements = protect_terms(line.strip())
        if not protected.strip():
            return ""
        encoded = self._tokenizer(
            protected,
            return_tensors="pt",
            truncation=True,
            max_length=512,
        )
        with torch.no_grad():
            output = self._model.generate(**encoded, max_length=512)
        zh = self._tokenizer.decode(output[0], skip_special_tokens=True)
        return restore_terms(zh, replacements)

    def translate_lines(self, lines: list[str]) -> list[str]:
        return [self.translate_line(line) for line in lines]


TRANSLATOR = CaptionTranslator()


def translate_payload(payload: dict[str, Any]) -> dict[str, list[str]]:
    lines = payload.get("lines")
    if not isinstance(lines, list):
        raise ValueError('Expected JSON {"lines":["..."]}')
    normalized = [str(line) for line in lines]
    translated = TRANSLATOR.translate_lines(normalized)
    if len(translated) != len(normalized):
        raise ValueError(
            f"Translation count mismatch: expected {len(normalized)}, got {len(translated)}"
        )
    return {"lines": translated}


class TranslateHandler(BaseHTTPRequestHandler):
    def log_message(self, format: str, *args: Any) -> None:
        sys.stderr.write("[caption-translate] " + (format % args) + "\n")

    def _send_json(self, status: int, payload: dict[str, Any]) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:
        if self.path.rstrip("/") == "/health":
            self._send_json(200, {"ok": True, "model": MODEL_NAME})
            return
        self._send_json(404, {"error": "not found"})

    def do_POST(self) -> None:
        if self.path.rstrip("/") != "/translate":
            self._send_json(404, {"error": "not found"})
            return
        length = int(self.headers.get("Content-Length", "0"))
        raw = self.rfile.read(length).decode("utf-8")
        try:
            payload = json.loads(raw)
            result = translate_payload(payload)
            self._send_json(200, result)
        except Exception as error:
            self._send_json(400, {"error": str(error)})


def run_server(host: str, port: int) -> None:
    TRANSLATOR.load()
    server = ThreadingHTTPServer((host, port), TranslateHandler)
    sys.stderr.write(
        f"[caption-translate] listening on http://{host}:{port} model={MODEL_NAME}\n"
    )
    server.serve_forever()


def main() -> None:
    parser = argparse.ArgumentParser(description="Offline EN→ZH caption translation")
    parser.add_argument("--serve", action="store_true", help="Run local HTTP server")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8790)
    args = parser.parse_args()

    if args.serve:
        run_server(args.host, args.port)
        return

    raw = sys.stdin.read()
    if not raw.strip():
        raise SystemExit("Expected JSON on stdin: {\"lines\":[\"...\"]}")

    payload = json.loads(raw)
    print(json.dumps(translate_payload(payload), ensure_ascii=False))


if __name__ == "__main__":
    main()
