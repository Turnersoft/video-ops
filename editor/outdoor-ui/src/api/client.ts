import { absoluteAgentUrl } from './urls';

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
  ZernioSyncResult,
  OutdoorJob,
  OutdoorJobDetail,
  OutdoorJobSummary,
  OutdoorScript,
  PipelineStage,
  PipelineSnapshot,
  PlatformTestResult,
  PlatformsHealthResponse,
  PublishAllResult,
  PublishFormat,
  PublishRecord,
  PublishResult,
  LiveBeat,
  LiveScript,
  ScriptsResyncResult,
  RunStageOptions,
  RunStageResponse,
  SelectionUpdateResponse,
  SocialPatch,
  SocialPosts,
  StageProgress,
  TakeManifest,
  UploadTakeResult,
  VideoOpsCatalog,
  VideoOpsCatalogSeries,
} from '../types';
import type { BeatStudioDocument } from '../types/beatStudio';
import type { DraftBeat } from '../components/ScriptBeatEditorPanel/ScriptBeatEditorPanel.types';

export class OutdoorApiError extends Error {
  readonly status: number;
  readonly path: string;
  readonly body: string;

  constructor(status: number, path: string, body: string) {
    super(body || `${status} ${path}`);
    this.name = 'OutdoorApiError';
    this.status = status;
    this.path = path;
    this.body = body;
  }
}

export type OutdoorApiOptions = {
  baseUrl: string;
  headers?: HeadersInit;
};

type JsonRequestInit = Omit<RequestInit, 'body'> & {
  body?: BodyInit | Record<string, unknown> | null;
};

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, '');
}

function resolvePath(baseUrl: string, path: string): string {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  const root = normalizeBaseUrl(baseUrl);
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `${root}${suffix}`;
}

function looksLikeHtml(text: string): boolean {
  const trimmed = text.trim();
  return (
    trimmed.startsWith('<!DOCTYPE') ||
    trimmed.startsWith('<html') ||
    trimmed.includes('<html')
  );
}

function friendlyApiBody(path: string, text: string, baseUrl: string): string {
  if (!looksLikeHtml(text)) {
    return text.slice(0, 300);
  }
  const lower = `${text}\n${baseUrl}`.toLowerCase();
  if (lower.includes('ngrok')) {
    return (
      'Ngrok returned a web page instead of the outdoor agent API. ' +
      'On Mac run: npm run outdoor:all — then iPhone → Refresh from iCloud.'
    );
  }
  if (lower.includes('loca.lt')) {
    return 'Tunnel returned HTML instead of JSON — restart npm run outdoor:all on Mac.';
  }
  return `Received HTML instead of JSON from ${path}. Check the Mac agent URL (:8788).`;
}

function applyTunnelHeaders(baseUrl: string, headers: Headers): void {
  const lower = baseUrl.toLowerCase();
  if (lower.includes('ngrok')) {
    headers.set('ngrok-skip-browser-warning', '1');
    headers.set('Ngrok-Skip-Browser-Warning', '1');
    if (!headers.has('User-Agent')) {
      headers.set('User-Agent', 'TurnOutdoor/1.0');
    }
  }
  if (lower.includes('loca.lt')) {
    headers.set('bypass-tunnel-reminder', 'true');
  }
  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }
}

export function formatOutdoorApiError(error: unknown): string {
  if (error instanceof OutdoorApiError) {
    return error.message;
  }
  if (error instanceof Error) {
    if (looksLikeHtml(error.message)) {
      return (
        'Agent returned HTML instead of JSON. ' +
        'On Mac run: npm run outdoor:all — then iPhone → Refresh from iCloud.'
      );
    }
    return error.message;
  }
  return String(error);
}

