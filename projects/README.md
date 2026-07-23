# Video projects (`projects/`)

Each series folder is an engineering **project**. Episodes live under the project. This folder is the sole source of truth for scripts, episode assets, and series-shared assets.

## Layout

```
projects/
  <project-id>/          # e.g. launch, compare, logic-for-life
    series.json          # title, styleKit, bgmProfile, playlist metadata
    shared/              # covers, logos, reference files for the series
    <episode-id>/
      script.md          # status: idea | outline | draft | review | final
      animation.md       # sole animation source (no animation.json)
      .cache/            # gitignored — render-props + animation-v4 from sync
      takes/
      export/
      assets/            # episode-local stickers, clips, etc.
```

## Script editor (per project UI)

Open in the outdoor app:

`http://localhost:8788/#/animation/<episode-id>`

The editor chrome (storyboard / dual-rail / still board) follows the project’s `styleKit`.

## Series (kit-native)

| Folder | styleKit | Role |
|--------|----------|------|
| `compare/` | compare | Lean ↔ Turn dual-panel |
| `formal-math/` | motion-essay | Motion essays |
| `pitfalls/` | pitfall | Formal math anti-patterns |
| `ai-math/` | ai-review | AI math news + Keep/Reject |
| `syntax/` | syntax-spot | Short syntax features |
| `launch/` | launch-pv | Product launch PV |
| `logic-for-life/` | life-essay | Life/meaning essays |

Legacy folders (`abstract_algebra_in_proof_assistant`, `algebra`, `why-need`) remain during migration.
`sets-v2-*` resolve to `compare/`; moved episodes keep a symlink under the old series folder.

## Compile

```bash
cd remotion && npm run sync -- --script <episode-id>
```

Writes `.cache/render-props.json` and `composition-meta.json` — never `animation.json`.

## Clients

- **iPhone teleprompter** — `/api/catalog` from Mac content API
- **Mac VideoOps / outdoor-ui** — edits `animation.md`
- **Remotion** — `publicDir` points at this folder (`staticFile('compare/…')`)

Do not store episode content outside this folder.
