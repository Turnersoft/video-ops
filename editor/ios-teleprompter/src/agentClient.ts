import * as FileSystem from 'expo-file-system/legacy';

import { withNgrokHeaders } from './outdoorFetch';
import { loadAgentBaseUrl } from './agentSettings';
import { agentFetchJson, AgentConnectionError } from './agentResponse';
import type { TakeManifest } from './scriptSchema';

export type PipelineStage = 'stabilize' | 'cut' | 'align' | 'composite' | 'social';

export type StageProgress = {
  percent: number;
  step: string;
  message: string;
  updatedAt: string;
};

export type StageRunSummary = {
  runId: string;
  status: 'pending' | 'running' | 'succeeded' | 'failed' | 'cancelled';
  createdAt: string;
  finishedAt?: string;
  error?: string;
  artifacts?: Record<string, string>;
};

export type OutdoorJobSummary = {
  jobId: string;
  takeId: string;
  scriptId: string;
  scriptTitle: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  selectedRuns: Partial<Record<PipelineStage, string>>;
  progress?: Partial<Record<PipelineStage, StageProgress | null>>;
};

export type OutdoorJobDetail = {
  job: {
    jobId: string;
    takeId: string;
    scriptId: string;
    scriptTitle: string;
    status: string;
    selectedRuns: Partial<Record<PipelineStage, string>>;
    runs: Record<PipelineStage, StageRunSummary[]>;
  };
  publish: {
    posts: Array<{
      platform: string;
      postId: string;
      url: string;
      status: 'live' | 'hidden' | 'deleted' | 'pending';
      publishedAt?: string;
      stub?: boolean;
      coverId?: string;
    }>;
  };
  progress: Partial<Record<PipelineStage, StageProgress | null>>;
  results?: {
    jobId: string;
    scriptId: string;
    takeId: string;
    stages: Array<{
      stage: PipelineStage;
      runId: string | null;
      status: string;
      videos: Array<{ label: string; url: string }>;
      summary: string[];
      socialTitles: Array<{ group: string; platform: string; title: string; body?: string }>;
    }>;
  };
};

async function agentFetch(path: string, init?: RequestInit): Promise<Response> {
  const baseUrl = await loadAgentBaseUrl();
  return fetch(`${baseUrl}${path}`, withNgrokHeaders(init));
}

async function agentBaseUrl(): Promise<string> {
  return loadAgentBaseUrl();
}

export async function checkAgentHealth(): Promise<boolean> {
  try {
    const baseUrl = await agentBaseUrl();
    const payload = await agentFetchJson<{ ok?: boolean }>(baseUrl, '/api/health');
    return payload.ok === true;
  } catch {
    return false;
  }
}

export async function checkAgentHealthMessage(): Promise<string | null> {
  try {
    const baseUrl = await agentBaseUrl();
    const payload = await agentFetchJson<{ ok?: boolean }>(baseUrl, '/api/health');
    return payload.ok === true ? null : `Agent at ${baseUrl} did not return ok:true`;
  } catch (error) {
    return error instanceof Error ? error.message : 'Agent unreachable';
  }
}

export async function scanInbox(): Promise<{
  ingested: Array<{ jobId: string; takeId: string; scriptTitle?: string | null }>;
}> {
  const baseUrl = await agentBaseUrl();
  const payload = await agentFetchJson<{ ingested?: Array<{ jobId: string; takeId: string; scriptTitle?: string | null }> }>(
    baseUrl,
    '/api/inbox/scan',
    { method: 'POST', body: '{}' },
  );
  return { ingested: payload.ingested ?? [] };
}

