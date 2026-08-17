import path from "node:path";
import { fileURLToPath } from "node:url";

import { scanVideoOpsCatalog, resolveSeriesSharedAsset } from "./catalog.ts";
import { fileExists, readJson, writeJson } from "./fs_util.ts";
import { readAnimationMd, writeAnimationMd } from "./animation-md.ts";
import { readBeatPosterMd } from "./beat-posters/poster-md.ts";
import {
  emptyBeatStudio,
  readBeatStudio,
  writeBeatStudio,
  type BeatStudioDocument,
} from "./beat-studio.ts";
import { reviseAnimationMarkdown, reviseBeatCandidate } from "./llm-client.ts";
import { loadLlmSettings, saveLlmSettings } from "./llm-settings.ts";
import {
  applyPublishCredentials,
  savePublishCredentials,
  toPublicPublishCredentials,
  type PublishMode,
} from "./publish-credentials.ts";
import { compileAnimationSource, resyncAllScripts } from "./scripts-watcher.ts";
import { buildLiveScript, patchLiveBeat } from "./live-script.ts";
import type { BeatVariantPatch } from "../../../src/beatVariants.ts";
import {
  deleteStickerAsset,
  handleStickerAssetUpload,
  resolveScriptAssetPath,
} from "./sticker-assets.ts";
import {
  createJobFromTake,
  jobExistsForTake,
  listJobs,
  loadJob,
  loadPublishState,
  readProgress,
  saveJob,
} from "./job-store.ts";
import {
  fileResponse,
  jsonResponse,
  optionsResponse,
  parseMultipart,
  readJsonBody,
} from "./http_util.ts";
import {
  ensureDir,
  INBOX_DIR,
  outdoorScriptPath,
  REPO_ROOT,
  VIDEO_OPS_ROOT,
  resolveStageArtifactPath,
  scriptDirFor,
  stageRunDir,
  takeSourceVideoPath,
  takeStageRunDir,
} from "./paths.ts";
import { revealPathInFinder } from "./reveal-in-finder.ts";
import { buildOutdoorEndpointsPayload } from "./outdoor-endpoints.ts";
import {
  buildPublishPlan,
  deletePublishedPost,
  hidePublishedPost,
  listSocialCards,
  publishAll,
  publishImageJob,
  publishImagesAll,
  publishJob,
  refreshPostizPublishState,
  SUPPORTED_PLATFORMS,
} from "./publish/index.ts";
import {
  BEAT_POSTER_COVER_ID,
  buildBeatPosterPublishPreview,
  beatPosterPublishErrorPayload,
  generateAllBeatPosters,
  generateBeatPoster,
  generateBeatPosterCover,
  getBeatPosterPublishState,
  listBeatPosterPlatforms,
  listBeatPosters,
  publishBeatPosterAlbum,
  publishBeatPosterAlbumAll,
  revertBeatPosterAlbumPublish,
  readBeatPosterAsset,
  saveUploadedBeatPosterPng,
  syncBeatPosterPreviewJpegs,
} from "./beat-posters/index.ts";
import {
  generateSocialCardsForJob,
  readSocialCardAsset,
} from "./social-cards/index.ts";
import {
  buildPostizOverview,
  getPostizConnectUrl,
} from "./publish/postiz.ts";
import {
  buildPlatformsHealth,
  selectPostizIntegration,
  syncPostizIntegrationsSuggestion,
  prepareForPublish,
  ensurePostizIntegrationsSynced,
  testPlatformConnection,
  testProviderConnection,
} from "./platform-status.ts";
import {
  runDefaultPipeline,
  runStage,
  setStageSelection,
  cancelJob,
} from "./queue.ts";
import { buildPipelineSnapshot } from "./pipeline-snapshot.ts";
import { appendTakeAgentLog } from "./stage-run-log.ts";
import {
  createVoxcpmTrialJob,
  checkVoxcpmHealth,
  fetchVoxcpmLogs,
  retryVoxcpmTrialJob,
  retryVoxcpmCompositeJob,
  runVoxcpmTrialJob,
} from "./voxcpm-trial.ts";
import { checkIndexTtsHealth } from "./indextts-client.ts";
import { parseVoiceEngine } from "../../../src/voiceEngine.ts";
import { parseScriptLanguage } from "../../../src/scriptLanguage.ts";
import {
  queueVoxcpmBeatRender,
  queueVoxcpmSentenceRender,
  readVoxcpmEditorDocument,
  resolveVoxcpmEditorAudioPath,
  saveVoxcpmEditorBeat,
  setPreviewVoiceEngine,
} from "./voxcpm-script-editor.ts";
import {
  isPipelineStage,
  PIPELINE_STAGES,
  type OutdoorJob,
  type PipelineStage,
  type StageProgress,
} from "./schema.ts";
import { scanInbox } from "./inbox-watcher.ts";
import { getInboxStatus } from "./inbox-status.ts";
import { buildJobResults } from "./job-results.ts";
import {
  buildCutReview,
  saveCutSelection,
  type CutSelection,
} from "./cut-review.ts";
import { applyCutSelectionRun } from "./cut-apply.ts";
import {
  buildAlignReview,
  saveAlignLayout,
  type AlignLayout,
} from "./align-review.ts";
import {
  syncOutdoorEditToAnimation,
  syncStudioLayoutToOutdoor,
} from "./sync-outdoor-animation.ts";
import { ensureTakeSocialPack, patchSocialPosts } from "./stages/social.ts";
import {
  captureCoverFromComposite,
  deleteCover,
  duplicateCover,
  listCovers,
  patchPlatformCoverMap,
  renameCover,
  resolveCoverFilePath,
  uploadCover,
} from "./covers.ts";
import {
  isScriptCoverSlot,
  listScriptCovers,
  resolveScriptCoverPath,
  uploadScriptCoverSlot,
  uploadScriptCoversBatch,
} from "./script-covers.ts";

const WEB_ROOT = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../web",
);

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
  return method === "GET" || method === "HEAD";
}

