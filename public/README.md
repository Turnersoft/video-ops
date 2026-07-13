# Remotion public assets (generated)

Symlinks created by `video_ops/remotion/scripts/ensure-public-dir.mjs`:

- `scripts/` → all series + episodes under `video_ops/scripts/`
- `assets/` → logos and shared images
- `turn-knowledge-cache/` → WASM LSP payloads (gitignored; regenerated before render)

Stale symlinks (`script/`, `script_v2/`, `generated/`) are removed automatically.

Do **not** symlink `remotion/` here — that causes recursive copies during bundle/render.
