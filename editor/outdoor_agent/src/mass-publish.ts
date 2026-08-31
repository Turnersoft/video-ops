import path from 'node:path';

import {
  buildMassPublishBoard,
  filterDispatchableItems,
  formatMassPublishFailure,
  isBrowserHandoffPlatform,
  parseMassPublishItemId,
  type MassPublishBoard,
  type MassPublishEpisodeInput,
  type MassPublishItem,
  type MassPublishLang,
  type MassPublishRecord,
} from '../../../src/massPublish.ts';
import type { BeatPosterSocialPostsFile } from '../../../src/beatPosterPublishPreview.ts';
import { scanVideoOpsCatalog } from './catalog.ts';
import { fileExists, readJson, writeJson } from './fs_util.ts';
import {
  ensureDir,
  publishStatePathForTake,
  scriptBeatPostersDir,
  scriptBeatPostersLangDir,
  VIDEO_OPS_ROOT,
} from './paths.ts';
import {
  getBeatPosterPublishState,
  publishBeatPosterAlbum,
  recordManualBeatPosterAlbumPublish,
} from './beat-posters/publish.ts';
import { prepareBrowserHandoff } from './publish/browser-handoff.ts';
import { publishJob } from './publish/index.ts';
import {
  episodeTitle,
  infographicReadiness,
  videoReadiness,
} from './publish-plan.ts';
import { newJobId } from './schema.ts';
import { abortSubprocess } from './subprocess.ts';

const DISPATCH_DIR = path.join(
  VIDEO_OPS_ROOT,
  'editor',
  'outdoor_agent',
  'data',
  'mass-publish',
);

export type MassDispatchItemStatus =
  | 'queued'
  | 'running'
  /** Creator page is open; the squat waits for you to publish or skip. */
  | 'awaiting_manual'
  | 'published'
  | 'failed'
  | 'skipped'
  | 'cancelled';

export type MassDispatchEventLevel = 'info' | 'warn' | 'error';

export type MassDispatchEvent = {
  at: string;
  itemId?: string;
  level: MassDispatchEventLevel;
  message: string;
  detail?: string;
};

export type MassDispatchItem = {
  id: string;
  title: string;
  episodeTitle?: string;
  kind: MassPublishItem['kind'];
  lang: MassPublishLang;
  platform: string;
  scriptId: string;
  status: MassDispatchItemStatus;
  progress?: string;
  error?: string;
  errorDetail?: string;
  url?: string;
  postId?: string;
  startedAt?: string;
  finishedAt?: string;
};

export type MassDispatch = {
  id: string;
  startedAt: string;
  finishedAt?: string;
  status: 'running' | 'waiting' | 'done' | 'failed' | 'cancelled';
  items: MassDispatchItem[];
  events?: MassDispatchEvent[];
  summary: {
    queued: number;
    awaiting: number;
    published: number;
    failed: number;
    skipped: number;
    cancelled: number;
  };
};

export type MassDispatchRef = {
  id: string;
  startedAt: string;
  finishedAt?: string;
  status: MassDispatch['status'];
  summary: MassDispatch['summary'];
};

export type MassPublishQuery = {
  seriesId?: string;
  lang?: string;
};

export type MassPublishBoardResponse = MassPublishBoard & {
  activeDispatch: MassDispatch | null;
};

export type StartMassDispatchBody = {
  itemIds?: unknown;
};

function recoverDispatch(dispatch: MassDispatch | null): MassDispatch | null {
  if (!dispatch || dispatch.status !== 'running') {
    return dispatch;
  }
  dispatch.status = 'failed';
  dispatch.finishedAt = new Date().toISOString();
  for (const item of dispatch.items) {
    if (item.status === 'queued' || item.status === 'running') {
      item.status = 'failed';
      item.progress = undefined;
      item.error = 'Agent restarted before this squat finished';
      item.errorDetail = item.error;
      appendDispatchEvent(dispatch, {
        itemId: item.id,
        level: 'error',
        message: `${item.platform} ${item.kind} aborted: agent restarted`,
        detail: item.error,
      }, false);
    }
  }
  dispatch.summary = summarizeDispatch(dispatch.items);
  normalizeDispatch(dispatch);
  saveDispatch(dispatch);
  return dispatch;
}

