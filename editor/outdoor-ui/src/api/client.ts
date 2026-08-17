import { absoluteAgentUrl, artifactRevealPath, sourceRevealPath } from "./urls";

import type {
  AlignLayout,
  AlignReviewPayload,
  AlignSyncStudioResponse,
  AnimationMdAiResult,
  AnimationMdDocument,
  CaptureCoverOptions,
  CoverPlatformMapPatch,
  CoversListResponse,
  CutReviewPayload,
  CutSelection,
  CancelJobResponse,
  HealthResponse,
  InboxScanResult,
  InboxStatusSnapshot,
  LlmSettings,
  PublishCredentialsPublic,
  ZernioSyncResult,
  OutdoorJob,
  OutdoorJobDetail,
  OutdoorJobSummary,
  OutdoorScript,
  PipelineStage,
  PipelineSnapshot,
  PlatformTestResult,
  PlatformsHealthResponse,
  PostizOverview,
  PublishAllResult,
  PublishFormat,
  PublishPlan,
  PublishRecord,
  PublishResult,
  PublishState,
  LiveBeat,
  LiveScript,
  ScriptsResyncResult,
  ScriptCoverSlot,
  ScriptCoversResponse,
  BeatPostersResponse,
  BeatPosterLang,
  BeatPosterPublishAlbumResult,
  BeatPosterPublishAllResult,
  BeatPosterRevertPublishResult,
  BeatPosterPublishPreviewResponse,
  BeatPosterPublishState,
  SocialCardsResponse,
  RunStageOptions,
  RunStageResponse,
  SelectionUpdateResponse,
  VoxcpmTrialResponse,
  VoxcpmHealthResponse,
  VoxcpmLogsResponse,
  VoxcpmEditorDocument,
  VoxcpmEditorRenderResponse,
  VoxcpmEditorSentence,
  SocialPatch,
  SocialPosts,
  StageProgress,
  TakeManifest,
  UploadTakeResult,
  VideoOpsCatalog,
  VideoOpsCatalogSeries,
} from "../types";
import type { BeatStudioDocument } from "../types/beatStudio";
import type { DraftBeat } from "../components/ScriptBeatEditorPanel/ScriptBeatEditorPanel.types";

export class OutdoorApiError extends Error {
  readonly status: number;
  readonly path: string;
  readonly body: string;
  readonly hint?: string;
  readonly details?: string;
  readonly platform?: string;
  readonly step?: string;

  constructor(
    status: number,
    path: string,
    body: string,
    meta: {
      hint?: string;
      details?: string;
      platform?: string;
      step?: string;
    } = {},
  ) {
    super(body || `${status} ${path}`);
    this.name = "OutdoorApiError";
    this.status = status;
    this.path = path;
    this.body = body;
    this.hint = meta.hint;
    this.details = meta.details;
    this.platform = meta.platform;
    this.step = meta.step;
  }
}

export type OutdoorApiOptions = {
  baseUrl: string;
  headers?: HeadersInit;
};

type JsonRequestInit = Omit<RequestInit, "body"> & {
  body?: BodyInit | Record<string, unknown> | null;
};

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, "");
}

