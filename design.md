# Outdoor pipeline — product design

Status: living design. Implement **one phase at a time**. Do not start a later phase until the previous phase’s acceptance checks pass.

Last updated: 2026-07-11

---

## 0. Goals & non-goals

### Goals

Turn the Mac browser take card (and matching iPhone surfaces) into a full **post-film → edit → composite → social → publish** console:

1. Align: Remotion editors (landscape + portrait) with beat tags, script-vs-said compare, clip mask editing.
2. Composite: regenerate from current Remotion layout; keep multiple composite versions and pick which is active.
3. Social: lightly editable AI copy; EN/ZH grouping; title+body fields; each platform card is a full “setup page”.
4. Covers: local multi-version cover library; per-platform cover selection; EN/ZH batch assign.
5. Publish: per-card publish + status + open link; Publish all (idempotent); credentials management page.

### Non-goals (for now)

- Rewriting Remotion Studio itself.
- Auto-translating China platform bodies (existing “请翻译” notes stay until a later AI pass).
- Replacing Zernio / SAU adapters — extend them, don’t invent a third publisher.
- Deleting old composite/social runs automatically (history is intentional).

### Surfaces

| Surface | Role |
|---------|------|
| Mac browser `:8788` take card | Primary operator console |
| iPhone Expo app | Film + review + light edit + publish parity where noted |
| Remotion Studio `:3000` | Live outdoor composition edit (mask / hints / seek) |
| Take folder on disk | Source of truth for runs, covers, publish-state |

---

## 1. Current baseline (what exists today)

### Align

- One landscape Remotion Studio iframe + beat tags that `postMessage` seek.
- Clip PIP mask is draggable in Studio; sync via **Sync Studio layout → take**.
- Outdoor Align iframe embeds Remotion with `?outdoorEmbed=1` (composition only, no narration overlay). Open Remotion Studio separately for the editable overlay script; captions still burn on render.
- iPhone Align is numeric PIP/hint + per-beat videos (no Studio embed).

### Composite

- Stage copies align artifacts and runs `remotion/scripts/render-outdoor.mjs` (`portrait` + `landscape`).
- Each re-run creates a new `pipeline/composite/{runId}/`.
- `pipeline-status.json` keeps `runs.composite[]` + `selectedRuns.composite`.
- Mac UI shows selected composite videos plus **Regenerate composite from Studio layout** and version chips (`runs.composite[]` / `selectedRuns.composite`).

### Social

- Generated at remotion sync into `scripts/.../{scriptId}/social-posts.json` (AI/template from `script.md`).
- Social stage **copies** that file into the take run (no generation).
- Mac take card: **Social setup** with EN / 中文 groups, Headline EN/ZH, editable title+body, Save → `PATCH /api/jobs/{jobId}/social`.
- iOS still shows a flat read-only title list.

### Publish

- Backend: `POST/DELETE .../publish/{platform}`, hide endpoint, **`POST .../publish-all`** (idempotent); **Zernio (EN)** + **SAU (CN)**.
- Idempotency: refuse publish if a **live** post already exists for that platform; publish-all skips live.
- Selected cover (if any) is passed as thumbnail to adapters and stored as `coverId` on the publish record.
- State: `takes/{takeId}/publish-state.json`.
- Mac Social cards: status badge + Publish / Open / Hide / Delete + Publish all.
- iPhone Job Review: full supported platform list + Publish all.

### Cover

- Take-local cover library under `takes/{takeId}/covers/` with `covers-index.json` + per-cover folders.
- APIs: list/upload/duplicate/rename/delete + platform-map (per-platform + batch EN/ZH).
- Mac Social setup: cover strip + per-card Cover dropdown + batch buttons.
- iPhone Take Results: cover library panel (upload / assign / batch).
- Publish still sends video only; selected cover path is resolvable via `resolveCoverFileForPlatform` for Phase E.

---

## 2. Feature specs (detailed)

