/** All video projects live under `video_ops/scripts/<series>/<episode>/`. */
export const SCRIPTS_ROOT = 'scripts';

/** Known series folders under `scripts/`. Discovery also scans the filesystem. */
export const SCRIPT_SERIES_DIRS = [
  'abstract_algebra_in_proof_assistant',
  'algebra',
  'syntax',
  'pitfalls',
  'why-need',
] as const;

export type ScriptSeriesDir = (typeof SCRIPT_SERIES_DIRS)[number];

/** @deprecated Use SCRIPT_SERIES_DIRS */
export const SCRIPT_COLLECTION_DIRS = SCRIPT_SERIES_DIRS;

/** @deprecated Use ScriptSeriesDir */
export type ScriptCollectionDir = ScriptSeriesDir;

const SETS_V2_PREFIXES = ['sets-v2-'] as const;

const RESERVED_SERIES_ENTRIES = new Set(['shared', 'series.json']);

const SERIES_PREFIX_RULES: Array<{ prefix: string; series: ScriptSeriesDir }> = [
  { prefix: 'sets-v2-', series: 'abstract_algebra_in_proof_assistant' },
  { prefix: 'algebra-', series: 'algebra' },
  { prefix: 'syntax-', series: 'syntax' },
  { prefix: 'pitfalls-', series: 'pitfalls' },
  { prefix: 'why-need-', series: 'why-need' },
];

export function isReservedSeriesEntry(name: string): boolean {
  return name.startsWith('.') || name.startsWith('_') || RESERVED_SERIES_ENTRIES.has(name);
}

/** Preferred series when creating a new episode folder. */
export function defaultSeriesForScriptId(scriptId: string): ScriptSeriesDir {
  for (const rule of SERIES_PREFIX_RULES) {
    if (scriptId.startsWith(rule.prefix)) {
      return rule.series;
    }
  }
  return 'algebra';
}

/** @deprecated Use defaultSeriesForScriptId */
export function defaultCollectionForScriptId(scriptId: string): ScriptSeriesDir {
  return defaultSeriesForScriptId(scriptId);
}

export function seriesForScriptId(scriptId: string): ScriptSeriesDir {
  return defaultSeriesForScriptId(scriptId);
}

/** Relative path from video_ops root to an episode folder. */
export function scriptFolderRelative(scriptId: string, series?: ScriptSeriesDir): string {
  const seriesDir = series ?? defaultSeriesForScriptId(scriptId);
  return `${SCRIPTS_ROOT}/${seriesDir}/${scriptId}`;
}

/** Relative path from video_ops root to a series shared folder. */
export function seriesSharedRelative(series: ScriptSeriesDir): string {
  return `${SCRIPTS_ROOT}/${series}/shared`;
}

/** Relative path from video_ops root to series metadata. */
export function seriesMetaRelative(series: ScriptSeriesDir): string {
  return `${SCRIPTS_ROOT}/${series}/series.json`;
}

/** Series that owns cross-episode Lean/Turn reference files. */
export const REFERENCE_SHARED_SERIES: ScriptSeriesDir = 'algebra';

/**
 * Short teleprompter / iPhone title from the episode folder name.
 * `sets-v2-01-set` → `01_set`, `sets-v2-02-subset` → `02_subset`.
 */
export function teleprompterTitleFromScriptId(scriptId: string): string {
  const setsMatch = scriptId.match(/^sets-v2-(\d+)-(.*)$/);
  if (setsMatch) {
    return `${setsMatch[1]}_${setsMatch[2].replace(/-/g, '_')}`;
  }
  return scriptId.replace(/-/g, '_');
}