export function createServer(options: ServerOptions = {}): OutdoorServer {
  const host = options.host ?? "127.0.0.1";
  const port = options.port ?? 8787;

  const server = Deno.serve(
    {
      hostname: host,
      port,
      onListen: () => console.log(`[outdoor-agent] API http://${host}:${port}`),
    },
    async (request) => {
      try {
        applyPublishCredentials();
        if (request.method === "OPTIONS") {
          return optionsResponse();
        }

        const url = new URL(request.url);
        const pathname = url.pathname;

        if (
          isRead(request.method) &&
          (pathname === "/" || pathname === "/status")
        ) {
          return fileResponse(path.join(WEB_ROOT, "index.html"), request);
        }

        const webAssetMatch = pathname.match(/^\/app\/(.+)$/);
        if (isRead(request.method) && webAssetMatch) {
          const rel = webAssetMatch[1];
          if (rel.includes("..")) {
            return jsonResponse(400, { error: "Invalid path" });
          }
          const filePath = path.join(WEB_ROOT, "app", rel);
          if (!fileExists(filePath)) {
            return jsonResponse(404, { error: "Not found" });
          }
          return fileResponse(filePath, request);
        }

        const beatPosterPreviewMatch = pathname.match(
          /^\/beat-poster-preview\/([^/]+)\/([^/]+\.jpg)$/,
        );
        if (isRead(request.method) && beatPosterPreviewMatch) {
          const scriptId = decodeURIComponent(beatPosterPreviewMatch[1]);
          const fileName = beatPosterPreviewMatch[2];
          if (fileName.includes("..")) {
            return jsonResponse(400, { error: "Invalid path" });
          }
          const filePath = path.join(
            WEB_ROOT,
            "beat-poster-preview",
            scriptId,
            fileName,
          );
          if (!fileExists(filePath)) {
            return jsonResponse(404, { error: "Preview JPEG not found" });
          }
          return fileResponse(filePath, request);
        }

        const brandLogoMatch = pathname.match(/^\/api\/brand\/(lean|turn)\.(svg|png)$/);
        if (isRead(request.method) && brandLogoMatch) {
          const brand = brandLogoMatch[1];
          const sharedDir = path.join(VIDEO_OPS_ROOT, "projects", "compare", "shared");
          const filePath = brand === "lean"
            ? path.join(sharedDir, "lean.svg")
            : path.join(sharedDir, "turn-lang-logo.png");
          if (!fileExists(filePath)) {
            return jsonResponse(404, { error: "Logo not found" });
          }
          return fileResponse(filePath, request);
        }

        if (request.method === "GET" && pathname === "/api/health") {
          return jsonResponse(200, { ok: true, service: "outdoor-agent" });
        }

        if (request.method === "GET" && pathname === "/api/voxcpm/health") {
          const health = await checkVoxcpmHealth();
          return jsonResponse(200, health);
        }

        if (request.method === "GET" && pathname === "/api/voxcpm/logs") {
          const limitRaw = url.searchParams.get("limit");
          const limit = limitRaw ? Number(limitRaw) : 200;
          const logs = await fetchVoxcpmLogs(Number.isFinite(limit) ? limit : 200);
          return jsonResponse(200, logs);
        }

        if (request.method === "GET" && pathname === "/api/indextts/health") {
          const health = await checkIndexTtsHealth();
          return jsonResponse(200, health);
        }

        const voxcpmEditorAudioMatch = pathname.match(
          /^\/api\/scripts\/([^/]+)\/voxcpm-editor\/audio\/(sentences|beats)\/([^/]+)$/,
        );
        if (isRead(request.method) && voxcpmEditorAudioMatch) {
          const scriptId = decodeURIComponent(voxcpmEditorAudioMatch[1]);
          const kind = voxcpmEditorAudioMatch[2];
          const fileName = decodeURIComponent(voxcpmEditorAudioMatch[3]);
          const voiceEngine = parseVoiceEngine(url.searchParams.get("engine"));
          const scriptLanguage = parseScriptLanguage(url.searchParams.get("lang"));
          const filePath = resolveVoxcpmEditorAudioPath(
            scriptId,
            kind,
            fileName,
            voiceEngine,
            scriptLanguage,
          );
          if (!filePath) {
            return jsonResponse(404, { error: "VoxCPM editor audio not found" });
          }
          return fileResponse(filePath, request);
        }

        const voxcpmEditorMatch = pathname.match(
          /^\/api\/scripts\/([^/]+)\/voxcpm-editor$/,
        );
        if (isRead(request.method) && voxcpmEditorMatch) {
          const scriptId = decodeURIComponent(voxcpmEditorMatch[1]);
          const referenceTakeId = url.searchParams.get("referenceTakeId") ?? undefined;
          const voiceEngine = parseVoiceEngine(url.searchParams.get("voiceEngine"));
          const scriptLanguage = parseScriptLanguage(url.searchParams.get("scriptLanguage"));
          try {
            const document = await readVoxcpmEditorDocument(scriptId, {
              referenceTakeId,
              voiceEngine,
              scriptLanguage,
            });
            return jsonResponse(200, document);
          } catch (error) {
            return jsonResponse(400, {
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }

        const voxcpmPreviewVoiceMatch = pathname.match(
          /^\/api\/scripts\/([^/]+)\/voxcpm-editor\/preview-voice-engine$/,
        );
        if (request.method === "PUT" && voxcpmPreviewVoiceMatch) {
          const scriptId = decodeURIComponent(voxcpmPreviewVoiceMatch[1]);
          const body = await readJsonBody(request);
          const voiceEngine = parseVoiceEngine(body.voiceEngine);
          try {
            const result = await setPreviewVoiceEngine(scriptId, voiceEngine);
            return jsonResponse(200, result);
          } catch (error) {
            return jsonResponse(400, {
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }

        const voxcpmEditorBeatMatch = pathname.match(
          /^\/api\/scripts\/([^/]+)\/voxcpm-editor\/beats\/(\d+)$/,
        );
        if (request.method === "PUT" && voxcpmEditorBeatMatch) {
          const scriptId = decodeURIComponent(voxcpmEditorBeatMatch[1]);
          const beatIndex = Number(voxcpmEditorBeatMatch[2]);
          const body = await readJsonBody(request);
          const voiceEngine = parseVoiceEngine(body.voiceEngine);
          const scriptLanguage = parseScriptLanguage(body.scriptLanguage);
          try {
            const document = await saveVoxcpmEditorBeat(
              scriptId,
              beatIndex,
              body.sentences,
              {
                referenceTakeId:
                  typeof body.referenceTakeId === "string"
                    ? body.referenceTakeId
                    : undefined,
                voiceEngine,
                scriptLanguage,
              },
            );
            return jsonResponse(200, document);
          } catch (error) {
            return jsonResponse(400, {
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }

        const voxcpmEditorSentenceRenderMatch = pathname.match(
          /^\/api\/scripts\/([^/]+)\/voxcpm-editor\/beats\/(\d+)\/sentences\/([^/]+)\/render$/,
        );
        if (request.method === "POST" && voxcpmEditorSentenceRenderMatch) {
          const scriptId = decodeURIComponent(voxcpmEditorSentenceRenderMatch[1]);
          const beatIndex = Number(voxcpmEditorSentenceRenderMatch[2]);
          const sentenceId = decodeURIComponent(voxcpmEditorSentenceRenderMatch[3]);
          const body = await readJsonBody(request);
          const referenceTakeId =
            typeof body.referenceTakeId === "string" ? body.referenceTakeId : undefined;
          const force = body.force === true;
          const voiceEngine = parseVoiceEngine(body.voiceEngine);
          const scriptLanguage = parseScriptLanguage(body.scriptLanguage);
          try {
            const health =
              voiceEngine === "indextts"
                ? await checkIndexTtsHealth()
                : await checkVoxcpmHealth();
            if (!health.ok) {
              const label = voiceEngine === "indextts" ? "IndexTTS" : "VoxCPM";
              return jsonResponse(503, {
                error: `${label} not running at ${health.url}`,
                voiceEngine,
                health,
              });
            }
            await queueVoxcpmSentenceRender(
              scriptId,
              beatIndex,
              sentenceId,
              { referenceTakeId, force, voiceEngine, scriptLanguage },
            );
            return jsonResponse(202, {
              accepted: true,
              scriptId,
              beatIndex,
              sentenceId,
            });
          } catch (error) {
            return jsonResponse(400, {
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }

        const voxcpmEditorBeatRenderMatch = pathname.match(
          /^\/api\/scripts\/([^/]+)\/voxcpm-editor\/beats\/(\d+)\/render$/,
        );
        if (request.method === "POST" && voxcpmEditorBeatRenderMatch) {
          const scriptId = decodeURIComponent(voxcpmEditorBeatRenderMatch[1]);
          const beatIndex = Number(voxcpmEditorBeatRenderMatch[2]);
          const body = await readJsonBody(request);
          const referenceTakeId =
            typeof body.referenceTakeId === "string" ? body.referenceTakeId : undefined;
          const force = body.force === true;
          const voiceEngine = parseVoiceEngine(body.voiceEngine);
          const scriptLanguage = parseScriptLanguage(body.scriptLanguage);
          try {
            const health =
              voiceEngine === "indextts"
                ? await checkIndexTtsHealth()
                : await checkVoxcpmHealth();
            if (!health.ok) {
              const label = voiceEngine === "indextts" ? "IndexTTS" : "VoxCPM";
              return jsonResponse(503, {
                error: `${label} not running at ${health.url}`,
                voiceEngine,
                health,
              });
            }
            await queueVoxcpmBeatRender(scriptId, beatIndex, {
              referenceTakeId,
              force,
              voiceEngine,
              scriptLanguage,
            });
            return jsonResponse(202, { accepted: true, scriptId, beatIndex });
          } catch (error) {
            return jsonResponse(400, {
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }

        if (request.method === "GET" && pathname === "/api/outdoor-endpoints") {
          return jsonResponse(200, buildOutdoorEndpointsPayload());
        }

        if (request.method === "GET" && pathname === "/api/catalog") {
          return jsonResponse(200, scanVideoOpsCatalog());
        }

        if (request.method === "POST" && pathname === "/api/scripts/resync") {
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

        const voxcpmTrialMatch = pathname.match(
          /^\/api\/scripts\/([^/]+)\/voxcpm-trial$/,
        );
        if (request.method === "POST" && voxcpmTrialMatch) {
          const scriptId = decodeURIComponent(voxcpmTrialMatch[1]);
          const body = await readJsonBody(request);
          const options = {
            referenceTakeId:
              typeof body.referenceTakeId === "string"
                ? body.referenceTakeId
                : undefined,
            referenceAudioPath:
              typeof body.referenceAudioPath === "string"
                ? body.referenceAudioPath
                : undefined,
            renderComposite: body.renderComposite !== false,
          };
          try {
            const health = await checkVoxcpmHealth();
            if (!health.ok) {
              return jsonResponse(503, {
                error:
                  `VoxCPM not running at ${health.url} — start npm run outdoor:all on Mac and wait for port 8791`,
                voxcpm: health,
              });
            }
            const { job, takeId, referenceAudioPath } = await createVoxcpmTrialJob(
              scriptId,
              options,
            );
            void runVoxcpmTrialJob(job, options).catch((error) => {
              console.error(
                `[api] voxcpm trial failed for ${scriptId} ${takeId}:`,
                error,
              );
            });
            return jsonResponse(202, {
              accepted: true,
              jobId: job.jobId,
              takeId,
              referenceAudioPath,
            });
          } catch (error) {
            return jsonResponse(400, {
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }

        if (request.method === "GET" && pathname === "/api/series") {
          const catalog = scanVideoOpsCatalog();
          return jsonResponse(200, {
            schemaVersion: catalog.schemaVersion,
            generatedAt: catalog.generatedAt,
            series: catalog.series,
          });
        }

        const seriesAssetMatch = pathname.match(
          /^\/api\/series\/([^/]+)\/shared\/(.+)$/,
        );
        if (isRead(request.method) && seriesAssetMatch) {
          const seriesId = decodeURIComponent(seriesAssetMatch[1]);
          const relativePath = decodeURIComponent(seriesAssetMatch[2]);
          const filePath = resolveSeriesSharedAsset(seriesId, relativePath);
          if (!filePath) {
            return jsonResponse(404, { error: "Series asset not found" });
          }
          return fileResponse(filePath, request);
        }

        const outdoorScriptMatch = pathname.match(
          /^\/api\/scripts\/([^/]+)\/outdoor-script$/,
        );
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
            return jsonResponse(404, { error: "Outdoor script not found" });
          }
          return fileResponse(filePath, request);
        }

        const liveScriptMatch = pathname.match(
          /^\/api\/scripts\/([^/]+)\/live-script$/,
        );
        if (isRead(request.method) && liveScriptMatch) {
          const scriptId = decodeURIComponent(liveScriptMatch[1]);
          try {
            const live = await buildLiveScript(scriptId);
            if (!live) {
              return jsonResponse(404, { error: "Not found" });
            }
            return jsonResponse(200, live);
          } catch (error) {
            return jsonResponse(500, {
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }

        const liveBeatMatch = pathname.match(
          /^\/api\/scripts\/([^/]+)\/beats\/(\d+)$/,
        );
        if (request.method === "PUT" && liveBeatMatch) {
          const scriptId = decodeURIComponent(liveBeatMatch[1]);
          const beatIndex = Number(liveBeatMatch[2]);
          if (!Number.isInteger(beatIndex) || beatIndex < 0) {
            return jsonResponse(400, { error: "Invalid beat index" });
          }
          const body = await readJsonBody(request);
          try {
            const live = await patchLiveBeat(scriptId, beatIndex, {
              title: typeof body.title === "string" ? body.title : undefined,
              say: typeof body.say === "string" ? body.say : undefined,
              chinese: typeof body.chinese === "string" ? body.chinese : undefined,
              leanCode:
                typeof body.leanCode === "string" ? body.leanCode : undefined,
              turnCode:
                typeof body.turnCode === "string" ? body.turnCode : undefined,
              visualNotes:
                typeof body.visualNotes === "string"
                  ? body.visualNotes
                  : undefined,
              selectedVariant:
                typeof body.selectedVariant === "string"
                  ? body.selectedVariant
                  : undefined,
              addVariant:
                body.addVariant && typeof body.addVariant === "object"
                  ? (body.addVariant as BeatVariantPatch["addVariant"])
                  : undefined,
            });
            return jsonResponse(200, live);
          } catch (error) {
            return jsonResponse(400, {
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }

        const beatStudioMatch = pathname.match(
          /^\/api\/scripts\/([^/]+)\/beat-studio$/,
        );
        if (isRead(request.method) && beatStudioMatch) {
          const scriptId = decodeURIComponent(beatStudioMatch[1]);
          const doc = readBeatStudio(scriptId);
          if (!doc) {
            return jsonResponse(200, emptyBeatStudio(scriptId));
          }
          return jsonResponse(200, doc);
        }
        if (request.method === "PUT" && beatStudioMatch) {
          const scriptId = decodeURIComponent(beatStudioMatch[1]);
          const body = await readJsonBody(request);
          if (body.schemaVersion !== 1 || body.scriptId !== scriptId) {
            return jsonResponse(400, { error: "Invalid beat studio document" });
          }
          if (!body.beats || typeof body.beats !== "object") {
            return jsonResponse(400, { error: "beats object required" });
          }
          const doc: BeatStudioDocument = {
            schemaVersion: 1,
            scriptId,
            updatedAt: new Date().toISOString(),
            beats: body.beats as BeatStudioDocument["beats"],
          };
          writeBeatStudio(doc);
          return jsonResponse(200, doc);
        }

        const scriptAssetMatch = pathname.match(
          /^\/api\/scripts\/([^/]+)\/assets\/(.+)$/,
        );
        if (isRead(request.method) && scriptAssetMatch) {
          const scriptId = decodeURIComponent(scriptAssetMatch[1]);
          const relativePath = decodeURIComponent(scriptAssetMatch[2]);
          const filePath = resolveScriptAssetPath(scriptId, relativePath);
          if (!filePath) {
            return jsonResponse(404, { error: "Asset not found" });
          }
          return fileResponse(filePath, request);
        }

        const stickerAssetMatch = pathname.match(
          /^\/api\/scripts\/([^/]+)\/sticker-assets$/,
        );
        if (request.method === "POST" && stickerAssetMatch) {
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
        if (request.method === "DELETE" && stickerAssetMatch) {
          const scriptId = decodeURIComponent(stickerAssetMatch[1]);
          const body = await readJsonBody(request);
          const assetPath =
            typeof body.assetPath === "string" ? body.assetPath : "";
          if (!assetPath) {
            return jsonResponse(400, { error: "assetPath required" });
          }
          if (!deleteStickerAsset(scriptId, assetPath)) {
            return jsonResponse(404, { error: "Asset not found" });
          }
          return jsonResponse(200, { ok: true });
        }

        const aiCandidateMatch = pathname.match(
          /^\/api\/scripts\/([^/]+)\/beats\/(\d+)\/ai-candidate$/,
        );
        if (request.method === "POST" && aiCandidateMatch) {
          const scriptId = decodeURIComponent(aiCandidateMatch[1]);
          const beatIndex = Number(aiCandidateMatch[2]);
          if (!Number.isInteger(beatIndex) || beatIndex < 0) {
            return jsonResponse(400, { error: "Invalid beat index" });
          }
          const body = await readJsonBody(request);
          const instruction =
            typeof body.instruction === "string" ? body.instruction.trim() : "";
          if (!instruction) {
            return jsonResponse(400, { error: "instruction required" });
          }
          const beatPayload = body.beat as Record<string, unknown>;
          if (!beatPayload || typeof beatPayload !== "object") {
            return jsonResponse(400, { error: "beat object required" });
          }
          const template =
            typeof body.template === "string" ? body.template : "compare-dual";
          try {
            const content = await reviseBeatCandidate({
              beat: {
                title:
                  typeof beatPayload.title === "string"
                    ? beatPayload.title
                    : "",
                say: typeof beatPayload.say === "string" ? beatPayload.say : "",
                leanCode:
                  typeof beatPayload.leanCode === "string"
                    ? beatPayload.leanCode
                    : "",
                turnCode:
                  typeof beatPayload.turnCode === "string"
                    ? beatPayload.turnCode
                    : "",
                visualNotes:
                  typeof beatPayload.visualNotes === "string"
                    ? beatPayload.visualNotes
                    : "",
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

        const animationMdMatch = pathname.match(
          /^\/api\/scripts\/([^/]+)\/animation-md$/,
        );
        if (isRead(request.method) && animationMdMatch) {
          const scriptId = decodeURIComponent(animationMdMatch[1]);
          const doc = readAnimationMd(scriptId);
          if (!doc.exists) {
            return jsonResponse(404, { error: "animation.md not found" });
          }
          return jsonResponse(200, doc);
        }

        const beatPosterMdMatch = pathname.match(
          /^\/api\/scripts\/([^/]+)\/beat-posters-md$/,
        );
        if (isRead(request.method) && beatPosterMdMatch) {
          const scriptId = decodeURIComponent(beatPosterMdMatch[1]);
          const doc = readBeatPosterMd(scriptId);
          if (!doc.exists) {
            return jsonResponse(404, { error: "beat-posters.md not found" });
          }
          return jsonResponse(200, doc);
        }
        if (request.method === "PUT" && animationMdMatch) {
          const scriptId = decodeURIComponent(animationMdMatch[1]);
          const body = await readJsonBody(request);
          const markdown =
            typeof body.markdown === "string" ? body.markdown : null;
          if (markdown === null) {
            return jsonResponse(400, { error: "markdown string required" });
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

        const animationMdAiMatch = pathname.match(
          /^\/api\/scripts\/([^/]+)\/animation-md\/ai$/,
        );
        if (request.method === "POST" && animationMdAiMatch) {
          const scriptId = decodeURIComponent(animationMdAiMatch[1]);
          const body = await readJsonBody(request);
          const instruction =
            typeof body.instruction === "string" ? body.instruction : "";
          if (!instruction.trim()) {
            return jsonResponse(400, { error: "instruction required" });
          }
          const current =
            typeof body.markdown === "string"
              ? body.markdown
              : readAnimationMd(scriptId).markdown;
          if (!current.trim()) {
            return jsonResponse(404, { error: "animation.md not found" });
          }
          try {
            const revised = await reviseAnimationMarkdown({
              markdown: current,
              instruction,
              selection:
                typeof body.selection === "string" ? body.selection : null,
            });
            if (body.apply) {
              const doc = await writeAnimationMd(scriptId, revised, {
                compile: true,
              });
              return jsonResponse(200, {
                markdown: revised,
                applied: true,
                document: doc,
              });
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
        if (request.method === "POST" && animationCompileMatch) {
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

        const scriptCoversMatch = pathname.match(
          /^\/api\/scripts\/([^/]+)\/covers$/,
        );
        if (scriptCoversMatch && request.method === "GET") {
          const scriptId = decodeURIComponent(scriptCoversMatch[1]);
          try {
            return jsonResponse(200, listScriptCovers(scriptId));
          } catch (error) {
            return jsonResponse(400, {
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }
        if (scriptCoversMatch && request.method === "POST") {
          const scriptId = decodeURIComponent(scriptCoversMatch[1]);
          try {
            const contentType = request.headers.get("content-type") ?? "";
            const boundaryMatch = /boundary=(.+)$/.exec(contentType);
            if (!boundaryMatch) {
              return jsonResponse(400, {
                error: "Expected multipart/form-data cover upload",
              });
            }
            const body = new Uint8Array(await request.arrayBuffer());
            const parts = parseMultipart(body, boundaryMatch[1]);
            const slotPart = parts.get("slot");
            const slotRaw = slotPart
              ? new TextDecoder().decode(slotPart.data).trim()
              : "";
            const filePart =
              parts.get("file") ?? parts.get("cover") ?? parts.get("image");
            if (slotRaw && isScriptCoverSlot(slotRaw)) {
              if (!filePart) {
                return jsonResponse(400, {
                  error: "Upload requires file field",
                });
              }
              return jsonResponse(
                200,
                uploadScriptCoverSlot(scriptId, slotRaw, filePart.data),
              );
            }
            const batchFiles: Array<{ fileName?: string; data: Uint8Array }> =
              [];
            for (const [name, part] of parts.entries()) {
              if (name === "slot" || name === "label" || name === "source") {
                continue;
              }
              batchFiles.push({
                fileName: part.fileName ?? name,
                data: part.data,
              });
            }
            if (!batchFiles.length && filePart) {
              batchFiles.push({
                fileName: filePart.fileName,
                data: filePart.data,
              });
            }
            return jsonResponse(
              200,
              uploadScriptCoversBatch(scriptId, batchFiles),
            );
          } catch (error) {
            return jsonResponse(400, {
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }

        const scriptCoverFileMatch = pathname.match(
          /^\/api\/scripts\/([^/]+)\/covers\/([^/]+)\/file$/,
        );
        if (
          scriptCoverFileMatch &&
          (request.method === "GET" || request.method === "HEAD")
        ) {
          const scriptId = decodeURIComponent(scriptCoverFileMatch[1]);
          const slotRaw = decodeURIComponent(scriptCoverFileMatch[2]);
          if (!isScriptCoverSlot(slotRaw)) {
            return jsonResponse(404, { error: "Unknown cover slot" });
          }
          const filePath = resolveScriptCoverPath(scriptId, slotRaw);
          if (!filePath) {
            return jsonResponse(404, { error: "Cover file missing" });
          }
          return fileResponse(filePath, request);
        }

        const scriptSocialMatch = pathname.match(
          /^\/api\/scripts\/([^/]+)\/social-posts$/,
        );
        if (scriptSocialMatch && request.method === "GET") {
          const scriptId = decodeURIComponent(scriptSocialMatch[1]);
          const socialPath = path.join(
            scriptDirFor(scriptId),
            "social-posts.json",
          );
          if (!fileExists(socialPath)) {
            return jsonResponse(404, { error: "social-posts.json not found" });
          }
          return jsonResponse(200, readJson(socialPath));
        }

        const beatPosterPublishPreviewMatch = pathname.match(
          /^\/api\/scripts\/([^/]+)\/beat-posters\/publish-preview$/,
        );
        if (beatPosterPublishPreviewMatch && request.method === "GET") {
          const scriptId = decodeURIComponent(beatPosterPublishPreviewMatch[1]);
          const url = new URL(request.url);
          const lang = url.searchParams.get("lang") === "zh" ? "zh" : "en";
          try {
            const preview = await buildBeatPosterPublishPreview(scriptId, lang);
            return jsonResponse(200, {
              preview,
              publishState: getBeatPosterPublishState(scriptId),
            });
          } catch (error) {
            return jsonResponse(400, {
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }

        const beatPosterPublishAllMatch = pathname.match(
          /^\/api\/scripts\/([^/]+)\/beat-posters\/publish-all$/,
        );
        if (beatPosterPublishAllMatch && request.method === "POST") {
          const scriptId = decodeURIComponent(beatPosterPublishAllMatch[1]);
          const body = await readJsonBody(request);
          const lang = body.lang === "zh" ? "zh" : "en";
          try {
            const outcome = await publishBeatPosterAlbumAll(scriptId, lang);
            return jsonResponse(200, outcome);
          } catch (error) {
            return jsonResponse(400, beatPosterPublishErrorPayload('all', error));
          }
        }

        const beatPosterAlbumPublishMatch = pathname.match(
          /^\/api\/scripts\/([^/]+)\/beat-posters\/publish\/([^/]+)$/,
        );
        if (beatPosterAlbumPublishMatch && request.method === "POST") {
          const scriptId = decodeURIComponent(beatPosterAlbumPublishMatch[1]);
          const platform = decodeURIComponent(beatPosterAlbumPublishMatch[2]);
          const body = await readJsonBody(request);
          const lang = body.lang === "zh" ? "zh" : "en";
          try {
            const outcome = await publishBeatPosterAlbum({
              scriptId,
              lang,
              platform,
            });
            return jsonResponse(200, outcome);
          } catch (error) {
            return jsonResponse(400, beatPosterPublishErrorPayload(platform, error));
          }
        }

        const beatPosterRevertMatch = pathname.match(
          /^\/api\/scripts\/([^/]+)\/beat-posters\/publish\/([^/]+)\/revert$/,
        );
        if (beatPosterRevertMatch && request.method === "POST") {
          const scriptId = decodeURIComponent(beatPosterRevertMatch[1]);
          const platform = decodeURIComponent(beatPosterRevertMatch[2]);
          const body = await readJsonBody(request);
          const lang = body.lang === "zh" ? "zh" : "en";
          try {
            const outcome = await revertBeatPosterAlbumPublish({
              scriptId,
              lang,
              platform,
            });
            return jsonResponse(200, outcome);
          } catch (error) {
            return jsonResponse(400, beatPosterPublishErrorPayload(platform, error));
          }
        }

        const beatPostersMatch = pathname.match(
          /^\/api\/scripts\/([^/]+)\/beat-posters$/,
        );
        if (beatPostersMatch && request.method === "GET") {
          const scriptId = decodeURIComponent(beatPostersMatch[1]);
          try {
            const payload = await listBeatPosters(scriptId);
            return jsonResponse(200, {
              ...payload,
              platforms: listBeatPosterPlatforms(),
              publishState: getBeatPosterPublishState(scriptId),
            });
          } catch (error) {
            return jsonResponse(400, {
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }
        if (beatPostersMatch && request.method === "POST") {
          const scriptId = decodeURIComponent(beatPostersMatch[1]);
          try {
            await generateAllBeatPosters(scriptId);
            const payload = await listBeatPosters(scriptId);
            return jsonResponse(200, {
              ...payload,
              platforms: listBeatPosterPlatforms(),
              publishState: getBeatPosterPublishState(scriptId),
            });
          } catch (error) {
            return jsonResponse(400, {
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }

        const beatPosterPreviewSyncMatch = pathname.match(
          /^\/api\/scripts\/([^/]+)\/beat-posters\/sync-preview-jpegs$/,
        );
        if (beatPosterPreviewSyncMatch && request.method === "POST") {
          const scriptId = decodeURIComponent(beatPosterPreviewSyncMatch[1]);
          try {
            const result = await syncBeatPosterPreviewJpegs(scriptId);
            return jsonResponse(200, result);
          } catch (error) {
            return jsonResponse(400, {
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }

        const beatPosterAssetMatch = pathname.match(
          /^\/api\/scripts\/([^/]+)\/beat-posters\/([^/]+)\/(en|zh)\/(png|html)$/,
        );
        if (
          beatPosterAssetMatch &&
          request.method === "PUT" &&
          beatPosterAssetMatch[4] === "png"
        ) {
          const scriptId = decodeURIComponent(beatPosterAssetMatch[1]);
          const beatId = decodeURIComponent(beatPosterAssetMatch[2]);
          const lang = beatPosterAssetMatch[3] as "en" | "zh";
          const body = await readJsonBody(request);
          const pngBase64 =
            typeof body.pngBase64 === "string" ? body.pngBase64 : "";
          if (!pngBase64.trim()) {
            return jsonResponse(400, { error: "pngBase64 required" });
          }
          try {
            const poster = await saveUploadedBeatPosterPng(
              scriptId,
              beatId,
              lang,
              pngBase64,
            );
            return jsonResponse(200, { poster });
          } catch (error) {
            return jsonResponse(400, {
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }
        if (
          beatPosterAssetMatch &&
          (request.method === "GET" || request.method === "HEAD")
        ) {
          const scriptId = decodeURIComponent(beatPosterAssetMatch[1]);
          const beatId = decodeURIComponent(beatPosterAssetMatch[2]);
          const lang = beatPosterAssetMatch[3] as "en" | "zh";
          const ext = beatPosterAssetMatch[4] as "png" | "html";
          const asset = readBeatPosterAsset(scriptId, beatId, lang, ext);
          if (!asset) {
            return jsonResponse(404, { error: "Beat poster not found" });
          }
          return fileResponse(asset.filePath, request);
        }

        const beatPosterOneMatch = pathname.match(
          /^\/api\/scripts\/([^/]+)\/beat-posters\/([^/]+)\/(en|zh)$/,
        );
        if (beatPosterOneMatch && request.method === "POST") {
          const scriptId = decodeURIComponent(beatPosterOneMatch[1]);
          const beatId = decodeURIComponent(beatPosterOneMatch[2]);
          const lang = beatPosterOneMatch[3] as "en" | "zh";
          try {
            const poster = beatId === BEAT_POSTER_COVER_ID
              ? await generateBeatPosterCover(scriptId, lang)
              : await generateBeatPoster(scriptId, beatId, lang);
            return jsonResponse(200, { poster });
          } catch (error) {
            return jsonResponse(400, {
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }

        if (request.method === "GET" && pathname === "/api/settings/llm") {
          return jsonResponse(200, loadLlmSettings());
        }
        if (request.method === "PUT" && pathname === "/api/settings/llm") {
          const body = await readJsonBody(request);
          try {
            return jsonResponse(
              200,
              saveLlmSettings({
                baseUrl:
                  typeof body.baseUrl === "string" ? body.baseUrl : undefined,
                model:
                  body.model === null
                    ? null
                    : typeof body.model === "string"
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

        if (request.method === "GET" && pathname === "/api/settings/publish") {
          return jsonResponse(200, toPublicPublishCredentials());
        }
        if (request.method === "PUT" && pathname === "/api/settings/publish") {
          const body = await readJsonBody(request);
          try {
            const mode = (value: unknown): PublishMode | undefined =>
              value === "live" || value === "stub" ? value : undefined;
            const integrations =
              body.postizIntegrationsJson &&
              typeof body.postizIntegrationsJson === "object" &&
              !Array.isArray(body.postizIntegrationsJson)
                ? (body.postizIntegrationsJson as Record<string, string>)
                : undefined;
            const integrationTypes =
              body.postizIntegrationTypesJson &&
              typeof body.postizIntegrationTypesJson === "object" &&
              !Array.isArray(body.postizIntegrationTypesJson)
                ? (body.postizIntegrationTypesJson as Record<string, string>)
                : undefined;
            return jsonResponse(
              200,
              savePublishCredentials({
                postizApiKey:
                  body.postizApiKey === null
                    ? null
                    : typeof body.postizApiKey === "string"
                      ? body.postizApiKey
                      : undefined,
                postizIntegrationsJson: integrations,
                postizIntegrationTypesJson: integrationTypes,
                postizPublishMode: mode(body.postizPublishMode),
                postizApiBase:
                  typeof body.postizApiBase === "string"
                    ? body.postizApiBase
                    : undefined,
                postizDashboardUrl:
                  typeof body.postizDashboardUrl === "string"
                    ? body.postizDashboardUrl
                    : undefined,
                sauPublishMode: mode(body.sauPublishMode),
                sauAccount:
                  typeof body.sauAccount === "string"
                    ? body.sauAccount
                    : undefined,
              }),
            );
          } catch (error) {
            return jsonResponse(400, {
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }

        const takeSourceMatch = pathname.match(
          /^\/api\/scripts\/([^/]+)\/takes\/([^/]+)\/source$/,
        );
        if (isRead(request.method) && takeSourceMatch) {
          const scriptId = decodeURIComponent(takeSourceMatch[1]);
          const takeId = decodeURIComponent(takeSourceMatch[2]);
          const filePath = takeSourceVideoPath(scriptId, takeId);
          if (!fileExists(filePath)) {
            return jsonResponse(404, { error: "Source video not found" });
          }
          return fileResponse(filePath, request);
        }

        const takeSourceRevealMatch = pathname.match(
          /^\/api\/scripts\/([^/]+)\/takes\/([^/]+)\/source\/reveal-in-finder$/,
        );
        if (request.method === "POST" && takeSourceRevealMatch) {
          const scriptId = decodeURIComponent(takeSourceRevealMatch[1]);
          const takeId = decodeURIComponent(takeSourceRevealMatch[2]);
          const filePath = takeSourceVideoPath(scriptId, takeId);
          try {
            await revealPathInFinder(filePath);
            return jsonResponse(200, { ok: true, path: filePath });
          } catch (error) {
            return jsonResponse(400, {
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }

        const takeArtifactRevealMatch = pathname.match(
          /^\/api\/scripts\/([^/]+)\/takes\/([^/]+)\/artifacts\/([^/]+)\/([^/]+)\/(.+)\/reveal-in-finder$/,
        );
        if (request.method === "POST" && takeArtifactRevealMatch) {
          const [, scriptId, takeId, stage, runId, fileName] =
            takeArtifactRevealMatch.map(decodeURIComponent);
          const filePath = resolveStageArtifactPath(
            scriptId,
            takeId,
            stage,
            runId,
            fileName,
          );
          if (!filePath) {
            return jsonResponse(404, { error: "Artifact not found" });
          }
          try {
            await revealPathInFinder(filePath);
            return jsonResponse(200, { ok: true, path: filePath });
          } catch (error) {
            return jsonResponse(400, {
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }

        const takeArtifactMatch = pathname.match(
          /^\/api\/scripts\/([^/]+)\/takes\/([^/]+)\/artifacts\/([^/]+)\/([^/]+)\/(.+)$/,
        );
        if (isRead(request.method) && takeArtifactMatch) {
          const [, scriptId, takeId, stage, runId, fileName] =
            takeArtifactMatch.map(decodeURIComponent);
          const filePath = resolveStageArtifactPath(
            scriptId,
            takeId,
            stage,
            runId,
            fileName,
          );
          if (!filePath) {
            return jsonResponse(404, { error: "Artifact not found" });
          }
          return fileResponse(filePath, request);
        }

        if (request.method === "GET" && pathname === "/api/jobs") {
          const jobs = listJobs().map(enrichJobSummary);
          return jsonResponse(200, { jobs });
        }

        const jobMatch = pathname.match(/^\/api\/jobs\/([^/]+)$/);
        if (request.method === "GET" && jobMatch) {
          const job = loadJob(decodeURIComponent(jobMatch[1]));
          if (!job) {
            return jsonResponse(404, { error: "Job not found" });
          }
          return jsonResponse(200, {
            job,
            publish: loadPublishState(job.jobId),
            progress: buildProgressMap(job),
            results: buildJobResults(job),
          });
        }

        const progressMatch = pathname.match(
          /^\/api\/jobs\/([^/]+)\/progress$/,
        );
        if (request.method === "GET" && progressMatch) {
          const job = loadJob(decodeURIComponent(progressMatch[1]));
          if (!job) {
            return jsonResponse(404, { error: "Job not found" });
          }
          return jsonResponse(200, buildProgressMap(job));
        }

        const snapshotMatch = pathname.match(
          /^\/api\/jobs\/([^/]+)\/pipeline-snapshot$/,
        );
        if (request.method === "GET" && snapshotMatch) {
          const job = loadJob(decodeURIComponent(snapshotMatch[1]));
          if (!job) {
            return jsonResponse(404, { error: "Job not found" });
          }
          return jsonResponse(200, buildPipelineSnapshot(job));
        }

        const voxcpmRetryMatch = pathname.match(/^\/api\/jobs\/([^/]+)\/voxcpm-retry$/);
        if (request.method === "POST" && voxcpmRetryMatch) {
          const jobId = decodeURIComponent(voxcpmRetryMatch[1]);
          const body = await readJsonBody(request);
          const options = {
            referenceTakeId:
              typeof body.referenceTakeId === "string"
                ? body.referenceTakeId
                : undefined,
            referenceAudioPath:
              typeof body.referenceAudioPath === "string"
                ? body.referenceAudioPath
                : undefined,
            renderComposite:
              body.renderComposite === false ? false : undefined,
            resynthesizeVoice: body.resynthesizeVoice === true,
          };
          try {
            const resynthesizeVoice =
              options.resynthesizeVoice === true ||
              options.renderComposite === false;
            if (resynthesizeVoice) {
              const health = await checkVoxcpmHealth();
              if (!health.ok) {
                return jsonResponse(503, {
                  error:
                    `VoxCPM not running at ${health.url} — start npm run outdoor:all on Mac and wait for port 8791`,
                  voxcpm: health,
                });
              }
            }
            void retryVoxcpmTrialJob(jobId, options).catch((error) => {
              console.error(`[api] voxcpm retry failed for ${jobId}:`, error);
            });
            return jsonResponse(202, { accepted: true, jobId });
          } catch (error) {
            return jsonResponse(400, {
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }

        const voxcpmCompositeRetryMatch = pathname.match(
          /^\/api\/jobs\/([^/]+)\/voxcpm-composite-retry$/,
        );
        if (request.method === "POST" && voxcpmCompositeRetryMatch) {
          const jobId = decodeURIComponent(voxcpmCompositeRetryMatch[1]);
          try {
            void retryVoxcpmCompositeJob(jobId).catch((error) => {
              console.error(
                `[api] voxcpm composite retry failed for ${jobId}:`,
                error,
              );
            });
            return jsonResponse(202, { accepted: true, jobId });
          } catch (error) {
            return jsonResponse(400, {
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }

        const cancelMatch = pathname.match(/^\/api\/jobs\/([^/]+)\/cancel$/);
        if (request.method === "POST" && cancelMatch) {
          const jobId = decodeURIComponent(cancelMatch[1]);
          try {
            const job = await cancelJob(jobId);
            return jsonResponse(200, {
              ok: true,
              job,
              snapshot: buildPipelineSnapshot(job),
            });
          } catch (error) {
            return jsonResponse(404, {
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }

        const artifactMatch = pathname.match(
          /^\/api\/jobs\/([^/]+)\/artifacts\/([^/]+)\/([^/]+)\/(.+)$/,
        );
        if (isRead(request.method) && artifactMatch) {
          const [, jobId, stage, runId, fileName] =
            artifactMatch.map(decodeURIComponent);
          const filePath = path.join(
            stageRunDir(jobId, stage, runId),
            fileName,
          );
          if (!fileExists(filePath)) {
            return jsonResponse(404, { error: "Artifact not found" });
          }
          return fileResponse(filePath, request);
        }

        if (request.method === "POST" && pathname === "/api/upload") {
          return await handleUpload(request);
        }

        if (request.method === "POST" && pathname === "/api/inbox/scan") {
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

        if (request.method === "GET" && pathname === "/api/inbox/status") {
          return jsonResponse(200, getInboxStatus());
        }

        const cutReviewMatch = pathname.match(
          /^\/api\/jobs\/([^/]+)\/cut-review$/,
        );
        if (request.method === "GET" && cutReviewMatch) {
          const job = loadJob(decodeURIComponent(cutReviewMatch[1]));
          if (!job) {
            return jsonResponse(404, { error: "Job not found" });
          }
          const runId = job.selectedRuns.cut;
          if (!runId) {
            return jsonResponse(404, { error: "No cut run selected" });
          }
          const review = buildCutReview(job, runId);
          if (!review) {
            return jsonResponse(404, { error: "Cut analysis not found" });
          }
          return jsonResponse(200, review);
        }

        const cutSelectionMatch = pathname.match(
          /^\/api\/jobs\/([^/]+)\/cut-selection$/,
        );
        if (request.method === "PUT" && cutSelectionMatch) {
          const job = loadJob(decodeURIComponent(cutSelectionMatch[1]));
          if (!job) {
            return jsonResponse(404, { error: "Job not found" });
          }
          const runId = job.selectedRuns.cut;
          if (!runId) {
            return jsonResponse(400, { error: "No cut run selected" });
          }
          const body = await readJsonBody(request);
          const selection = saveCutSelection(job, runId, body as CutSelection);
          return jsonResponse(200, {
            selection,
            review: buildCutReview(job, runId),
            note: "Selection saved. Use Apply selection to rebuild the edited video.",
          });
        }

        const cutApplyMatch = pathname.match(
          /^\/api\/jobs\/([^/]+)\/cut-apply-selection$/,
        );
        if (request.method === "POST" && cutApplyMatch) {
          const job = loadJob(decodeURIComponent(cutApplyMatch[1]));
          if (!job) {
            return jsonResponse(404, { error: "Job not found" });
          }
          const runId = job.selectedRuns.cut;
          if (!runId) {
            return jsonResponse(400, { error: "No cut run selected" });
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

        const alignReviewMatch = pathname.match(
          /^\/api\/jobs\/([^/]+)\/align-review$/,
        );
        if (request.method === "GET" && alignReviewMatch) {
          const job = loadJob(decodeURIComponent(alignReviewMatch[1]));
          if (!job) {
            return jsonResponse(404, { error: "Job not found" });
          }
          const runId = job.selectedRuns.align;
          if (!runId) {
            return jsonResponse(404, { error: "No align run selected" });
          }
          const outdoorAnimationPath = path.join(
            takeStageRunDir(job.scriptId, job.takeId, "align", runId),
            "animation-outdoor.json",
          );
          syncOutdoorEditToAnimation(job.scriptId, outdoorAnimationPath);
          const review = buildAlignReview(job, runId);
          if (!review) {
            return jsonResponse(404, { error: "Align artifacts not found" });
          }
          return jsonResponse(200, review);
        }

        const alignLayoutMatch = pathname.match(
          /^\/api\/jobs\/([^/]+)\/align-layout$/,
        );
        if (request.method === "PUT" && alignLayoutMatch) {
          const job = loadJob(decodeURIComponent(alignLayoutMatch[1]));
          if (!job) {
            return jsonResponse(404, { error: "Job not found" });
          }
          const runId = job.selectedRuns.align;
          if (!runId) {
            return jsonResponse(400, { error: "No align run selected" });
          }
          const body = await readJsonBody(request);
          const layout = saveAlignLayout(job, runId, body as AlignLayout);
          return jsonResponse(200, {
            layout,
            review: buildAlignReview(job, runId),
          });
        }

        const alignSyncStudioMatch = pathname.match(
          /^\/api\/jobs\/([^/]+)\/align-sync-studio$/,
        );
        if (request.method === "POST" && alignSyncStudioMatch) {
          const job = loadJob(decodeURIComponent(alignSyncStudioMatch[1]));
          if (!job) {
            return jsonResponse(404, { error: "Job not found" });
          }
          const runId = job.selectedRuns.align;
          if (!runId) {
            return jsonResponse(400, { error: "No align run selected" });
          }
          const outdoorAnimationPath = path.join(
            takeStageRunDir(job.scriptId, job.takeId, "align", runId),
            "animation-outdoor.json",
          );
          const synced = syncStudioLayoutToOutdoor(
            job.scriptId,
            outdoorAnimationPath,
          );
          if (!synced) {
            return jsonResponse(400, {
              error:
                "Could not sync — missing outdoorEdit in cache or animation-outdoor.json",
            });
          }
          return jsonResponse(200, {
            synced: true,
            outdoorEdit: synced,
            review: buildAlignReview(job, runId),
          });
        }

        const runStageMatch = pathname.match(
          /^\/api\/jobs\/([^/]+)\/stages\/([^/]+)\/run$/,
        );
        if (request.method === "POST" && runStageMatch) {
          const jobId = decodeURIComponent(runStageMatch[1]);
          const stage = decodeURIComponent(runStageMatch[2]);
          if (!isPipelineStage(stage)) {
            return jsonResponse(400, { error: `Unknown stage: ${stage}` });
          }
          const body = await readJsonBody(request);
          void runStage(jobId, stage, {
            rerun: Boolean(body.rerun),
            options:
              (body.options as Record<string, unknown> | undefined) ?? {},
          }).catch((error) => {
            console.error(`[api] stage ${stage} failed for ${jobId}:`, error);
          });
          return jsonResponse(202, { accepted: true, jobId, stage });
        }

        const selectMatch = pathname.match(/^\/api\/jobs\/([^/]+)\/selection$/);
        if (request.method === "PUT" && selectMatch) {
          const jobId = decodeURIComponent(selectMatch[1]);
          const body = await readJsonBody(request);
          const selectedRuns = (body.selectedRuns ?? body) as Partial<
            Record<PipelineStage, string>
          >;
          const job = setStageSelection(jobId, selectedRuns);
          return jsonResponse(200, { job });
        }

        const pipelineMatch = pathname.match(
          /^\/api\/jobs\/([^/]+)\/pipeline\/run$/,
        );
        if (request.method === "POST" && pipelineMatch) {
          const jobId = decodeURIComponent(pipelineMatch[1]);
          const body = await readJsonBody(request);
          void runDefaultPipeline(jobId, { rerun: body.rerun !== false }).catch(
            (error) => {
              console.error(`[api] pipeline failed for ${jobId}:`, error);
            },
          );
          return jsonResponse(202, { accepted: true, jobId });
        }

        const socialMatch = pathname.match(/^\/api\/jobs\/([^/]+)\/social$/);
        if (
          socialMatch &&
          (request.method === "GET" || request.method === "PATCH")
        ) {
          const jobId = decodeURIComponent(socialMatch[1]);
          const job = loadJob(jobId);
          if (!job) {
            return jsonResponse(404, { error: "Job not found" });
          }
          let socialPath: string;
          try {
            socialPath = ensureTakeSocialPack(job);
          } catch (error) {
            return jsonResponse(404, {
              error: error instanceof Error ? error.message : String(error),
            });
          }
          if (!fileExists(socialPath)) {
            return jsonResponse(404, { error: "social-posts.json not found" });
          }
          if (request.method === "GET") {
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

        const coversListMatch = pathname.match(
          /^\/api\/jobs\/([^/]+)\/covers$/,
        );
        if (coversListMatch && request.method === "GET") {
          const jobId = decodeURIComponent(coversListMatch[1]);
          try {
            return jsonResponse(200, listCovers(jobId));
          } catch (error) {
            return jsonResponse(404, {
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }
        if (coversListMatch && request.method === "POST") {
          const jobId = decodeURIComponent(coversListMatch[1]);
          try {
            const contentType = request.headers.get("content-type") ?? "";
            if (contentType.includes("application/json")) {
              const body = await readJsonBody(request);
              if (
                body.action === "duplicate" &&
                typeof body.coverId === "string"
              ) {
                return jsonResponse(200, duplicateCover(jobId, body.coverId));
              }
              if (body.action === "capture-composite") {
                const format =
                  body.format === "landscape" ? "landscape" : "portrait";
                const atSeconds =
                  typeof body.atSeconds === "number"
                    ? body.atSeconds
                    : undefined;
                const label =
                  typeof body.label === "string" ? body.label : undefined;
                return jsonResponse(
                  200,
                  await captureCoverFromComposite(jobId, {
                    format,
                    atSeconds,
                    label,
                  }),
                );
              }
              return jsonResponse(400, {
                error: "Unsupported covers POST JSON action",
              });
            }
            const boundaryMatch = /boundary=(.+)$/.exec(contentType);
            if (!boundaryMatch) {
              return jsonResponse(400, {
                error: "Expected multipart/form-data cover upload",
              });
            }
            const body = new Uint8Array(await request.arrayBuffer());
            const parts = parseMultipart(body, boundaryMatch[1]);
            const filePart =
              parts.get("cover") ?? parts.get("file") ?? parts.get("image");
            if (!filePart) {
              return jsonResponse(400, {
                error: "Upload requires cover/file/image field",
              });
            }
            const labelPart = parts.get("label");
            const sourcePart = parts.get("source");
            const label = labelPart
              ? new TextDecoder().decode(labelPart.data).trim()
              : undefined;
            const sourceRaw = sourcePart
              ? new TextDecoder().decode(sourcePart.data).trim()
              : "browser";
            const source =
              sourceRaw === "iphone" ||
              sourceRaw === "import" ||
              sourceRaw === "duplicate" ||
              sourceRaw === "composite"
                ? sourceRaw
                : "browser";
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

        const coversMapMatch = pathname.match(
          /^\/api\/jobs\/([^/]+)\/covers\/platform-map$/,
        );
        if (coversMapMatch && request.method === "PATCH") {
          const jobId = decodeURIComponent(coversMapMatch[1]);
          try {
            const body = await readJsonBody(request);
            return jsonResponse(
              200,
              patchPlatformCoverMap(
                jobId,
                body as Parameters<typeof patchPlatformCoverMap>[1],
              ),
            );
          } catch (error) {
            return jsonResponse(400, {
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }

        const coverFileMatch = pathname.match(
          /^\/api\/jobs\/([^/]+)\/covers\/([^/]+)\/file$/,
        );
        if (
          coverFileMatch &&
          (request.method === "GET" || request.method === "HEAD")
        ) {
          const jobId = decodeURIComponent(coverFileMatch[1]);
          const coverId = decodeURIComponent(coverFileMatch[2]);
          const job = loadJob(jobId);
          if (!job) {
            return jsonResponse(404, { error: "Job not found" });
          }
          const filePath = resolveCoverFilePath(
            job.scriptId,
            job.takeId,
            coverId,
          );
          if (!filePath) {
            return jsonResponse(404, { error: "Cover file not found" });
          }
          return fileResponse(filePath, request);
        }

        const coverItemMatch = pathname.match(
          /^\/api\/jobs\/([^/]+)\/covers\/([^/]+)$/,
        );
        if (coverItemMatch && request.method === "PATCH") {
          const jobId = decodeURIComponent(coverItemMatch[1]);
          const coverId = decodeURIComponent(coverItemMatch[2]);
          try {
            const body = await readJsonBody(request);
            if (typeof body.label !== "string") {
              return jsonResponse(400, { error: "label is required" });
            }
            return jsonResponse(200, renameCover(jobId, coverId, body.label));
          } catch (error) {
            return jsonResponse(400, {
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }
        if (coverItemMatch && request.method === "DELETE") {
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

        const publishPreviewMatch = pathname.match(
          /^\/api\/jobs\/([^/]+)\/publish-preview$/,
        );
        if (request.method === "GET" && publishPreviewMatch) {
          const jobId = decodeURIComponent(publishPreviewMatch[1]);
          await ensurePostizIntegrationsSynced();
          return jsonResponse(200, buildPublishPlan(jobId));
        }

        const socialCardsMatch = pathname.match(
          /^\/api\/jobs\/([^/]+)\/social-cards$/,
        );
        if (request.method === "GET" && socialCardsMatch) {
          const jobId = decodeURIComponent(socialCardsMatch[1]);
          try {
            return jsonResponse(200, listSocialCards(jobId));
          } catch (error) {
            return jsonResponse(400, {
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }
        if (request.method === "POST" && socialCardsMatch) {
          const jobId = decodeURIComponent(socialCardsMatch[1]);
          try {
            const manifest = await generateSocialCardsForJob(jobId);
            return jsonResponse(200, {
              ...listSocialCards(jobId),
              manifest,
            });
          } catch (error) {
            return jsonResponse(400, {
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }

        const socialCardAssetMatch = pathname.match(
          /^\/api\/jobs\/([^/]+)\/social-cards\/([^/]+)\/(png|html)$/,
        );
        if (
          socialCardAssetMatch &&
          (request.method === "GET" || request.method === "HEAD")
        ) {
          const jobId = decodeURIComponent(socialCardAssetMatch[1]);
          const cardId = decodeURIComponent(socialCardAssetMatch[2]);
          const ext = socialCardAssetMatch[3] as "png" | "html";
          const job = loadJob(jobId);
          if (!job) {
            return jsonResponse(404, { error: "Job not found" });
          }
          const asset = readSocialCardAsset(job.scriptId, job.takeId, cardId, ext);
          if (!asset) {
            return jsonResponse(404, { error: "Social card not found" });
          }
          return fileResponse(asset.filePath, request);
        }

        const publishImagesAllMatch = pathname.match(
          /^\/api\/jobs\/([^/]+)\/publish-images-all$/,
        );
        if (request.method === "POST" && publishImagesAllMatch) {
          const jobId = decodeURIComponent(publishImagesAllMatch[1]);
          try {
            const summary = await publishImagesAll(jobId);
            return jsonResponse(200, summary);
          } catch (error) {
            return jsonResponse(400, {
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }

        const publishImageMatch = pathname.match(
          /^\/api\/jobs\/([^/]+)\/publish-image\/([^/]+)$/,
        );
        if (request.method === "POST" && publishImageMatch) {
          const jobId = decodeURIComponent(publishImageMatch[1]);
          const platform = decodeURIComponent(publishImageMatch[2]);
          try {
            const record = await publishImageJob(jobId, platform);
            return jsonResponse(200, { record });
          } catch (error) {
            return jsonResponse(400, {
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }

        const publishStatusMatch = pathname.match(
          /^\/api\/jobs\/([^/]+)\/publish-status\/refresh$/,
        );
        if (request.method === "POST" && publishStatusMatch) {
          const jobId = decodeURIComponent(publishStatusMatch[1]);
          try {
            return jsonResponse(
              200,
              await refreshPostizPublishState(jobId),
            );
          } catch (error) {
            return jsonResponse(400, {
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }

        const publishAllMatch = pathname.match(
          /^\/api\/jobs\/([^/]+)\/publish-all$/,
        );
        if (request.method === "POST" && publishAllMatch) {
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

        const publishMatch = pathname.match(
          /^\/api\/jobs\/([^/]+)\/publish\/([^/]+)$/,
        );
        if (request.method === "POST" && publishMatch) {
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

        const hideMatch = pathname.match(
          /^\/api\/jobs\/([^/]+)\/publish\/([^/]+)\/hide$/,
        );
        if (request.method === "POST" && hideMatch) {
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

        const deleteMatch = pathname.match(
          /^\/api\/jobs\/([^/]+)\/publish\/([^/]+)$/,
        );
        if (request.method === "DELETE" && deleteMatch) {
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

        if (request.method === "GET" && pathname === "/api/platforms") {
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

        if (
          request.method === "GET" &&
          pathname === "/api/platforms/postiz/overview"
        ) {
          return jsonResponse(200, await buildPostizOverview());
        }

        const postizConnectMatch = pathname.match(
          /^\/api\/platforms\/postiz\/connect\/([^/]+)$/,
        );
        if (request.method === "GET" && postizConnectMatch) {
          const platform = decodeURIComponent(postizConnectMatch[1]);
          const refreshId = url.searchParams.get("refresh");
          try {
            return jsonResponse(
              200,
              await getPostizConnectUrl(platform, refreshId),
            );
          } catch (error) {
            return jsonResponse(400, {
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }

        const postizSelectMatch = pathname.match(
          /^\/api\/platforms\/postiz\/select\/([^/]+)$/,
        );
        if (request.method === "POST" && postizSelectMatch) {
          const platform = decodeURIComponent(postizSelectMatch[1]);
          const body = await readJsonBody(request);
          const integrationId =
            typeof body.integrationId === "string"
              ? body.integrationId.trim()
              : "";
          if (!integrationId) {
            return jsonResponse(400, { error: "integrationId is required" });
          }
          try {
            return jsonResponse(
              200,
              await selectPostizIntegration(platform, integrationId),
            );
          } catch (error) {
            return jsonResponse(400, {
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }

        if (
          request.method === "POST" &&
          pathname === "/api/platforms/prepare-publish"
        ) {
          try {
            return jsonResponse(200, await prepareForPublish());
          } catch (error) {
            return jsonResponse(400, {
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }

        if (
          request.method === "POST" &&
          (pathname === "/api/platforms/postiz/sync-integrations" ||
            pathname === "/api/platforms/zernio/sync-accounts")
        ) {
          try {
            return jsonResponse(200, await syncPostizIntegrationsSuggestion());
          } catch (error) {
            return jsonResponse(400, {
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }

        const platformTestMatch = pathname.match(
          /^\/api\/platforms\/([^/]+)\/test$/,
        );
        if (request.method === "POST" && platformTestMatch) {
          const target = decodeURIComponent(platformTestMatch[1]);
          try {
            if (
              target === "postiz" ||
              target === "zernio" ||
              target === "sau"
            ) {
              return jsonResponse(200, await testProviderConnection(target));
            }
            return jsonResponse(200, await testPlatformConnection(target));
          } catch (error) {
            return jsonResponse(400, {
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }

        if (pathname.startsWith("/api/")) {
          const hint = pathname.includes("beat-posters/publish")
            ? "Restart outdoor_agent — beat-poster publish routes are missing from the running server (npm run outdoor:all on Mac)."
            : "This API route is not registered on the running outdoor_agent. Restart after pulling latest code.";
          return jsonResponse(404, {
            error: `API route not found: ${pathname}`,
            path: pathname,
            hint,
            details: `HTTP 404 on ${request.method} ${pathname}`,
          });
        }

        return jsonResponse(404, { error: "Not found" });
      } catch (error) {
        console.error("[api] error:", error);
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

function buildProgressMap(
  job: OutdoorJob,
): Partial<Record<PipelineStage, StageProgress | null>> {
  const progress: Partial<Record<PipelineStage, StageProgress | null>> = {};
  for (const stage of PIPELINE_STAGES) {
    const runs = job.runs[stage] ?? [];
    const runId =
      runs.find((entry) => entry.status === "running")?.runId ??
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
  const contentType = request.headers.get("content-type") ?? "";
  const boundaryMatch = /boundary=(.+)$/.exec(contentType);
  if (!boundaryMatch) {
    return jsonResponse(400, { error: "Expected multipart/form-data upload" });
  }

  const body = new Uint8Array(await request.arrayBuffer());
  const parts = parseMultipart(body, boundaryMatch[1]);
  const takePart = parts.get("take");
  const videoPart = parts.get("video");
  if (!takePart || !videoPart) {
    return jsonResponse(400, {
      error: 'Upload requires "take" JSON and "video" fields',
    });
  }

  const take = JSON.parse(new TextDecoder().decode(takePart.data)) as {
    takeId?: string;
    scriptId?: string;
    scriptTitle?: string;
  };
  if (!take.takeId) {
    return jsonResponse(400, { error: "take.takeId is required" });
  }

  const takeId = take.takeId;
  const videoName = videoPart.fileName?.toLowerCase() ?? "";
  const videoExt = videoName.endsWith(".webm")
    ? ".webm"
    : videoName.endsWith(".mov")
      ? ".mov"
      : videoPart.contentType?.includes("webm")
        ? ".webm"
        : ".mp4";
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
      appendTakeAgentLog(
        createdJob.scriptId,
        createdJob.takeId,
        `pipeline failed: ${message}`,
      );
      console.error(`[upload] pipeline failed for ${createdJob.jobId}:`, error);
    });
  } else {
    job = loadJob(`job-${takeId}`);
  }

  return jsonResponse(201, {
    ok: true,
    takeId,
    jobId: job?.jobId ?? `job-${takeId}`,
    message: jobExistsForTake(takeId) ? "Take already ingested" : "Job created",
  });
}
