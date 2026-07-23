import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { scanVideoOpsCatalog, resolveSeriesSharedAsset } from './catalog.ts';
import { fileExists, readJson, writeJson } from './fs_util.ts';
import { readAnimationMd, writeAnimationMd } from './animation-md.ts';
import { emptyBeatStudio, readBeatStudio, writeBeatStudio, type BeatStudioDocument } from './beat-studio.ts';
import { reviseAnimationMarkdown, reviseBeatCandidate } from './llm-client.ts';
import { loadLlmSettings, saveLlmSettings } from './llm-settings.ts';
import { compileAnimationSource, resyncAllScripts } from './scripts-watcher.ts';
import { buildLiveScript, patchLiveBeat } from './live-script.ts';
import type { BeatVariantPatch } from '../../../src/beatVariants.ts';
import {
  deleteStickerAsset,
  handleStickerAssetUpload,
  resolveScriptAssetPath,
} from './sticker-assets.ts';
import {
  createJobFromTake,
  jobExistsForTake,
  listJobs,
  loadJob,
  loadPublishState,
  readProgress,
  saveJob,
} from './job-store.ts';
import {
  fileResponse,
  jsonResponse,
  optionsResponse,
  parseMultipart,
  readJsonBody,
} from './http_util.ts';
import {
  ensureDir,
  INBOX_DIR,
  outdoorScriptPath,
  stageRunDir,
  takeSourceVideoPath,
  takeStageRunDir,
} from './paths.ts';
import { buildOutdoorEndpointsPayload } from './outdoor-endpoints.ts';
import {
  deletePublishedPost,
  hidePublishedPost,
  publishAll,
  publishJob,
  SUPPORTED_PLATFORMS,
} from './publish/index.ts';
import {
  buildPlatformsHealth,
  syncZernioAccountsSuggestion,
  testPlatformConnection,
  testProviderConnection,
} from './platform-status.ts';
import { runDefaultPipeline, runStage, setStageSelection, cancelJob } from './queue.ts';
import { buildPipelineSnapshot } from './pipeline-snapshot.ts';
import { appendTakeAgentLog } from './stage-run-log.ts';
import {
  isPipelineStage,
  PIPELINE_STAGES,
  type OutdoorJob,
  type PipelineStage,
  type StageProgress,
} from './schema.ts';
import { scanInbox } from './inbox-watcher.ts';
import { getInboxStatus } from './inbox-status.ts';
import { buildJobResults } from './job-results.ts';
import { buildCutReview, saveCutSelection, type CutSelection } from './cut-review.ts';
import { applyCutSelectionRun } from './cut-apply.ts';
import {
  buildAlignReview,
  saveAlignLayout,
  type AlignLayout,
} from './align-review.ts';
import { syncStudioLayoutToOutdoor } from './sync-outdoor-animation.ts';
import { patchSocialPosts } from './stages/social.ts';
import {
  captureCoverFromComposite,
  deleteCover,
  duplicateCover,
  listCovers,
  patchPlatformCoverMap,
  renameCover,
  resolveCoverFilePath,
  uploadCover,
} from './covers.ts';

const WEB_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '../web');

export type ServerOptions = {
  host?: string;
  port?: number;
};

export type OutdoorServer = {
  host: string;
  port: number;
  listen: () => Promise<Deno.HttpServer>;
  close: () => void;
};

function isRead(method: string): boolean {
  return method === 'GET' || method === 'HEAD';
}

