export type BeatPosterLang = 'en' | 'zh';

export const BEAT_POSTER_COVER_ID = 'cover';

/** Export canvas — 3:4 portrait, same aspect as the on-screen preview frame. */
export const BEAT_POSTER_WIDTH = 1080;
export const BEAT_POSTER_HEIGHT = 1440;

export const BEAT_POSTER_POSTIZ_PLATFORMS = [
  'x',
  'linkedin',
  'instagram',
  'facebook',
  'bluesky',
  'threads',
  'reddit',
  'tiktok',
] as const;

export const BEAT_POSTER_CHINA_PLATFORMS = [
  'xiaohongshu',
  'bilibili',
  'douyin',
  'weibo',
  'wechat_channels',
  'wechat',
  'kuaishou',
] as const;

/**
 * Image-note carousel via social-auto-upload `upload-note`.
 *
 * 小红书 is deliberately absent: it rejects automated uploads, so its albums go
 * through the browser handoff (see MASS_PUBLISH_BROWSER_HANDOFF_PLATFORMS).
 */
export const BEAT_POSTER_SAU_NOTE_PLATFORMS = [
  'douyin',
  'kuaishou',
  'wechat_channels',
  'weibo',
] as const;

/** Poster album becomes a silent slideshow, then SAU `upload-video`. */
export const BEAT_POSTER_SAU_VIDEO_PLATFORMS = [
  'bilibili',
] as const;

export function isBeatPosterSauNotePlatform(platform: string): boolean {
  return (BEAT_POSTER_SAU_NOTE_PLATFORMS as readonly string[]).includes(platform);
}

export function isBeatPosterSauVideoPlatform(platform: string): boolean {
  return (BEAT_POSTER_SAU_VIDEO_PLATFORMS as readonly string[]).includes(platform);
}

export function isBeatPosterSauAutoPlatform(platform: string): boolean {
  return isBeatPosterSauNotePlatform(platform) || isBeatPosterSauVideoPlatform(platform);
}

export type BeatPosterSocialPostsFile = {
  titleEnglish?: string;
  titleChina?: string;
  english?: Record<string, { title?: string; body?: string }>;
  china?: Record<string, { title?: string; body?: string }>;
  infographic?: {
    english?: Record<string, { title?: string; body?: string }>;
    china?: Record<string, { title?: string; body?: string }>;
  };
};

export type BeatPosterPlatformPreview = {
  platform: string;
  lang: BeatPosterLang;
  title: string;
  body: string;
  imageUrls: string[];
  imageCount: number;
  postizImageSupported: boolean;
  provider: 'postiz' | 'sau' | 'manual';
  publishMode: 'auto' | 'manual';
  characterCount: number;
  reviewNotes: string[];
};

export type BeatPosterPublishPreview = {
  scriptId: string;
  lang: BeatPosterLang;
  beatCount: number;
  platforms: BeatPosterPlatformPreview[];
};

export type BeatPosterCopyFallbacks = {
  socialTitleEnglish?: string;
  socialTitleChina?: string;
  promotionalDescription?: string;
  promotionalDescriptionChina?: string;
  scriptTitle?: string;
};

export function listBeatPosterReviewPlatforms(lang: BeatPosterLang): string[] {
  return lang === 'zh' ? [...BEAT_POSTER_CHINA_PLATFORMS] : [...BEAT_POSTER_POSTIZ_PLATFORMS];
}

export function isBeatPosterPostizPlatform(platform: string): boolean {
  return (BEAT_POSTER_POSTIZ_PLATFORMS as readonly string[]).includes(platform);
}

export function beatPosterAlbumImageUrls(
  scriptId: string,
  lang: BeatPosterLang,
  beatIds: string[],
): string[] {
  const ordered = [BEAT_POSTER_COVER_ID, ...beatIds];
  return ordered.map(
    (beatId) =>
      beatPosterPreviewJpegUrl(scriptId, beatId, lang),
  );
}

