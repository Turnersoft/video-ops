export const BEAT_POSTER_COVER_ID = 'cover';

export type BeatPosterCoverLang = 'en' | 'zh';

export type BeatPosterCoverVideoStyle = {
  coverHeadline: string;
  episodeSubtitle: string;
  titleColor: string;
  titleStroke: string;
};

export type BeatPosterCoverContent = {
  lang: BeatPosterCoverLang;
  seriesTitle: string;
  episodeTitle: string;
  coverHeadline: string;
  episodeSubtitle: string;
  titleColor: string;
  titleStroke: string;
  tagline: string;
  beatCount: number;
  beatCountLabel: string;
  pageLabel: string;
  swipeHint: string;
  vsLabel: string;
  backgroundLeanCode: string;
  backgroundTurnCode: string;
};

/** Decorative watermark snippets — low opacity on the cover poster. */
export const COVER_BACKGROUND_LEAN = `-- set equality
theorem Set.ext {α : Type} {s t : Set α}
  (h : ∀ x, x ∈ s ↔ x ∈ t) : s = t := by
  ext x; exact h x

example : ({1, 2} : Set Nat) = {2, 1} := by
  ext x; simp [Set.mem_insert_iff]`;

export const COVER_BACKGROUND_TURN = `-- set equality
theorem set_ext {α : Any} {s t : Set α}
  (h : ∀ x, x ∈ s ↔ x ∈ t) : s = t :=
proof
  intro x
  exact h x

example {1, 2} = {2, 1} :=
  proof ext x; simp`;

export type BeatPosterCoverDecorations = {
  titleTilt: number;
  cardTilt: number;
  sparkle: boolean;
};

const CONCEPT_COLORS: Record<string, { titleColor: string; titleStroke: string }> = {
  'set-equality': { titleColor: '#e8a0ff', titleStroke: '#4a148c' },
  default: { titleColor: '#7dd3fc', titleStroke: '#1a4fd8' },
};

function excerptTagline(text: string, maxLen: number): string {
  const normalized = text.replace(/\s+/g, ' ').trim();
  const first = normalized.split(/(?<=[.!?。！？])\s*/u)[0]?.trim() ?? normalized;
  if (first.length <= maxLen) {
    return first;
  }
  return `${first.slice(0, maxLen).trim()}…`;
}

function episodeNumberFromTitle(title: string): string {
  const match = title.match(/^(\d+)\s*[.．、]/);
  return match?.[1] ?? '';
}

function episodeTopicFromTitle(title: string, lang: BeatPosterCoverLang): string {
  const withoutNumber = title
    .replace(/^\d+\s*[.．、]\s*/, '')
    .replace(/^\d+[-_\s]+/i, '')
    .trim();
  const topic = withoutNumber.split(/[:：]/)[0]?.trim() ?? withoutNumber;
  const spaced = topic.replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
  if (lang === 'zh') {
    return spaced;
  }
  return spaced.toUpperCase();
}

function episodeSubtitleFromTitle(title: string): string {
  const parts = title.split(/[:：]/);
  if (parts.length >= 2) {
    return parts.slice(1).join(':').trim();
  }
  return '';
}

function inferConceptId(scriptId: string): string {
  if (scriptId.includes('set-equality')) {
    return 'set-equality';
  }
  return 'default';
}

export function resolveBeatPosterCoverVideoStyle(params: {
  scriptId: string;
  episodeTitle: string;
  lang: BeatPosterCoverLang;
}): BeatPosterCoverVideoStyle {
  const { scriptId, episodeTitle, lang } = params;
  const conceptId = inferConceptId(scriptId);
  const colors = CONCEPT_COLORS[conceptId] ?? CONCEPT_COLORS.default;
  const episodeNumber =
    episodeNumberFromTitle(episodeTitle) ||
    (scriptId.match(/^(\d+)-/)?.[1] ?? '');
  const topic = episodeTopicFromTitle(episodeTitle, lang);
  const coverHeadline = episodeNumber ? `${episodeNumber} ${topic}` : topic;
  const episodeSubtitle = episodeSubtitleFromTitle(episodeTitle);

  return {
    coverHeadline,
    episodeSubtitle,
    titleColor: colors.titleColor,
    titleStroke: colors.titleStroke,
  };
}

function seededVariant(seedText: string): number {
  let hash = 0;
  for (const char of seedText) {
    hash = (hash * 31 + char.charCodeAt(0)) % 9973;
  }
  return hash;
}

function tiltFor(seedText: string, slot: number): number {
  const value = (seededVariant(seedText) + slot * 17) % 9;
  return (value - 4) * 0.75;
}