export async function fetchInboxStatus(): Promise<{
  watchedFolders: string[];
  files: Array<{
    takeId: string;
    videoFileName: string | null;
    videoPath: string | null;
    status: string;
    scriptId: string | null;
    takeDir?: string;
    inboxDir?: string;
  }>;
  recentIngests: Array<{
    takeId: string;
    videoFileName: string | null;
    videoPath: string | null;
    inboxDir: string;
    takeDir?: string;
    jobId?: string;
    scriptTitle?: string | null;
    ingestedAt?: string;
  }>;
}> {
  const baseUrl = await agentBaseUrl();
  return agentFetchJson(baseUrl, '/api/inbox/status');
}

export async function listOutdoorJobs(): Promise<OutdoorJobSummary[]> {
  const baseUrl = await agentBaseUrl();
  const payload = await agentFetchJson<{ jobs: OutdoorJobSummary[] }>(baseUrl, '/api/jobs');
  return payload.jobs;
}

export async function getOutdoorJob(jobId: string): Promise<OutdoorJobDetail> {
  const baseUrl = await agentBaseUrl();
  const payload = await agentFetchJson<OutdoorJobDetail>(
    baseUrl,
    `/api/jobs/${encodeURIComponent(jobId)}`,
  );
  if (!payload?.job?.jobId) {
    throw new AgentConnectionError(
      `Agent URL points at Expo Metro, not the outdoor agent.\n\n` +
        `On Mac: npm run outdoor:all  (Tailscale → :8788)\n` +
        `Or use same Wi‑Fi and Refresh from iCloud.\n\n` +
        `Tried: ${baseUrl}`,
      baseUrl,
    );
  }
  return payload;
}

export async function rerunStage(
  jobId: string,
  stage: PipelineStage,
  options?: Record<string, unknown>,
): Promise<void> {
  const response = await agentFetch(
    `/api/jobs/${encodeURIComponent(jobId)}/stages/${encodeURIComponent(stage)}/run`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rerun: true, options }),
    },
  );
  if (!response.ok) {
    throw new Error(`Could not re-run ${stage}`);
  }
}

export async function syncAlignStudio(jobId: string): Promise<void> {
  const response = await agentFetch(`/api/jobs/${encodeURIComponent(jobId)}/align-sync-studio`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(payload.error ?? 'Could not sync Remotion Studio layout');
  }
}

export async function regenerateCompositeFromStudio(jobId: string): Promise<string> {
  const before = await getOutdoorJob(jobId);
  const previousIds = new Set((before.job.runs.composite ?? []).map((run) => run.runId));
  await syncAlignStudio(jobId);
  await rerunStage(jobId, 'composite');
  const deadline = Date.now() + 5 * 60_000;
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 4000));
    const fresh = await getOutdoorJob(jobId);
    const compositeRuns = fresh.job.runs.composite ?? [];
    const succeeded = compositeRuns.find(
      (run) => !previousIds.has(run.runId) && run.status === 'succeeded',
    );
    if (succeeded) {
      await selectStageRuns(jobId, { composite: succeeded.runId });
      return succeeded.runId;
    }
    const failed = compositeRuns.find((run) => !previousIds.has(run.runId) && run.status === 'failed');
    if (failed) {
      throw new Error(failed.error || 'Composite stage failed');
    }
  }
  throw new Error('Composite regenerate timed out — check Mac agent logs and refresh.');
}

export async function selectStageRuns(
  jobId: string,
  selectedRuns: Partial<Record<PipelineStage, string>>,
): Promise<void> {
  const response = await agentFetch(`/api/jobs/${encodeURIComponent(jobId)}/selection`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ selectedRuns }),
  });
  if (!response.ok) {
    throw new Error('Could not update stage selection');
  }
}