### F1 — Align: script vs said (side-by-side above Remotion)

**Problem:** Beat tags alone don’t show what was planned vs what was spoken.

**UI (above the single Remotion editor, below beat tags):**

```
┌ Beat tags: [1][2][3][4][5][6] ─────────────────────────────────┐
├──────────────────────┬──────────────────────────────────────────┤
│ Script (teleprompter)│ Said (from cut / Whisper transcript)     │
│ editable? optional   │ read-only, sentence-level, active seek   │
│ for active beat      │ highlights current sentence if possible  │
└──────────────────────┴──────────────────────────────────────────┘
┌ Remotion editor (landscape | portrait tabs) ────────────────────┐
```

**Behavior**

- Selecting a beat tag seeks Remotion **and** scrolls/highlights both panes to that beat’s window.
- **Left — Script:** `animation` / outdoor script beat `say` (and optional ZH if present). Light edit allowed later (phase note); v1 can be read-only if edit is deferred to social.
- **Right — Said:** sentences from cut-review / transcript that fall inside `[editedStart, editedEnd)` for that beat (reuse cut-review sentence split). Clicking a said sentence seeks Remotion to that sentence’s start (map via align boundaries + source/edited times).
- No full-script dump for all beats at once in the compare panes — **active beat only** (keeps the first viewport usable). Optional “show all beats” expand later.

**Data**

- Script: align review slides already expose `say`, `editedStart`, `editedEnd`.
- Said: extend `GET .../align-review` (or reuse cut-review) with `slides[].saidLines: [{ id, text, start, end }]`.

**Acceptance**

- Click beat 3 → Remotion seeks ~46.9s; left shows beat 3 script; right shows spoken lines for that window.
- Click a said line → Remotion seeks near that line’s time.

---

### F2 — Align: portrait Remotion editor

**UI**

- Tabs above the iframe: **Landscape** | **Portrait**.
- One iframe at a time (never two Studios).
- Landscape → `video-outdoor-landscape`; Portrait → `video-outdoor-portrait`.
- Beat tags seek the **active** composition id (`postMessage.compositionId`).
- Sync Studio layout → take must pull layout for the format being edited (or both if both were touched). Prefer writing shared `pipMask` / `beatLayouts` in `animation-outdoor.json` (normalized 0–1), which already apply to both formats.

**Acceptance**

- Switching to Portrait loads portrait composition; beat tags still seek; clip mask drag still persists.

---

### F3 — Composite: regenerate from Remotion + version history UI

**Regenerate**

- Button **before** the composite video section (and/or on the Align toolbar):  
  `Regenerate composite from Studio layout`
- Flow:
  1. `POST .../align-sync-studio` (pull latest Studio outdoorEdit into take `animation-outdoor.json`).
  2. `POST .../stages/composite/run` with `{ rerun: true }` (new `runId`).
  3. On success, select the new run as `selectedRuns.composite`.
  4. Refresh take card videos.

**Version history (Mac + iPhone)**

- Under COMPOSITE section:
  - List all `runs.composite[]` (newest first): `runId`, status, createdAt, portrait/landscape thumbs or links.
  - **Active** chip = `selectedRuns.composite`.
  - Click a past run → `PUT .../selection` `{ stage: 'composite', runId }` → videos switch.
  - Never delete old runs from this UI (optional “archive” later).

**Acceptance**

- After mask edit + regenerate, a new `composite-*` folder appears and becomes selected.
- Switching to an older run shows that run’s MP4s without re-render.

---

### F4 — Social setup cards (editable, EN/ZH grouped)

**Information architecture**

```
Social setup
├── [Publish all]   (idempotent — see F6)
├── English
│   ├── Headline EN          (title only)
│   ├── YouTube card         (title + body + cover + publish)
│   ├── X / LinkedIn / …     (same)
│   └── …
└── 中文 / China
    ├── Headline ZH
    ├── 哔哩哔哩 / 抖音 / … 
    └── …
```

