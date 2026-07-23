#!/usr/bin/env python3
"""Rename episode folders to drop series prefixes and rewrite scriptId refs.

Example: projects/ai-math/ai-math-01-keep-reject-intro → …/01-keep-reject-intro
"""

from __future__ import annotations

import json
import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PROJECTS = ROOT / "projects"

# Longest prefix first. Prefix is stripped from folder / scriptId.
PREFIX_RULES: list[tuple[str, str]] = [
    ("formal-math-", "formal-math"),
    ("sets-v2-", "abstract_algebra_in_proof_assistant"),
    ("groups-v1-", "abstract_algebra_in_proof_assistant"),
    ("why-need-", "why-need"),
    ("pitfalls-", "pitfalls"),
    ("ai-math-", "ai-math"),
    ("algebra-", "algebra"),
    ("compare-", "compare"),
    ("launch-", "launch"),
    ("syntax-", "syntax"),
    ("life-", "logic-for-life"),
]

SKIP_DIRS = {"shared", "_templates"}
TEXT_SUFFIXES = {
    ".md",
    ".json",
    ".txt",
    ".log",
    ".ts",
    ".tsx",
    ".mjs",
    ".js",
    ".yml",
    ".yaml",
}


def strip_prefix(name: str) -> str | None:
    for prefix, _series in PREFIX_RULES:
        if name.startswith(prefix):
            return name[len(prefix) :]
    return None


def collect_renames() -> list[tuple[Path, Path, str, str]]:
    renames: list[tuple[Path, Path, str, str]] = []
    shorts: dict[str, str] = {}
    for series_dir in sorted(PROJECTS.iterdir()):
        if not series_dir.is_dir() or series_dir.name in SKIP_DIRS or series_dir.name.startswith("."):
            continue
        for ep in sorted(series_dir.iterdir()):
            if not ep.is_dir() or ep.name in SKIP_DIRS or ep.name.startswith("."):
                continue
            short = strip_prefix(ep.name)
            if not short:
                continue
            if short in shorts:
                raise SystemExit(
                    f"short-id collision: {short} ({shorts[short]} vs {series_dir.name}/{ep.name})"
                )
            shorts[short] = f"{series_dir.name}/{ep.name}"
            dest = ep.with_name(short)
            if dest.exists():
                raise SystemExit(f"dest exists: {dest}")
            renames.append((ep, dest, ep.name, short))
    return renames


def rewrite_text(text: str, replacements: list[tuple[str, str]]) -> str:
    # Longest old ids first so nested prefixes don't partially rewrite.
    for old, new in sorted(replacements, key=lambda pair: len(pair[0]), reverse=True):
        text = text.replace(old, new)
    return text


def rewrite_tree(root: Path, replacements: list[tuple[str, str]]) -> int:
    changed = 0
    for path in root.rglob("*"):
        if not path.is_file():
            continue
        if path.suffix.lower() not in TEXT_SUFFIXES and path.name not in {
            "Dockerfile",
            "Makefile",
            "concat.txt",
        }:
            continue
        try:
            raw = path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            continue
        new = rewrite_text(raw, replacements)
        if new != raw:
            path.write_text(new, encoding="utf-8")
            changed += 1
    return changed


def rename_prefixed_files(episode_dir: Path, old_id: str, new_id: str) -> None:
    """Rename files that embed the old scriptId in the basename."""
    patterns = [
        (f"{old_id}-outdoor-script.json", "outdoor-script.json"),
        (f"{old_id}-outdoor-portrait.mp4", "outdoor-portrait.mp4"),
        (f"{old_id}-outdoor-landscape.mp4", "outdoor-landscape.mp4"),
        (f"{old_id}.mp4", "video.mp4"),
        (f"{old_id}-preview.mp4", "video-preview.mp4"),
        (f"{old_id}-edited.mp4", "video-edited.mp4"),
    ]
    for path in list(episode_dir.rglob("*")):
        if not path.is_file():
            continue
        for old_name, new_name in patterns:
            if path.name == old_name:
                dest = path.with_name(new_name)
                if not dest.exists():
                    path.rename(dest)
                break