export function coverDecorations(seed: string): BeatPosterCoverDecorations {
  return {
    titleTilt: tiltFor(seed, 1),
    cardTilt: tiltFor(seed, 2),
    sparkle: (seededVariant(seed) % 3) === 0,
  };
}

/** Album page count: cover slide + one infographic per beat. */
export function beatPosterAlbumPageCount(beatCount: number): number {
  return Math.max(1, beatCount + 1);
}

/** Cover is page 1; the first beat is page 2. */
export function beatPosterAlbumPageNumber(
  kind: 'cover' | 'beat',
  beatIndex = 0,
): number {
  switch (kind) {
    case 'cover':
      return 1;
    case 'beat':
      return Math.max(0, beatIndex) + 2;
    default: {
      const _never: never = kind;
      return _never;
    }
  }
}

export function formatBeatPosterPageLabel(page: number, pageCount: number): string {
  const total = Math.max(1, pageCount);
  const current = Math.min(Math.max(1, page), total);
  return `${current} / ${total}`;
}

export function beatPosterPageLabel(params: {
  kind: 'cover' | 'beat';
  beatIndex?: number;
  beatCount: number;
}): string {
  return formatBeatPosterPageLabel(
    beatPosterAlbumPageNumber(params.kind, params.beatIndex ?? 0),
    beatPosterAlbumPageCount(params.beatCount),
  );
}

/** Rough swipe-album read time from page count (~25s per card). */
export function estimateBeatPosterAlbumReadMinutes(pageCount: number): number {
  const secondsPerPage = 25;
  return Math.max(1, Math.round((pageCount * secondsPerPage) / 60));
}

export function formatBeatPosterCoverBadgeLabel(params: {
  lang: BeatPosterCoverLang;
  beatCount: number;
}): string {
  const pageCount = beatPosterAlbumPageCount(params.beatCount);
  const readMinutes = estimateBeatPosterAlbumReadMinutes(pageCount);
  if (params.lang === 'zh') {
    return `${pageCount} 页 · 约 ${readMinutes} 分钟`;
  }
  const pageWord = pageCount === 1 ? 'page' : 'pages';
  return `${pageCount} ${pageWord} · ~${readMinutes} min read`;
}

export function buildBeatPosterCoverContent(params: {
  scriptId: string;
  lang: BeatPosterCoverLang;
  seriesTitle: string;
  episodeTitle: string;
  promotionalDescription?: string;
  beatCount: number;
}): BeatPosterCoverContent {
  const { scriptId, lang, seriesTitle, episodeTitle, promotionalDescription, beatCount } = params;
  const videoStyle = resolveBeatPosterCoverVideoStyle({ scriptId, episodeTitle, lang });
  const tagline = promotionalDescription?.trim()
    ? excerptTagline(promotionalDescription, lang === 'zh' ? 34 : 96)
    : (lang === 'zh' ? '户外讲，屏幕验。' : 'Formal math, explained outdoors.');
  const beatCountLabel = formatBeatPosterCoverBadgeLabel({ lang, beatCount });
  const swipeHint = lang === 'zh'
    ? '左滑 · 逐拍信息图'
    : 'Swipe → beat-by-beat';
  return {
    lang,
    seriesTitle,
    episodeTitle,
    coverHeadline: videoStyle.coverHeadline,
    episodeSubtitle: videoStyle.episodeSubtitle,
    titleColor: videoStyle.titleColor,
    titleStroke: videoStyle.titleStroke,
    tagline,
    beatCount,
    beatCountLabel,
    pageLabel: beatPosterPageLabel({ kind: 'cover', beatCount }),
    swipeHint,
    vsLabel: 'Lean 4 vs Turn-Lang',
    backgroundLeanCode: COVER_BACKGROUND_LEAN,
    backgroundTurnCode: COVER_BACKGROUND_TURN,
  };
}

export function fitCoverHeadlineSize(headline: string, lang: BeatPosterCoverLang): number {
  const units = headline.length;
  if (lang === 'zh') {
    if (units <= 8) return 52;
    if (units <= 12) return 46;
    return 40;
  }
  if (units <= 12) return 56;
  if (units <= 18) return 48;
  return 42;
}

export function fitCoverSubtitleSize(subtitle: string, lang: BeatPosterCoverLang): number {
  const units = subtitle.length;
  if (lang === 'zh') {
    if (units <= 14) return 28;
    if (units <= 22) return 24;
    return 22;
  }
  if (units <= 36) return 26;
  if (units <= 56) return 23;
  return 21;
}

export function fitCoverTaglineSize(tagline: string, lang: BeatPosterCoverLang): number {
  const units = tagline.length;
  if (lang === 'zh') {
    if (units <= 18) return 34;
    if (units <= 28) return 30;
    return 28;
  }
  if (units <= 50) return 30;
  if (units <= 80) return 28;
  return 26;
}