let activeDispatch: MassDispatch | null = null;
let dispatchLoop: Promise<void> | null = null;
let abortingDispatchId: string | null = null;

const STOP_MILESTONES = [
  'Stopping upload',
  'Killing sau process',
  'Closing publisher',
  'Stopped',
] as const;

function massPublishAbortKey(id: string): string {
  return `mass-publish:${id}`;
}

function isDispatchAborting(dispatch: MassDispatch): boolean {
  return abortingDispatchId === dispatch.id;
}

function isStopError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /Stopped by Clear queue|signal: (killed|terminated)|SIGTERM|SIGKILL/i.test(message);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseBoardLang(value: string | undefined): MassPublishLang | 'all' {
  if (value === 'en' || value === 'zh' || value === 'all') {
    return value;
  }
  return 'zh';
}

function coverUrl(scriptId: string, lang: MassPublishLang | 'all'): string {
  const coverLang = lang === 'en' ? 'en' : 'zh';
  return `/api/scripts/${encodeURIComponent(scriptId)}/beat-posters/cover/${coverLang}/png`;
}

function pickVideoTake(
  takes: Array<{
    takeId: string;
    recordedAt?: string | null;
    hasPortrait?: boolean;
    hasLandscape?: boolean;
  }>,
): { takeId: string; recordedAt: string | null } | null {
  if (!takes.length) {
    return null;
  }
  const withVideo = takes.filter((take) => take.hasPortrait || take.hasLandscape);
  const pool = withVideo.length ? withVideo : takes;
  const sorted = [...pool].sort((left, right) =>
    String(right.recordedAt ?? '').localeCompare(String(left.recordedAt ?? '')),
  );
  const take = sorted[0];
  if (!take) {
    return null;
  }
  return { takeId: take.takeId, recordedAt: take.recordedAt ?? null };
}

function loadInfographicRecords(scriptId: string): MassPublishRecord[] {
  const state = getBeatPosterPublishState(scriptId);
  return state.posts.map((post) => ({
    platform: post.platform,
    lang: post.lang,
    status: post.status,
    publishedAt: post.publishedAt,
    url: post.url,
    postId: post.postId,
    stub: post.stub,
  }));
}

function loadVideoRecords(scriptId: string, takeId: string): MassPublishRecord[] {
  const statePath = publishStatePathForTake(scriptId, takeId);
  if (!fileExists(statePath)) {
    return [];
  }
  try {
    const raw = readJson<{ posts?: MassPublishRecord[] }>(statePath);
    return Array.isArray(raw.posts) ? raw.posts : [];
  } catch {
    return [];
  }
}

function withCaptions(
  readiness: { ready: boolean; blockers: string[] },
  captionBlockers: string[],
): { ready: boolean; blockers: string[] } {
  const blockers = [...readiness.blockers, ...captionBlockers];
  return { ready: readiness.ready && captionBlockers.length === 0, blockers };
}

function scanEpisodes(lang: MassPublishLang | 'all'): MassPublishEpisodeInput[] {
  const catalog = scanVideoOpsCatalog();
  const titleLang: MassPublishLang = lang === 'en' ? 'en' : 'zh';
  const episodes: MassPublishEpisodeInput[] = [];

  for (const series of catalog.series) {
    for (const episode of series.episodes) {
      const socialPath = episode.paths?.socialPosts ?? null;
      const captionBlockers: string[] = [];
      if (!episode.hasSocialPosts) {
        captionBlockers.push('No social-posts.json captions');
      }
      let social: BeatPosterSocialPostsFile | null = null;
      if (socialPath && fileExists(socialPath)) {
        try {
          social = readJson<BeatPosterSocialPostsFile>(socialPath);
        } catch {
          social = null;
        }
      }
      const video = videoReadiness(episode.takes);
      const take = pickVideoTake(episode.takes);
      const takeId = take?.takeId ?? null;
      const jobId = takeId ? newJobId(takeId) : null;
      episodes.push({
        seriesId: series.id,
        seriesTitle: series.title,
        scriptId: episode.scriptId,
        episodeTitle: episodeTitle(
          episode.scriptId,
          episode.title,
          titleLang,
          socialPath,
        ),
        coverUrl: coverUrl(episode.scriptId, lang),
        infographic: {
          zh: withCaptions(infographicReadiness(episode.scriptId, 'zh'), captionBlockers),
          en: withCaptions(infographicReadiness(episode.scriptId, 'en'), captionBlockers),
        },
        video: {
          zh: withCaptions(video, captionBlockers),
          en: withCaptions(video, captionBlockers),
        },
        jobId,
        takeId,
        infographicRecords: loadInfographicRecords(episode.scriptId),
        videoRecords: takeId ? loadVideoRecords(episode.scriptId, takeId) : [],
        social,
      });
    }
  }

  return episodes;
}