export function createServer(options: ServerOptions = {}): OutdoorServer {
  const host = options.host ?? '127.0.0.1';
  const port = options.port ?? 8787;

  const server = Deno.serve(
    { hostname: host, port, onListen: () => console.log(`[outdoor-agent] API http://${host}:${port}`) },
    async (request) => {
      try {
        if (request.method === 'OPTIONS') {
          return optionsResponse();
        }

        const url = new URL(request.url);
        const pathname = url.pathname;

        if (isRead(request.method) && (pathname === '/' || pathname === '/status')) {
          return fileResponse(path.join(WEB_ROOT, 'index.html'), request);
        }

        const webAssetMatch = pathname.match(/^\/app\/(.+)$/);
        if (isRead(request.method) && webAssetMatch) {
          const rel = webAssetMatch[1];
          if (rel.includes('..')) {
            return jsonResponse(400, { error: 'Invalid path' });
          }
          const filePath = path.join(WEB_ROOT, 'app', rel);
          if (!fileExists(filePath)) {
            return jsonResponse(404, { error: 'Not found' });
          }
          return fileResponse(filePath, request);
        }

        if (request.method === 'GET' && pathname === '/api/health') {
          return jsonResponse(200, { ok: true, service: 'outdoor-agent' });
        }

        if (request.method === 'GET' && pathname === '/api/outdoor-endpoints') {
          return jsonResponse(200, buildOutdoorEndpointsPayload());
        }

        if (request.method === 'GET' && pathname === '/api/catalog') {
          return jsonResponse(200, scanVideoOpsCatalog());
        }

        if (request.method === 'POST' && pathname === '/api/scripts/resync') {
          const body = await readJsonBody(request);
          const force = body.force === true;
          try {
            const result = await resyncAllScripts({ force });
            const catalog = scanVideoOpsCatalog();
            return jsonResponse(200, { ...result, catalog });
          } catch (error) {
            return jsonResponse(500, {
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }

        if (request.method === 'GET' && pathname === '/api/series') {
          const catalog = scanVideoOpsCatalog();
          return jsonResponse(200, {
            schemaVersion: catalog.schemaVersion,
            generatedAt: catalog.generatedAt,
            series: catalog.series,
          });
        }

        const seriesAssetMatch = pathname.match(/^\/api\/series\/([^/]+)\/shared\/(.+)$/);
        if (isRead(request.method) && seriesAssetMatch) {
          const seriesId = decodeURIComponent(seriesAssetMatch[1]);
          const relativePath = decodeURIComponent(seriesAssetMatch[2]);
          const filePath = resolveSeriesSharedAsset(seriesId, relativePath);
          if (!filePath) {
            return jsonResponse(404, { error: 'Series asset not found' });
          }
          return fileResponse(filePath, request);
        }

        const outdoorScriptMatch = pathname.match(/^\/api\/scripts\/([^/]+)\/outdoor-script$/);
        if (isRead(request.method) && outdoorScriptMatch) {
          const scriptId = decodeURIComponent(outdoorScriptMatch[1]);
          try {
            const live = await buildLiveScript(scriptId);
            if (live) {
              return jsonResponse(200, live);
            }
          } catch (error) {
            console.error(
              `[outdoor-script] live build failed for ${scriptId}:`,
              error instanceof Error ? error.message : error,
            );
          }
          const filePath = outdoorScriptPath(scriptId);
          if (!fileExists(filePath)) {
            return jsonResponse(404, { error: 'Outdoor script not found' });
          }
          return fileResponse(filePath, request);
        }

        const liveScriptMatch = pathname.match(/^\/api\/scripts\/([^/]+)\/live-script$/);
        if (isRead(request.method) && liveScriptMatch) {
          const scriptId = decodeURIComponent(liveScriptMatch[1]);
          try {
            const live = await buildLiveScript(scriptId);
            if (!live) {
              return jsonResponse(404, { error: 'Not found' });
            }
            return jsonResponse(200, live);
          } catch (error) {
            return jsonResponse(500, {
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }

        const liveBeatMatch = pathname.match(/^\/api\/scripts\/([^/]+)\/beats\/(\d+)$/);
        if (request.method === 'PUT' && liveBeatMatch) {
          const scriptId = decodeURIComponent(liveBeatMatch[1]);
          const beatIndex = Number(liveBeatMatch[2]);
          if (!Number.isInteger(beatIndex) || beatIndex < 0) {
            return jsonResponse(400, { error: 'Invalid beat index' });
          }
          const body = await readJsonBody(request);
          try {
            const live = await patchLiveBeat(scriptId, beatIndex, {
              title: typeof body.title === 'string' ? body.title : undefined,
              say: typeof body.say === 'string' ? body.say : undefined,
              leanCode: typeof body.leanCode === 'string' ? body.leanCode : undefined,
              turnCode: typeof body.turnCode === 'string' ? body.turnCode : undefined,
              visualNotes: typeof body.visualNotes === 'string' ? body.visualNotes : undefined,
              selectedVariant:
                typeof body.selectedVariant === 'string' ? body.selectedVariant : undefined,
              addVariant:
                body.addVariant && typeof body.addVariant === 'object'
                  ? (body.addVariant as BeatVariantPatch['addVariant'])
                  : undefined,
            });
            return jsonResponse(200, live);
          } catch (error) {
            return jsonResponse(400, {
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }

        const beatStudioMatch = pathname.match(/^\/api\/scripts\/([^/]+)\/beat-studio$/);
        if (isRead(request.method) && beatStudioMatch) {
          const scriptId = decodeURIComponent(beatStudioMatch[1]);
          const doc = readBeatStudio(scriptId);
          if (!doc) {
            return jsonResponse(200, emptyBeatStudio(scriptId));
          }
          return jsonResponse(200, doc);
        }
        if (request.method === 'PUT' && beatStudioMatch) {
          const scriptId = decodeURIComponent(beatStudioMatch[1]);
          const body = await readJsonBody(request);
          if (body.schemaVersion !== 1 || body.scriptId !== scriptId) {
            return jsonResponse(400, { error: 'Invalid beat studio document' });
          }
          if (!body.beats || typeof body.beats !== 'object') {
            return jsonResponse(400, { error: 'beats object required' });
          }
          const doc: BeatStudioDocument = {
            schemaVersion: 1,
            scriptId,
            updatedAt: new Date().toISOString(),
            beats: body.beats as BeatStudioDocument['beats'],
          };
          writeBeatStudio(doc);
          return jsonResponse(200, doc);
        }

        const scriptAssetMatch = pathname.match(/^\/api\/scripts\/([^/]+)\/assets\/(.+)$/);
        if (isRead(request.method) && scriptAssetMatch) {
          const scriptId = decodeURIComponent(scriptAssetMatch[1]);
          const relativePath = decodeURIComponent(scriptAssetMatch[2]);
          const filePath = resolveScriptAssetPath(scriptId, relativePath);
          if (!filePath) {
            return jsonResponse(404, { error: 'Asset not found' });
          }
          return fileResponse(filePath, request);
        }

        const stickerAssetMatch = pathname.match(/^\/api\/scripts\/([^/]+)\/sticker-assets$/);
        if (request.method === 'POST' && stickerAssetMatch) {
          const scriptId = decodeURIComponent(stickerAssetMatch[1]);
          try {
            const result = await handleStickerAssetUpload(scriptId, request);
            return jsonResponse(200, result);
          } catch (error) {
            return jsonResponse(400, {
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }
        if (request.method === 'DELETE' && stickerAssetMatch) {
          const scriptId = decodeURIComponent(stickerAssetMatch[1]);
          const body = await readJsonBody(request);
          const assetPath = typeof body.assetPath === 'string' ? body.assetPath : '';
          if (!assetPath) {
            return jsonResponse(400, { error: 'assetPath required' });
          }
          if (!deleteStickerAsset(scriptId, assetPath)) {
            return jsonResponse(404, { error: 'Asset not found' });
          }
          return jsonResponse(200, { ok: true });
        }

        const aiCandidateMatch = pathname.match(/^\/api\/scripts\/([^/]+)\/beats\/(\d+)\/ai-candidate$/);
        if (request.method === 'POST' && aiCandidateMatch) {
          const scriptId = decodeURIComponent(aiCandidateMatch[1]);
          const beatIndex = Number(aiCandidateMatch[2]);
          if (!Number.isInteger(beatIndex) || beatIndex < 0) {
            return jsonResponse(400, { error: 'Invalid beat index' });
          }
          const body = await readJsonBody(request);
          const instruction = typeof body.instruction === 'string' ? body.instruction.trim() : '';
          if (!instruction) {
            return jsonResponse(400, { error: 'instruction required' });
          }
          const beatPayload = body.beat as Record<string, unknown>;
          if (!beatPayload || typeof beatPayload !== 'object') {
            return jsonResponse(400, { error: 'beat object required' });
          }
          const template = typeof body.template === 'string' ? body.template : 'compare-dual';
          try {
            const content = await reviseBeatCandidate({
              beat: {
                title: typeof beatPayload.title === 'string' ? beatPayload.title : '',
                say: typeof beatPayload.say === 'string' ? beatPayload.say : '',
                leanCode: typeof beatPayload.leanCode === 'string' ? beatPayload.leanCode : '',
                turnCode: typeof beatPayload.turnCode === 'string' ? beatPayload.turnCode : '',
                visualNotes: typeof beatPayload.visualNotes === 'string' ? beatPayload.visualNotes : '',
              },
              template,
              instruction,
            });
            return jsonResponse(200, { content, template });
          } catch (error) {
            return jsonResponse(500, {
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }

        const animationMdMatch = pathname.match(/^\/api\/scripts\/([^/]+)\/animation-md$/);
        if (isRead(request.method) && animationMdMatch) {
          const scriptId = decodeURIComponent(animationMdMatch[1]);
          const doc = readAnimationMd(scriptId);
          if (!doc.exists) {
            return jsonResponse(404, { error: 'animation.md not found' });
          }
          return jsonResponse(200, doc);
        }
        if (request.method === 'PUT' && animationMdMatch) {
          const scriptId = decodeURIComponent(animationMdMatch[1]);
          const body = await readJsonBody(request);
          const markdown = typeof body.markdown === 'string' ? body.markdown : null;
          if (markdown === null) {
            return jsonResponse(400, { error: 'markdown string required' });
          }
          try {
            const doc = await writeAnimationMd(scriptId, markdown, {
              compile: body.compile !== false,
            });
            return jsonResponse(200, doc);
          } catch (error) {
            return jsonResponse(400, {
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }

        const animationMdAiMatch = pathname.match(/^\/api\/scripts\/([^/]+)\/animation-md\/ai$/);
        if (request.method === 'POST' && animationMdAiMatch) {
          const scriptId = decodeURIComponent(animationMdAiMatch[1]);
          const body = await readJsonBody(request);
          const instruction = typeof body.instruction === 'string' ? body.instruction : '';
          if (!instruction.trim()) {
            return jsonResponse(400, { error: 'instruction required' });
          }
          const current =
            typeof body.markdown === 'string'
              ? body.markdown
              : readAnimationMd(scriptId).markdown;
          if (!current.trim()) {
            return jsonResponse(404, { error: 'animation.md not found' });
          }
          try {
            const revised = await reviseAnimationMarkdown({
              markdown: current,
              instruction,
              selection: typeof body.selection === 'string' ? body.selection : null,
            });
            if (body.apply) {
              const doc = await writeAnimationMd(scriptId, revised, { compile: true });
              return jsonResponse(200, { markdown: revised, applied: true, document: doc });
            }
            return jsonResponse(200, { markdown: revised, applied: false });
          } catch (error) {
            return jsonResponse(502, {
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }

        const animationCompileMatch = pathname.match(
          /^\/api\/scripts\/([^/]+)\/animation-md\/compile$/,
        );
        if (request.method === 'POST' && animationCompileMatch) {
          const scriptId = decodeURIComponent(animationCompileMatch[1]);
          try {
            await compileAnimationSource(scriptId);
            return jsonResponse(200, { ok: true, scriptId });
          } catch (error) {
            return jsonResponse(400, {
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }

        if (request.method === 'GET' && pathname === '/api/settings/llm') {
          return jsonResponse(200, loadLlmSettings());
        }
        if (request.method === 'PUT' && pathname === '/api/settings/llm') {
          const body = await readJsonBody(request);
          try {
            return jsonResponse(
              200,
              saveLlmSettings({
                baseUrl: typeof body.baseUrl === 'string' ? body.baseUrl : undefined,
                model:
                  body.model === null
                    ? null
                    : typeof body.model === 'string'
                      ? body.model
                      : undefined,
              }),
            );
          } catch (error) {
            return jsonResponse(400, {
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }

        const takeSourceMatch = pathname.match(/^\/api\/scripts\/([^/]+)\/takes\/([^/]+)\/source$/);
        if (isRead(request.method) && takeSourceMatch) {
          const scriptId = decodeURIComponent(takeSourceMatch[1]);
          const takeId = decodeURIComponent(takeSourceMatch[2]);
          const filePath = takeSourceVideoPath(scriptId, takeId);
          if (!fileExists(filePath)) {
            return jsonResponse(404, { error: 'Source video not found' });
          }
          return fileResponse(filePath, request);
        }

        const takeArtifactMatch = pathname.match(
          /^\/api\/scripts\/([^/]+)\/takes\/([^/]+)\/artifacts\/([^/]+)\/([^/]+)\/(.+)$/,
        );
        if (isRead(request.method) && takeArtifactMatch) {
          const [, scriptId, takeId, stage, runId, fileName] = takeArtifactMatch.map(
            decodeURIComponent,
          );
          const filePath = path.join(takeStageRunDir(scriptId, takeId, stage, runId), fileName);
          if (!fileExists(filePath)) {
            return jsonResponse(404, { error: 'Artifact not found' });
          }
          return fileResponse(filePath, request);
        }

        if (request.method === 'GET' && pathname === '/api/jobs') {
          const jobs = listJobs().map(enrichJobSummary);
          return jsonResponse(200, { jobs });
        }

        const jobMatch = pathname.match(/^\/api\/jobs\/([^/]+)$/);
        if (request.method === 'GET' && jobMatch) {
          const job = loadJob(decodeURIComponent(jobMatch[1]));
          if (!job) {
            return jsonResponse(404, { error: 'Job not found' });
          }
          return jsonResponse(200, {
            job,
            publish: loadPublishState(job.jobId),
            progress: buildProgressMap(job),
            results: buildJobResults(job),
          });
        }

        const progressMatch = pathname.match(/^\/api\/jobs\/([^/]+)\/progress$/);
        if (request.method === 'GET' && progressMatch) {
          const job = loadJob(decodeURIComponent(progressMatch[1]));
          if (!job) {
            return jsonResponse(404, { error: 'Job not found' });
          }
          return jsonResponse(200, buildProgressMap(job));
        }

        const snapshotMatch = pathname.match(/^\/api\/jobs\/([^/]+)\/pipeline-snapshot$/);
        if (request.method === 'GET' && snapshotMatch) {
          const job = loadJob(decodeURIComponent(snapshotMatch[1]));
          if (!job) {
            return jsonResponse(404, { error: 'Job not found' });
          }
          return jsonResponse(200, buildPipelineSnapshot(job));
        }

        const cancelMatch = pathname.match(/^\/api\/jobs\/([^/]+)\/cancel$/);
        if (request.method === 'POST' && cancelMatch) {
          const jobId = decodeURIComponent(cancelMatch[1]);
          try {
            const job = await cancelJob(jobId);
            return jsonResponse(200, { ok: true, job, snapshot: buildPipelineSnapshot(job) });
          } catch (error) {
            return jsonResponse(404, {
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }

        const artifactMatch = pathname.match(/^\/api\/jobs\/([^/]+)\/artifacts\/([^/]+)\/([^/]+)\/(.+)$/);
        if (isRead(request.method) && artifactMatch) {
          const [, jobId, stage, runId, fileName] = artifactMatch.map(decodeURIComponent);
          const filePath = path.join(stageRunDir(jobId, stage, runId), fileName);
          if (!fileExists(filePath)) {
            return jsonResponse(404, { error: 'Artifact not found' });
          }
          return fileResponse(filePath, request);
        }

        if (request.method === 'POST' && pathname === '/api/upload') {
          return await handleUpload(request);
        }

        if (request.method === 'POST' && pathname === '/api/inbox/scan') {
          const jobs = scanInbox();
          for (const job of jobs) {
            console.log(`[inbox] scanned ${job.jobId} (${job.scriptTitle})`);
          }
          return jsonResponse(200, {
            ok: true,
            ingested: jobs.map((job) => ({
              jobId: job.jobId,
              takeId: job.takeId,
              scriptId: job.scriptId,
              scriptTitle: job.scriptTitle,
            })),
            status: getInboxStatus(),
          });
        }

        if (request.method === 'GET' && pathname === '/api/inbox/status') {
          return jsonResponse(200, getInboxStatus());
        }

        const cutReviewMatch = pathname.match(/^\/api\/jobs\/([^/]+)\/cut-review$/);
        if (request.method === 'GET' && cutReviewMatch) {
          const job = loadJob(decodeURIComponent(cutReviewMatch[1]));
          if (!job) {
            return jsonResponse(404, { error: 'Job not found' });
          }
          const runId = job.selectedRuns.cut;
          if (!runId) {
            return jsonResponse(404, { error: 'No cut run selected' });
          }
          const review = buildCutReview(job, runId);
          if (!review) {
            return jsonResponse(404, { error: 'Cut analysis not found' });
          }
          return jsonResponse(200, review);
        }

        const cutSelectionMatch = pathname.match(/^\/api\/jobs\/([^/]+)\/cut-selection$/);
        if (request.method === 'PUT' && cutSelectionMatch) {
          const job = loadJob(decodeURIComponent(cutSelectionMatch[1]));
          if (!job) {
            return jsonResponse(404, { error: 'Job not found' });
          }
          const runId = job.selectedRuns.cut;
          if (!runId) {
            return jsonResponse(400, { error: 'No cut run selected' });
          }
          const body = await readJsonBody(request);
          const selection = saveCutSelection(job, runId, body as CutSelection);
          return jsonResponse(200, {
            selection,
            review: buildCutReview(job, runId),
            note: 'Selection saved. Use Apply selection to rebuild the edited video.',
          });
        }

        const cutApplyMatch = pathname.match(/^\/api\/jobs\/([^/]+)\/cut-apply-selection$/);
        if (request.method === 'POST' && cutApplyMatch) {
          const job = loadJob(decodeURIComponent(cutApplyMatch[1]));
          if (!job) {
            return jsonResponse(404, { error: 'Job not found' });
          }
          const runId = job.selectedRuns.cut;
          if (!runId) {
            return jsonResponse(400, { error: 'No cut run selected' });
          }
          try {
            const result = await applyCutSelectionRun(job, runId);
            saveJob(job);
            return jsonResponse(200, {
              ok: true,
              runId,
              editedVideo: result.editedVideo,
              review: result.review,
            });
          } catch (error) {
            return jsonResponse(500, {
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }

        const alignReviewMatch = pathname.match(/^\/api\/jobs\/([^/]+)\/align-review$/);
        if (request.method === 'GET' && alignReviewMatch) {
          const job = loadJob(decodeURIComponent(alignReviewMatch[1]));
          if (!job) {
            return jsonResponse(404, { error: 'Job not found' });
          }
          const runId = job.selectedRuns.align;
          if (!runId) {
            return jsonResponse(404, { error: 'No align run selected' });
          }
          const review = buildAlignReview(job, runId);
          if (!review) {
            return jsonResponse(404, { error: 'Align artifacts not found' });
          }
          return jsonResponse(200, review);
        }

        const alignLayoutMatch = pathname.match(/^\/api\/jobs\/([^/]+)\/align-layout$/);
        if (request.method === 'PUT' && alignLayoutMatch) {
          const job = loadJob(decodeURIComponent(alignLayoutMatch[1]));
          if (!job) {
            return jsonResponse(404, { error: 'Job not found' });
          }
          const runId = job.selectedRuns.align;
          if (!runId) {
            return jsonResponse(400, { error: 'No align run selected' });
          }
          const body = await readJsonBody(request);
          const layout = saveAlignLayout(job, runId, body as AlignLayout);
          return jsonResponse(200, { layout, review: buildAlignReview(job, runId) });
        }

        const alignSyncStudioMatch = pathname.match(/^\/api\/jobs\/([^/]+)\/align-sync-studio$/);
        if (request.method === 'POST' && alignSyncStudioMatch) {
          const job = loadJob(decodeURIComponent(alignSyncStudioMatch[1]));
          if (!job) {
            return jsonResponse(404, { error: 'Job not found' });
          }
          const runId = job.selectedRuns.align;
          if (!runId) {
            return jsonResponse(400, { error: 'No align run selected' });
          }
          const outdoorAnimationPath = path.join(
            takeStageRunDir(job.scriptId, job.takeId, 'align', runId),
            'animation-outdoor.json',
          );
          const synced = syncStudioLayoutToOutdoor(job.scriptId, outdoorAnimationPath);
          if (!synced) {
            return jsonResponse(400, {
              error: 'Could not sync — missing outdoorEdit in cache or animation-outdoor.json',
            });
          }
          return jsonResponse(200, {
            synced: true,
            outdoorEdit: synced,
            review: buildAlignReview(job, runId),
          });
        }

        const runStageMatch = pathname.match(/^\/api\/jobs\/([^/]+)\/stages\/([^/]+)\/run$/);
        if (request.method === 'POST' && runStageMatch) {
          const jobId = decodeURIComponent(runStageMatch[1]);
          const stage = decodeURIComponent(runStageMatch[2]);
          if (!isPipelineStage(stage)) {
            return jsonResponse(400, { error: `Unknown stage: ${stage}` });
          }
          const body = await readJsonBody(request);
          void runStage(jobId, stage, {
            rerun: Boolean(body.rerun),
            options: (body.options as Record<string, unknown> | undefined) ?? {},
          }).catch((error) => {
            console.error(`[api] stage ${stage} failed for ${jobId}:`, error);
          });
          return jsonResponse(202, { accepted: true, jobId, stage });
        }

        const selectMatch = pathname.match(/^\/api\/jobs\/([^/]+)\/selection$/);
        if (request.method === 'PUT' && selectMatch) {
          const jobId = decodeURIComponent(selectMatch[1]);
          const body = await readJsonBody(request);
          const selectedRuns = (body.selectedRuns ?? body) as Partial<Record<PipelineStage, string>>;
          const job = setStageSelection(jobId, selectedRuns);
          return jsonResponse(200, { job });
        }

        const pipelineMatch = pathname.match(/^\/api\/jobs\/([^/]+)\/pipeline\/run$/);
        if (request.method === 'POST' && pipelineMatch) {
          const jobId = decodeURIComponent(pipelineMatch[1]);
          const body = await readJsonBody(request);
          void runDefaultPipeline(jobId, { rerun: body.rerun !== false }).catch((error) => {
            console.error(`[api] pipeline failed for ${jobId}:`, error);
          });
          return jsonResponse(202, { accepted: true, jobId });
        }

        const socialMatch = pathname.match(/^\/api\/jobs\/([^/]+)\/social$/);
        if (socialMatch && (request.method === 'GET' || request.method === 'PATCH')) {
          const jobId = decodeURIComponent(socialMatch[1]);
          const job = loadJob(jobId);
          if (!job?.selectedRuns.social) {
            return jsonResponse(400, { error: 'No social run selected' });
          }
          const socialPath = path.join(
            takeStageRunDir(job.scriptId, job.takeId, 'social', job.selectedRuns.social),
            'social-posts.json',
          );
          if (!fileExists(socialPath)) {
            return jsonResponse(404, { error: 'social-posts.json not found' });
          }
          if (request.method === 'GET') {
            return jsonResponse(200, { social: readJson(socialPath) });
          }
          const body = await readJsonBody(request);
          let social;
          if (body.social) {
            writeJson(socialPath, body.social);
            social = body.social;
          } else {
            social = patchSocialPosts(
              socialPath,
              (body.patch ?? body) as Parameters<typeof patchSocialPosts>[1],
            );
          }
          return jsonResponse(200, { social });
        }

        const coversListMatch = pathname.match(/^\/api\/jobs\/([^/]+)\/covers$/);
        if (coversListMatch && request.method === 'GET') {
          const jobId = decodeURIComponent(coversListMatch[1]);
          try {
            return jsonResponse(200, listCovers(jobId));
          } catch (error) {
            return jsonResponse(404, {
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }
        if (coversListMatch && request.method === 'POST') {
          const jobId = decodeURIComponent(coversListMatch[1]);
          try {
            const contentType = request.headers.get('content-type') ?? '';
            if (contentType.includes('application/json')) {
              const body = await readJsonBody(request);
              if (body.action === 'duplicate' && typeof body.coverId === 'string') {
                return jsonResponse(200, duplicateCover(jobId, body.coverId));
              }
              if (body.action === 'capture-composite') {
                const format = body.format === 'landscape' ? 'landscape' : 'portrait';
                const atSeconds = typeof body.atSeconds === 'number' ? body.atSeconds : undefined;
                const label = typeof body.label === 'string' ? body.label : undefined;
                return jsonResponse(
                  200,
                  await captureCoverFromComposite(jobId, { format, atSeconds, label }),
                );
              }
              return jsonResponse(400, { error: 'Unsupported covers POST JSON action' });
            }
            const boundaryMatch = /boundary=(.+)$/.exec(contentType);
            if (!boundaryMatch) {
              return jsonResponse(400, { error: 'Expected multipart/form-data cover upload' });
            }
            const body = new Uint8Array(await request.arrayBuffer());
            const parts = parseMultipart(body, boundaryMatch[1]);
            const filePart = parts.get('cover') ?? parts.get('file') ?? parts.get('image');
            if (!filePart) {
              return jsonResponse(400, { error: 'Upload requires cover/file/image field' });
            }
            const labelPart = parts.get('label');
            const sourcePart = parts.get('source');
            const label = labelPart
              ? new TextDecoder().decode(labelPart.data).trim()
              : undefined;
            const sourceRaw = sourcePart
              ? new TextDecoder().decode(sourcePart.data).trim()
              : 'browser';
            const source =
              sourceRaw === 'iphone' ||
                sourceRaw === 'import' ||
                sourceRaw === 'duplicate' ||
                sourceRaw === 'composite'
                ? sourceRaw
                : 'browser';
            return jsonResponse(
              200,
              uploadCover(jobId, {
                data: filePart.data,
                fileName: filePart.fileName,
                contentType: filePart.contentType,
                label,
                source,
              }),
            );
          } catch (error) {
            return jsonResponse(400, {
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }

        const coversMapMatch = pathname.match(/^\/api\/jobs\/([^/]+)\/covers\/platform-map$/);
        if (coversMapMatch && request.method === 'PATCH') {
          const jobId = decodeURIComponent(coversMapMatch[1]);
          try {
            const body = await readJsonBody(request);
            return jsonResponse(
              200,
              patchPlatformCoverMap(jobId, body as Parameters<typeof patchPlatformCoverMap>[1]),
            );
          } catch (error) {
            return jsonResponse(400, {
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }

        const coverFileMatch = pathname.match(/^\/api\/jobs\/([^/]+)\/covers\/([^/]+)\/file$/);
        if (coverFileMatch && (request.method === 'GET' || request.method === 'HEAD')) {
          const jobId = decodeURIComponent(coverFileMatch[1]);
          const coverId = decodeURIComponent(coverFileMatch[2]);
          const job = loadJob(jobId);
          if (!job) {
            return jsonResponse(404, { error: 'Job not found' });
          }
          const filePath = resolveCoverFilePath(job.scriptId, job.takeId, coverId);
          if (!filePath) {
            return jsonResponse(404, { error: 'Cover file not found' });
          }
          return fileResponse(filePath, request);
        }

        const coverItemMatch = pathname.match(/^\/api\/jobs\/([^/]+)\/covers\/([^/]+)$/);
        if (coverItemMatch && request.method === 'PATCH') {
          const jobId = decodeURIComponent(coverItemMatch[1]);
          const coverId = decodeURIComponent(coverItemMatch[2]);
          try {
            const body = await readJsonBody(request);
            if (typeof body.label !== 'string') {
              return jsonResponse(400, { error: 'label is required' });
            }
            return jsonResponse(200, renameCover(jobId, coverId, body.label));
          } catch (error) {
            return jsonResponse(400, {
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }
        if (coverItemMatch && request.method === 'DELETE') {
          const jobId = decodeURIComponent(coverItemMatch[1]);
          const coverId = decodeURIComponent(coverItemMatch[2]);
          try {
            return jsonResponse(200, deleteCover(jobId, coverId));
          } catch (error) {
            return jsonResponse(400, {
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }

        const publishAllMatch = pathname.match(/^\/api\/jobs\/([^/]+)\/publish-all$/);
        if (request.method === 'POST' && publishAllMatch) {
          const jobId = decodeURIComponent(publishAllMatch[1]);
          try {
            const summary = await publishAll(jobId);
            return jsonResponse(200, summary);
          } catch (error) {
            return jsonResponse(400, {
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }

        const publishMatch = pathname.match(/^\/api\/jobs\/([^/]+)\/publish\/([^/]+)$/);
        if (request.method === 'POST' && publishMatch) {
          const jobId = decodeURIComponent(publishMatch[1]);
          const platform = decodeURIComponent(publishMatch[2]);
          const body = await readJsonBody(request);
          try {
            const record = await publishJob(jobId, platform, body);
            return jsonResponse(200, { record });
          } catch (error) {
            return jsonResponse(400, {
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }

        const hideMatch = pathname.match(/^\/api\/jobs\/([^/]+)\/publish\/([^/]+)\/hide$/);
        if (request.method === 'POST' && hideMatch) {
          const jobId = decodeURIComponent(hideMatch[1]);
          const platform = decodeURIComponent(hideMatch[2]);
          try {
            const record = await hidePublishedPost(jobId, platform);
            return jsonResponse(200, { record });
          } catch (error) {
            return jsonResponse(400, {
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }

        const deleteMatch = pathname.match(/^\/api\/jobs\/([^/]+)\/publish\/([^/]+)$/);
        if (request.method === 'DELETE' && deleteMatch) {
          const jobId = decodeURIComponent(deleteMatch[1]);
          const platform = decodeURIComponent(deleteMatch[2]);
          try {
            const record = await deletePublishedPost(jobId, platform);
            return jsonResponse(200, { record });
          } catch (error) {
            return jsonResponse(400, {
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }

        if (request.method === 'GET' && pathname === '/api/platforms') {
          const health = await buildPlatformsHealth();
          return jsonResponse(200, {
            platformIds: SUPPORTED_PLATFORMS,
            platforms: health.platforms,
            checkedAt: health.checkedAt,
            connectProgress: health.connectProgress,
            providers: health.providers,
            manualPlatforms: health.manualPlatforms,
          });
        }

        if (request.method === 'POST' && pathname === '/api/platforms/zernio/sync-accounts') {
          try {
            return jsonResponse(200, await syncZernioAccountsSuggestion());
          } catch (error) {
            return jsonResponse(400, {
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }

        const platformTestMatch = pathname.match(/^\/api\/platforms\/([^/]+)\/test$/);
        if (request.method === 'POST' && platformTestMatch) {
          const target = decodeURIComponent(platformTestMatch[1]);
          try {
            if (target === 'zernio' || target === 'sau') {
              return jsonResponse(200, await testProviderConnection(target));
            }
            return jsonResponse(200, await testPlatformConnection(target));
          } catch (error) {
            return jsonResponse(400, {
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }

        return jsonResponse(404, { error: 'Not found' });
      } catch (error) {
        console.error('[api] error:', error);
        return jsonResponse(500, {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    },
  );

  return {
    host,
    port,
    listen: async () => server,
    close: () => server.shutdown(),
  };
}

function enrichJobSummary(job: OutdoorJob) {
  return {
    jobId: job.jobId,
    takeId: job.takeId,
    scriptId: job.scriptId,
    scriptTitle: job.scriptTitle,
    status: job.status,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    selectedRuns: job.selectedRuns,
    progress: buildProgressMap(job),
  };
}

function buildProgressMap(job: OutdoorJob): Partial<Record<PipelineStage, StageProgress | null>> {
  const progress: Partial<Record<PipelineStage, StageProgress | null>> = {};
  for (const stage of PIPELINE_STAGES) {
    const runs = job.runs[stage] ?? [];
    const runId =
      runs.find((entry) => entry.status === 'running')?.runId ??
      job.selectedRuns[stage] ??
      runs[0]?.runId;
    if (!runId) {
      continue;
    }
    progress[stage] = readProgress(job.jobId, stage, runId);
  }
  return progress;
}

async function handleUpload(request: Request): Promise<Response> {
  ensureDir(INBOX_DIR);
  const contentType = request.headers.get('content-type') ?? '';
  const boundaryMatch = /boundary=(.+)$/.exec(contentType);
  if (!boundaryMatch) {
    return jsonResponse(400, { error: 'Expected multipart/form-data upload' });
  }

  const body = new Uint8Array(await request.arrayBuffer());
  const parts = parseMultipart(body, boundaryMatch[1]);
  const takePart = parts.get('take');
  const videoPart = parts.get('video');
  if (!takePart || !videoPart) {
    return jsonResponse(400, { error: 'Upload requires "take" JSON and "video" fields' });
  }

  const take = JSON.parse(new TextDecoder().decode(takePart.data)) as {
    takeId?: string;
    scriptId?: string;
    scriptTitle?: string;
  };
  if (!take.takeId) {
    return jsonResponse(400, { error: 'take.takeId is required' });
  }

  const takeId = take.takeId;
  const videoName = videoPart.fileName?.toLowerCase() ?? '';
  const videoExt = videoName.endsWith('.webm')
    ? '.webm'
    : videoName.endsWith('.mov')
    ? '.mov'
    : videoPart.contentType?.includes('webm')
    ? '.webm'
    : '.mp4';
  const inboxVideo = path.join(INBOX_DIR, `${takeId}${videoExt}`);
  const inboxTake = path.join(INBOX_DIR, `${takeId}.json`);
  Deno.writeFileSync(inboxVideo, videoPart.data);
  Deno.writeTextFileSync(inboxTake, `${JSON.stringify(take, null, 2)}\n`);

  let job: OutdoorJob | null = null;
  if (!jobExistsForTake(takeId)) {
    job = createJobFromTake({
      takeId,
      scriptId: take.scriptId ?? takeId,
      scriptTitle: take.scriptTitle ?? take.scriptId ?? takeId,
      videoPath: inboxVideo,
      takeManifestPath: inboxTake,
    });
    const createdJob = job;
    appendTakeAgentLog(
      createdJob.scriptId,
      createdJob.takeId,
      `uploaded from iPhone → job ${createdJob.jobId}`,
    );
    void runDefaultPipeline(createdJob.jobId).catch((error) => {
      const message = error instanceof Error ? error.message : String(error);
      appendTakeAgentLog(createdJob.scriptId, createdJob.takeId, `pipeline failed: ${message}`);
      console.error(`[upload] pipeline failed for ${createdJob.jobId}:`, error);
    });
  } else {
    job = loadJob(`job-${takeId}`);
  }

  return jsonResponse(201, {
    ok: true,
    takeId,
    jobId: job?.jobId ?? `job-${takeId}`,
    message: jobExistsForTake(takeId) ? 'Take already ingested' : 'Job created',
  });
}