function serializeBody(body: JsonRequestInit['body']): BodyInit | undefined {
  if (body === null || body === undefined) {
    return undefined;
  }
  if (
    typeof body === 'string' ||
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
      typeof init.body === 'object' &&
      !(init.body instanceof FormData) &&
      !(init.body instanceof Blob) &&
      !(init.body instanceof URLSearchParams) &&
      !(init.body instanceof ArrayBuffer) &&
      !(typeof init.body === 'string');

    if (isJsonObject && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
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
    const contentType = response.headers.get('content-type') ?? '';
    const isJson = contentType.includes('application/json');
    const text = await response.text();

    if (!response.ok) {
      if (isJson && text) {
        try {
          const payload = JSON.parse(text) as { error?: string };
          if (payload.error) {
            throw new OutdoorApiError(response.status, path, payload.error);
          }
        } catch (error) {
          if (error instanceof OutdoorApiError) {
            throw error;
          }
        }
      }
      throw new OutdoorApiError(
        response.status,
        path,
        friendlyApiBody(path, text, this.baseUrl),
      );
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
        'Non-JSON response from agent URL — point Mac connection at outdoor agent :8788, not Expo Metro :8081.',
      );
    }

    try {
      return JSON.parse(text) as T;
    } catch {
      throw new OutdoorApiError(response.status, path, `Invalid JSON from ${path}`);
    }
  }

  absoluteUrl(relativeOrAbsolute: string): string {
    return absoluteAgentUrl(this.baseUrl, relativeOrAbsolute);
  }

  // —— Health ——

  async getHealth(): Promise<HealthResponse> {
    return this.fetchJson<HealthResponse>('/api/health');
  }

  // —— Catalog ——

  async getCatalog(): Promise<VideoOpsCatalog> {
    const catalog = await this.fetchJson<VideoOpsCatalog>(
      `/api/catalog?t=${Date.now()}`,
    );
    if (!catalog || !Array.isArray(catalog.series)) {
      throw new OutdoorApiError(
        200,
        '/api/catalog',
        'Invalid catalog response (missing series). Check Mac connection — agent URL must be :8788, not Expo Metro :8081.',
      );
    }
    return catalog;
  }

  async resyncScripts(force = true): Promise<ScriptsResyncResult> {
    return this.fetchJson<ScriptsResyncResult>('/api/scripts/resync', {
      method: 'POST',
      body: { force },
    });
  }

  async getSeries(): Promise<VideoOpsCatalogSeries[]> {
    const payload = await this.fetchJson<{ series: VideoOpsCatalogSeries[] }>('/api/series');
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
    patch: Partial<Pick<LiveBeat, 'title' | 'say' | 'leanCode' | 'turnCode' | 'visualNotes'>> & {
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
      { method: 'PUT', body: patch },
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
      { method: 'PUT', body: doc },
    );
  }

  async uploadStickerAsset(
    scriptId: string,
    stickerId: string,
    file: Blob | File,
  ): Promise<{ assetPath: string }> {
    const form = new FormData();
    form.append('stickerId', stickerId);
    form.append('file', file, file instanceof File ? file.name : 'sticker.png');
    return this.fetchJson<{ assetPath: string }>(
      `/api/scripts/${encodeURIComponent(scriptId)}/sticker-assets`,
      { method: 'POST', body: form },
    );
  }

  async deleteStickerAsset(scriptId: string, assetPath: string): Promise<{ ok: boolean }> {
    return this.fetchJson<{ ok: boolean }>(
      `/api/scripts/${encodeURIComponent(scriptId)}/sticker-assets`,
      { method: 'DELETE', body: { assetPath } },
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
      { method: 'POST', body: options },
    );
  }

  async getAnimationMd(scriptId: string): Promise<AnimationMdDocument> {
    return this.fetchJson<AnimationMdDocument>(
      `/api/scripts/${encodeURIComponent(scriptId)}/animation-md`,
    );
  }

  async putAnimationMd(
    scriptId: string,
    markdown: string,
    compile = true,
  ): Promise<AnimationMdDocument> {
    return this.fetchJson<AnimationMdDocument>(
      `/api/scripts/${encodeURIComponent(scriptId)}/animation-md`,
      { method: 'PUT', body: { markdown, compile } },
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
      { method: 'POST', body: options },
    );
  }

  async compileAnimationMd(scriptId: string): Promise<{ ok: boolean; scriptId: string }> {
    return this.fetchJson(`/api/scripts/${encodeURIComponent(scriptId)}/animation-md/compile`, {
      method: 'POST',
      body: {},
    });
  }

  async getLlmSettings(): Promise<LlmSettings> {
    return this.fetchJson<LlmSettings>('/api/settings/llm');
  }

  async putLlmSettings(partial: { baseUrl?: string; model?: string | null }): Promise<LlmSettings> {
    return this.fetchJson<LlmSettings>('/api/settings/llm', {
      method: 'PUT',
      body: partial,
    });
  }

  // —— Inbox ——

  async getInboxStatus(): Promise<InboxStatusSnapshot> {
    const status = await this.fetchJson<InboxStatusSnapshot>('/api/inbox/status');
    return {
      ...status,
      watchedFolders: status.watchedFolders ?? [],
      files: status.files ?? [],
      recentIngests: status.recentIngests ?? [],
    };
  }

  async scanInbox(): Promise<InboxScanResult> {
    return this.fetchJson<InboxScanResult>('/api/inbox/scan', {
      method: 'POST',
      body: {},
    });
  }

  // —— Jobs ——

  async listJobs(): Promise<OutdoorJobSummary[]> {
    const payload = await this.fetchJson<{ jobs: OutdoorJobSummary[] }>('/api/jobs');
    return payload.jobs;
  }

  async getJob(jobId: string): Promise<OutdoorJobDetail> {
    return this.fetchJson<OutdoorJobDetail>(`/api/jobs/${encodeURIComponent(jobId)}`);
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
      { method: 'POST', body: {} },
    );
  }

  async runPipeline(jobId: string, options: { rerun?: boolean } = {}): Promise<RunStageResponse> {
    return this.fetchJson<RunStageResponse>(
      `/api/jobs/${encodeURIComponent(jobId)}/pipeline/run`,
      { method: 'POST', body: { rerun: options.rerun !== false } },
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
        method: 'POST',
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
        method: 'PUT',
        body: { selectedRuns },
      },
    );
  }

  async uploadTake(take: TakeManifest, video: Blob | File): Promise<UploadTakeResult> {
    const form = new FormData();
    form.append(
      'take',
      new Blob([JSON.stringify(take)], { type: 'application/json' }),
      `${take.takeId}.json`,
    );
    const ext = take.videoUri.endsWith('.webm') || video.type.includes('webm') ? 'webm' : 'mp4';
    form.append('video', video, `${take.takeId}.${ext}`);
    const payload = await this.fetchJson<UploadTakeResult>('/api/upload', {
      method: 'POST',
      body: form,
    });
    if (!payload.jobId) {
      throw new OutdoorApiError(201, '/api/upload', 'Upload succeeded but no jobId returned');
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
        method: 'PUT',
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
        method: 'POST',
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

  async saveAlignLayout(jobId: string, layout: AlignLayout): Promise<AlignReviewPayload> {
    const payload = await this.fetchJson<{ review?: AlignReviewPayload }>(
      `/api/jobs/${encodeURIComponent(jobId)}/align-layout`,
      {
        method: 'PUT',
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
        method: 'POST',
        body: {},
      },
    );
  }

  async regenerateCompositeFromStudio(jobId: string): Promise<string> {
    const before = await this.getJob(jobId);
    const previousIds = new Set((before.job.runs.composite ?? []).map((run) => run.runId));
    await this.syncAlignStudio(jobId);
    await this.runStage(jobId, 'composite', { rerun: true });

    const deadline = Date.now() + 5 * 60_000;
    while (Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 4000));
      const fresh = await this.getJob(jobId);
      const compositeRuns = fresh.job.runs.composite ?? [];
      const succeeded = compositeRuns.find(
        (run) => !previousIds.has(run.runId) && run.status === 'succeeded',
      );
      if (succeeded) {
        await this.updateSelection(jobId, { composite: succeeded.runId });
        return succeeded.runId;
      }
      const failed = compositeRuns.find(
        (run) => !previousIds.has(run.runId) && run.status === 'failed',
      );
      if (failed) {
        throw new Error(failed.error ?? 'Composite stage failed');
      }
    }
    throw new Error('Composite regenerate timed out — check Mac agent logs and refresh.');
  }

  // —— Social ——

  async getSocial(jobId: string): Promise<SocialPosts> {
    const payload = await this.fetchJson<{ social: SocialPosts }>(
      `/api/jobs/${encodeURIComponent(jobId)}/social`,
    );
    if (!payload.social) {
      throw new OutdoorApiError(200, `/api/jobs/${jobId}/social`, 'Social pack missing');
    }
    return payload.social;
  }

  async patchSocial(jobId: string, patch: SocialPatch): Promise<SocialPosts> {
    const payload = await this.fetchJson<{ social?: SocialPosts }>(
      `/api/jobs/${encodeURIComponent(jobId)}/social`,
      {
        method: 'PATCH',
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
        method: 'POST',
        body: {
          action: 'capture-composite',
          format: options.format ?? 'portrait',
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
    source: 'browser' | 'iphone' = 'browser',
  ): Promise<CoversListResponse> {
    const form = new FormData();
    form.append('cover', file);
    form.append('label', label ?? (file instanceof File ? file.name : 'cover'));
    form.append('source', source);
    return this.fetchJson<CoversListResponse>(
      `/api/jobs/${encodeURIComponent(jobId)}/covers`,
      {
        method: 'POST',
        body: form,
      },
    );
  }

  async duplicateCover(jobId: string, coverId: string): Promise<CoversListResponse> {
    return this.fetchJson<CoversListResponse>(
      `/api/jobs/${encodeURIComponent(jobId)}/covers`,
      {
        method: 'POST',
        body: { action: 'duplicate', coverId },
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
        method: 'PATCH',
        body: { label },
      },
    );
  }

  async deleteCover(jobId: string, coverId: string): Promise<CoversListResponse> {
    return this.fetchJson<CoversListResponse>(
      `/api/jobs/${encodeURIComponent(jobId)}/covers/${encodeURIComponent(coverId)}`,
      { method: 'DELETE' },
    );
  }

  async patchCoverPlatformMap(
    jobId: string,
    patch: CoverPlatformMapPatch,
  ): Promise<CoversListResponse> {
    return this.fetchJson<CoversListResponse>(
      `/api/jobs/${encodeURIComponent(jobId)}/covers/platform-map`,
      {
        method: 'PATCH',
        body: patch,
      },
    );
  }

  // —— Platforms ——

  async getPlatformsHealth(): Promise<PlatformsHealthResponse> {
    const payload = await this.fetchJson<PlatformsHealthResponse>('/api/platforms');
    const entries = payload.entries ?? payload.platforms ?? [];
    return {
      ...payload,
      entries,
      platformIds:
        payload.platformIds?.length > 0
          ? payload.platformIds
          : entries.map((entry) => entry.platform),
      connectProgress:
        payload.connectProgress ?? {
          total: entries.filter((entry) => entry.status !== 'manual').length,
          ready: entries.filter(
            (entry) => entry.status === 'connected' || entry.status === 'configured',
          ).length,
          missing: entries
            .filter(
              (entry) =>
                entry.status === 'missing_credentials' || entry.status === 'stub',
            )
            .map((entry) => entry.platform),
          manual: entries
            .filter((entry) => entry.status === 'manual')
            .map((entry) => entry.platform),
          stubOnly: true,
        },
    };
  }

  async getSupportedPlatformIds(): Promise<string[]> {
    const health = await this.getPlatformsHealth();
    return health.platformIds;
  }

  async syncZernioAccounts(): Promise<ZernioSyncResult> {
    return this.fetchJson<ZernioSyncResult>('/api/platforms/zernio/sync-accounts', {
      method: 'POST',
      body: {},
    });
  }

  async testPlatformOrProvider(target: string): Promise<PlatformTestResult> {
    return this.fetchJson<PlatformTestResult>(
      `/api/platforms/${encodeURIComponent(target)}/test`,
      {
        method: 'POST',
        body: {},
      },
    );
  }

  // —— Publish ——

  async publishJob(
    jobId: string,
    platform: string,
    format?: PublishFormat,
  ): Promise<PublishResult> {
    const payload = await this.fetchJson<{ record?: PublishRecord }>(
      `/api/jobs/${encodeURIComponent(jobId)}/publish/${encodeURIComponent(platform)}`,
      {
        method: 'POST',
        body: format ? { format } : {},
      },
    );
    return {
      url: payload.record?.url ?? '',
      stub: payload.record?.stub,
      status: payload.record?.status,
    };
  }

  async publishAll(jobId: string): Promise<PublishAllResult> {
    const payload = await this.fetchJson<PublishAllResult>(
      `/api/jobs/${encodeURIComponent(jobId)}/publish-all`,
      {
        method: 'POST',
        body: {},
      },
    );
    return {
      published: payload.published ?? [],
      skippedLive: payload.skippedLive ?? [],
      skippedNoTitle: payload.skippedNoTitle ?? [],
      failed: payload.failed ?? [],
    };
  }

  async hidePost(jobId: string, platform: string): Promise<PublishRecord> {
    const payload = await this.fetchJson<{ record: PublishRecord }>(
      `/api/jobs/${encodeURIComponent(jobId)}/publish/${encodeURIComponent(platform)}/hide`,
      { method: 'POST' },
    );
    return payload.record;
  }

  async deletePost(jobId: string, platform: string): Promise<PublishRecord> {
    const payload = await this.fetchJson<{ record: PublishRecord }>(
      `/api/jobs/${encodeURIComponent(jobId)}/publish/${encodeURIComponent(platform)}`,
      { method: 'DELETE' },
    );
    return payload.record;
  }
}
