const PLATFORM_LABELS: Record<string, string> = {
  youtube: 'YouTube',
  x: 'X',
  linkedin: 'LinkedIn',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  facebook: 'Facebook',
  bluesky: 'Bluesky',
  threads: 'Threads',
  reddit: 'Reddit',
  bilibili: '哔哩哔哩',
  douyin: '抖音',
  xiaohongshu: '小红书',
  weibo: '微博',
  wechat_channels: '视频号',
  kuaishou: '快手',
};

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) {
    return '';
  }
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export function fmtDuration(ms: number | null | undefined): string {
  if (ms === null || ms === undefined) {
    return '';
  }
  const total = Math.round(ms / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function takeStatusLabel(count: number | null | undefined): string {
  if (!count) {
    return 'Not filmed';
  }
  return count === 1 ? '1 take' : `${count} takes`;
}

export type SeriesProgressCounts = {
  total: number;
  filmed: number;
  published: number;
};

export function isEpisodeFilmed(episode: {
  takeCount: number;
}): boolean {
  return episode.takeCount > 0;
}

export function isEpisodePublished(episode: {
  takes: Array<{ pipelineStatus: string; publishPostCount: number }>;
}): boolean {
  return episode.takes.some(
    (take) =>
      take.pipelineStatus === 'published' || take.publishPostCount > 0,
  );
}

export function seriesProgressCounts(
  episodes: Array<{
    takeCount: number;
    takes: Array<{ pipelineStatus: string; publishPostCount: number }>;
  }>,
): SeriesProgressCounts {
  return {
    total: episodes.length,
    filmed: episodes.filter(isEpisodeFilmed).length,
    published: episodes.filter(isEpisodePublished).length,
  };
}

export function seriesProgressLabel(counts: SeriesProgressCounts): string {
  if (counts.total === 0) {
    return '0 filmed · 0 published';
  }
  return `${counts.filmed}/${counts.total} filmed · ${counts.published}/${counts.total} published`;
}

export function freshnessTone(
  daysAgo: number | null | undefined,
): 'fresh' | 'recent' | 'stale' | 'unknown' {
  if (daysAgo === null || daysAgo === undefined) {
    return 'unknown';
  }
  if (daysAgo <= 0) {
    return 'fresh';
  }
  if (daysAgo <= 7) {
    return 'recent';
  }
  return 'stale';
}

export function platformLabel(
  platform: string,
  group?: 'headline' | 'english' | 'china' | string,
): string {
  if (group === 'headline' && platform === 'EN') {
    return 'Headline EN';
  }
  if (group === 'headline' && platform === 'ZH') {
    return 'Headline ZH';
  }
  return PLATFORM_LABELS[platform] ?? platform;
}

export function publishStatusLabel(
  post: { status?: string; stub?: boolean } | null | undefined,
): string {
  if (!post) {
    return 'not published';
  }
  if (post.status === 'live' && post.stub) {
    return 'stub';
  }
  return post.status ?? 'not published';
}

export function stageLabel(stage: string): string {
  const labels: Record<string, string> = {
    cut: 'Cut',
    align: 'Align',
    composite: 'Composite',
    social: 'Social',
  };
  return labels[stage] ?? stage;
}