export function buildMassPublishBoardFromCatalog(
  query: MassPublishQuery,
): MassPublishBoardResponse {
  const lang = parseBoardLang(query.lang);
  const seriesId = query.seriesId?.trim() || 'all';
  const board = buildMassPublishBoard({
    seriesId,
    lang,
    episodes: scanEpisodes(lang),
  });
  return {
    ...board,
    activeDispatch: activeDispatch ? normalizeDispatch(activeDispatch) : null,
  };
}

function dispatchPath(id: string): string {
  return path.join(DISPATCH_DIR, `${id}.json`);
}

function latestPointerPath(): string {
  return path.join(DISPATCH_DIR, 'latest.json');
}

function eventLogPath(): string {
  return path.join(DISPATCH_DIR, 'events.jsonl');
}

function saveDispatch(dispatch: MassDispatch): void {
  ensureDir(DISPATCH_DIR);
  writeJson(dispatchPath(dispatch.id), dispatch);
  writeJson(latestPointerPath(), { id: dispatch.id });
}

function appendEventLog(event: MassDispatchEvent & { dispatchId: string }): void {
  ensureDir(DISPATCH_DIR);
  Deno.writeTextFileSync(eventLogPath(), `${JSON.stringify(event)}\n`, { append: true });
  const prefix = `[squat ${event.dispatchId}]`;
  if (event.level === 'error') {
    console.error(prefix, event.message);
    if (event.detail) {
      console.error(prefix, event.detail);
    }
    return;
  }
  if (event.level === 'warn') {
    console.warn(prefix, event.message);
    return;
  }
  console.log(prefix, event.message);
}

function appendDispatchEvent(
  dispatch: MassDispatch,
  event: Omit<MassDispatchEvent, 'at'>,
  persist = true,
): void {
  const full: MassDispatchEvent = {
    at: new Date().toISOString(),
    ...event,
  };
  appendEventLog({ ...full, dispatchId: dispatch.id });
  const events = dispatch.events ?? [];
  events.push(full);
  dispatch.events = events.length > 200 ? events.slice(-200) : events;
  if (persist) {
    saveDispatch(dispatch);
  }
}

function loadLatestDispatch(): MassDispatch | null {
  const pointer = latestPointerPath();
  if (!fileExists(pointer)) {
    return null;
  }
  try {
    const raw = readJson<{ id?: string }>(pointer);
    if (!raw.id) {
      return null;
    }
    return loadDispatch(raw.id);
  } catch {
    return null;
  }
}

function normalizeDispatch(dispatch: MassDispatch): MassDispatch {
  dispatch.events = dispatch.events ?? [];
  dispatch.summary = summarizeDispatch(dispatch.items);
  for (const item of dispatch.items) {
    if (!item.error || item.errorDetail) {
      continue;
    }
    const formatted = formatMassPublishFailure(item.error);
    item.errorDetail = formatted.detail;
    item.error = formatted.message;
  }
  return dispatch;
}

export function loadDispatch(id: string): MassDispatch | null {
  if (activeDispatch?.id === id) {
    return normalizeDispatch(activeDispatch);
  }
  const filePath = dispatchPath(id);
  if (!fileExists(filePath)) {
    return null;
  }
  try {
    return normalizeDispatch(readJson<MassDispatch>(filePath));
  } catch {
    return null;
  }
}

export function getActiveMassDispatch(): MassDispatch | null {
  return activeDispatch ? normalizeDispatch(activeDispatch) : null;
}

