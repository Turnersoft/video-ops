/**
 * Mass-publish board.
 *
 * One episode folder holds both the poster album and the later video.
 * This module flattens episodes × platforms × {infographic, video} so a
 * dispatch squat can ship many pending posters (or videos) and show
 * which cells are already live.
 */

import {
  BEAT_POSTER_CHINA_PLATFORMS,
  BEAT_POSTER_POSTIZ_PLATFORMS,
  isBeatPosterPostizPlatform,
  isBeatPosterSauAutoPlatform,
  type BeatPosterSocialPostsFile,
} from './beatPosterPublishPreview.ts';
import {
  compareProductSeries,
  parseEpisodeIndex,
  type PublishContentKind,
  type PublishPlanLang,
} from './publishPlan.ts';

export type MassPublishKind = PublishContentKind;
export type MassPublishLang = PublishPlanLang;
export type MassPublishStatus = 'pending' | 'published' | 'failed' | 'blocked';
export type MassPublishProvider = 'postiz' | 'sau' | 'manual' | 'browser';
export type MassPublishMode = 'auto' | 'manual';

/**
 * Platforms that reject automated uploads. The squat opens the creator page in
 * the logged-in browser, hands over the caption, then waits for you to publish.
 */
export const MASS_PUBLISH_BROWSER_HANDOFF_PLATFORMS = [
  'xiaohongshu',
] as const;

export function isBrowserHandoffPlatform(platform: string): boolean {
  return (MASS_PUBLISH_BROWSER_HANDOFF_PLATFORMS as readonly string[]).includes(platform);
}

export const MASS_PUBLISH_VIDEO_PLATFORMS_EN = [
  'youtube',
  'x',
  'linkedin',
  'instagram',
  'tiktok',
  'facebook',
  'bluesky',
  'threads',
  'reddit',
] as const;

export const MASS_PUBLISH_VIDEO_PLATFORMS_ZH = [
  'xiaohongshu',
  'bilibili',
  'douyin',
  'weibo',
  'wechat_channels',
  'wechat',
  'kuaishou',
] as const;

/** China video lanes SAU can upload. Weibo video stays manual. */
export const MASS_PUBLISH_VIDEO_SAU_PLATFORMS = [
  'xiaohongshu',
  'bilibili',
  'douyin',
  'wechat_channels',
  'kuaishou',
] as const;

export type MassPublishRecord = {
  platform: string;
  lang?: MassPublishLang;
  status: string;
  publishedAt?: string;
  url?: string;
  postId?: string;
  stub?: boolean;
};

export type MassPublishReadiness = {
  ready: boolean;
  blockers: string[];
};

export type MassPublishEpisodeInput = {
  seriesId: string;
  seriesTitle: string;
  scriptId: string;
  episodeTitle: string;
  coverUrl: string | null;
  infographic: Record<MassPublishLang, MassPublishReadiness>;
  video: Record<MassPublishLang, MassPublishReadiness>;
  jobId: string | null;
  takeId: string | null;
  infographicRecords: MassPublishRecord[];
  videoRecords: MassPublishRecord[];
  social?: BeatPosterSocialPostsFile | null;
};

export type MassPublishItem = {
  id: string;
  seriesId: string;
  seriesTitle: string;
  scriptId: string;
  episodeIndex: number | null;
  episodeTitle: string;
  kind: MassPublishKind;
  lang: MassPublishLang;
  platform: string;
  title: string;
  captionTitle: string;
  captionBody: string;
  ready: boolean;
  blockers: string[];
  provider: MassPublishProvider;
  publishMode: MassPublishMode;
  status: MassPublishStatus;
  canDispatch: boolean;
  publishedAt: string | null;
  url: string | null;
  openUrl: string | null;
  postId: string | null;
  stub: boolean;
  jobId: string | null;
  takeId: string | null;
  coverUrl: string | null;
};

export type MassPublishEpisodeRow = {
  scriptId: string;
  seriesId: string;
  seriesTitle: string;
  episodeIndex: number | null;
  episodeTitle: string;
  coverUrl: string | null;
  infographicReady: boolean;
  videoReady: boolean;
  infographicBlockers: string[];
  videoBlockers: string[];
  jobId: string | null;
  takeId: string | null;
  itemIds: string[];
};