export async function publishOutdoorJob(
  jobId: string,
  platform: string,
  format?: 'portrait' | 'landscape',
): Promise<{ url: string; stub?: boolean; status?: string }> {
  const response = await agentFetch(
    `/api/jobs/${encodeURIComponent(jobId)}/publish/${encodeURIComponent(platform)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ format }),
    },
  );
  const payload = (await response.json()) as {
    record?: { url: string; stub?: boolean; status?: string };
    error?: string;
  };
  if (!response.ok) {
    throw new Error(payload.error ?? `Publish failed (${response.status})`);
  }
  return {
    url: payload.record?.url ?? '',
    stub: payload.record?.stub,
    status: payload.record?.status,
  };
}

export async function publishAllOutdoorJob(jobId: string): Promise<{
  published: Array<{ platform: string }>;
  skippedLive: string[];
  skippedNoTitle: string[];
  failed: Array<{ platform: string; error: string }>;
}> {
  const response = await agentFetch(`/api/jobs/${encodeURIComponent(jobId)}/publish-all`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  });
  const payload = (await response.json()) as {
    published?: Array<{ platform: string }>;
    skippedLive?: string[];
    skippedNoTitle?: string[];
    failed?: Array<{ platform: string; error: string }>;
    error?: string;
  };
  if (!response.ok) {
    throw new Error(payload.error ?? `Publish all failed (${response.status})`);
  }
  return {
    published: payload.published ?? [],
    skippedLive: payload.skippedLive ?? [],
    skippedNoTitle: payload.skippedNoTitle ?? [],
    failed: payload.failed ?? [],
  };
}

export async function fetchSocialPosts(jobId: string): Promise<SocialPosts> {
  const response = await agentFetch(`/api/jobs/${encodeURIComponent(jobId)}/social`);
  const payload = (await response.json()) as { social?: SocialPosts; error?: string };
  if (!response.ok) {
    throw new Error(payload.error ?? `Social pack unavailable (${response.status})`);
  }
  if (!payload.social) {
    throw new Error('Social pack missing');
  }
  return payload.social;
}

export type SocialPosts = {
  titleEnglish?: string;
  titleChina?: string;
  title?: string;
  english?: Record<string, { title?: string; body?: string }>;
  china?: Record<string, { title?: string; body?: string }>;
  updatedAt?: string;
};

export type SocialPatch = {
  titleEnglish?: string;
  titleChina?: string;
  title?: string;
  english?: Record<string, { title?: string; body?: string }>;
  china?: Record<string, { title?: string; body?: string }>;
};

export async function patchSocialPosts(jobId: string, patch: SocialPatch): Promise<SocialPosts> {
  const response = await agentFetch(`/api/jobs/${encodeURIComponent(jobId)}/social`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ patch }),
  });
  const payload = (await response.json()) as { social?: SocialPosts; error?: string };
  if (!response.ok) {
    throw new Error(payload.error ?? `Could not save social edits (${response.status})`);
  }
  if (!payload.social) {
    return fetchSocialPosts(jobId);
  }
  return payload.social;
}

export async function fetchSupportedPlatforms(): Promise<string[]> {
  const response = await agentFetch('/api/platforms');
  if (!response.ok) {
    throw new Error(`Platforms unavailable (${response.status})`);
  }
  const payload = (await response.json()) as {
    platformIds?: string[];
    platforms?: Array<string | { platform: string }>;
  };
  if (payload.platformIds?.length) {
    return payload.platformIds;
  }
  const raw = payload.platforms ?? [];
  if (raw.length && typeof raw[0] === 'string') {
    return raw as string[];
  }
  return (raw as Array<{ platform: string }>).map((entry) => entry.platform).filter(Boolean);
}

export type PlatformStatus = {
  platform: string;
  provider: 'zernio' | 'social-auto-upload' | 'unknown';
  mode: 'stub' | 'live';
  status: string;
  accountLabel: string | null;
  accountMasked: string | null;
  notes: string[];
  loginCommand?: string | null;
  loginLinks?: Array<{ label: string; url?: string; command?: string }>;
};

export type ConnectProgress = {
  total: number;
  ready: number;
  missing: string[];
  manual: string[];
  stubOnly: boolean;
};

export async function fetchPlatformsHealth(): Promise<{
  checkedAt: string;
  platformIds: string[];
  connectProgress: ConnectProgress;
  providers: {
    zernio: {
      mode: 'stub' | 'live';
      hasApiKey: boolean;
      dashboardUrl: string;
      signupUrl?: string;
      apiKeysUrl?: string;
      connectGuideUrl?: string;
      envDocs: string[];
      loginLinks?: Array<{ label: string; url?: string; command?: string }>;
      suggestedAccountsExport?: string | null;
    };
    sau: {
      mode: 'stub' | 'live';
      dashboardHint: string;
      installHint?: string;
      envDocs: string[];
      loginLinks?: Array<{ label: string; url?: string; command?: string }>;
    };
  };
  entries: PlatformStatus[];
  manualPlatforms: string[];
}> {
  const response = await agentFetch('/api/platforms');
  if (!response.ok) {
    throw new Error(`Platforms unavailable (${response.status})`);
  }
  const payload = (await response.json()) as {
    checkedAt?: string;
    platformIds?: string[];
    platforms?: PlatformStatus[];
    connectProgress?: ConnectProgress;
    providers?: {
      zernio: {
        mode: 'stub' | 'live';
        hasApiKey: boolean;
        dashboardUrl: string;
        signupUrl?: string;
        apiKeysUrl?: string;
        connectGuideUrl?: string;
        envDocs: string[];
        loginLinks?: Array<{ label: string; url?: string; command?: string }>;
        suggestedAccountsExport?: string | null;
      };
      sau: {
        mode: 'stub' | 'live';
        dashboardHint: string;
        installHint?: string;
        envDocs: string[];
        loginLinks?: Array<{ label: string; url?: string; command?: string }>;
      };
    };
    manualPlatforms?: string[];
  };
  const entries = payload.platforms ?? [];
  return {
    checkedAt: payload.checkedAt ?? new Date().toISOString(),
    platformIds: payload.platformIds?.length
      ? payload.platformIds
      : entries.map((entry) => entry.platform),
    connectProgress: payload.connectProgress ?? {
      total: entries.filter((entry) => entry.status !== 'manual').length,
      ready: entries.filter(
        (entry) => entry.status === 'connected' || entry.status === 'configured',
      ).length,
      missing: entries
        .filter((entry) => entry.status === 'missing_credentials' || entry.status === 'stub')
        .map((entry) => entry.platform),
      manual: entries.filter((entry) => entry.status === 'manual').map((entry) => entry.platform),
      stubOnly: true,
    },
    providers: payload.providers ?? {
      zernio: {
        mode: 'stub',
        hasApiKey: false,
        dashboardUrl: 'https://zernio.com/dashboard',
        envDocs: [],
      },
      sau: { mode: 'stub', dashboardHint: '', envDocs: [] },
    },
    entries,
    manualPlatforms: payload.manualPlatforms ?? [],
  };
}

export async function syncZernioAccounts(): Promise<{
  suggestedAccountsJson: Record<string, string>;
  exportCommand: string;
}> {
  const response = await agentFetch('/api/platforms/zernio/sync-accounts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  });
  const payload = (await response.json()) as {
    suggestedAccountsJson?: Record<string, string>;
    exportCommand?: string;
    error?: string;
  };
  if (!response.ok) {
    throw new Error(payload.error ?? `Sync failed (${response.status})`);
  }
  return {
    suggestedAccountsJson: payload.suggestedAccountsJson ?? {},
    exportCommand: payload.exportCommand ?? '',
  };
}

export async function testPlatformOrProvider(
  target: string,
): Promise<{ ok: boolean; message: string; provider?: string | null }> {
  const response = await agentFetch(`/api/platforms/${encodeURIComponent(target)}/test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  });
  const payload = (await response.json()) as {
    ok?: boolean;
    message?: string;
    provider?: string | null;
    error?: string;
  };
  if (!response.ok) {
    throw new Error(payload.error ?? `Test failed (${response.status})`);
  }
  return {
    ok: Boolean(payload.ok),
    message: payload.message ?? '',
    provider: payload.provider,
  };
}