/** Static JPEG served from outdoor_agent/web/beat-poster-preview/ */
export function beatPosterPreviewJpegUrl(
  scriptId: string,
  beatId: string,
  lang: BeatPosterLang,
): string {
  return `/beat-poster-preview/${encodeURIComponent(scriptId)}/${encodeURIComponent(beatId)}-${lang}.jpg`;
}

/** @deprecated Use beatPosterPreviewJpegUrl — kept for API PNG fallback. */
export function beatPosterAlbumApiPngUrls(
  scriptId: string,
  lang: BeatPosterLang,
  beatIds: string[],
): string[] {
  const ordered = [BEAT_POSTER_COVER_ID, ...beatIds];
  return ordered.map(
    (beatId) =>
      `/api/scripts/${encodeURIComponent(scriptId)}/beat-posters/${encodeURIComponent(beatId)}/${lang}/png`,
  );
}

function albumSuffix(lang: BeatPosterLang, imageCount: number): string {
  if (lang === 'zh') {
    return `\n\n${imageCount} 张信息图（含封面），左滑看完。`;
  }
  return `\n\n${imageCount} infographic slides (incl. cover) — full beat-by-beat series at turn-lang.com`;
}

function loadSocialCopyFromFile(
  social: BeatPosterSocialPostsFile | null | undefined,
  platform: string,
  lang: BeatPosterLang,
  fallbacks: BeatPosterCopyFallbacks,
  scriptId: string,
): { title: string; body: string } {
  if (social) {
    const bucket = lang === 'zh' ? social.china : social.english;
    const entry = bucket?.[platform];
    if (entry?.title || entry?.body) {
      return {
        title: entry.title?.trim() || social.titleEnglish || scriptId,
        body: entry.body?.trim() || '',
      };
    }
    if (lang === 'zh' && social.titleChina) {
      return {
        title: social.titleChina,
        body: fallbacks.promotionalDescriptionChina ?? '',
      };
    }
    if (social.titleEnglish) {
      return {
        title: social.titleEnglish,
        body: fallbacks.promotionalDescription ?? '',
      };
    }
  }

  const title = lang === 'zh'
    ? (fallbacks.socialTitleChina ?? fallbacks.scriptTitle ?? scriptId)
    : (fallbacks.socialTitleEnglish ?? fallbacks.scriptTitle ?? scriptId);
  const body = lang === 'zh'
    ? (fallbacks.promotionalDescriptionChina ?? '')
    : (fallbacks.promotionalDescription ?? '');
  return { title, body };
}

export function loadInfographicCopyFromSocial(params: {
  social: BeatPosterSocialPostsFile | null | undefined;
  platform: string;
  lang: BeatPosterLang;
  imageCount: number;
  fallbacks: BeatPosterCopyFallbacks;
  scriptId: string;
}): { title: string; body: string } {
  const { social, platform, lang, imageCount, fallbacks, scriptId } = params;
  const bucket = lang === 'zh' ? social?.infographic?.china : social?.infographic?.english;
  const entry = bucket?.[platform];
  if (entry?.title || entry?.body) {
    return {
      title: entry.title?.trim() || loadSocialCopyFromFile(social, platform, lang, fallbacks, scriptId).title,
      body: entry.body?.trim() || '',
    };
  }

  const fallback = loadSocialCopyFromFile(social, platform, lang, fallbacks, scriptId);
  return {
    title: fallback.title,
    body: `${fallback.body.trim()}${albumSuffix(lang, imageCount)}`.trim(),
  };
}