export function listMassDispatches(): MassDispatchRef[] {
  ensureDir(DISPATCH_DIR);
  const refs: MassDispatchRef[] = [];
  for (const entry of Deno.readDirSync(DISPATCH_DIR)) {
    if (!entry.isFile || !entry.name.startsWith('squat-') || !entry.name.endsWith('.json')) {
      continue;
    }
    const id = entry.name.slice(0, -'.json'.length);
    const dispatch = id === activeDispatch?.id ? activeDispatch : loadDispatch(id);
    if (!dispatch) {
      continue;
    }
    refs.push({
      id: dispatch.id,
      startedAt: dispatch.startedAt,
      finishedAt: dispatch.finishedAt,
      status: dispatch.status,
      summary: dispatch.summary,
    });
  }
  refs.sort((left, right) => right.startedAt.localeCompare(left.startedAt));
  return refs;
}

function summarizeDispatch(items: MassDispatchItem[]): MassDispatch['summary'] {
  let queued = 0;
  let awaiting = 0;
  let published = 0;
  let failed = 0;
  let skipped = 0;
  let cancelled = 0;
  for (const item of items) {
    switch (item.status) {
      case 'queued':
      case 'running':
        queued += 1;
        break;
      case 'awaiting_manual':
        awaiting += 1;
        break;
      case 'published':
        published += 1;
        break;
      case 'failed':
        failed += 1;
        break;
      case 'skipped':
        skipped += 1;
        break;
      case 'cancelled':
        cancelled += 1;
        break;
      default: {
        const exhaustive: never = item.status;
        return exhaustive;
      }
    }
  }
  return { queued, awaiting, published, failed, skipped, cancelled };
}

function parseItemIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const ids: string[] = [];
  for (const value of raw) {
    if (typeof value === 'string' && value.trim()) {
      ids.push(value.trim());
    }
  }
  return ids;
}

function toDispatchItem(item: MassPublishItem): MassDispatchItem {
  return {
    id: item.id,
    title: item.title,
    episodeTitle: item.episodeTitle,
    kind: item.kind,
    lang: item.lang,
    platform: item.platform,
    scriptId: item.scriptId,
    status: 'queued',
    progress: 'Queued',
  };
}

function persistDispatch(dispatch: MassDispatch): void {
  dispatch.summary = summarizeDispatch(dispatch.items);
  saveDispatch(dispatch);
}

function setItemProgress(
  dispatch: MassDispatch,
  entry: MassDispatchItem,
  message: string,
): void {
  entry.progress = message;
  persistDispatch(dispatch);
  appendDispatchEvent(dispatch, {
    itemId: entry.id,
    level: 'info',
    message: `${entry.platform}: ${message}`,
  }, false);
}

async function publishOne(
  dispatch: MassDispatch,
  item: MassPublishItem,
  onProgress: (message: string) => void,
): Promise<{ url?: string; postId?: string }> {
  const parsed = parseMassPublishItemId(item.id);
  if (!parsed) {
    throw new Error(`Bad item id ${item.id}`);
  }
  if (isDispatchAborting(dispatch)) {
    throw new Error('Stopped by Clear queue');
  }
  if (parsed.kind === 'infographic') {
    const outcome = await publishBeatPosterAlbum({
      scriptId: parsed.scriptId,
      lang: parsed.lang,
      platform: parsed.platform,
      republish: true,
      onProgress,
      abortKey: massPublishAbortKey(dispatch.id),
      shouldAbort: () => isDispatchAborting(dispatch),
    });
    return { url: outcome.record.url, postId: outcome.record.postId };
  }
  if (!item.jobId) {
    throw new Error('No composite take to publish — film this episode first');
  }
  onProgress(`Uploading video to ${parsed.platform}`);
  const record = await publishJob(item.jobId, parsed.platform, { republish: true });
  return { url: record.url, postId: record.postId };
}

function cancelQueuedItem(entry: MassDispatchItem): void {
  entry.status = 'cancelled';
  entry.progress = 'Stopped before start';
  entry.error = 'Stopped by Clear queue';
  entry.errorDetail = entry.error;
  entry.finishedAt = new Date().toISOString();
}

async function finishCancelledItem(
  dispatch: MassDispatch,
  entry: MassDispatchItem,
): Promise<void> {
  for (const milestone of STOP_MILESTONES) {
    entry.progress = milestone;
    persistDispatch(dispatch);
    appendDispatchEvent(dispatch, {
      itemId: entry.id,
      level: 'warn',
      message: `${entry.platform}: ${milestone}`,
    }, false);
    await sleep(450);
  }
  entry.status = 'cancelled';
  entry.error = 'Stopped by Clear queue';
  entry.errorDetail = entry.error;
  entry.finishedAt = new Date().toISOString();
  persistDispatch(dispatch);
  appendDispatchEvent(dispatch, {
    itemId: entry.id,
    level: 'warn',
    message: `${entry.platform} ${entry.kind} stopped`,
  });
}