export type MassPublishBoard = {
  schemaVersion: 1;
  generatedAt: string;
  seriesId: string;
  lang: MassPublishLang | 'all';
  platforms: string[];
  episodes: MassPublishEpisodeRow[];
  items: MassPublishItem[];
  summary: {
    episodeCount: number;
    itemCount: number;
    pendingAuto: number;
    pendingManual: number;
    published: number;
    blocked: number;
    failed: number;
    posterPending: number;
    videoPending: number;
  };
};

export function massPublishItemId(params: {
  scriptId: string;
  kind: MassPublishKind;
  lang: MassPublishLang;
  platform: string;
}): string {
  return `${params.scriptId}::${params.kind}::${params.lang}::${params.platform}`;
}

export function parseMassPublishItemId(id: string): {
  scriptId: string;
  kind: MassPublishKind;
  lang: MassPublishLang;
  platform: string;
} | null {
  const parts = id.split('::');
  if (parts.length !== 4) {
    return null;
  }
  const [scriptId, kind, lang, platform] = parts;
  if (!scriptId || !platform) {
    return null;
  }
  if (kind !== 'infographic' && kind !== 'video') {
    return null;
  }
  if (lang !== 'en' && lang !== 'zh') {
    return null;
  }
  return { scriptId, kind, lang, platform };
}

export function massPublishPlatforms(
  lang: MassPublishLang,
  kind: MassPublishKind,
): string[] {
  if (kind === 'infographic') {
    return lang === 'zh'
      ? [...BEAT_POSTER_CHINA_PLATFORMS]
      : [...BEAT_POSTER_POSTIZ_PLATFORMS];
  }
  return lang === 'zh'
    ? [...MASS_PUBLISH_VIDEO_PLATFORMS_ZH]
    : [...MASS_PUBLISH_VIDEO_PLATFORMS_EN];
}

export function massPublishColumns(lang: MassPublishLang | 'all'): string[] {
  if (lang === 'zh') {
    return uniquePlatforms([
      ...massPublishPlatforms('zh', 'infographic'),
      ...massPublishPlatforms('zh', 'video'),
    ]);
  }
  if (lang === 'en') {
    return uniquePlatforms([
      ...massPublishPlatforms('en', 'video'),
      ...massPublishPlatforms('en', 'infographic'),
    ]);
  }
  return uniquePlatforms([
    ...massPublishColumns('zh'),
    ...massPublishColumns('en'),
  ]);
}

export function massPublishProvider(
  kind: MassPublishKind,
  lang: MassPublishLang,
  platform: string,
): { provider: MassPublishProvider; publishMode: MassPublishMode } {
  if (isBrowserHandoffPlatform(platform)) {
    // Poster albums get the creator-page handoff; videos stay fully manual.
    return {
      provider: 'browser',
      publishMode: kind === 'infographic' ? 'auto' : 'manual',
    };
  }
  if (kind === 'infographic') {
    if (lang === 'en' && isBeatPosterPostizPlatform(platform)) {
      return { provider: 'postiz', publishMode: 'auto' };
    }
    if (lang === 'zh' && isBeatPosterSauAutoPlatform(platform)) {
      return { provider: 'sau', publishMode: 'auto' };
    }
    return { provider: 'manual', publishMode: 'manual' };
  }
  if (lang === 'en' && isVideoPostizPlatform(platform)) {
    return { provider: 'postiz', publishMode: 'auto' };
  }
  if (lang === 'zh' && isVideoSauPlatform(platform)) {
    return { provider: 'sau', publishMode: 'auto' };
  }
  return { provider: 'manual', publishMode: 'manual' };
}

export function pickActivePublishRecord(
  records: MassPublishRecord[],
  platform: string,
  lang: MassPublishLang | null,
): MassPublishRecord | null {
  const matched = records.filter((record) => {
    if (record.platform !== platform) {
      return false;
    }
    if (lang && record.lang && record.lang !== lang) {
      return false;
    }
    if (record.status === 'deleted' || record.status === 'hidden') {
      return false;
    }
    return true;
  });
  if (!matched.length) {
    return null;
  }
  const live = matched.find(
    (record) => record.status === 'live' || record.status === 'pending',
  );
  if (live) {
    return live;
  }
  return [...matched].sort((left, right) =>
    String(right.publishedAt ?? '').localeCompare(String(left.publishedAt ?? '')),
  )[0] ?? null;
}