export async function hideOutdoorPost(jobId: string, platform: string): Promise<void> {
  const response = await agentFetch(
    `/api/jobs/${encodeURIComponent(jobId)}/publish/${encodeURIComponent(platform)}/hide`,
    { method: 'POST' },
  );
  if (!response.ok) {
    throw new Error(`Hide failed (${response.status})`);
  }
}

export async function deleteOutdoorPost(jobId: string, platform: string): Promise<void> {
  const response = await agentFetch(
    `/api/jobs/${encodeURIComponent(jobId)}/publish/${encodeURIComponent(platform)}`,
    { method: 'DELETE' },
  );
  if (!response.ok) {
    throw new Error(`Delete failed (${response.status})`);
  }
}

export async function artifactUrl(
  scriptId: string,
  takeId: string,
  stage: PipelineStage,
  runId: string,
  fileName: string,
): Promise<string> {
  const baseUrl = await loadAgentBaseUrl();
  return `${baseUrl}/api/scripts/${encodeURIComponent(scriptId)}/takes/${encodeURIComponent(takeId)}/artifacts/${encodeURIComponent(stage)}/${encodeURIComponent(runId)}/${encodeURIComponent(fileName)}`;
}

export type CutTranscriptLine = {
  id: string;
  start: number;
  end: number;
  text: string;
  kept: boolean;
  kind: 'keep' | 'silence' | 'ng' | 'other';
  reason: string;
  toggleStart: number;
  toggleEnd: number;
  toggleMode: 'bad' | 'good';
};