/**
 * Platforms that block automated uploads: open the creator page with the
 * caption ready, then wait for the human to publish or skip.
 * Returns true when the item now waits on you.
 */
async function runBrowserHandoffItem(
  dispatch: MassDispatch,
  entry: MassDispatchItem,
  item: MassPublishItem,
): Promise<boolean> {
  try {
    setItemProgress(dispatch, entry, 'Opening creator page');
    const handoff = await prepareBrowserHandoff({
      platform: entry.platform,
      captionTitle: item.captionTitle,
      captionBody: item.captionBody,
      albumDir: entry.kind === 'infographic'
        ? (fileExists(scriptBeatPostersLangDir(entry.scriptId, entry.lang))
          ? scriptBeatPostersLangDir(entry.scriptId, entry.lang)
          : scriptBeatPostersDir(entry.scriptId))
        : null,
    });
    entry.status = 'awaiting_manual';
    entry.progress = handoff.message;
    persistDispatch(dispatch);
    appendDispatchEvent(dispatch, {
      itemId: entry.id,
      level: 'warn',
      message: `${entry.platform} waiting for you: ${handoff.creatorUrl}`,
    });
    return true;
  } catch (error) {
    const formatted = formatMassPublishFailure(error);
    entry.status = 'failed';
    entry.progress = undefined;
    entry.error = formatted.message;
    entry.errorDetail = formatted.detail;
    entry.finishedAt = new Date().toISOString();
    persistDispatch(dispatch);
    appendDispatchEvent(dispatch, {
      itemId: entry.id,
      level: 'error',
      message: `${entry.platform} handoff failed: ${formatted.message}`,
      detail: formatted.detail,
    });
    return false;
  }
}

/** Returns true when the item is parked, waiting on a manual publish. */
async function runDispatchItem(
  dispatch: MassDispatch,
  entry: MassDispatchItem,
  item: MassPublishItem | undefined,
): Promise<boolean> {
  entry.status = 'running';
  entry.startedAt = new Date().toISOString();
  entry.progress = 'Starting';
  persistDispatch(dispatch);
  appendDispatchEvent(dispatch, {
    itemId: entry.id,
    level: 'info',
    message: `Started ${entry.platform} ${entry.kind} ${entry.scriptId}`,
  });
  if (!item) {
    entry.status = 'skipped';
    entry.progress = undefined;
    entry.error = 'Item no longer dispatchable';
    entry.errorDetail = entry.error;
    entry.finishedAt = new Date().toISOString();
    persistDispatch(dispatch);
    appendDispatchEvent(dispatch, {
      itemId: entry.id,
      level: 'warn',
      message: `${entry.platform} skipped: no longer dispatchable`,
    });
    return false;
  }
  if (isBrowserHandoffPlatform(entry.platform)) {
    return await runBrowserHandoffItem(dispatch, entry, item);
  }
  try {
    const result = await publishOne(dispatch, item, (message) => {
      if (isDispatchAborting(dispatch)) {
        return;
      }
      setItemProgress(dispatch, entry, message);
    });
    if (isDispatchAborting(dispatch)) {
      await finishCancelledItem(dispatch, entry);
      return false;
    }
    entry.status = 'published';
    entry.progress = 'Published';
    entry.url = result.url;
    entry.postId = result.postId;
    entry.finishedAt = new Date().toISOString();
    persistDispatch(dispatch);
    appendDispatchEvent(dispatch, {
      itemId: entry.id,
      level: 'info',
      message: `${entry.platform} published${result.url ? ` ${result.url}` : ''}`,
    });
  } catch (error) {
    if (isDispatchAborting(dispatch) || isStopError(error)) {
      await finishCancelledItem(dispatch, entry);
      return false;
    }
    const formatted = formatMassPublishFailure(error);
    entry.status = 'failed';
    entry.progress = undefined;
    entry.error = formatted.message;
    entry.errorDetail = formatted.detail;
    entry.finishedAt = new Date().toISOString();
    persistDispatch(dispatch);
    appendDispatchEvent(dispatch, {
      itemId: entry.id,
      level: 'error',
      message: `${entry.platform} ${entry.kind} failed: ${formatted.message}`,
      detail: formatted.detail,
    });
  }
  return false;
}