export function statusFromRecord(
  ready: boolean,
  record: MassPublishRecord | null,
): MassPublishStatus {
  if (record && (record.status === 'live' || record.status === 'pending')) {
    return 'published';
  }
  if (record && record.status === 'failed') {
    return 'failed';
  }
  if (!ready) {
    return 'blocked';
  }
  return 'pending';
}

export function compareMassPublishItems(
  left: MassPublishItem,
  right: MassPublishItem,
): number {
  const seriesCmp = compareProductSeries(left.seriesId, right.seriesId);
  if (seriesCmp !== 0) {
    return seriesCmp;
  }
  const leftIndex = left.episodeIndex;
  const rightIndex = right.episodeIndex;
  if (leftIndex !== null && rightIndex !== null && leftIndex !== rightIndex) {
    return leftIndex - rightIndex;
  }
  if (leftIndex !== null && rightIndex === null) {
    return -1;
  }
  if (leftIndex === null && rightIndex !== null) {
    return 1;
  }
  const scriptCmp = left.scriptId.localeCompare(right.scriptId);
  if (scriptCmp !== 0) {
    return scriptCmp;
  }
  if (left.kind !== right.kind) {
    return left.kind === 'infographic' ? -1 : 1;
  }
  if (left.lang !== right.lang) {
    return left.lang.localeCompare(right.lang);
  }
  return massPublishPlatformRank(left.platform) - massPublishPlatformRank(right.platform);
}

export function massPublishPlatformRank(platform: string): number {
  const index = MASS_PUBLISH_PLATFORM_ORDER.indexOf(platform);
  return index === -1 ? MASS_PUBLISH_PLATFORM_ORDER.length : index;
}

export function buildMassPublishBoard(params: {
  seriesId: string;
  lang: MassPublishLang | 'all';
  episodes: MassPublishEpisodeInput[];
  generatedAt?: string;
}): MassPublishBoard {
  const seriesId = params.seriesId.trim() || 'all';
  const scoped = seriesId === 'all'
    ? params.episodes
    : params.episodes.filter((episode) => episode.seriesId === seriesId);
  const ordered = [...scoped].sort(compareMassPublishEpisodes);
  const langs: MassPublishLang[] = params.lang === 'all' ? ['zh', 'en'] : [params.lang];
  const items: MassPublishItem[] = [];

  for (const episode of ordered) {
    const episodeIndex = parseEpisodeIndex(episode.scriptId);
    for (const lang of langs) {
      for (const kind of ['infographic', 'video'] as const) {
        for (const platform of massPublishPlatforms(lang, kind)) {
          items.push(buildItem(episode, episodeIndex, kind, lang, platform));
        }
      }
    }
  }

  items.sort(compareMassPublishItems);

  const episodeRows: MassPublishEpisodeRow[] = ordered.map((episode) => {
    const episodeIndex = parseEpisodeIndex(episode.scriptId);
    return {
      scriptId: episode.scriptId,
      seriesId: episode.seriesId,
      seriesTitle: episode.seriesTitle,
      episodeIndex,
      episodeTitle: episode.episodeTitle,
      coverUrl: episode.coverUrl,
      infographicReady: episode.infographic.zh.ready || episode.infographic.en.ready,
      videoReady: episode.video.zh.ready || episode.video.en.ready,
      infographicBlockers: episode.infographic.zh.blockers,
      videoBlockers: episode.video.zh.blockers,
      jobId: episode.jobId,
      takeId: episode.takeId,
      itemIds: items
        .filter((item) => item.scriptId === episode.scriptId)
        .map((item) => item.id),
    };
  });

  return {
    schemaVersion: 1,
    generatedAt: params.generatedAt ?? new Date().toISOString(),
    seriesId,
    lang: params.lang,
    platforms: massPublishColumns(params.lang),
    episodes: episodeRows,
    items,
    summary: summarizeItems(items, episodeRows.length),
  };
}

