/** All video projects live under `video_ops/projects/<series>/<episode>/`. */
export {
  CANONICAL_SERIES_DIRS,
  LEGACY_SERIES_DIRS,
  LEGACY_SERIES_STYLE_KIT,
  SCRIPT_SERIES_DIRS,
  SERIES_PREFIX_RULES,
  stripSeriesPrefixFromScriptId,
  type CanonicalSeriesDir,
  type LegacySeriesDir,
  type ScriptSeriesDir,
  type ScriptStatus,
  type SeriesMetaV2,
  type StyleKit,
  migrateLegacyStatus,
  parseScriptStatus,
  styleKitForSeriesId,
  validateLayersForKit,
} from './seriesRegistry.ts';

import {
  LEGACY_SERIES_DIRS,
  SERIES_PREFIX_RULES,
  SCRIPT_SERIES_DIRS,
  type ScriptSeriesDir,
} from './seriesRegistry.ts';

export const SCRIPTS_ROOT = 'projects';

const RESERVED_SERIES_ENTRIES = new Set(['shared', 'series.json']);

export function isReservedSeriesEntry(name: string): boolean {
  return name.startsWith('.') || name.startsWith('_') || RESERVED_SERIES_ENTRIES.has(name);
}

/** @deprecated Use SCRIPT_SERIES_DIRS */
export const SCRIPT_COLLECTION_DIRS = SCRIPT_SERIES_DIRS;

/** @deprecated Use ScriptSeriesDir */
export type ScriptCollectionDir = ScriptSeriesDir;

/**
 * Fallback when the episode folder cannot be scanned on disk (prefix rules only).
 * Prefer `seriesForScriptId` in outdoor_agent / scriptSeries.mjs for runtime resolution.
 */
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
  return scriptId.replace(/-/g, '_');
}

/** Legacy series ids that alias canonical kits during migration. */
export function isLegacySeries(seriesId: string): boolean {
  return (LEGACY_SERIES_DIRS as readonly string[]).includes(seriesId);
}