export type CutReviewPayload = {
  runId: string;
  /** @deprecated Prefer previewVideoUrl */
  sourceVideoUrl: string;
  previewVideoUrl?: string;
  previewUsesStabilized?: boolean;
  editedVideoUrl: string | null;
  durationSeconds: number;
  slides: Array<{
    slideId: string;
    slideTitle: string;
    sourceStart: number;
    sourceEnd: number;
    lines: CutTranscriptLine[];
  }>;
  selection: {
    schemaVersion: 1;
    restoreBad: Array<{ start: number; end: number }>;
    dropGood: Array<{ start: number; end: number }>;
    updatedAt: string;
  };
  usesStabilizedInput?: boolean;
  appliesWithStabilizedVideo?: boolean;
  needsStabilizedApply?: boolean;
  stale?: boolean;
  staleReason?: string | null;
};

export async function fetchCutReview(jobId: string): Promise<CutReviewPayload> {
  const response = await agentFetch(`/api/jobs/${encodeURIComponent(jobId)}/cut-review`);
  if (!response.ok) {
    throw new Error(`Cut review unavailable (${response.status})`);
  }
  return (await response.json()) as CutReviewPayload;
}

export async function saveCutSelection(
  jobId: string,
  selection: CutReviewPayload['selection'],
): Promise<CutReviewPayload> {
  const response = await agentFetch(`/api/jobs/${encodeURIComponent(jobId)}/cut-selection`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(selection),
  });
  if (!response.ok) {
    throw new Error(`Could not save cut selection (${response.status})`);
  }
  const payload = (await response.json()) as { review?: CutReviewPayload };
  if (!payload.review) {
    return fetchCutReview(jobId);
  }
  return payload.review;
}

export async function applyCutSelection(jobId: string): Promise<CutReviewPayload> {
  const response = await agentFetch(`/api/jobs/${encodeURIComponent(jobId)}/cut-apply-selection`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(payload.error ?? `Could not apply cut selection (${response.status})`);
  }
  const payload = (await response.json()) as { review?: CutReviewPayload };
  if (!payload.review) {
    return fetchCutReview(jobId);
  }
  return payload.review;
}

