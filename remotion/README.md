# Turn Video Ops — Remotion

One Remotion package renders every script. Each script folder owns `animation.json` — Remotion loads it directly at runtime.

## Layout

```
video_ops/
  scripts/                  # all series + episodes (source of truth)
    algebra/
    syntax/
    abstract_algebra_in_proof_assistant/
  remotion/                 # shared Remotion project (this folder)
  public/                   # symlinks for staticFile() — run ensure-public
  manifest.json
```

## Quick start

```bash
cd video_ops/remotion
npm install
npm run studio        # Mac only — syncs composition-meta, opens Studio
npm run studio:lan    # LAN + iPhone preview (binds 0.0.0.0:3000 and dev API :3021)
```

In-app editor (sidebar + preview + teleprompter): `/video-ops/editor` in basic_ui.

### iPhone Remotion preview

1. Mac: `npm run studio:lan` in `video_ops/remotion`
2. iPhone: Settings → Remotion Studio URL = `http://<mac-lan-ip>:3000`
3. Script detail → **Remotion** opens Studio for that composition in-app

## Sync animation artifacts

```bash
cd video_ops/remotion
npm run sync          # create missing animation.json only
npm run sync:force    # rebuild all animation.json from script.md
```

## Render one video

```bash
npm run render:script -- pitfalls-03-reject-a-false-premise
```

Output: `video_ops/scripts/<series>/<slug>/export/<slug>.mp4`. MP4s are gitignored inside each script’s `export/` folder.

## animation.json

Canonical timeline artifact. Remotion fetches `scripts/<series>/<slug>/animation.json` via `staticFile()`.

```json
{
  "version": 1,
  "scriptId": "pitfalls-03-reject-a-false-premise",
  "composition": { "fps": 30, "width": 1080, "height": 1920, "format": "short" },
  "scenes": [
    {
      "index": 1,
      "title": "Hook",
      "durationSeconds": 4,
      "say": ["Hi friends.", "Second line."],
      "layers": [
        { "type": "caption" },
        { "type": "turn-code", "source": "|- true", "animation": { "kind": "type", "charsPerSecond": 28 } },
        { "type": "pip", "src": "shared/reference/turn-workspace.mp4", "position": "bottom-right", "widthFraction": 0.44 }
      ]
    }
  ]
}
```

Layer types: `caption`, `turn-code`, `screen-text`, `pip`.

## Knowledge panel (same math as VS Code / app)

Remotion imports the **same** `renderMathNode` pipeline from `turn-user` that powers the Knowledge panel in the VS Code extension and the proof-slide cards in `basic_ui`:

```
turn-user/.../visualization/knowledge/render/mathShell.tsx
  → math_node/math_node.tsx + math_node.module.scss (MathJax fonts)
```

Webpack is configured in `remotion.config.ts`:

- `@turn-user` alias → `codetree/turn/turn-user`
- SCSS loader for `knowledge/render/**/*.scss` (CSS-modules class `arguments` needs `namedExport: false`)
- `postinstall` symlinks MathJax fonts via `scripts/link-knowledge-fonts.sh`

Scene tracks can point at exported knowledge JSON:

```json
"knowledgePanel": { "exportPath": "tracks/scene-2-knowledge.json" }
```

`SidePanelFromTrack` loads that export before `continueRender`, then passes it to `KnowledgePanelRender`.

### Shared with `/app` (`@turn-video-shared`)

Remotion and `/video-ops` import editor + side-panel code from `src/shared/turn-video/` (alias `@turn-video-shared`):

- **`TurnTypingCode`** — same Turn-Monaco keyword/tactic lists as the live editor
- **`TurnVideoSidePanel`** — routes to `EmbeddedProofPanel` / `EmbeddedKnowledgePanel` when full LSP JSON is present (same components as `turn-side-panels.tsx`), otherwise falls back to wasm step exports + `GoalRow`
- **`createVideoVisualizationHost`** — no-op host for non-interactive embedded panels

IDE tracks can reference full LSP payloads:

```json
"proofPanel": {
  "exportPath": "tracks/scene-3-proof.json",
  "visualizationDataPath": "tracks/scene-3-visualization.json"
},
"knowledgePanel": {
  "exportPath": "tracks/scene-2-knowledge.json",
  "knowledgeDataPath": "tracks/scene-2-knowledge-data.json"
}
```