def write_series_map(renames: list[tuple[Path, Path, str, str]]) -> dict[str, str]:
    mapping: dict[str, str] = {}
    # Include all episodes under projects (renamed + already-short + templates skipped).
    for series_dir in sorted(PROJECTS.iterdir()):
        if not series_dir.is_dir() or series_dir.name in SKIP_DIRS or series_dir.name.startswith("."):
            continue
        for ep in sorted(series_dir.iterdir()):
            if not ep.is_dir() or ep.name in SKIP_DIRS or ep.name.startswith("."):
                continue
            if not (ep / "animation.md").exists() and not (ep / "script.md").exists():
                continue
            mapping[ep.name] = series_dir.name
    # Also include pending renames' new names before/after — caller runs after rename.
    return dict(sorted(mapping.items()))


def main() -> None:
    renames = collect_renames()
    print(f"planned renames: {len(renames)}")
    replacements = [(old, new) for _src, _dst, old, new in renames]

    # 1) Rename folders
    for src, dst, old, new in renames:
        print(f"  {src.relative_to(ROOT)} → {dst.name}")
        src.rename(dst)

    # 2) Rewrite content inside each renamed episode + global indexes
    global_targets = [
        ROOT / "manifest.json",
        ROOT / "editor" / "remotion" / "src" / "Root.tsx",
        ROOT / "editor" / "remotion" / "src" / "generated",
        ROOT / "editor" / "ios-teleprompter" / "src" / "bundledScripts.ts",
        ROOT / "editor" / "ios-teleprompter" / "assets" / "scripts",
        ROOT / "projects" / ".cache" / "turn-knowledge-cache",
    ]
    for _src, dst, old, new in renames:
        n = rewrite_tree(dst, [(old, new)])
        rename_prefixed_files(dst, old, new)
        print(f"  rewrote {n} files under {dst.relative_to(ROOT)}")

    for target in global_targets:
        if target.is_file():
            try:
                raw = target.read_text(encoding="utf-8")
            except UnicodeDecodeError:
                continue
            new = rewrite_text(raw, replacements)
            if new != raw:
                target.write_text(new, encoding="utf-8")
                print(f"  rewrote {target.relative_to(ROOT)}")
        elif target.is_dir():
            n = rewrite_tree(target, replacements)
            if n:
                print(f"  rewrote {n} files under {target.relative_to(ROOT)}")

    # Rename teleprompter asset files + knowledge-cache filenames that embed scriptId
    tele_dir = ROOT / "editor" / "ios-teleprompter" / "assets" / "scripts"
    if tele_dir.is_dir():
        for old, new in replacements:
            src = tele_dir / f"{old}.json"
            dst = tele_dir / f"{new}.json"
            if src.exists() and not dst.exists():
                src.rename(dst)
                print(f"  teleprompter asset {src.name} → {dst.name}")

    cache_dir = ROOT / "projects" / ".cache" / "turn-knowledge-cache"
    if cache_dir.is_dir():
        for path in list(cache_dir.iterdir()):
            if not path.is_file():
                continue
            new_name = rewrite_text(path.name, replacements)
            if new_name != path.name:
                dest = path.with_name(new_name)
                if not dest.exists():
                    path.rename(dest)

    mapping = write_series_map(renames)

    json_out = ROOT / "editor" / "remotion" / "src" / "lib" / "generated" / "scriptSeriesMap.json"
    json_out.parent.mkdir(parents=True, exist_ok=True)
    json_out.write_text(json.dumps(mapping, indent=2) + "\n", encoding="utf-8")
    print(f"  wrote {json_out}")

    # Rebuild manifest scripts list from projects
    scripts = sorted(mapping.keys())
    manifest_path = ROOT / "manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    manifest["scripts"] = scripts
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(f"  manifest scripts: {len(scripts)}")


if __name__ == "__main__":
    main()
