# video_ops

Outdoor filming pipeline, Remotion renders, and script projects.

## Content layout

All video projects live under **`scripts/`**:

| Series | Episodes |
|--------|----------|
| `abstract_algebra_in_proof_assistant/` | `sets-v2-*` |
| `algebra/` | `algebra-*` |
| `syntax/` | `syntax-*` |
| `pitfalls/` | `pitfalls-*` |
| `why-need/` | `why-need-*` |

See [scripts/README.md](./scripts/README.md).

## Quick start

Requires **Tailscale** on Mac (`johns-macbook-pro` @ `100.66.185.67`) and iPhone (`iphone172`).

```bash
npm run outdoor:all
```

Starts outdoor agent (:8788), Remotion Studio (:3000 + animation.md watcher), and Expo (:8081).

`animation.md` under `scripts/` is the source of truth — the agent watches it, syncs Remotion, and exports outdoor teleprompter JSON.

iPhone: Tailscale ON → Mac connection → **Refresh from iCloud**.

Automation scripts are in `bin/`.