export async function cutReviewPreviewUrl(
  scriptId: string,
  takeId: string,
  review: Pick<CutReviewPayload, 'previewVideoUrl' | 'sourceVideoUrl'>,
  baseUrl: string,
): Promise<string> {
  const path =
    review.previewVideoUrl ||
    review.sourceVideoUrl ||
    `/api/scripts/${encodeURIComponent(scriptId)}/takes/${encodeURIComponent(takeId)}/source`;
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  return `${baseUrl.replace(/\/+$/, '')}${path.startsWith('/') ? path : `/${path}`}`;
}

export async function sourceVideoUrl(scriptId: string, takeId: string): Promise<string> {
  const baseUrl = await loadAgentBaseUrl();
  return `${baseUrl}/api/scripts/${encodeURIComponent(scriptId)}/takes/${encodeURIComponent(takeId)}/source`;
}

export type AlignReviewPayload = {
  runId: string;
  editedVideoUrl: string;
  layoutPath: string;
  remotionStudioUrl?: string | null;
  remotionCompositionUrl?: string | null;
  remotionPortraitUrl?: string | null;
  layout: {
    schemaVersion: 1;
    updatedAt: string;
    pip: {
      shape: 'circle' | 'rectangle';
      x: number;
      y: number;
      w: number;
      h: number;
      objectPositionX: number;
      objectPositionY: number;
      scale: number;
    };
    hintPanel: {
      x: number;
      y: number;
      w: number;
      h: number;
    };
    beats?: Record<
      string,
      {
        pip: AlignReviewPayload['layout']['pip'];
        hintPanel: AlignReviewPayload['layout']['hintPanel'];
      }
    >;
  };
  slides: Array<{
    beatIndex: number;
    slideId: string;
    slideTitle: string;
    editedStart: number;
    editedEnd: number;
    durationSeconds: number;
    say?: string;
    saidLines?: Array<{ id: string; text: string; start: number; end: number }>;
    videoUrl: string;
    remotionStudioHint: string;
    remotionStudioUrl?: string | null;
    remotionPortraitUrl?: string | null;
    layout?: {
      pip: AlignReviewPayload['layout']['pip'];
      hintPanel: AlignReviewPayload['layout']['hintPanel'];
    };
  }>;
};

export async function fetchAlignReview(jobId: string): Promise<AlignReviewPayload> {
  const response = await agentFetch(`/api/jobs/${encodeURIComponent(jobId)}/align-review`);
  if (!response.ok) {
    throw new Error(`Align review unavailable (${response.status})`);
  }
  return (await response.json()) as AlignReviewPayload;
}

export async function saveAlignLayout(
  jobId: string,
  layout: AlignReviewPayload['layout'],
): Promise<AlignReviewPayload> {
  const response = await agentFetch(`/api/jobs/${encodeURIComponent(jobId)}/align-layout`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(layout),
  });
  if (!response.ok) {
    throw new Error(`Could not save align layout (${response.status})`);
  }
  const payload = (await response.json()) as { review?: AlignReviewPayload };
  if (!payload.review) {
    return fetchAlignReview(jobId);
  }
  return payload.review;
}

export async function absoluteAgentUrl(relativeOrAbsolute: string): Promise<string> {
  if (/^https?:\/\//i.test(relativeOrAbsolute)) {
    return relativeOrAbsolute;
  }
  const baseUrl = await loadAgentBaseUrl();
  return `${baseUrl}${relativeOrAbsolute.startsWith('/') ? '' : '/'}${relativeOrAbsolute}`;
}

export type CoverListItem = {
  id: string;
  label: string;
  path: string;
  url: string;
  usedBy: string[];
  meta?: {
    id: string;
    label: string;
    createdAt: string;
    source: string;
    fileName: string;
  };
};

export type CoversListResponse = {
  covers: CoverListItem[];
  platformCovers: Record<string, string>;
};

export async function fetchCovers(jobId: string): Promise<CoversListResponse> {
  const response = await agentFetch(`/api/jobs/${encodeURIComponent(jobId)}/covers`);
  if (!response.ok) {
    throw new Error(`Covers unavailable (${response.status})`);
  }
  return (await response.json()) as CoversListResponse;
}