export function filterDispatchableItems(
  items: MassPublishItem[],
  itemIds: string[],
): MassPublishItem[] {
  const byId = new Map(items.map((item) => [item.id, item]));
  const out: MassPublishItem[] = [];
  for (const id of itemIds) {
    const item = byId.get(id);
    if (item && item.canDispatch) {
      out.push(item);
    }
  }
  return out;
}

function buildItem(
  episode: MassPublishEpisodeInput,
  episodeIndex: number | null,
  kind: MassPublishKind,
  lang: MassPublishLang,
  platform: string,
): MassPublishItem {
  const readiness = kind === 'infographic' ? episode.infographic[lang] : episode.video[lang];
  const ready = readiness.ready;
  const blockers = readiness.blockers;
  const records = kind === 'infographic'
    ? episode.infographicRecords
    : episode.videoRecords;
  const record = pickActivePublishRecord(
    records,
    platform,
    kind === 'infographic' ? lang : null,
  );
  const { provider, publishMode } = massPublishProvider(kind, lang, platform);
  const status = statusFromRecord(ready, record);
  const kindLabel = kind === 'infographic'
    ? (lang === 'zh' ? '信息图' : 'poster')
    : (lang === 'zh' ? '视频' : 'video');
  const caption = massPublishCaption(
    episode.social,
    kind,
    lang,
    platform,
    episode.episodeTitle,
  );
  const url = record?.url ?? null;
  const openUrl = isOpenablePublishUrl(url, record?.stub) ? url : null;
  return {
    id: massPublishItemId({
      scriptId: episode.scriptId,
      kind,
      lang,
      platform,
    }),
    seriesId: episode.seriesId,
    seriesTitle: episode.seriesTitle,
    scriptId: episode.scriptId,
    episodeIndex,
    episodeTitle: episode.episodeTitle,
    kind,
    lang,
    platform,
    title: `${episode.episodeTitle} · ${kindLabel} · ${platform}`,
    captionTitle: caption.title,
    captionBody: caption.body,
    ready,
    blockers,
    provider,
    publishMode,
    status,
    canDispatch: publishMode === 'auto' && ready &&
      (status === 'pending' || status === 'failed' || status === 'published'),
    publishedAt: record?.publishedAt ?? null,
    url,
    openUrl,
    postId: record?.postId ?? null,
    stub: Boolean(record?.stub),
    jobId: episode.jobId,
    takeId: episode.takeId,
    coverUrl: episode.coverUrl,
  };
}

function compareMassPublishEpisodes(
  left: MassPublishEpisodeInput,
  right: MassPublishEpisodeInput,
): number {
  const seriesCmp = compareProductSeries(left.seriesId, right.seriesId);
  if (seriesCmp !== 0) {
    return seriesCmp;
  }
  const leftIndex = parseEpisodeIndex(left.scriptId);
  const rightIndex = parseEpisodeIndex(right.scriptId);
  if (leftIndex !== null && rightIndex !== null && leftIndex !== rightIndex) {
    return leftIndex - rightIndex;
  }
  if (leftIndex !== null && rightIndex === null) {
    return -1;
  }
  if (leftIndex === null && rightIndex !== null) {
    return 1;
  }
  return left.scriptId.localeCompare(right.scriptId);
}

function summarizeItems(
  items: MassPublishItem[],
  episodeCount: number,
): MassPublishBoard['summary'] {
  let pendingAuto = 0;
  let pendingManual = 0;
  let published = 0;
  let blocked = 0;
  let failed = 0;
  let posterPending = 0;
  let videoPending = 0;
  for (const item of items) {
    switch (item.status) {
      case 'published':
        published += 1;
        break;
      case 'blocked':
        blocked += 1;
        break;
      case 'failed':
        failed += 1;
        break;
      case 'pending':
        if (item.publishMode === 'auto') {
          pendingAuto += 1;
        } else {
          pendingManual += 1;
        }
        if (item.kind === 'infographic') {
          posterPending += 1;
        } else {
          videoPending += 1;
        }
        break;
      default: {
        const exhaustive: never = item.status;
        return exhaustive;
      }
    }
  }
  return {
    episodeCount,
    itemCount: items.length,
    pendingAuto,
    pendingManual,
    published,
    blocked,
    failed,
    posterPending,
    videoPending,
  };
}

