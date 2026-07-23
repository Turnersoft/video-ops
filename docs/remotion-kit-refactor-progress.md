# Remotion + scripts kit refactor — progress

| Phase | Deliverable | Status |
| ----- | ----------- | ------ |
| P0 | `schema/` + kit allow-lists + 7 series stubs/aliases | done |
| P1 | md-only loader; sync/meta from md | done |
| P2 | Split SceneComposer; `kits/compare` wired | done |
| P3 | Shared kit layer stubs + smoke templates | done |
| P4 | Flagship `sets-v2-04-set-equality` under `compare/` (legacy path = symlink alias) | done |
| P5 | `syntax-spot` + `life-essay` templates | done |
| P6 | Remaining kits + BGM cue fields in md frontmatter | done |
| P7 | Stop reading/writing `animation.json` in agents | done |

## Authoring

- **Source of truth:** `animation.md` only (no `script.md`, no root `animation.json`)
- **Compile output:** `projects/<series>/<episode>/.cache/render-props.json` + `animation-v4.json`
- **Sync:** `cd remotion && npm run sync -- --script <episode-id>`
- **Kit allow-list:** warns by default (md still emits `compare` for most beats). Use `--strict-kit` when an episode is kit-native.
- **Path resolution:** prefers canonical series over legacy aliases; catalog dedupes by realpath.
- **Flagship:** `projects/compare/sets-v2-04-set-equality` (real); legacy folder has symlink alias.

## Series folders

| Folder | styleKit |
|--------|----------|
| `compare/` | compare |
| `formal-math/` | motion-essay |
| `pitfalls/` | pitfall |
| `ai-math/` | ai-review |
| `syntax/` | syntax-spot |
| `launch/` | launch-pv |
| `logic-for-life/` | life-essay |

Legacy folders (`abstract_algebra_in_proof_assistant`, `algebra`, `why-need`) remain as aliases during migration.
