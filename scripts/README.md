# Video projects (`scripts/`)

Single source of truth for every video series, episode, take, and artifact.

## Layout

```
scripts/
  <series-id>/
    series.json          # title, thumbnail, playlist metadata
    shared/              # covers, reference files (symlinked across tutorial series)
    <episode-id>/
      script.md
      animation.json
      takes/
      export/
```

## Series

| Series | Episodes |
|--------|----------|
| `abstract_algebra_in_proof_assistant/` | `sets-v2-*` (12 sets lessons) |
| `algebra/` | `algebra-*` (7) — owns `shared/reference/` |
| `syntax/` | `syntax-*` (12) |
| `pitfalls/` | `pitfalls-*` (5) |
| `why-need/` | `why-need-*` (5) |

Tutorial series symlink `shared/` → `../algebra/shared` for Lean/Turn reference files.

## Clients

- **iPhone teleprompter** — `/api/catalog` from Mac content API
- **Mac VideoOps** — same `scripts/` tree
- **Remotion** — `public/scripts` symlink

Do not store episode content outside this folder.