**Per platform card (“social media setup page”)**

Fields:

| Field | When |
|-------|------|
| Title | Always |
| Body | When platform copy has / needs a body (YouTube, LinkedIn, Bilibili, …). Short platforms (X) still get both; UI may show char count. |
| Cover picker | F5 |
| Format hint | portrait vs landscape (from publish auto rules; override optional) |
| Publish | F6 |
| Status | live / hidden / deleted / never / stub |
| Open link | if `url` present |

**Editing**

- AI copy is the default; edits are light.
- Save via existing `PATCH /api/jobs/{jobId}/social` (patch nested `english.{platform}` / `china.{platform}` / headlines).
- Optionally also write back to script-level `social-posts.json` when user checks “Update script template” (default **off** — take-local edits only).

**Acceptance**

- EN platforms grouped together; ZH grouped together.
- Editing YouTube title+body persists after refresh.
- Headline EN/ZH are separate top cards (title-only).

---

### F5 — Cover library (multi-version, per-platform select)

**Storage (local to take, syncable to iPhone via agent API)**

```
takes/{takeId}/covers/
  covers-index.json
  cover-{id}/
    cover.png          # or .jpg
    meta.json          # { id, label, createdAt, source: 'browser'|'iphone'|'import', width, height }
```

`covers-index.json`:

```json
{
  "schemaVersion": 1,
  "covers": [{ "id": "cover-…", "label": "Outdoor A", "path": "cover-…/cover.png" }],
  "platformCovers": {
    "youtube": "cover-…",
    "bilibili": "cover-…"
  }
}
```

**UI**

- Cover library strip at top of Social setup (and a dedicated subsection on take card).
- Actions: Upload / Capture from Remotion still (later) / Duplicate / Rename / Delete (if unused).
- Each social card: dropdown “Cover: [library item]”.
- Batch: **Apply cover to all English** / **Apply cover to all 中文** (does not override locked cards if we add a lock; v1 no lock).
- Browser + iPhone both call the same cover APIs.

**Publish integration**

- When publishing, if platform has a selected cover file, pass it to Zernio/SAU as thumbnail when the adapter supports it; otherwise attach as best-effort and log when unsupported.

**Acceptance**

- Upload two covers; assign YouTube→A, Bilibili→B; batch EN→A; each card can still override.

---

### F6 — Publish UX (per card + publish all + status + link)

**Per card**

- Button: Publish | Republish disabled while `live`.
- Status badge: `not published` | `live` | `hidden` | `deleted` | `stub`.
- Link: “Open post” → `record.url` (new tab / iOS `Linking`).
- Secondary: Hide / Delete (existing APIs).

**Publish all**

- Top button publishes every platform that:
  - has title (and body if required),
  - has composite selected,
  - has **no** live post yet.
- Idempotent: skip platforms that already have `status === 'live'` (never create a second live post).
- Report summary: `{ published: [], skippedLive: [], failed: [] }`.

**Mac + iPhone**

- Mac take card gets full platform list (not only youtube/bilibili).
- iPhone Job Review / TakeResults expand beyond the two platforms.

**Acceptance**

- Publish all twice → second run skips all live platforms.
- Each live card shows openable URL (or stub URL in stub mode).

---

### F7 — Platform credentials / login management page

**New route (Mac):** `#credentials` or `#platforms`  
**iPhone:** Settings → Platform accounts

**Show**

- Provider: Zernio vs SAU.
- Per platform: connected? account name/id, last verified, env mode (`stub`|`live`).
- Actions: Open provider dashboard, “Test connection”, paste/update token where we already use env/files (never commit secrets; store in local env / SAU account store / Zernio key as today).
- Document which env vars / SAU CLI accounts map to which platform.

**Do not** build a full OAuth server in v1 if Zernio/SAU already own login — this page is an **operator console + health check**, not a new IdP.

---