export function reviewNotesForBeatPosterPlatform(platform: string, lang: BeatPosterLang): string[] {
  if (lang === 'zh') {
    if (isBeatPosterSauNotePlatform(platform)) {
      return [
        'Auto via SAU (social-auto-upload upload-note) when SAU is live on #/platforms.',
        'Upload order: cover first, then beat-01 … beat-11 (match carousel order).',
        platform === 'xiaohongshu'
          ? '小红书: image carousel note · title maps to note headline, body to note text.'
          : platform === 'wechat_channels'
            ? '视频号: photo album · cover first, then each beat. Needs 图文/图片 publish on the account.'
            : 'Image carousel note — check platform image-count limits before publishing.',
      ];
    }
    if (isBeatPosterSauVideoPlatform(platform)) {
      return [
        'Auto via SAU upload-video when SAU is live on #/platforms.',
        'Album is stitched into a silent slideshow (cover first, then each beat).',
        '哔哩哔哩: slideshow video · partition from SAU_BILIBILI_TID (default 249).',
      ];
    }
    if (platform === 'xiaohongshu') {
      return [
        'Browser handoff: queue it on #/mass-publish and the squat opens 小红书 creator with this caption on the clipboard.',
        'Upload order: cover first, then beat-01 … beat-11 (match carousel order).',
        '小红书 blocks automated uploads — drop the PNGs in yourself, then mark the cell live.',
      ];
    }
    return [
      'Manual upload: save PNG album from beat-posters/ and paste this caption in the creator app.',
      'Upload order: cover first, then beat-01 … beat-11 (match carousel order).',
      platform === 'wechat'
        ? '微信公众号: 图文文章，封面作头图，其余 PNG 按拍序插入。需在公众号后台手动发。'
        : 'Manual China lane — paste the album in the creator app.',
    ];
  }

  const notes = [
    'Auto via Postiz when the platform is connected on #/platforms.',
    'One post = full album (cover + all beats).',
  ];
  if (platform === 'instagram' || platform === 'threads') {
    notes.push('Carousel post — cover is slide 1.');
  }
  if (platform === 'reddit') {
    notes.push('Use a gallery post; title field maps to Reddit post title.');
  }
  if (platform === 'x') {
    notes.push('Keep an eye on character limits; trim hashtags if Postiz rejects.');
  }
  return notes;
}

export function buildBeatPosterPlatformPreviews(params: {
  scriptId: string;
  lang: BeatPosterLang;
  beatCount: number;
  imageUrls: string[];
  social: BeatPosterSocialPostsFile | null | undefined;
  fallbacks: BeatPosterCopyFallbacks;
}): BeatPosterPlatformPreview[] {
  const { scriptId, lang, beatCount, imageUrls, social, fallbacks } = params;
  const imageCount = imageUrls.length;

  return listBeatPosterReviewPlatforms(lang).map((platform) => {
    const copy = loadInfographicCopyFromSocial({
      social,
      platform,
      lang,
      imageCount,
      fallbacks,
      scriptId,
    });
    const postizImageSupported = isBeatPosterPostizPlatform(platform);
    const sauAutoSupported = isBeatPosterSauAutoPlatform(platform);
    const fullText = `${copy.title}\n\n${copy.body}`.trim();
    return {
      platform,
      lang,
      title: copy.title,
      body: copy.body,
      imageUrls,
      imageCount,
      postizImageSupported,
      provider: postizImageSupported ? 'postiz' : sauAutoSupported ? 'sau' : 'manual',
      publishMode: postizImageSupported || sauAutoSupported ? 'auto' : 'manual',
      characterCount: fullText.length,
      reviewNotes: reviewNotesForBeatPosterPlatform(platform, lang),
    };
  });
}

export function buildBeatPosterPublishPreviewLocal(params: {
  scriptId: string;
  lang: BeatPosterLang;
  beatIds: string[];
  social: BeatPosterSocialPostsFile | null | undefined;
  fallbacks: BeatPosterCopyFallbacks;
  imageUrls?: string[];
}): BeatPosterPublishPreview {
  const imageUrls = params.imageUrls ?? beatPosterAlbumImageUrls(
    params.scriptId,
    params.lang,
    params.beatIds,
  );
  return {
    scriptId: params.scriptId,
    lang: params.lang,
    beatCount: params.beatIds.length,
    platforms: buildBeatPosterPlatformPreviews({
      scriptId: params.scriptId,
      lang: params.lang,
      beatCount: params.beatIds.length,
      imageUrls,
      social: params.social,
      fallbacks: params.fallbacks,
    }),
  };
}