function pauseDispatchForManualItem(dispatch: MassDispatch, entry: MassDispatchItem): void {
  dispatch.status = 'waiting';
  persistDispatch(dispatch);
  appendDispatchEvent(dispatch, {
    level: 'warn',
    message:
      `Squat paused: publish ${entry.platform} ${entry.kind} in the browser, then mark it live or skip`,
  });
}

async function runDispatch(dispatch: MassDispatch, items: MassPublishItem[]): Promise<void> {
  const byId = new Map(items.map((item) => [item.id, item]));
  appendDispatchEvent(dispatch, {
    level: 'info',
    message: `Running ${dispatch.summary.queued} uploads in click order`,
  });
  for (const entry of dispatch.items) {
    if (isDispatchAborting(dispatch)) {
      break;
    }
    if (entry.status !== 'queued') {
      continue;
    }
    const parked = await runDispatchItem(dispatch, entry, byId.get(entry.id));
    if (parked) {
      pauseDispatchForManualItem(dispatch, entry);
      return;
    }
  }
  if (isDispatchAborting(dispatch)) {
    for (const entry of dispatch.items) {
      if (entry.status === 'queued') {
        cancelQueuedItem(entry);
      }
    }
    persistDispatch(dispatch);
    dispatch.status = 'cancelled';
    dispatch.finishedAt = new Date().toISOString();
    persistDispatch(dispatch);
    appendDispatchEvent(dispatch, {
      level: 'warn',
      message: `Squat stopped: ${dispatch.summary.published} live, ${dispatch.summary.cancelled} stopped`,
    });
    abortingDispatchId = null;
    return;
  }
  persistDispatch(dispatch);
  const failedOnly = dispatch.summary.published === 0 && dispatch.summary.failed > 0;
  dispatch.status = failedOnly ? 'failed' : 'done';
  dispatch.finishedAt = new Date().toISOString();
  persistDispatch(dispatch);
  appendDispatchEvent(dispatch, {
    level: failedOnly ? 'error' : 'info',
    message: `Squat ${dispatch.status}: ${dispatch.summary.published} live, ${dispatch.summary.failed} failed`,
  });
}

export function abortMassDispatch(): MassDispatch {
  if (
    !activeDispatch ||
    (activeDispatch.status !== 'running' && activeDispatch.status !== 'waiting')
  ) {
    throw new Error('No running squat to stop');
  }
  abortingDispatchId = activeDispatch.id;
  const dispatch = activeDispatch;
  const wasWaiting = dispatch.status === 'waiting';
  appendDispatchEvent(dispatch, {
    level: 'warn',
    message: 'Clear queue: stopping squat',
  });
  for (const item of dispatch.items) {
    if (item.status === 'queued' || item.status === 'awaiting_manual') {
      cancelQueuedItem(item);
    } else if (item.status === 'running') {
      item.progress = STOP_MILESTONES[0];
    }
  }
  persistDispatch(dispatch);
  if (wasWaiting) {
    // Nothing is uploading while a manual item waits, so finalize here.
    dispatch.status = 'cancelled';
    dispatch.finishedAt = new Date().toISOString();
    persistDispatch(dispatch);
    appendDispatchEvent(dispatch, {
      level: 'warn',
      message: `Squat stopped: ${dispatch.summary.published} live, ${dispatch.summary.cancelled} stopped`,
    });
    abortingDispatchId = null;
    return dispatch;
  }
  abortSubprocess(massPublishAbortKey(dispatch.id));
  return dispatch;
}