## 3. Data model additions

### Align review payload (extend)

```ts
slides: Array<{
  beatIndex: number;
  slideTitle: string;
  say?: string;
  editedStart: number;
  editedEnd: number;
  saidLines?: Array<{ id: string; text: string; start: number; end: number }>;
}>;
```

### Covers

See F5 `covers-index.json`.

### Publish state (existing, UI must surface)

```ts
posts: Array<{
  platform: string;
  provider: 'zernio' | 'sau';
  postId: string;
  url: string;
  status: 'live' | 'hidden' | 'deleted';
  publishedAt: string;
  compositeRunId: string;
  stub?: boolean;
  coverId?: string; // new optional
}>;
```

### Social posts (existing)

Keep `english` / `china` maps; UI must stop flattening into a single unordered grid.

---

## 4. API additions / changes

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/jobs/:id/align-review` | Add `saidLines` per slide |
| POST | `/api/jobs/:id/align-sync-studio` | Existing |
| POST | `/api/jobs/:id/stages/composite/run` | Existing; UI wires regenerate |
| PUT | `/api/jobs/:id/selection` | Existing; Mac UI for composite history |
| GET | `/api/jobs/:id/social` | Full take social-posts.json |
| PATCH | `/api/jobs/:id/social` | Existing; Mac editors wired |
| GET | `/api/jobs/:id/covers` | List covers + platform map |
| POST | `/api/jobs/:id/covers` | Upload cover |
| PATCH | `/api/jobs/:id/covers/platform-map` | Set per-platform / batch EN|ZH |
| DELETE | `/api/jobs/:id/covers/:coverId` | Delete unused |
| POST | `/api/jobs/:id/publish/:platform` | Existing |
| POST | `/api/jobs/:id/publish-all` | Idempotent batch publish |
| GET | `/api/platforms` | Platform ids + health (mode, masked account, connectProgress, signup steps, live Zernio accounts) |
| POST | `/api/platforms/zernio/sync-accounts` | List Zernio accounts → suggested `ZERNIO_ACCOUNTS_JSON` export |
| POST | `/api/platforms/:id/test` | Test zernio/sau provider or a platform |

---

## 5. UI structure (Mac take card order)

1. Inbox / take meta  
2. Cut review  
3. **Align**
   - Beat tags  
   - Script | Said compare  
   - Landscape | Portrait tabs + one Remotion iframe  
   - Sync layout · Regenerate composite  
4. **Composite**
   - Version history chips  
   - Active portrait + landscape players  
5. **Social setup**
   - Cover library  
   - Publish all  
   - English group → cards  
   - 中文 group → cards  
6. Other stage leftovers (if any)

Nav: Library · Script · Film · **Platforms** (`#/platforms`)

---

## 6. Implementation phases (do in order)

### Phase A — Align compare + portrait editor  
**Implements:** F1, F2  
**Status:** done (2026-07-11)

- Extend align-review with `saidLines`.  
- Script | Said panes bound to active beat tag.  
- Landscape/Portrait Remotion tabs (single iframe).  
- Seek bridge already exists; pass correct `compositionId`.

**Verify:** beat tag updates both panes + seeks; portrait tab loads portrait composition.

---

### Phase B — Composite regenerate + history on Mac  
**Implements:** F3  
**Status:** done (2026-07-11)

- “Regenerate composite from Studio layout” button (sync → rerun → select).  
- Composite run chips + selection on Mac take card (parity with iOS).  

**Verify:** new run appears; switching runs changes videos.

---

### Phase C — Social setup cards (edit + EN/ZH layout)  
**Implements:** F4 (without covers/publish yet)  
**Status:** done (2026-07-11)

- Regroup UI; title+body editors; PATCH save; debounce or Save button.  
- Headline EN/ZH cards.  

**Verify:** edit persists; groups correct.

---

### Phase D — Cover library  
**Implements:** F5  
**Status:** done (2026-07-11)

