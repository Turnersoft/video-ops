import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  defaultSeriesForScriptId,
  isReservedSeriesEntry,
  SCRIPTS_ROOT,
  SCRIPT_SERIES_DIRS,
  type ScriptSeriesDir,
} from '../../src/scriptCollections.ts';
import { fileExists } from './fs_util.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const OUTDOOR_POST_ROOT = path.resolve(__dirname, '..');
export const VIDEO_OPS_ROOT = path.resolve(OUTDOOR_POST_ROOT, '..');
export const SCRIPTS_DIR = path.join(VIDEO_OPS_ROOT, SCRIPTS_ROOT);

export function seriesDirFor(seriesId: ScriptSeriesDir): string {
  return path.join(SCRIPTS_DIR, seriesId);
}

export function seriesForScriptId(scriptId: string): ScriptSeriesDir {
  for (const seriesId of SCRIPT_SERIES_DIRS) {
    const dir = path.join(seriesDirFor(seriesId), scriptId);
    if (fileExists(path.join(dir, 'animation.json')) || fileExists(path.join(dir, 'script.md'))) {
      return seriesId;
    }
  }
  return defaultSeriesForScriptId(scriptId);
}

export function scriptDirFor(scriptId: string): string {
  return path.join(seriesDirFor(seriesForScriptId(scriptId)), scriptId);
}

export function scriptFolder(scriptId: string): string {
  const dir = scriptDirFor(scriptId);
  return path.relative(VIDEO_OPS_ROOT, dir);
}