function uniquePlatforms(platforms: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const platform of platforms) {
    if (seen.has(platform)) {
      continue;
    }
    seen.add(platform);
    out.push(platform);
  }
  return out;
}

const MASS_PUBLISH_PLATFORM_ORDER = uniquePlatforms([
  ...BEAT_POSTER_CHINA_PLATFORMS,
  ...MASS_PUBLISH_VIDEO_PLATFORMS_ZH,
  ...MASS_PUBLISH_VIDEO_PLATFORMS_EN,
  ...BEAT_POSTER_POSTIZ_PLATFORMS,
]);

const ANSI_ESCAPE_RE = /\u001b\[[0-9;]*m/g;

export function stripMassPublishAnsi(text: string): string {
  return text.replace(ANSI_ESCAPE_RE, '');
}

export function formatMassPublishFailure(error: unknown): {
  message: string;
  detail: string;
} {
  const detail = stripMassPublishAnsi(
    error instanceof Error ? error.message : String(error),
  ).trim();
  return {
    message: summarizeMassPublishFailure(detail),
    detail,
  };
}

function summarizeMassPublishFailure(detail: string): string {
  const sau = detail.match(/^sau (\S+) (upload-[a-z]+)/);
  const action = sau?.[2]?.replace('upload-', '') ?? 'upload';
  const prefix = sau ? `${sau[1]} ${action}` : 'Upload';
  const lower = detail.toLowerCase();

  if (lower.includes('certificate is expired')) {
    return `${prefix} failed: CDN certificate expired`;
  }
  if (/timeout \d+ms exceeded/i.test(detail) || /locator\.wait_for/i.test(detail)) {
    if (detail.includes('填写作品标题') || /title/i.test(detail)) {
      return `${prefix} timed out waiting for the title field`;
    }
    return `${prefix} timed out waiting for the publish form`;
  }
  if (/request failed after \d+ retries/i.test(detail)) {
    return `${prefix} failed after retries`;
  }
  if (/not logged|未登录|missing_credentials|cookie/i.test(detail)) {
    return `${prefix} failed: not logged in`;
  }

  const afterFailed = detail.split(/ failed:\s*/).slice(1).join(' failed: ').trim();
  if (afterFailed) {
    const firstLine = afterFailed.split('\n').map((line) => line.trim()).find(Boolean);
    if (firstLine && firstLine.length < 180) {
      return `${prefix} failed: ${firstLine.replace(/^Error:\s*/i, '')}`;
    }
  }
  const firstLine = detail.split('\n')[0]?.trim() ?? 'Upload failed';
  if (firstLine.startsWith('sau ')) {
    return `${prefix} failed`;
  }
  return firstLine.slice(0, 180);
}

function isVideoPostizPlatform(platform: string): boolean {
  return (MASS_PUBLISH_VIDEO_PLATFORMS_EN as readonly string[]).includes(platform);
}

function isVideoSauPlatform(platform: string): boolean {
  return (MASS_PUBLISH_VIDEO_SAU_PLATFORMS as readonly string[]).includes(platform);
}

export function isOpenablePublishUrl(
  url: string | null | undefined,
  stub?: boolean,
): boolean {
  if (stub || !url) {
    return false;
  }
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }
    const host = parsed.hostname.toLowerCase();
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === 'example.invalid' ||
      host.endsWith('.invalid')
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function massPublishCaption(
  social: BeatPosterSocialPostsFile | null | undefined,
  kind: MassPublishKind,
  lang: MassPublishLang,
  platform: string,
  fallbackTitle: string,
): { title: string; body: string } {
  if (!social) {
    return { title: fallbackTitle, body: '' };
  }
  if (kind === 'infographic') {
    const album = lang === 'zh' ? social.infographic?.china : social.infographic?.english;
    const albumEntry = album?.[platform];
    if (albumEntry?.title || albumEntry?.body) {
      return {
        title: albumEntry.title?.trim() || fallbackTitle,
        body: albumEntry.body?.trim() || '',
      };
    }
  }
  const bucket = lang === 'zh' ? social.china : social.english;
  const entry = bucket?.[platform];
  if (entry?.title || entry?.body) {
    return {
      title: entry.title?.trim() || fallbackTitle,
      body: entry.body?.trim() || '',
    };
  }
  return { title: fallbackTitle, body: '' };
}