- Disk layout + APIs.  
- Mac + iPhone upload/list/select.  
- Batch EN/ZH assign.  
- Wire cover id into publish payload when ready (can land with Phase E).  

**Verify:** two covers, per-card + batch assign.

---

### Phase E — Publish UI + publish-all  
**Implements:** F6  
**Status:** done (2026-07-11)

- Per-card publish/status/link on Mac + expand iPhone.  
- `POST publish-all` idempotent.  
- Pass selected cover when adapter supports it.  

**Verify:** double publish-all does not duplicate live posts.

---

### Phase F — Credentials page  
**Implements:** F7  
**Status:** done (2026-07-11)

- Mac `#platforms` + iPhone settings.  
- Health/test + docs for env/SAU accounts.  

**Verify:** page lists all supported platforms and stub/live mode.

---

## 7. Cross-cutting rules

1. **Idempotent publish:** never create a second `live` post for the same job+platform.  
2. **History:** composite (and social packs) keep prior runs; selection is a pointer.  
3. **Take-local vs script-template:** social edits default to take run file; script-level update is opt-in.  
4. **Secrets:** never write tokens into `scripts/` or git; credentials page only references env/SAU store.  
5. **Parity:** any Mac take-card feature that edits take state should expose the same API to iPhone; UI can lag one phase but APIs should not be Mac-only.  
6. **Remotion:** one Studio iframe; formats via tab; beat tags are the seek UI.  
7. **Formal math content:** unchanged — tooling/UI only.

---

## 8. Suggested first ticket (Phase A)

> Align take card: active-beat Script | Said compare + Landscape/Portrait Remotion tab switcher.

Out of scope for that ticket: composite regenerate, social edit, covers, publish UI.

---

## 9. Open questions (resolve when hitting the phase)

1. Should Script pane be editable in Align, or only Social copy? (Recommendation: Align script read-only in A; social edit in C.) → **Resolved in A/C:** Align script read-only; social editable.
2. Cover aspect ratios: one master 9:16 + crop, or separate landscape/portrait covers? (Recommendation: store master + optional per-format derivative later.) → **Deferred:** v1 stores one master image per cover id.
3. Publish-all order: EN then ZH, or parallel with concurrency limit 2? (Recommendation: serial per provider to avoid API rate limits.) → **Resolved in E:** serial over social platforms.
4. When regenerating composite, auto-sync Studio even if iframe on portrait tab — confirm both formats share normalized layout (yes today). → **Resolved in B:** regenerate always syncs Studio layout first.

---

## 10. Post-phase backlog (optional next)

Design phases A–F are implemented. Sensible follow-ups if you want to keep going:

1. Smoke-test the focus take (`sets-v2-04-set-equality`) end-to-end: align → regen composite → edit social → upload covers → stub publish-all twice.
2. ~~iPhone social editors (Mac has editable cards; iPhone still mostly read-only titles + covers/publish).~~ **Done (2026-07-11):** `SocialSetupPanel` on Take Results + Job Review.
3. ~~Cover aspect derivatives / Remotion still capture into cover library.~~ **Done (partial, 2026-07-11):** capture portrait/landscape still from selected composite via ffmpeg (`action: capture-composite`). Per-format crop derivatives still deferred.
4. ~~Credentials: optional “open SAU login instructions” deep-links; still no in-app secret storage.~~ **Done (2026-07-11):** provider/platform login links + copyable SAU `sau … login` commands on Mac `#/platforms` and iPhone Settings.
5. ~~Connect-all signup checklist.~~ **Current (2026-07-11):** EN provider is **Zernio** + SAU for China. Mac `#/platforms` + iPhone Settings connect-all / Sync accounts / `publish.env.example`.
6. First git commit / PR of the outdoor console work (repo currently has no commits on `main`).
7. Legacy `publish/postiz.ts` remains in tree unused — delete once no live Postiz publish records remain.
