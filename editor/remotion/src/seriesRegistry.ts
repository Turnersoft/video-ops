/**
 * Seven video series style kits + legacy folder aliases.
 * Episodes declare status in script.md; series declares styleKit in series.json.
 *
 * Remotion-local copy — keep in sync with `video_ops/src/seriesRegistry.ts`.
 */

export const SCRIPT_STATUSES = [
  'idea',
  'outline',
  'draft',
  'review',
  'final',
] as const;

export type ScriptStatus = (typeof SCRIPT_STATUSES)[number];

export const STYLE_KITS = [
  'compare',
  'motion-essay',
  'pitfall',
  'ai-review',
  'syntax-spot',
  'launch-pv',
  'life-essay',
] as const;

export type StyleKit = (typeof STYLE_KITS)[number];

/** Main layer types allowed per kit (compile-time validation). */
export const KIT_ALLOWED_MAIN_LAYERS: Record<StyleKit, readonly string[]> = {
  compare: ['compare', 'math-board', 'title-card', 'video-clip'],
  'motion-essay': ['math-board', 'terminal', 'split-receipt', 'title-card'],
  pitfall: ['lean4', 'compare', 'chapter-beat', 'terminal', 'title-card'],
  'ai-review': ['turn-ide', 'split-receipt', 'title-card', 'video-clip'],
  'syntax-spot': ['turn-code', 'turn-ide', 'title-card'],
  'launch-pv': ['title-card', 'video-clip', 'hero-shot'],
  'life-essay': ['title-card', 'video-clip', 'still-board', 'meme-card', 'quote-slide'],
};

export const KIT_ALLOWED_OVERLAY_LAYERS: readonly string[] = [
  'pip',
  'talking-head',
  'caption',
];

export type SeriesGrowthJob =
  | 'conversion'
  | 'discovery'
  | 'trust'
  | 'authority'
  | 'volume'
  | 'product'
  | 'meaning';

export type SeriesMetaV2 = {
  schemaVersion: 2;
  id: string;
  title: string;
  description?: string;
  thumbnail?: string;
  playlist?: string;
  styleKit: StyleKit;
  growthJob?: SeriesGrowthJob;
  bgmProfile?: string;
};

/** Canonical series folders (kit-native). */
export const CANONICAL_SERIES_DIRS = [
  'compare',
  'formal-math',
  'pitfalls',
  'ai-math',
  'syntax',
  'launch',
  'logic-for-life',
] as const;

export type CanonicalSeriesDir = (typeof CANONICAL_SERIES_DIRS)[number];

/**
 * Legacy series folders kept during migration (1A).
 * Episodes may still live here; path resolution checks both.
 */
export const LEGACY_SERIES_DIRS = [
  'abstract_algebra_in_proof_assistant',
  'algebra',
  'why-need',
] as const;

export type LegacySeriesDir = (typeof LEGACY_SERIES_DIRS)[number];

/** All series folder names (canonical + legacy + pitfalls/syntax already canonical). */
export const SCRIPT_SERIES_DIRS = [
  ...CANONICAL_SERIES_DIRS,
  ...LEGACY_SERIES_DIRS,
] as const;

export type ScriptSeriesDir = (typeof SCRIPT_SERIES_DIRS)[number];

/** Map legacy series id → canonical styleKit for catalog badges. */
export const LEGACY_SERIES_STYLE_KIT: Record<string, StyleKit> = {
  abstract_algebra_in_proof_assistant: 'compare',
  algebra: 'compare',
  pitfalls: 'pitfall',
  syntax: 'syntax-spot',
  'why-need': 'motion-essay',
};

/** Prefix rules: first match wins when scanning filesystem. */
/**
 * Legacy episode-id prefixes (folder names used to include these).
 * Kept so old URLs / bookmarks like `sets-v2-04-set-equality` resolve to `04-set-equality`.
 */
export const SERIES_PREFIX_RULES: Array<{ prefix: string; series: ScriptSeriesDir }> = [
  { prefix: 'formal-math-', series: 'formal-math' },
  { prefix: 'sets-v2-', series: 'abstract_algebra_in_proof_assistant' },
  { prefix: 'groups-v1-', series: 'abstract_algebra_in_proof_assistant' },
  { prefix: 'compare-', series: 'compare' },
  { prefix: 'ai-math-', series: 'ai-math' },
  { prefix: 'launch-', series: 'launch' },
  { prefix: 'life-', series: 'logic-for-life' },
  { prefix: 'algebra-', series: 'algebra' },
  { prefix: 'syntax-', series: 'syntax' },
  { prefix: 'pitfalls-', series: 'pitfalls' },
  { prefix: 'why-need-', series: 'why-need' },
];

/** Strip a known series prefix from a legacy scriptId, if present. */
export function stripSeriesPrefixFromScriptId(scriptId: string): string | null {
  for (const rule of SERIES_PREFIX_RULES) {
    if (scriptId.startsWith(rule.prefix)) {
      const short = scriptId.slice(rule.prefix.length);
      return short || null;
    }
  }
  return null;
}

export function styleKitForSeriesId(seriesId: string): StyleKit {
  const meta = CANONICAL_SERIES_DIRS.includes(seriesId as CanonicalSeriesDir)
    ? seriesId
    : null;
  if (meta === 'compare') return 'compare';
  if (meta === 'formal-math') return 'motion-essay';
  if (meta === 'pitfalls') return 'pitfall';
  if (meta === 'ai-math') return 'ai-review';
  if (meta === 'syntax') return 'syntax-spot';
  if (meta === 'launch') return 'launch-pv';
  if (meta === 'logic-for-life') return 'life-essay';
  return LEGACY_SERIES_STYLE_KIT[seriesId] ?? 'compare';
}

export function validateLayersForKit(
  styleKit: StyleKit,
  layerTypes: string[],
): { ok: true } | { ok: false; invalid: string[] } {
  const allowed = new Set([
    ...KIT_ALLOWED_MAIN_LAYERS[styleKit],
    ...KIT_ALLOWED_OVERLAY_LAYERS,
  ]);
  const invalid = layerTypes.filter((type) => !allowed.has(type));
  if (invalid.length) {
    return { ok: false, invalid };
  }
  return { ok: true };
}

export function parseScriptStatus(raw: string | undefined): ScriptStatus | null {
  if (!raw) return null;
  const normalized = raw.trim().toLowerCase();
  return SCRIPT_STATUSES.includes(normalized as ScriptStatus)
    ? (normalized as ScriptStatus)
    : null;
}

/** Map legacy Status: Idea|Script|Published → new lifecycle. */
export function migrateLegacyStatus(legacy: string | undefined): ScriptStatus {
  const lower = (legacy ?? '').trim().toLowerCase();
  if (lower === 'published' || lower === 'final') return 'final';
  if (lower === 'script') return 'draft';
  if (lower === 'idea') return 'idea';
  return 'outline';
}