function resolvePath(baseUrl: string, path: string): string {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  const root = normalizeBaseUrl(baseUrl);
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${root}${suffix}`;
}

function looksLikeHtml(text: string): boolean {
  const trimmed = text.trim();
  return (
    trimmed.startsWith("<!DOCTYPE") ||
    trimmed.startsWith("<html") ||
    trimmed.includes("<html")
  );
}

function friendlyApiBody(path: string, text: string, baseUrl: string): string {
  if (!looksLikeHtml(text)) {
    return text.slice(0, 300);
  }
  const lower = `${text}\n${baseUrl}`.toLowerCase();
  if (lower.includes("ngrok")) {
    return (
      "Ngrok returned a web page instead of the outdoor agent API. " +
      "On Mac run: npm run outdoor:all — then iPhone → Refresh from iCloud."
    );
  }
  if (lower.includes("loca.lt")) {
    return "Tunnel returned HTML instead of JSON — restart npm run outdoor:all on Mac.";
  }
  return `Received HTML instead of JSON from ${path}. Check the Mac agent URL (:8788).`;
}

function applyTunnelHeaders(baseUrl: string, headers: Headers): void {
  const lower = baseUrl.toLowerCase();
  if (lower.includes("ngrok")) {
    headers.set("ngrok-skip-browser-warning", "1");
    headers.set("Ngrok-Skip-Browser-Warning", "1");
    if (!headers.has("User-Agent")) {
      headers.set("User-Agent", "TurnOutdoor/1.0");
    }
  }
  if (lower.includes("loca.lt")) {
    headers.set("bypass-tunnel-reminder", "true");
  }
  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }
}

export function formatOutdoorApiError(error: unknown): string {
  if (error instanceof OutdoorApiError) {
    return error.message;
  }
  if (error instanceof Error) {
    if (looksLikeHtml(error.message)) {
      return (
        "Agent returned HTML instead of JSON. " +
        "On Mac run: npm run outdoor:all — then iPhone → Refresh from iCloud."
      );
    }
    return error.message;
  }
  return String(error);
}

function serializeBody(body: JsonRequestInit["body"]): BodyInit | undefined {
  if (body === null || body === undefined) {
    return undefined;
  }
  if (
    typeof body === "string" ||
    body instanceof FormData ||
    body instanceof Blob ||
    body instanceof URLSearchParams ||
    body instanceof ArrayBuffer
  ) {
    return body;
  }
  return JSON.stringify(body);
}

export class OutdoorApi {
  private _baseUrl: string;
  private readonly defaultHeaders: HeadersInit;

  constructor(options: OutdoorApiOptions) {
    this._baseUrl = normalizeBaseUrl(options.baseUrl);
    this.defaultHeaders = options.headers ?? {};
  }

  get baseUrl(): string {
    return this._baseUrl;
  }

  /** Switch to a faster agent transport (localhost / LAN / Tailscale). */
  setBaseUrl(baseUrl: string): void {
    this._baseUrl = normalizeBaseUrl(baseUrl);
  }

  resolveUrl(path: string): string {
    return resolvePath(this.baseUrl, path);
  }

  requestHeaders(): Record<string, string> {
    const headers = new Headers(this.defaultHeaders);
    const out: Record<string, string> = {};
    headers.forEach((value, key) => {
      out[key] = value;
    });
    return out;
  }

  async fetch(path: string, init: JsonRequestInit = {}): Promise<Response> {
    const headers = new Headers(this.defaultHeaders);
    if (init.headers) {
      const extra = new Headers(init.headers);
      extra.forEach((value, key) => {
        headers.set(key, value);
      });
    }

    const body = serializeBody(init.body);
    const isJsonObject =
      init.body !== null &&
      init.body !== undefined &&
      typeof init.body === "object" &&
      !(init.body instanceof FormData) &&
      !(init.body instanceof Blob) &&
      !(init.body instanceof URLSearchParams) &&
      !(init.body instanceof ArrayBuffer) &&
      !(typeof init.body === "string");

    if (isJsonObject && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    applyTunnelHeaders(this.baseUrl, headers);

    return fetch(this.resolveUrl(path), {
      ...init,
      headers,
      body,
    });
  }

  async fetchJson<T>(path: string, init: JsonRequestInit = {}): Promise<T> {
    const response = await this.fetch(path, init);
    const contentType = response.headers.get("content-type") ?? "";
    const isJson = contentType.includes("application/json");
    const text = await response.text();

    if (!response.ok) {
      if (isJson && text) {
        try {
          const payload = JSON.parse(text) as {
            error?: string;
            hint?: string;
            details?: string;
            platform?: string;
            step?: string;
          };
          if (payload.error) {
            throw new OutdoorApiError(response.status, path, payload.error, {
              hint: payload.hint,
              details: payload.details,
              platform: payload.platform,
              step: payload.step,
            });
          }
        } catch (error) {
          if (error instanceof OutdoorApiError) {
            throw error;
          }
        }
      }
      const friendly = friendlyApiBody(path, text, this.baseUrl);
      throw new OutdoorApiError(response.status, path, friendly, {
        hint:
          response.status === 500 && path.startsWith("/api/")
            ? "Outdoor agent API (:8789) is not running or crashed on startup. Check the outdoor:all terminal for Deno errors, then restart npm run outdoor:all."
            : undefined,
        details: text ? text.slice(0, 800) : undefined,
      });
    }

    if (!text) {
      return undefined as T;
    }

    if (looksLikeHtml(text)) {
      throw new OutdoorApiError(
        response.status,
        path,
        friendlyApiBody(path, text, this.baseUrl),
      );
    }

    if (!isJson) {
      throw new OutdoorApiError(
        response.status,
        path,
        "Non-JSON response from agent URL — point Mac connection at outdoor agent :8788, not Expo Metro :8081.",
      );
    }

    try {
      return JSON.parse(text) as T;
    } catch {
      throw new OutdoorApiError(
        response.status,
        path,
        `Invalid JSON from ${path}`,
      );
    }
  }

  absoluteUrl(relativeOrAbsolute: string): string {
    return absoluteAgentUrl(this.baseUrl, relativeOrAbsolute);
  }

  // —— Health ——

  async getHealth(): Promise<HealthResponse> {
    return this.fetchJson<HealthResponse>("/api/health");
  }

  // —— Catalog ——

  async getCatalog(): Promise<VideoOpsCatalog> {
    const catalog = await this.fetchJson<VideoOpsCatalog>(
      `/api/catalog?t=${Date.now()}`,
    );
    if (!catalog || !Array.isArray(catalog.series)) {
      throw new OutdoorApiError(
        200,
        "/api/catalog",
        "Invalid catalog response (missing series). Check Mac connection — agent URL must be :8788, not Expo Metro :8081.",
      );
    }
    return catalog;
  }

  async resyncScripts(force = true): Promise<ScriptsResyncResult> {
    return this.fetchJson<ScriptsResyncResult>("/api/scripts/resync", {
      method: "POST",
      body: { force },
    });
  }

  async getSeries(): Promise<VideoOpsCatalogSeries[]> {
    const payload = await this.fetchJson<{ series: VideoOpsCatalogSeries[] }>(
      "/api/series",
    );
    return payload.series;
  }

  async getOutdoorScript(scriptId: string): Promise<OutdoorScript> {
    return this.fetchJson<OutdoorScript>(
      `/api/scripts/${encodeURIComponent(scriptId)}/outdoor-script?t=${Date.now()}`,
    );
  }

  async getLiveScript(scriptId: string): Promise<LiveScript> {
    return this.fetchJson<LiveScript>(
      `/api/scripts/${encodeURIComponent(scriptId)}/live-script?t=${Date.now()}`,
    );
  }

  async putLiveBeat(
    scriptId: string,
    beatIndex: number,
    patch: Partial<
      Pick<LiveBeat, "title" | "say" | "chinese" | "leanCode" | "turnCode" | "visualNotes">
    > & {
      selectedVariant?: string;
      addVariant?: {
        label: string;
        template: string;
        templateConfig: unknown;
        content: {
          title: string;
          say: string;
          leanCode: string;
          turnCode: string;
          visualNotes: string;
        };
      };
    },
  ): Promise<LiveScript> {
    return this.fetchJson<LiveScript>(
      `/api/scripts/${encodeURIComponent(scriptId)}/beats/${beatIndex}`,
      { method: "PUT", body: patch },
    );
  }

  async getBeatStudio(scriptId: string): Promise<BeatStudioDocument> {
    return this.fetchJson<BeatStudioDocument>(
      `/api/scripts/${encodeURIComponent(scriptId)}/beat-studio?t=${Date.now()}`,
    );
  }

  async putBeatStudio(doc: BeatStudioDocument): Promise<BeatStudioDocument> {
    return this.fetchJson<BeatStudioDocument>(
      `/api/scripts/${encodeURIComponent(doc.scriptId)}/beat-studio`,
      { method: "PUT", body: doc },
    );
  }

  async uploadStickerAsset(
    scriptId: string,
    stickerId: string,
    file: Blob | File,
  ): Promise<{ assetPath: string }> {
    const form = new FormData();
    form.append("stickerId", stickerId);
    form.append("file", file, file instanceof File ? file.name : "sticker.png");
    return this.fetchJson<{ assetPath: string }>(
      `/api/scripts/${encodeURIComponent(scriptId)}/sticker-assets`,
      { method: "POST", body: form },
    );
  }

  async deleteStickerAsset(
    scriptId: string,
    assetPath: string,
  ): Promise<{ ok: boolean }> {
    return this.fetchJson<{ ok: boolean }>(
      `/api/scripts/${encodeURIComponent(scriptId)}/sticker-assets`,
      { method: "DELETE", body: { assetPath } },
    );
  }

  async generateBeatAiCandidate(
    scriptId: string,
    beatIndex: number,
    options: {
      instruction: string;
      beat: DraftBeat;
      template: string;
    },
  ): Promise<{ content: DraftBeat; template: string }> {
    return this.fetchJson<{ content: DraftBeat; template: string }>(
      `/api/scripts/${encodeURIComponent(scriptId)}/beats/${beatIndex}/ai-candidate`,
      { method: "POST", body: options },
    );
  }

  async getAnimationMd(scriptId: string): Promise<AnimationMdDocument> {
    return this.fetchJson<AnimationMdDocument>(
      `/api/scripts/${encodeURIComponent(scriptId)}/animation-md`,
    );
  }

  async getBeatPosterMd(scriptId: string): Promise<AnimationMdDocument> {
    return this.fetchJson<AnimationMdDocument>(
      `/api/scripts/${encodeURIComponent(scriptId)}/beat-posters-md`,
    );
  }

  async putAnimationMd(
    scriptId: string,
    markdown: string,
    compile = true,
  ): Promise<AnimationMdDocument> {
    return this.fetchJson<AnimationMdDocument>(
      `/api/scripts/${encodeURIComponent(scriptId)}/animation-md`,
      { method: "PUT", body: { markdown, compile } },
    );
  }

  async aiEditAnimationMd(
    scriptId: string,
    options: {
      instruction: string;
      selection?: string;
      apply?: boolean;
      markdown?: string;
    },
  ): Promise<AnimationMdAiResult> {
    return this.fetchJson<AnimationMdAiResult>(
      `/api/scripts/${encodeURIComponent(scriptId)}/animation-md/ai`,
      { method: "POST", body: options },
    );
  }

  async compileAnimationMd(
    scriptId: string,
  ): Promise<{ ok: boolean; scriptId: string }> {
    return this.fetchJson(
      `/api/scripts/${encodeURIComponent(scriptId)}/animation-md/compile`,
      {
        method: "POST",
        body: {},
      },
    );
  }

  async getLlmSettings(): Promise<LlmSettings> {
    return this.fetchJson<LlmSettings>("/api/settings/llm");
  }

  async putLlmSettings(partial: {
    baseUrl?: string;
    model?: string | null;
  }): Promise<LlmSettings> {
    return this.fetchJson<LlmSettings>("/api/settings/llm", {
      method: "PUT",
      body: partial,
    });
  }

  async getPublishCredentials(): Promise<PublishCredentialsPublic> {
    return this.fetchJson<PublishCredentialsPublic>("/api/settings/publish");
  }

  async putPublishCredentials(partial: {
    postizApiKey?: string | null;
    postizIntegrationsJson?: Record<string, string>;
    postizIntegrationTypesJson?: Record<string, string>;
    postizPublishMode?: "stub" | "live";
    postizApiBase?: string;
    postizDashboardUrl?: string;
    sauPublishMode?: "stub" | "live";
    sauAccount?: string;
  }): Promise<PublishCredentialsPublic> {
    return this.fetchJson<PublishCredentialsPublic>("/api/settings/publish", {
      method: "PUT",
      body: partial,
    });
  }

  // —— Inbox ——

  async getInboxStatus(): Promise<InboxStatusSnapshot> {
    const status =
      await this.fetchJson<InboxStatusSnapshot>("/api/inbox/status");
    return {
      ...status,
      watchedFolders: status.watchedFolders ?? [],
      files: status.files ?? [],
      recentIngests: status.recentIngests ?? [],
    };
  }

  async scanInbox(): Promise<InboxScanResult> {
    return this.fetchJson<InboxScanResult>("/api/inbox/scan", {
      method: "POST",
      body: {},
    });
  }

  // —— Jobs ——

  async listJobs(): Promise<OutdoorJobSummary[]> {
    const payload = await this.fetchJson<{ jobs: OutdoorJobSummary[] }>(
      "/api/jobs",
    );
    return payload.jobs;
  }

  async getJob(jobId: string): Promise<OutdoorJobDetail> {
    return this.fetchJson<OutdoorJobDetail>(
      `/api/jobs/${encodeURIComponent(jobId)}`,
    );
  }

  async getJobProgress(
    jobId: string,
  ): Promise<Partial<Record<PipelineStage, StageProgress | null>>> {
    return this.fetchJson<Partial<Record<PipelineStage, StageProgress | null>>>(
      `/api/jobs/${encodeURIComponent(jobId)}/progress`,
    );
  }

  async getPipelineSnapshot(jobId: string): Promise<PipelineSnapshot> {
    return this.fetchJson<PipelineSnapshot>(
      `/api/jobs/${encodeURIComponent(jobId)}/pipeline-snapshot`,
    );
  }

  async cancelJob(jobId: string): Promise<CancelJobResponse> {
    return this.fetchJson<CancelJobResponse>(
      `/api/jobs/${encodeURIComponent(jobId)}/cancel`,
      { method: "POST", body: {} },
    );
  }

  async runPipeline(
    jobId: string,
    options: { rerun?: boolean } = {},
  ): Promise<RunStageResponse> {
    return this.fetchJson<RunStageResponse>(
      `/api/jobs/${encodeURIComponent(jobId)}/pipeline/run`,
      { method: "POST", body: { rerun: options.rerun !== false } },
    );
  }

  async runStage(
    jobId: string,
    stage: PipelineStage,
    options: RunStageOptions = {},
  ): Promise<RunStageResponse> {
    return this.fetchJson<RunStageResponse>(
      `/api/jobs/${encodeURIComponent(jobId)}/stages/${encodeURIComponent(stage)}/run`,
      {
        method: "POST",
        body: {
          rerun: Boolean(options.rerun),
          options: options.options ?? {},
        },
      },
    );
  }

  async updateSelection(
    jobId: string,
    selectedRuns: Partial<Record<PipelineStage, string>>,
  ): Promise<SelectionUpdateResponse> {
    return this.fetchJson<SelectionUpdateResponse>(
      `/api/jobs/${encodeURIComponent(jobId)}/selection`,
      {
        method: "PUT",
        body: { selectedRuns },
      },
    );
  }

  async uploadTake(
    take: TakeManifest,
    video: Blob | File,
  ): Promise<UploadTakeResult> {
    const form = new FormData();
    form.append(
      "take",
      new Blob([JSON.stringify(take)], { type: "application/json" }),
      `${take.takeId}.json`,
    );
    const ext =
      take.videoUri.endsWith(".webm") || video.type.includes("webm")
        ? "webm"
        : "mp4";
    form.append("video", video, `${take.takeId}.${ext}`);
    const payload = await this.fetchJson<UploadTakeResult>("/api/upload", {
      method: "POST",
      body: form,
    });
    if (!payload.jobId) {
      throw new OutdoorApiError(
        201,
        "/api/upload",
        "Upload succeeded but no jobId returned",
      );
    }
    return payload;
  }

  // —— Cut review ——

  async getCutReview(jobId: string): Promise<CutReviewPayload> {
    return this.fetchJson<CutReviewPayload>(
      `/api/jobs/${encodeURIComponent(jobId)}/cut-review`,
    );
  }

  async saveCutSelection(
    jobId: string,
    selection: CutSelection,
  ): Promise<CutReviewPayload> {
    const payload = await this.fetchJson<{ review?: CutReviewPayload }>(
      `/api/jobs/${encodeURIComponent(jobId)}/cut-selection`,
      {
        method: "PUT",
        body: selection,
      },
    );
    if (payload.review) {
      return payload.review;
    }
    return this.getCutReview(jobId);
  }

  async applyCutSelection(jobId: string): Promise<CutReviewPayload> {
    const payload = await this.fetchJson<{ review?: CutReviewPayload }>(
      `/api/jobs/${encodeURIComponent(jobId)}/cut-apply-selection`,
      {
        method: "POST",
        body: {},
      },
    );
    if (payload.review) {
      return payload.review;
    }
    return this.getCutReview(jobId);
  }

  // —— Align review ——

  async getAlignReview(jobId: string): Promise<AlignReviewPayload> {
    return this.fetchJson<AlignReviewPayload>(
      `/api/jobs/${encodeURIComponent(jobId)}/align-review`,
    );
  }

  async saveAlignLayout(
    jobId: string,
    layout: AlignLayout,
  ): Promise<AlignReviewPayload> {
    const payload = await this.fetchJson<{ review?: AlignReviewPayload }>(
      `/api/jobs/${encodeURIComponent(jobId)}/align-layout`,
      {
        method: "PUT",
        body: layout,
      },
    );
    if (payload.review) {
      return payload.review;
    }
    return this.getAlignReview(jobId);
  }

  async syncAlignStudio(jobId: string): Promise<AlignSyncStudioResponse> {
    return this.fetchJson<AlignSyncStudioResponse>(
      `/api/jobs/${encodeURIComponent(jobId)}/align-sync-studio`,
      {
        method: "POST",
        body: {},
      },
    );
  }

  async getVoxcpmHealth(): Promise<VoxcpmHealthResponse> {
    return this.fetchJson<VoxcpmHealthResponse>('/api/voxcpm/health');
  }

  async getVoxcpmLogs(limit = 200): Promise<VoxcpmLogsResponse> {
    const query = Number.isFinite(limit) ? `?limit=${Math.round(limit)}` : '';
    return this.fetchJson<VoxcpmLogsResponse>(`/api/voxcpm/logs${query}`);
  }

  async getVoxcpmEditor(
    scriptId: string,
    referenceTakeId?: string,
    voiceEngine?: import('../utils/voiceEngine').VoiceEngineId,
    scriptLanguage?: import('../utils/scriptLanguage').ScriptLanguageId,
  ): Promise<VoxcpmEditorDocument> {
    const params = new URLSearchParams({ t: String(Date.now()) });
    if (referenceTakeId) {
      params.set('referenceTakeId', referenceTakeId);
    }
    if (voiceEngine) {
      params.set('voiceEngine', voiceEngine);
    }
    if (scriptLanguage) {
      params.set('scriptLanguage', scriptLanguage);
    }
    return this.fetchJson<VoxcpmEditorDocument>(
      `/api/scripts/${encodeURIComponent(scriptId)}/voxcpm-editor?${params.toString()}`,
    );
  }

  async setPreviewVoiceEngine(
    scriptId: string,
    voiceEngine: import('../utils/voiceEngine').VoiceEngineId,
  ): Promise<{ previewVoiceEngine: import('../utils/voiceEngine').VoiceEngineId; previewRevision: string }> {
    return this.fetchJson<{ previewVoiceEngine: import('../utils/voiceEngine').VoiceEngineId; previewRevision: string }>(
      `/api/scripts/${encodeURIComponent(scriptId)}/voxcpm-editor/preview-voice-engine`,
      {
        method: 'PUT',
        body: { voiceEngine },
      },
    );
  }

  async putVoxcpmEditorBeat(
    scriptId: string,
    beatIndex: number,
    sentences: Array<
      Pick<VoxcpmEditorSentence, 'id' | 'text' | 'tone' | 'pauseAfterMs'>
    >,
    referenceTakeId?: string,
    voiceEngine?: import('../utils/voiceEngine').VoiceEngineId,
    scriptLanguage?: import('../utils/scriptLanguage').ScriptLanguageId,
  ): Promise<VoxcpmEditorDocument> {
    return this.fetchJson<VoxcpmEditorDocument>(
      `/api/scripts/${encodeURIComponent(scriptId)}/voxcpm-editor/beats/${beatIndex}`,
      {
        method: 'PUT',
        body: { sentences, referenceTakeId, voiceEngine, scriptLanguage },
      },
    );
  }

  async renderVoxcpmEditorSentence(
    scriptId: string,
    beatIndex: number,
    sentenceId: string,
    referenceTakeId?: string,
    options?: {
      force?: boolean;
      voiceEngine?: import('../utils/voiceEngine').VoiceEngineId;
      scriptLanguage?: import('../utils/scriptLanguage').ScriptLanguageId;
    },
  ): Promise<VoxcpmEditorRenderResponse> {
    return this.fetchJson<VoxcpmEditorRenderResponse>(
      `/api/scripts/${encodeURIComponent(scriptId)}/voxcpm-editor/beats/${beatIndex}/sentences/${encodeURIComponent(sentenceId)}/render`,
      {
        method: 'POST',
        body: {
          referenceTakeId,
          voiceEngine: options?.voiceEngine,
          scriptLanguage: options?.scriptLanguage,
          force: options?.force === true ? true : undefined,
        },
      },
    );
  }

  async renderVoxcpmEditorBeat(
    scriptId: string,
    beatIndex: number,
    referenceTakeId?: string,
    options?: {
      force?: boolean;
      voiceEngine?: import('../utils/voiceEngine').VoiceEngineId;
      scriptLanguage?: import('../utils/scriptLanguage').ScriptLanguageId;
    },
  ): Promise<VoxcpmEditorRenderResponse> {
    return this.fetchJson<VoxcpmEditorRenderResponse>(
      `/api/scripts/${encodeURIComponent(scriptId)}/voxcpm-editor/beats/${beatIndex}/render`,
      {
        method: 'POST',
        body: {
          referenceTakeId,
          voiceEngine: options?.voiceEngine,
          scriptLanguage: options?.scriptLanguage,
          force: options?.force === true ? true : undefined,
        },
      },
    );
  }

  async startVoxcpmTrial(
    scriptId: string,
    options: {
      referenceTakeId?: string;
      referenceAudioPath?: string;
      renderComposite?: boolean;
    } = {},
  ): Promise<VoxcpmTrialResponse> {
    return this.fetchJson<VoxcpmTrialResponse>(
      `/api/scripts/${encodeURIComponent(scriptId)}/voxcpm-trial`,
      {
        method: "POST",
        body: options,
      },
    );
  }

  async retryVoxcpmTrial(
    jobId: string,
    options: {
      referenceTakeId?: string;
      referenceAudioPath?: string;
      renderComposite?: boolean;
      resynthesizeVoice?: boolean;
    } = {},
  ): Promise<{ accepted: boolean; jobId: string }> {
    return this.fetchJson<{ accepted: boolean; jobId: string }>(
      `/api/jobs/${encodeURIComponent(jobId)}/voxcpm-retry`,
      {
        method: 'POST',
        body: options,
      },
    );
  }

  async retryVoxcpmComposite(
    jobId: string,
  ): Promise<{ accepted: boolean; jobId: string }> {
    return this.fetchJson<{ accepted: boolean; jobId: string }>(
      `/api/jobs/${encodeURIComponent(jobId)}/voxcpm-composite-retry`,
      {
        method: 'POST',
        body: {},
      },
    );
  }

  async regenerateCompositeFromStudio(jobId: string): Promise<string> {
    const before = await this.getJob(jobId);
    const previousIds = new Set(
      (before.job.runs.composite ?? []).map((run) => run.runId),
    );
    await this.syncAlignStudio(jobId);
    await this.runStage(jobId, "composite", { rerun: true });

    const deadline = Date.now() + 5 * 60_000;
    while (Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 4000));
      const fresh = await this.getJob(jobId);
      const compositeRuns = fresh.job.runs.composite ?? [];
      const succeeded = compositeRuns.find(
        (run) => !previousIds.has(run.runId) && run.status === "succeeded",
      );
      if (succeeded) {
        await this.updateSelection(jobId, { composite: succeeded.runId });
        return succeeded.runId;
      }
      const failed = compositeRuns.find(
        (run) => !previousIds.has(run.runId) && run.status === "failed",
      );
      if (failed) {
        throw new Error(failed.error ?? "Composite stage failed");
      }
    }
    throw new Error(
      "Composite regenerate timed out — check Mac agent logs and refresh.",
    );
  }

  // —— Social ——

  async getSocial(jobId: string): Promise<SocialPosts> {
    const payload = await this.fetchJson<{ social: SocialPosts }>(
      `/api/jobs/${encodeURIComponent(jobId)}/social`,
    );
    if (!payload.social) {
      throw new OutdoorApiError(
        200,
        `/api/jobs/${jobId}/social`,
        "Social pack missing",
      );
    }
    return payload.social;
  }

  async patchSocial(jobId: string, patch: SocialPatch): Promise<SocialPosts> {
    const payload = await this.fetchJson<{ social?: SocialPosts }>(
      `/api/jobs/${encodeURIComponent(jobId)}/social`,
      {
        method: "PATCH",
        body: { patch },
      },
    );
    if (payload.social) {
      return payload.social;
    }
    return this.getSocial(jobId);
  }

  // —— Covers ——

  async getCovers(jobId: string): Promise<CoversListResponse> {
    return this.fetchJson<CoversListResponse>(
      `/api/jobs/${encodeURIComponent(jobId)}/covers`,
    );
  }

  async captureCoverFromComposite(
    jobId: string,
    options: CaptureCoverOptions = {},
  ): Promise<CoversListResponse> {
    return this.fetchJson<CoversListResponse>(
      `/api/jobs/${encodeURIComponent(jobId)}/covers`,
      {
        method: "POST",
        body: {
          action: "capture-composite",
          format: options.format ?? "portrait",
          atSeconds: options.atSeconds ?? 1,
          label: options.label,
        },
      },
    );
  }

  async uploadCover(
    jobId: string,
    file: Blob | File,
    label?: string,
    source: "browser" | "iphone" = "browser",
  ): Promise<CoversListResponse> {
    const form = new FormData();
    form.append("cover", file);
    form.append("label", label ?? (file instanceof File ? file.name : "cover"));
    form.append("source", source);
    return this.fetchJson<CoversListResponse>(
      `/api/jobs/${encodeURIComponent(jobId)}/covers`,
      {
        method: "POST",
        body: form,
      },
    );
  }

  async duplicateCover(
    jobId: string,
    coverId: string,
  ): Promise<CoversListResponse> {
    return this.fetchJson<CoversListResponse>(
      `/api/jobs/${encodeURIComponent(jobId)}/covers`,
      {
        method: "POST",
        body: { action: "duplicate", coverId },
      },
    );
  }

  async renameCover(
    jobId: string,
    coverId: string,
    label: string,
  ): Promise<CoversListResponse> {
    return this.fetchJson<CoversListResponse>(
      `/api/jobs/${encodeURIComponent(jobId)}/covers/${encodeURIComponent(coverId)}`,
      {
        method: "PATCH",
        body: { label },
      },
    );
  }

  async deleteCover(
    jobId: string,
    coverId: string,
  ): Promise<CoversListResponse> {
    return this.fetchJson<CoversListResponse>(
      `/api/jobs/${encodeURIComponent(jobId)}/covers/${encodeURIComponent(coverId)}`,
      { method: "DELETE" },
    );
  }

  async patchCoverPlatformMap(
    jobId: string,
    patch: CoverPlatformMapPatch,
  ): Promise<CoversListResponse> {
    return this.fetchJson<CoversListResponse>(
      `/api/jobs/${encodeURIComponent(jobId)}/covers/platform-map`,
      {
        method: "PATCH",
        body: patch,
      },
    );
  }

  // —— Script covers (episode folder) ——

  async getScriptCovers(scriptId: string): Promise<ScriptCoversResponse> {
    return this.fetchJson<ScriptCoversResponse>(
      `/api/scripts/${encodeURIComponent(scriptId)}/covers?t=${Date.now()}`,
    );
  }

  async getScriptSocialPosts(scriptId: string): Promise<SocialPosts> {
    return this.fetchJson<SocialPosts>(
      `/api/scripts/${encodeURIComponent(scriptId)}/social-posts?t=${Date.now()}`,
    );
  }

  async uploadScriptCoverSlot(
    scriptId: string,
    slot: ScriptCoverSlot,
    file: Blob | File,
  ): Promise<ScriptCoversResponse> {
    const form = new FormData();
    form.append("slot", slot);
    form.append("file", file);
    return this.fetchJson<ScriptCoversResponse>(
      `/api/scripts/${encodeURIComponent(scriptId)}/covers`,
      {
        method: "POST",
        body: form,
      },
    );
  }

  async uploadScriptCoversBatch(
    scriptId: string,
    files: File[] | FileList,
  ): Promise<ScriptCoversResponse> {
    const form = new FormData();
    for (const file of files) {
      form.append(file.name || "cover.jpg", file);
    }
    return this.fetchJson<ScriptCoversResponse>(
      `/api/scripts/${encodeURIComponent(scriptId)}/covers`,
      {
        method: "POST",
        body: form,
      },
    );
  }

  // —— Platforms ——

  async getPlatformsHealth(): Promise<PlatformsHealthResponse> {
    const payload =
      await this.fetchJson<PlatformsHealthResponse>("/api/platforms");
    const entries = payload.entries ?? payload.platforms ?? [];
    return {
      ...payload,
      entries,
      platformIds:
        payload.platformIds?.length > 0
          ? payload.platformIds
          : entries.map((entry) => entry.platform),
      connectProgress: payload.connectProgress ?? {
        total: entries.filter((entry) => entry.status !== "manual").length,
        ready: entries.filter(
          (entry) =>
            entry.status === "connected" || entry.status === "configured",
        ).length,
        missing: entries
          .filter(
            (entry) =>
              entry.status === "missing_credentials" || entry.status === "stub",
          )
          .map((entry) => entry.platform),
        manual: entries
          .filter((entry) => entry.status === "manual")
          .map((entry) => entry.platform),
        stubOnly: true,
      },
    };
  }

  async getSupportedPlatformIds(): Promise<string[]> {
    const health = await this.getPlatformsHealth();
    return health.platformIds;
  }

  async syncPostizIntegrations(): Promise<ZernioSyncResult> {
    return this.fetchJson<ZernioSyncResult>(
      "/api/platforms/postiz/sync-integrations",
      {
        method: "POST",
        body: {},
      },
    );
  }

  async prepareForPublish(): Promise<{
    postizPublishMode: "stub" | "live";
    sauPublishMode: "stub" | "live";
    syncedPlatforms: string[];
    applied: boolean;
  }> {
    return this.fetchJson("/api/platforms/prepare-publish", {
      method: "POST",
      body: {},
    });
  }

  async getPostizOverview(): Promise<PostizOverview> {
    return this.fetchJson<PostizOverview>(
      "/api/platforms/postiz/overview",
    );
  }

  async getPostizConnectUrl(
    platform: string,
    refreshIntegrationId?: string,
  ): Promise<{ platform: string; identifier: string; url: string }> {
    const refresh = refreshIntegrationId
      ? `?refresh=${encodeURIComponent(refreshIntegrationId)}`
      : "";
    return this.fetchJson(
      `/api/platforms/postiz/connect/${encodeURIComponent(platform)}${refresh}`,
    );
  }

  async selectPostizIntegration(
    platform: string,
    integrationId: string,
  ): Promise<{ applied: boolean }> {
    return this.fetchJson(
      `/api/platforms/postiz/select/${encodeURIComponent(platform)}`,
      {
        method: "POST",
        body: { integrationId },
      },
    );
  }

  /** @deprecated Use syncPostizIntegrations */
  async syncZernioAccounts(): Promise<ZernioSyncResult> {
    return this.syncPostizIntegrations();
  }

  async testPlatformOrProvider(target: string): Promise<PlatformTestResult> {
    return this.fetchJson<PlatformTestResult>(
      `/api/platforms/${encodeURIComponent(target)}/test`,
      {
        method: "POST",
        body: {},
      },
    );
  }

  // —— Publish ——

  async getPublishPreview(jobId: string): Promise<PublishPlan> {
    return this.fetchJson<PublishPlan>(
      `/api/jobs/${encodeURIComponent(jobId)}/publish-preview`,
    );
  }

  async refreshPublishStatus(jobId: string): Promise<PublishState> {
    return this.fetchJson<PublishState>(
      `/api/jobs/${encodeURIComponent(jobId)}/publish-status/refresh`,
      { method: "POST", body: {} },
    );
  }

  async publishJob(
    jobId: string,
    platform: string,
    format?: PublishFormat,
  ): Promise<PublishResult> {
    const payload = await this.fetchJson<{ record?: PublishRecord }>(
      `/api/jobs/${encodeURIComponent(jobId)}/publish/${encodeURIComponent(platform)}`,
      {
        method: "POST",
        body: format ? { format } : {},
      },
    );
    return {
      url: payload.record?.url ?? "",
      stub: payload.record?.stub,
      status: payload.record?.status,
    };
  }

  async publishAll(jobId: string): Promise<PublishAllResult> {
    const payload = await this.fetchJson<PublishAllResult>(
      `/api/jobs/${encodeURIComponent(jobId)}/publish-all`,
      {
        method: "POST",
        body: {},
      },
    );
    return {
      published: payload.published ?? [],
      skippedLive: payload.skippedLive ?? [],
      skippedNoTitle: payload.skippedNoTitle ?? [],
      skippedUnavailable: payload.skippedUnavailable ?? [],
      failed: payload.failed ?? [],
    };
  }

  async getSocialCards(jobId: string): Promise<SocialCardsResponse> {
    return this.fetchJson<SocialCardsResponse>(
      `/api/jobs/${encodeURIComponent(jobId)}/social-cards`,
    );
  }

  async generateSocialCards(jobId: string): Promise<SocialCardsResponse> {
    return this.fetchJson<SocialCardsResponse>(
      `/api/jobs/${encodeURIComponent(jobId)}/social-cards`,
      { method: "POST", body: {} },
    );
  }

  async getBeatPosters(scriptId: string): Promise<BeatPostersResponse> {
    return this.fetchJson<BeatPostersResponse>(
      `/api/scripts/${encodeURIComponent(scriptId)}/beat-posters`,
    );
  }

  async generateBeatPosters(scriptId: string): Promise<BeatPostersResponse> {
    return this.fetchJson<BeatPostersResponse>(
      `/api/scripts/${encodeURIComponent(scriptId)}/beat-posters`,
      { method: "POST", body: {} },
    );
  }

  async uploadBeatPosterPng(
    scriptId: string,
    beatId: string,
    lang: BeatPosterLang,
    pngBase64: string,
  ): Promise<{ poster: { beatId: string; lang: BeatPosterLang; pngPath: string } }> {
    return this.fetchJson(
      `/api/scripts/${encodeURIComponent(scriptId)}/beat-posters/${encodeURIComponent(beatId)}/${encodeURIComponent(lang)}/png`,
      { method: "PUT", body: { pngBase64 } },
    );
  }

  async publishBeatPoster(
    scriptId: string,
    beatId: string,
    platform: string,
    lang: BeatPosterLang,
  ): Promise<{ publishState: BeatPosterPublishState }> {
    return this.fetchJson<{ publishState: BeatPosterPublishState }>(
      `/api/scripts/${encodeURIComponent(scriptId)}/beat-posters/${encodeURIComponent(beatId)}/publish/${encodeURIComponent(platform)}`,
      { method: "POST", body: { lang } },
    );
  }

  async getBeatPosterPublishPreview(
    scriptId: string,
    lang: BeatPosterLang,
  ): Promise<BeatPosterPublishPreviewResponse> {
    return this.fetchJson<BeatPosterPublishPreviewResponse>(
      `/api/scripts/${encodeURIComponent(scriptId)}/beat-posters/publish-preview?lang=${lang}`,
    );
  }

  async syncBeatPosterPreviewJpegs(
    scriptId: string,
  ): Promise<{ exported: number; urls: string[] }> {
    return this.fetchJson<{ exported: number; urls: string[] }>(
      `/api/scripts/${encodeURIComponent(scriptId)}/beat-posters/sync-preview-jpegs`,
      { method: 'POST', body: {} },
    );
  }

  async publishBeatPosterAlbum(
    scriptId: string,
    platform: string,
    lang: BeatPosterLang,
  ): Promise<BeatPosterPublishAlbumResult> {
    return this.fetchJson<BeatPosterPublishAlbumResult>(
      `/api/scripts/${encodeURIComponent(scriptId)}/beat-posters/publish/${encodeURIComponent(platform)}`,
      { method: "POST", body: { lang } },
    );
  }

  async publishBeatPosterAlbumAll(
    scriptId: string,
    lang: BeatPosterLang,
  ): Promise<BeatPosterPublishAllResult> {
    return this.fetchJson<BeatPosterPublishAllResult>(
      `/api/scripts/${encodeURIComponent(scriptId)}/beat-posters/publish-all`,
      { method: "POST", body: { lang } },
    );
  }

  async revertBeatPosterPublish(
    scriptId: string,
    platform: string,
    lang: BeatPosterLang,
  ): Promise<BeatPosterRevertPublishResult> {
    return this.fetchJson<BeatPosterRevertPublishResult>(
      `/api/scripts/${encodeURIComponent(scriptId)}/beat-posters/publish/${encodeURIComponent(platform)}/revert`,
      { method: "POST", body: { lang } },
    );
  }

  async publishImageJob(jobId: string, platform: string): Promise<PublishResult> {
    const payload = await this.fetchJson<{ record?: PublishRecord }>(
      `/api/jobs/${encodeURIComponent(jobId)}/publish-image/${encodeURIComponent(platform)}`,
      { method: "POST", body: {} },
    );
    return {
      url: payload.record?.url ?? "",
      stub: payload.record?.stub,
      status: payload.record?.status,
    };
  }

  async publishImagesAll(jobId: string): Promise<PublishAllResult> {
    const payload = await this.fetchJson<PublishAllResult>(
      `/api/jobs/${encodeURIComponent(jobId)}/publish-images-all`,
      { method: "POST", body: {} },
    );
    return {
      published: payload.published ?? [],
      skippedLive: payload.skippedLive ?? [],
      skippedNoTitle: payload.skippedNoTitle ?? [],
      skippedUnavailable: payload.skippedUnavailable ?? [],
      failed: payload.failed ?? [],
    };
  }

  async hidePost(jobId: string, platform: string): Promise<PublishRecord> {
    const payload = await this.fetchJson<{ record: PublishRecord }>(
      `/api/jobs/${encodeURIComponent(jobId)}/publish/${encodeURIComponent(platform)}/hide`,
      { method: "POST" },
    );
    return payload.record;
  }

  async deletePost(jobId: string, platform: string): Promise<PublishRecord> {
    const payload = await this.fetchJson<{ record: PublishRecord }>(
      `/api/jobs/${encodeURIComponent(jobId)}/publish/${encodeURIComponent(platform)}`,
      { method: "DELETE" },
    );
    return payload.record;
  }

  async revealTakeVideoInFinder(
    target:
      | { kind: "source"; scriptId: string; takeId: string }
      | {
          kind: "artifact";
          scriptId: string;
          takeId: string;
          stage: PipelineStage | string;
          runId: string;
          fileName: string;
        },
  ): Promise<{ ok: boolean; path?: string }> {
    const path =
      target.kind === "source"
        ? sourceRevealPath(target.scriptId, target.takeId)
        : artifactRevealPath(
            target.scriptId,
            target.takeId,
            target.stage,
            target.runId,
            target.fileName,
          );
    return this.fetchJson<{ ok: boolean; path?: string }>(path, {
      method: "POST",
      body: {},
    });
  }
}