export async function captureCoverFromComposite(
  jobId: string,
  options: {
    format?: 'portrait' | 'landscape';
    atSeconds?: number;
    label?: string;
  } = {},
): Promise<CoversListResponse> {
  const response = await agentFetch(`/api/jobs/${encodeURIComponent(jobId)}/covers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'capture-composite',
      format: options.format ?? 'portrait',
      atSeconds: options.atSeconds ?? 1,
      label: options.label,
    }),
  });
  const payload = (await response.json()) as CoversListResponse & { error?: string };
  if (!response.ok) {
    throw new Error(payload.error ?? `Cover capture failed (${response.status})`);
  }
  return payload;
}

export async function uploadCoverToAgent(
  jobId: string,
  file: { uri: string; name: string; type: string },
  label?: string,
): Promise<CoversListResponse> {
  const baseUrl = await loadAgentBaseUrl();
  const form = new FormData();
  form.append(
    'cover',
    {
      uri: file.uri,
      type: file.type || 'image/jpeg',
      name: file.name || 'cover.jpg',
    } as unknown as Blob,
  );
  form.append('label', label || file.name || 'cover');
  form.append('source', 'iphone');
  const response = await fetch(
    `${baseUrl}/api/jobs/${encodeURIComponent(jobId)}/covers`,
    withNgrokHeaders({ method: 'POST', body: form }),
  );
  const payload = (await response.json()) as CoversListResponse & { error?: string };
  if (!response.ok) {
    throw new Error(payload.error ?? `Cover upload failed (${response.status})`);
  }
  return payload;
}

export async function patchCoverPlatformMap(
  jobId: string,
  patch: {
    platformCovers?: Record<string, string | null>;
    batch?: { group: 'english' | 'china'; coverId: string | null; platforms: string[] };
  },
): Promise<CoversListResponse> {
  const response = await agentFetch(`/api/jobs/${encodeURIComponent(jobId)}/covers/platform-map`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  const payload = (await response.json()) as CoversListResponse & { error?: string };
  if (!response.ok) {
    throw new Error(payload.error ?? `Could not update cover map (${response.status})`);
  }
  return payload;
}

export async function deleteCoverFromAgent(jobId: string, coverId: string): Promise<CoversListResponse> {
  const response = await agentFetch(
    `/api/jobs/${encodeURIComponent(jobId)}/covers/${encodeURIComponent(coverId)}`,
    { method: 'DELETE' },
  );
  const payload = (await response.json()) as CoversListResponse & { error?: string };
  if (!response.ok) {
    throw new Error(payload.error ?? `Could not delete cover (${response.status})`);
  }
  return payload;
}

export async function uploadTakeToAgent(take: TakeManifest): Promise<{ jobId: string }> {
  const baseUrl = await loadAgentBaseUrl();
  const form = new FormData();
  form.append(
    'take',
    {
      uri: takeManifestUri(take.takeId),
      type: 'application/json',
      name: `${take.takeId}.json`,
    } as unknown as Blob,
  );
  form.append(
    'video',
    {
      uri: take.videoUri,
      type: 'video/mp4',
      name: `${take.takeId}.mp4`,
    } as unknown as Blob,
  );

  const response = await fetch(`${baseUrl}/api/upload`, withNgrokHeaders({
    method: 'POST',
    body: form,
  }));
  const payload = (await response.json()) as { jobId?: string; error?: string };
  if (!response.ok) {
    throw new Error(payload.error ?? `Upload failed (${response.status})`);
  }
  if (!payload.jobId) {
    throw new Error('Upload succeeded but no jobId returned');
  }
  return { jobId: payload.jobId };
}

function takeManifestUri(takeId: string): string {
  return `${FileSystem.documentDirectory ?? ''}turn-outdoor-teleprompter/takes/${encodeURIComponent(takeId)}.json`;
}
