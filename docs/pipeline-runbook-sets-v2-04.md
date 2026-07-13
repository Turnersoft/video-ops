# Full outdoor pipeline — `sets-v2-04-set-equality`

End-to-end: script → iPhone film → cut → align → composite → social copy → publish.

Project folder:

```text
video_ops/abstract_algebra_in_proof_assistant/sets-v2-04-set-equality/
```

---

## Prerequisites (one-time)

| Tool | Install |
|------|---------|
| Deno | `brew install deno` |
| Node 20+ | for Expo + Remotion |
| ffmpeg / ffprobe | `brew install ffmpeg` |
| ngrok | `brew install ngrok` + `ngrok config add-authtoken …` |
| Expo Go | on iPhone |
| Whisper (optional) | `pip3 install faster-whisper` **or** set `OPENAI_API_KEY` for cut/align |

```bash
cd video_ops/ios-teleprompter && npm install
cd video_ops/remotion && npm install
```

---

## Step 0 — Script (you edit)

1. Open **Video Ops editor** in basic_ui:
   ```bash
   cd ../basic_ui && npm run dev:with-lsp
   ```
   Browser: `/video-ops/editor/sets-v2-04-set-equality`

2. Edit beats in `animation.json` and spoken text in `script-clean.md`.

3. Recompute timings + sync Remotion props:
   ```bash
   cd ../basic_ui
   npx tsx tooling/recomputeAnimationBeatDurations.ts sets-v2-04-set-equality
   cd ../video_ops/remotion && npm run sync
   ```

4. Export phone script JSON:
   ```bash
   cd ../video_ops
   deno run --allow-all outdoor_post/main.ts export-outdoor-script sets-v2-04-set-equality \
     ios-teleprompter/assets/scripts/sets-v2-04-set-equality.json
   ```

---

## Before filming (Mac stays on, internet on)

**Terminal 1 — pipeline agent + ngrok (upload & publish from phone):**
```bash
cd video_ops
deno run --allow-all bin/start-outdoor-mac.ts
```
Copy `AGENT_URL` from `outdoor-agent-ngrok.txt`.

**Terminal 2 — teleprompter (Expo, any network):**
```bash
cd video_ops/ios-teleprompter
npm run start:ngrok
```
Copy `exp://…` from `outdoor-expo-link.txt`.

**On iPhone:**
1. Expo Go → Enter URL → `exp://…`
2. **Agent Settings** → paste `https://….ngrok-free.app` (no trailing slash)
3. **Library** → sync catalog → open **Set equality**
4. **Film**

### Filming tips (align without Wi‑Fi later)

- **Manual mode** — you control pace; tap **Next** when you finish each beat (6 beats).
- Each **Next** records a `slideEvent` → pipeline can align from markers (no ASR needed).
- Tap **Mark NG** immediately on bad lines → rough cut removes them.
- Optional: same Wi‑Fi as Mac → upload right after save. Off Wi‑Fi → film first, upload when back on cellular via ngrok URL.

---

## Step 1 — Ingest take → rough + smart cut

**From iPhone:** Library → your take → **Upload**

**Or Mac inbox:** drop `takeId.json` + `takeId.mp4` into `video_ops/inbox/`

Agent auto-runs pipeline. Stages land under:

```text
takes/{takeId}/pipeline/cut/{runId}/
  edited-good-intervals.mp4
  analysis.json
  transcript.verbose.json
```

Cut uses NG markers + spoken “again / ng / redo” + Whisper transcript.

Monitor:
- iPhone → job review screen
- Mac → `basic_ui` → `/video-ops` → **Outdoor jobs**
- `curl http://127.0.0.1:8788/api/jobs`

---

## Step 2 — Align slides to voice

**Preferred (you tapped Next on each beat):** align-from-slides — uses `slideEvents` from the phone.

**Fallback:** ASR word alignment (`align-speech-to-beats`) when slide markers are sparse.

Outputs in `pipeline/align/{runId}/`:
- `speech-alignment.json`
- `animation-outdoor.json` (beat durations = your speech)
- `remotion-visual-plan.json`

Re-run align only:
```bash
curl -X POST http://127.0.0.1:8788/api/jobs/job-{takeId}/stages/align/run \
  -H 'Content-Type: application/json' \
  -d '{"rerun":true,"options":{"mode":"slides"}}'
```
Use `"mode":"asr"` to force Whisper alignment.

---

## Step 3 — Composite (face + Remotion)

Renders **portrait** (you top, editors below) and **landscape** (compare layout):

```text
pipeline/composite/{runId}/
  sets-v2-04-set-equality-outdoor-portrait.mp4
  sets-v2-04-set-equality-outdoor-landscape.mp4
  outdoor-manifest.json
```

Manual composite if needed:
```bash
cd video_ops/remotion
npm run render:outdoor -- sets-v2-04-set-equality \
  --edit-dir ../abstract_algebra_in_proof_assistant/sets-v2-04-set-equality/takes/{takeId}/pipeline/align/{runId} \
  --format both
```

---

## Step 4 — Social copy pack

Stage `social` copies `social-posts.json` into the pipeline run with per-platform titles/messages (English + China groups).

Edit copy:
```bash
# PATCH /api/jobs/job-{takeId}/social with edited JSON
```

Source file: `abstract_algebra_in_proof_assistant/sets-v2-04-set-equality/social-posts.json`

---

## Step 5 — Publish

**Stub mode (default)** — returns fake URLs for testing:

```bash
export ZERNIO_PUBLISH_MODE=stub
export SAU_PUBLISH_MODE=stub
```

**Live English (Zernio):**
```bash
export ZERNIO_API_KEY=...
export ZERNIO_ACCOUNTS_JSON='{"youtube":"acc_xxx","linkedin":"acc_yyy"}'
export ZERNIO_PUBLISH_MODE=live
```

**Live China (social-auto-upload):**
```bash
export SAU_BIN=sau
export SAU_ACCOUNT=default
export SAU_PUBLISH_MODE=live
```

Publish from iPhone job review or:
```bash
curl -X POST http://127.0.0.1:8788/api/jobs/job-{takeId}/publish/youtube \
  -H 'Content-Type: application/json' -d '{"format":"portrait"}'
```

Response includes `record.url` per platform.

---

## Step 6 — Hide / delete / republish

- **Hide:** `POST /api/jobs/{id}/publish/{platform}/hide`
- **Delete:** `DELETE /api/jobs/{id}/publish/{platform}`
- **Republish:** only allowed when no `live` post exists for that platform (prior must be hidden or deleted).

iPhone job review has buttons for hide/delete/publish per platform.

---

## Quick checklist

- [ ] Step 0: `animation.json` edited, outdoor script exported to teleprompter assets
- [ ] Mac: `deno run --allow-all bin/start-outdoor-mac.ts`
- [ ] Mac: `npm run start:ngrok` in ios-teleprompter
- [ ] iPhone: Expo URL + Agent URL configured
- [ ] Film: 6 beats, Next each time, NG on mistakes
- [ ] Upload take → wait for cut → align → composite → social
- [ ] Review portrait + landscape in Outdoor jobs
- [ ] Publish (stub or live) → save links
- [ ] If wrong: hide/delete → fix composite run → select run → republish

---

## Formal math impact

None — video production pipeline only.
