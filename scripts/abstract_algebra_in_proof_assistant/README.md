# script_v2 — serial micro-videos from long-form lectures

One **definition or theorem per clip**, split from the published lecture  
`published/2026-5-26-  1.1 Sets: Abstract Algebra formalized from scratch with Turn-Lang.md`.

## Series: `sets-v2-*` (Judson §1.2 Sets)

| # | Slug | Topic | Kind |
|---|------|-------|------|
| 01 | `sets-v2-01-set` | **Set** — textbook → Lean Mem/wiring → Turn structure/laws | definition |
| 02 | `sets-v2-02-subset` | **Subset** as relation, not constructor | definition |
| 03 | `sets-v2-03-proper-subset` | **Proper subset** (`PropModified` variant) | definition |
| 04 | `sets-v2-04-set-equality` | **Set equality** via mutual subset | definition |
| 05 | `sets-v2-05-empty-set` | **Empty set** inherits `Set`, `no_members` law | definition |
| 06 | `sets-v2-06-empty-subset-theorem` | **∅ ⊆ S** for every set S | theorem |
| 07 | `sets-v2-07-union` | **Union** structure + def law | definition |
| 08 | `sets-v2-08-intersection` | **Intersection** structure + def law | definition |
| 09 | `sets-v2-09-disjoint` | **Disjoint** as relation on two sets | definition |
| 10 | `sets-v2-10-complement` | **Complement** in a universe | definition |
| 11 | `sets-v2-11-difference` | **Difference** structure | definition |
| 12 | `sets-v2-12-union-idempotent` | **A ∪ A = A** (Prop 1.2.1 part 1) | theorem |

**Not split (on purpose):** *element / member* — membership is native `in`, not a separate object (see parent lecture ~0:45).

**Later series (same parent video):** De Morgan, full Prop 1.2.1 parts 2–6, difference–complement lemma.

## Clip shape (every episode)

1. **Scene 1 — Textbook** (`math-focus`): Judson §1.2 heading + the bold definition line.
2. **Scene 2 — Intuition** (`math-focus` / `chapter-beat`): space for you on camera — informal “why we model it this way”.
3. **Scene 3 — Compare** (`dual-panel` + `compare` layer): Lean 4 (left) vs Turn-Lang (right), caption-synced highlights.

## Filming workflow

- Open **`/video-ops/editor/sets-v2-01-set`** (etc.) in dev.
- **Canvas** = Scenes 1–3 only (textbook, intuition board, compare).
- **Script panel below the canvas** = your teleprompter (`director.say` lines). Keep **Teleprompter overlay: Off** so lines are not drawn on the video.
- Each `animation.json` sets `"teleprompter": { "position": "below-canvas" }` as a reminder.
- Record talking-head separately; add `talking-head` layer when ready.
- Export MP4 from Remotion → `export/<slug>.mp4` in this folder; burn captions optional (`burnCaptions`).
- Edit per-platform titles/captions in `social-posts.json` (`english` / `china` groups). Regenerated on `npm run sync`; China posts you translate are preserved.

## Sources

| Asset | Path |
|-------|------|
| Turn-Lang | `script/shared/reference/02_sets_and_equivalence_relations.turn` |
| Lean 4 | `script/shared/reference/judson_sets.lean` |
| Parent transcript | `published/2026-5-26-  1.1 Sets: …` |

## Infrastructure

Scripts live under `video_ops/script_v2/<slug>/`. Slugs prefixed `sets-v2-` resolve via `videoOpsScriptCollection()` in `src/shared/turn-video/videoOpsPaths.ts`.

Regenerate manifest after adding folders:

```bash
node tooling/regenerateVideoOpsManifest.mjs
```
