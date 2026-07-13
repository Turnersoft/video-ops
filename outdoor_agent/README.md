# Outdoor Agent

Local Mac agent for the outdoor take → publish pipeline. **Filesystem is the source of truth** — no local database.

Built with **Deno + TypeScript** (standalone; no Node `package.json` in this folder).

## Folder layout (per video)

```
video_ops/script_v2/{scriptId}/
  script.md                    # episode metadata
  animation.json               # studio Remotion (your fix point)
  social-posts.json            # per-platform copy
  export/
    {scriptId}-outdoor-script.json
    {scriptId}.mp4             # studio render (optional)
  takes/{takeId}/
    take.json                  # TakeManifest from phone
    source.mp4                 # raw filmed video
    pipeline-status.json       # pipeline state (replaces job DB)
    publish-state.json         # publish records + republish gate
    pipeline/
      cut/{runId}/...
      align/{runId}/...
      composite/{runId}/...
      social/{runId}/...
```

Legacy `video_ops/jobs/` is still read if present; new ingests write under `takes/`.

## Start

```bash
# from repo root
npm run outdoor-agent
npm run outdoor-agent:lan      # bind 0.0.0.0 for iPhone

# or directly with Deno
cd video_ops/outdoor_agent
deno task start
deno task start:lan
deno task check                # type-check
```

API: `http://127.0.0.1:8787` (use `--port 8788` if 8787 is taken).

Browser app: open `http://127.0.0.1:8788/` — library grouped by `video_ops/scripts/` series, script detail with pipeline videos, and camera filming (uploads to `/api/upload`).

Stage workers spawn **Deno** for `outdoor_post` scripts and **Node** for Remotion render.

## Key API routes

| Route | Purpose |
|-------|---------|
| `GET /` | Browser library + film app |
| `GET /api/catalog` | Scan all of `video_ops` — scripts, takes, pipeline status |
| `GET /api/scripts/{id}/outdoor-script` | Download teleprompter JSON |
| `GET /api/scripts/{id}/takes/{takeId}/source` | Stream source take video |
| `POST /api/upload` | Ingest take → `takes/{takeId}/` |
| `GET /api/jobs` | List pipeline jobs (from FS) |
| `GET /api/jobs/{jobId}` | Job detail + stage progress + results |
| `GET /api/scripts/.../artifacts/...` | Stream pipeline artifacts |

## Publish

| Region | Provider | Env |
|--------|----------|-----|
| English (`social.english.*`) | **Zernio** | `ZERNIO_API_KEY`, `ZERNIO_ACCOUNTS_JSON`, `ZERNIO_PUBLISH_MODE=live` |
| China (`social.china.*`) | **social-auto-upload** | `SAU_BIN`, `SAU_ACCOUNT`, `SAU_PUBLISH_MODE=live` |

Both default to **stub mode** for local testing.

Example Zernio accounts:

```bash
export ZERNIO_ACCOUNTS_JSON='{"youtube":"acc_xxx","x":"acc_yyy","linkedin":"acc_zzz"}'
```

Example SAU:

```bash
sau bilibili login --account default
export SAU_ACCOUNT=default
export SAU_PUBLISH_MODE=live
```

## iPhone inbox (flat — no subfolders)

iPhone writes **two sibling files** at the inbox root (not nested folders):

```
TurnOutdoor/inbox/
  {takeId}.mp4
  {takeId}.json
```

The agent ingests each pair into the structured take folder:

```
scripts/{series}/{scriptId}/takes/{takeId}/
  take.json, source.mp4, pipeline-status.json, publish-state.json
  pipeline/cut|align|composite|social/{runId}/...
```

iCloud sync can miss file-watch events — the agent rescans every 30s. Force ingest:

```bash
curl -X POST http://127.0.0.1:8788/api/inbox/scan
# or
cd outdoor_agent && deno task scan-inbox
```

## Pipeline (5 steps)

| # | Step | Automated |
|---|------|-----------|
| 1 | **Ingest** inbox pair → `takes/{takeId}/` | yes (watcher / scan) |
| 2 | **Cut** — transcribe + smart cut | yes |
| 3 | **Align** — slides to voice | yes |
| 4 | **Composite** — portrait + landscape render | yes |
| 5 | **Social** copy pack (+ **Publish** via API) | social auto; publish manual |

## iPhone

Point the teleprompter at the Mac agent URL. On launch it:

1. Calls `GET /api/catalog` to discover all `video_ops` scripts
2. Downloads outdoor scripts from the Mac
3. Shows Mac pipeline takes alongside on-device takes