Export tooling (repo root):

```bash
node tooling/exportVideoOpsProofPanel.mjs ... --visualization-output video_ops/script/.../tracks/scene-3-visualization.json
node tooling/exportVideoOpsKnowledgePanel.mjs --turn-file ... --output video_ops/script/.../tracks/scene-2-knowledge-data.json
```

When `visualizationDataPath` is set and the track has no proof-step scrub interactions, Remotion renders the **same** embedded proof panel as `/app`. Step-scrub animations still use per-step wasm exports.

### Lean 4 panel (static source + goal)

Lean 4 scenes use the `lean4` layer type — dark editor + light goal panel (no Monaco, no live Lean LSP):

```json
{ "type": "lean4", "track": "tracks/scene-1-lean4.json" }
```

1. Copy [`docs/examples/lean4/`](../docs/examples/lean4/) track + goal JSON into your script’s `tracks/` folder.
2. Put `.lean` source under `script/shared/reference/` (or script-local path).
3. Hand-author `scene-*-lean4-goal.json` from Lean infoview output (`hypotheses` + `target`, optional `steps` for scrubbing).

Shared components live in `@turn-video-shared`: `LeanTypingCode`, `Lean4GoalPanel`, `LeanMathLine`, `UnicodeMathLine` (serif Unicode math for math-board + Lean goals — no MathJax JS), `loadLean4TrackAssets`.

### Proof panel (same `GoalRow` as proof-slide mode)

Export real LSP goals from the repo root (not from `video_ops/remotion`):

```bash
npm run export:video-proof-panel -- \
  --turn-file ../codetree/turn/turn-user/language_server/examples/AATA/01_preliminaries/02_sets_and_equivalence_relations.turn \
  --theorem "equivalence classes form a partition (Judson Theorem 1.25 forward)" \
  --output video_ops/script/algebra-01-spread-classes-into-partition/tracks/scene-3-proof.json \
  --bindings "open goal:0:input:0,witness confirm:0:output:0,close branch:70:input:0"
```

IDE tracks reference the export via `proofPanel.exportPath`. `ProofPanelRender` uses real LSP `GoalRow` + `sequent_*_rich_text` from wasm export — do not hand-author simplified `Math` segments.

`math-board` beats use `AnimatedMathFormula` + a coherent `MathBoardDiagramPanel` on a black field — the same equivalence-class world persists while each beat refocuses it. Optional `diagram` id per beat; otherwise inferred from `label`. Built-in ids: `equivalence-bucket`, `set-builder`, `membership-biconditional`, `representative`, `textbook-set`, `turn-structure`, `lean-setoid`.


1. Run `npm install` from `video_ops/remotion` (runs font symlink).
2. Delete stale copies: `rm -rf video_ops/codetree` (broken font symlinks break bundling).
3. Run `npm run sync` so `src/generated/composition-meta.json` exists.
4. Restart Studio.

Full `KnowledgeSectionView` from `knowledge/app.tsx` is not bundled yet (heavy VS Code deps); math bodies use the same renderer.

## Video kit (universal math + coding)

See [`docs/video-kit.md`](../docs/video-kit.md) for layout presets and layer types:

- **3Blue1Brown-style:** `title-card`, `math-board`, `chapter-beat`, burned `caption`
- **Coding tutorial:** `turn-ide`, `terminal`, `pip`, `talking-head`
- **SceneComposer** routes layers via `MainLayerRenderer` (no more hardcoded scene switches)

### Full Turn-Lang source vs ellipsized typing

- `sourceFile` + `sourceRange` — real `.turn` excerpt copied to `script/shared/reference/` on sync (from `Source file:` in `script.md`).
- `typing.snippet` — ellipsized text that paces the animation (`{ ... }` allowed).
- The code panel **renders** the full excerpt; snippet length only controls how fast lines appear.

## Public assets

`remotion.config.ts` sets `publicDir` to `video_ops/public/` (symlinks to `script/`, `script_v2/`, `assets/` only — **not** the whole `video_ops/` tree, which would recurse `remotion/build/` into multi-GB bundles). Run `npm run ensure-public` after clone.