/** Mark a paused browser-handoff cell done (or skipped) and resume the squat. */
export function resolveMassDispatchManualItem(params: {
  itemId: string;
  result: 'published' | 'skipped';
}): MassDispatch {
  const dispatch = activeDispatch;
  if (!dispatch || dispatch.status !== 'waiting') {
    throw new Error('No squat is waiting on a manual publish');
  }
  const entry = dispatch.items.find((item) => item.id === params.itemId);
  if (!entry) {
    throw new Error(`${params.itemId} is not part of squat ${dispatch.id}`);
  }
  if (entry.status !== 'awaiting_manual') {
    throw new Error(`${entry.platform} ${entry.kind} is not waiting on you`);
  }
  const parsed = parseMassPublishItemId(entry.id);
  if (!parsed) {
    throw new Error(`Bad item id ${entry.id}`);
  }

  if (params.result === 'published') {
    if (parsed.kind !== 'infographic') {
      throw new Error('Only poster albums can be marked live by hand');
    }
    const outcome = recordManualBeatPosterAlbumPublish({
      scriptId: parsed.scriptId,
      lang: parsed.lang,
      platform: parsed.platform,
    });
    entry.status = 'published';
    entry.progress = 'Published by hand';
    entry.postId = outcome.record.postId;
  } else {
    entry.status = 'skipped';
    entry.progress = undefined;
  }
  entry.finishedAt = new Date().toISOString();
  persistDispatch(dispatch);
  appendDispatchEvent(dispatch, {
    itemId: entry.id,
    level: 'info',
    message: params.result === 'published'
      ? `${entry.platform} marked live by hand`
      : `${entry.platform} skipped by hand`,
  });

  if (!dispatch.items.some((item) => item.status === 'queued')) {
    dispatch.status = dispatch.summary.published === 0 && dispatch.summary.failed > 0
      ? 'failed'
      : 'done';
    dispatch.finishedAt = new Date().toISOString();
    persistDispatch(dispatch);
    appendDispatchEvent(dispatch, {
      level: 'info',
      message: `Squat ${dispatch.status}: ${dispatch.summary.published} live, ${dispatch.summary.failed} failed`,
    });
    return dispatch;
  }

  dispatch.status = 'running';
  persistDispatch(dispatch);
  appendDispatchEvent(dispatch, {
    level: 'info',
    message: `Resuming squat: ${dispatch.summary.queued} left`,
  });
  beginDispatchLoop(dispatch, buildDispatchBoardItems());
  return dispatch;
}

function buildDispatchBoardItems(): MassPublishItem[] {
  return buildMassPublishBoard({
    seriesId: 'all',
    lang: 'all',
    episodes: scanEpisodes('all'),
  }).items;
}

function beginDispatchLoop(dispatch: MassDispatch, items: MassPublishItem[]): void {
  dispatchLoop = runDispatch(dispatch, items).catch((error) => {
    const formatted = formatMassPublishFailure(error);
    dispatch.status = 'failed';
    dispatch.finishedAt = new Date().toISOString();
    dispatch.items.forEach((entry) => {
      if (entry.status === 'queued' || entry.status === 'running') {
        entry.status = 'failed';
        entry.progress = undefined;
        entry.error = formatted.message;
        entry.errorDetail = formatted.detail;
      }
    });
    persistDispatch(dispatch);
    appendDispatchEvent(dispatch, {
      level: 'error',
      message: `Squat aborted: ${formatted.message}`,
      detail: formatted.detail,
    });
  }).finally(() => {
    dispatchLoop = null;
  });
  void dispatchLoop;
}

export function startMassDispatch(body: StartMassDispatchBody): MassDispatch {
  if (activeDispatch?.status === 'running') {
    throw new Error(`Dispatch ${activeDispatch.id} is still running`);
  }
  if (activeDispatch?.status === 'waiting') {
    throw new Error(
      `Dispatch ${activeDispatch.id} is waiting on a manual publish — mark it live or skip it first`,
    );
  }
  abortingDispatchId = null;
  const itemIds = parseItemIds(body.itemIds);
  if (!itemIds.length) {
    throw new Error('Select at least one pending cell for the squat');
  }
  const queued = filterDispatchableItems(buildDispatchBoardItems(), itemIds);
  if (!queued.length) {
    throw new Error('None of the selected cells are auto-publishable');
  }
  const dispatchItems = queued.map(toDispatchItem);
  const dispatch: MassDispatch = {
    id: `squat-${Date.now().toString(36)}`,
    startedAt: new Date().toISOString(),
    status: 'running',
    items: dispatchItems,
    events: [],
    summary: summarizeDispatch(dispatchItems),
  };
  activeDispatch = dispatch;
  saveDispatch(dispatch);
  appendDispatchEvent(dispatch, {
    level: 'info',
    message: `Squat started with ${dispatchItems.length} items`,
  });
  beginDispatchLoop(dispatch, queued);
  return dispatch;
}

activeDispatch = recoverDispatch(loadLatestDispatch());
