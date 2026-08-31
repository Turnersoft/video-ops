/**
 * New-account publish plan.
 *
 * A social account is a product people scroll freely. Posts must land in
 * curriculum order so a stranger who opens the profile from the oldest post
 * still gets episode 1 before episode 2.
 *
 * The sequence is platform-agnostic. Bind a real account later, or clone the
 * same plan onto matrix accounts. Adding a platform does not reorder content.
 */

export type PublishPlanLang = 'en' | 'zh';
export type PublishContentKind = 'infographic' | 'video';

export const ANY_PUBLISH_PLATFORM = 'any';

/** Known lanes. Append here when a new network is added — plan items stay the same. */
export const PUBLISH_PLAN_PLATFORMS = [
  ANY_PUBLISH_PLATFORM,
  'xiaohongshu',
  'bilibili',
  'douyin',
  'weibo',
  'wechat_channels',
  'wechat',
  'kuaishou',
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

export type PublishPlanPlatform = (typeof PUBLISH_PLAN_PLATFORMS)[number];

/** Product order for a new viewer. Unknown series append after these. */
export const PRODUCT_SERIES_ORDER = [
  'abstract_algebra_in_proof_assistant',
  'compare',
  'formal-math',
  'logic-for-life',
  'syntax',
  'ai-math',
  'pitfalls',
  'launch',
  'why-need',
  'algebra',
] as const;

export type PublishPlanEpisodeInput = {
  seriesId: string;
  seriesTitle: string;
  scriptId: string;
  episodeTitle: string;
  infographicReady: boolean;
  infographicBlockers: string[];
  videoReady: boolean;
  videoBlockers: string[];
};

export type PublishPlanPost = {
  index: number;
  seriesId: string;
  seriesTitle: string;
  scriptId: string;
  episodeIndex: number | null;
  episodeTitle: string;
  kind: PublishContentKind;
  lang: PublishPlanLang;
  title: string;
  reason: string;
  ready: boolean;
  blockers: string[];
};

export type PublishPlanAccountSlot = {
  accountId: string;
  label: string;
  platform: string;
  connected: boolean;
};

export type NewAccountPublishPlan = {
  schemaVersion: 1;
  mode: 'new-account';
  createdAt: string;
  seriesId: string;
  platform: string;
  lang: PublishPlanLang;
  accountSlots: PublishPlanAccountSlot[];
  posts: PublishPlanPost[];
  summary: {
    episodeCount: number;
    postCount: number;
    readyCount: number;
    blockedCount: number;
  };
};

export function parseEpisodeIndex(scriptId: string): number | null {
  const match = scriptId.match(/(?:^|-)(\d{1,3})(?:-|$)/);
  if (!match) {
    return null;
  }
  return Number(match[1]);
}

export function compareProductSeries(left: string, right: string): number {
  const leftRank = PRODUCT_SERIES_ORDER.indexOf(
    left as (typeof PRODUCT_SERIES_ORDER)[number],
  );
  const rightRank = PRODUCT_SERIES_ORDER.indexOf(
    right as (typeof PRODUCT_SERIES_ORDER)[number],
  );
  const leftOrder = leftRank === -1 ? PRODUCT_SERIES_ORDER.length : leftRank;
  const rightOrder = rightRank === -1 ? PRODUCT_SERIES_ORDER.length : rightRank;
  if (leftOrder !== rightOrder) {
    return leftOrder - rightOrder;
  }
  return left.localeCompare(right);
}

export function compareCurriculumEpisodes(
  left: PublishPlanEpisodeInput,
  right: PublishPlanEpisodeInput,
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

export function isPublishPlanPlatform(value: string): boolean {
  return (PUBLISH_PLAN_PLATFORMS as readonly string[]).includes(value);
}

export function buildAccountSlots(params: {
  platform: string;
  replicaCount: number;
}): PublishPlanAccountSlot[] {
  const count = Math.max(1, Math.min(params.replicaCount, 40));
  const slots: PublishPlanAccountSlot[] = [];
  for (let i = 0; i < count; i += 1) {
    slots.push({
      accountId: `slot-${i + 1}`,
      label: count === 1
        ? 'New account — bind later'
        : `Matrix account ${i + 1} — bind later`,
      platform: params.platform,
      connected: false,
    });
  }
  return slots;
}

function postTitle(
  episode: PublishPlanEpisodeInput,
  kind: PublishContentKind,
  lang: PublishPlanLang,
): string {
  const kindLabel = kind === 'infographic'
    ? (lang === 'zh' ? '信息图专辑' : 'infographic album')
    : (lang === 'zh' ? '视频' : 'video');
  return `${episode.episodeTitle} · ${kindLabel}`;
}

function postReason(kind: PublishContentKind, lang: PublishPlanLang): string {
  if (kind === 'infographic') {
    return lang === 'zh'
      ? '先发信息图：新访客从旧到新滑，先读完这一课的笔记。'
      : 'Album first: a new visitor scrolling oldest-to-newest reads the chapter notes.';
  }
  return lang === 'zh'
    ? '再发视频：同一课的讲解，紧跟在笔记后面。'
    : 'Video second: the lecture for the same episode, right after the notes.';
}

/**
 * Build the feed a brand-new account should publish, oldest first.
 * Same sequence for every platform and every matrix replica.
 */
export function buildNewAccountPublishPlan(params: {
  seriesId: string;
  platform: string;
  lang: PublishPlanLang;
  replicaCount: number;
  episodes: PublishPlanEpisodeInput[];
  createdAt?: string;
}): NewAccountPublishPlan {
  const seriesId = params.seriesId.trim() || 'all';
  const platform = isPublishPlanPlatform(params.platform)
    ? params.platform
    : ANY_PUBLISH_PLATFORM;
  const scoped = seriesId === 'all'
    ? params.episodes
    : params.episodes.filter((episode) => episode.seriesId === seriesId);
  const ordered = [...scoped].sort(compareCurriculumEpisodes);
  const posts: PublishPlanPost[] = [];

  for (const episode of ordered) {
    const episodeIndex = parseEpisodeIndex(episode.scriptId);
    posts.push({
      index: posts.length + 1,
      seriesId: episode.seriesId,
      seriesTitle: episode.seriesTitle,
      scriptId: episode.scriptId,
      episodeIndex,
      episodeTitle: episode.episodeTitle,
      kind: 'infographic',
      lang: params.lang,
      title: postTitle(episode, 'infographic', params.lang),
      reason: postReason('infographic', params.lang),
      ready: episode.infographicReady,
      blockers: episode.infographicBlockers,
    });
    posts.push({
      index: posts.length + 1,
      seriesId: episode.seriesId,
      seriesTitle: episode.seriesTitle,
      scriptId: episode.scriptId,
      episodeIndex,
      episodeTitle: episode.episodeTitle,
      kind: 'video',
      lang: params.lang,
      title: postTitle(episode, 'video', params.lang),
      reason: postReason('video', params.lang),
      ready: episode.videoReady,
      blockers: episode.videoBlockers,
    });
  }

  let readyCount = 0;
  for (const post of posts) {
    if (post.ready) {
      readyCount += 1;
    }
  }

  return {
    schemaVersion: 1,
    mode: 'new-account',
    createdAt: params.createdAt ?? new Date().toISOString(),
    seriesId,
    platform,
    lang: params.lang,
    accountSlots: buildAccountSlots({
      platform,
      replicaCount: params.replicaCount,
    }),
    posts,
    summary: {
      episodeCount: ordered.length,
      postCount: posts.length,
      readyCount,
      blockedCount: posts.length - readyCount,
    },
  };
}
