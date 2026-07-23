import path from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';

import { fileExists } from './fs_util.ts';
import {
  CANONICAL_SERIES_DIRS,
  defaultSeriesForScriptId,
  isReservedSeriesEntry,
  SCRIPTS_ROOT,
  SCRIPT_SERIES_DIRS,
  seriesSharedRelative,
  stripSeriesPrefixFromScriptId,
  type ScriptSeriesDir,
} from '../../../src/scriptCollections.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const AGENT_ROOT = path.resolve(__dirname, '..');

/** Walk up until we find video_ops root (has projects/ + manifest.json). */
function resolveVideoOpsRoot(startDir: string): string {
  let dir = startDir;
  for (let i = 0; i < 6; i += 1) {
    if (
      fileExists(path.join(dir, 'manifest.json')) &&
      (fileExists(path.join(dir, 'projects')) || fileExists(path.join(dir, 'scripts')))
    ) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      break;
    }
    dir = parent;
  }
  return path.resolve(startDir, '../..');
}

export const VIDEO_OPS_ROOT = resolveVideoOpsRoot(AGENT_ROOT);
export const REPO_ROOT = path.resolve(VIDEO_OPS_ROOT, '..');
export const SCRIPTS_DIR = path.join(VIDEO_OPS_ROOT, SCRIPTS_ROOT);
export const INBOX_DIR = path.join(VIDEO_OPS_ROOT, 'inbox');

const DEFAULT_ICLOUD_INBOX = path.join(
  homedir(),
  'Library/Mobile Documents/com~apple~CloudDocs/TurnOutdoor/inbox',
);

const APP_ICLOUD_DOCUMENTS = path.join(
  homedir(),
  'Library/Mobile Documents/iCloud~com~turnlang~outdoorteleprompter/Documents',
);

const APP_ICLOUD_INBOX = path.join(APP_ICLOUD_DOCUMENTS, 'outdoor-inbox');

/** iCloud Drive folder synced Mac ↔ iPhone (optional manual path). */
export function icloudInboxDir(): string | null {
  const fromEnv = Deno.env.get('OUTDOOR_ICLOUD_INBOX')?.trim();
  const dir = fromEnv || DEFAULT_ICLOUD_INBOX;
  return fileExists(dir) ? dir : fromEnv ? dir : null;
}

/** App iCloud container inbox — written by the dev build on Process tap. */
export function appIcloudInboxDir(): string | null {
  const fromEnv = Deno.env.get('OUTDOOR_APP_ICLOUD_INBOX')?.trim();
  if (fromEnv) {
    return fromEnv;
  }
  if (!fileExists(APP_ICLOUD_DOCUMENTS)) {
    return null;
  }
  return APP_ICLOUD_INBOX;
}

export function listInboxDirs(): string[] {
  const dirs = [INBOX_DIR];
  for (const candidate of [icloudInboxDir(), appIcloudInboxDir()]) {
    if (candidate && !dirs.includes(candidate)) {
      dirs.push(candidate);
    }
  }
  return dirs;
}

/** @deprecated Legacy jobs dir — new work uses projects/<series>/<episode>/takes/ */
export const JOBS_DIR = path.join(VIDEO_OPS_ROOT, 'jobs');

export type TakeRef = { scriptId: string; takeId: string; seriesId?: ScriptSeriesDir };

export function seriesDirFor(seriesId: ScriptSeriesDir): string {
  return path.join(SCRIPTS_DIR, seriesId);
}

export function seriesSharedDirFor(seriesId: ScriptSeriesDir): string {
  return path.join(VIDEO_OPS_ROOT, seriesSharedRelative(seriesId));
}

function episodeLooksPresent(dir: string): boolean {
  return fileExists(path.join(dir, 'animation.md'));
}

function episodeExistsAnywhere(scriptId: string): boolean {
  for (const seriesId of SCRIPT_SERIES_DIRS) {
    if (episodeLooksPresent(path.join(seriesDirFor(seriesId), scriptId))) {
      return true;
    }
  }
  const templateDir = path.join(SCRIPTS_DIR, '_templates', scriptId);
  return episodeLooksPresent(templateDir);
}

/**
 * Map legacy prefixed ids (`sets-v2-04-set-equality`) to short folder names (`04-set-equality`).
 */
export function canonicalizeScriptId(scriptId: string): string {
  const trimmed = scriptId.trim();
  if (!trimmed) {
    return trimmed;
  }
  if (episodeExistsAnywhere(trimmed)) {
    return trimmed;
  }
  const short = stripSeriesPrefixFromScriptId(trimmed);
  if (short && episodeExistsAnywhere(short)) {
    return short;
  }
  return trimmed;
}

/**
 * Prefer canonical series folders over legacy aliases when both exist.
 */
export function seriesForScriptId(scriptId: string): ScriptSeriesDir {
  const id = canonicalizeScriptId(scriptId);
  let legacyHit: ScriptSeriesDir | null = null;
  for (const seriesId of SCRIPT_SERIES_DIRS) {
    const dir = path.join(seriesDirFor(seriesId), id);
    if (!episodeLooksPresent(dir)) {
      continue;
    }
    const isCanonical = (CANONICAL_SERIES_DIRS as readonly string[]).includes(seriesId);
    if (isCanonical) {
      return seriesId;
    }
    if (!legacyHit) {
      legacyHit = seriesId;
    }
  }
  return legacyHit ?? defaultSeriesForScriptId(id);
}

/** Human-authored Remotion + outdoor source of truth. */
export function animationMdPath(scriptId: string): string {
  return path.join(scriptDirFor(scriptId), 'animation.md');
}

/** @deprecated Use seriesForScriptId */
export function scriptCollectionFor(scriptId: string): ScriptSeriesDir {
  return seriesForScriptId(scriptId);
}

export function scriptDirFor(scriptId: string): string {
  const id = canonicalizeScriptId(scriptId);
  return path.join(seriesDirFor(seriesForScriptId(id)), id);
}

/** Absolute paths to each series folder under `projects/`. */
export function listScriptSeriesDirs(): string[] {
  if (!fileExists(SCRIPTS_DIR)) {
    return [];
  }
  const discovered = [...Deno.readDirSync(SCRIPTS_DIR)]
    .filter((entry) => entry.isDirectory && !isReservedSeriesEntry(entry.name))
    .map((entry) => path.join(SCRIPTS_DIR, entry.name));
  const ordered = SCRIPT_SERIES_DIRS.map((seriesId) => seriesDirFor(seriesId)).filter((dir) =>
    fileExists(dir),
  );
  for (const dir of discovered) {
    if (!ordered.includes(dir)) {
      ordered.push(dir);
    }
  }
  return ordered;
}

/** @deprecated Use listScriptSeriesDirs */
export function listScriptCollections(): string[] {
  return listScriptSeriesDirs();
}

/** Episode-local video names (folder already identifies the script). */
export const OUTDOOR_PORTRAIT_MP4 = 'outdoor-portrait.mp4';
export const OUTDOOR_LANDSCAPE_MP4 = 'outdoor-landscape.mp4';
export const STUDIO_EXPORT_MP4 = 'video.mp4';
export const STUDIO_EXPORT_EDITED_MP4 = 'video-edited.mp4';
export const STUDIO_EXPORT_PREVIEW_MP4 = 'video-preview.mp4';

/** Prefer short name; fall back to legacy `${scriptId}-…` files already on disk. */
export function outdoorCompositeMp4Path(
  compositeDir: string,
  scriptId: string,
  format: 'portrait' | 'landscape',
): string {
  const short =
    format === 'portrait' ? OUTDOOR_PORTRAIT_MP4 : OUTDOOR_LANDSCAPE_MP4;
  const modern = path.join(compositeDir, short);
  if (fileExists(modern)) {
    return modern;
  }
  const legacy = path.join(compositeDir, `${scriptId}-outdoor-${format}.mp4`);
  return fileExists(legacy) ? legacy : modern;
}

export function studioExportMp4Path(scriptDir: string, scriptId: string): string {
  const modern = path.join(scriptDir, 'export', STUDIO_EXPORT_MP4);
  if (fileExists(modern)) {
    return modern;
  }
  const legacy = path.join(scriptDir, 'export', `${scriptId}.mp4`);
  return fileExists(legacy) ? legacy : modern;
}

export function outdoorScriptPath(scriptId: string): string {
  const dir = scriptDirFor(scriptId);
  const modern = path.join(dir, 'export', 'outdoor-script.json');
  if (fileExists(modern)) {
    return modern;
  }
  const legacy = path.join(dir, 'export', `${scriptId}-outdoor-script.json`);
  if (fileExists(legacy)) {
    return legacy;
  }
  // Never fall back to bundled teleprompter JSON when live animation sources exist —
  // those assets go stale and were the iPhone "script not updating" bug.
  if (fileExists(animationMdPath(scriptId))) {
    return modern;
  }
  const teleprompterPath = path.join(
    VIDEO_OPS_ROOT,
    'editor/ios-teleprompter/assets/scripts',
    `${scriptId}.json`,
  );
  if (fileExists(teleprompterPath)) {
    return teleprompterPath;
  }
  return modern;
}

export function ensureDir(dirPath: string): void {
  Deno.mkdirSync(dirPath, { recursive: true });
}

export function takeDir(scriptId: string, takeId: string): string {
  return path.join(scriptDirFor(scriptId), 'takes', takeId);
}

export function takeManifestPath(scriptId: string, takeId: string): string {
  return path.join(takeDir(scriptId, takeId), 'take.json');
}

export function takeSourceVideoPath(scriptId: string, takeId: string): string {
  const dir = takeDir(scriptId, takeId);
  const candidates = [
    'source.mp4',
    'source.webm',
    `${takeId}.mp4`,
    `${takeId}.webm`,
    `${takeId}.MP4`,
    'take.mp4',
  ];
  for (const name of candidates) {
    const candidate = path.join(dir, name);
    if (fileExists(candidate)) {
      return candidate;
    }
  }
  return path.join(dir, 'source.mp4');
}

/** Destination path for a newly ingested source video (preserves container extension). */
export function takeSourceVideoDest(scriptId: string, takeId: string, sourcePath: string): string {
  const ext = path.extname(sourcePath).toLowerCase();
  const safeExt = ext === '.webm' || ext === '.mp4' || ext === '.mov' ? ext : '.mp4';
  return path.join(takeDir(scriptId, takeId), `source${safeExt}`);
}

export function pipelineDir(scriptId: string, takeId: string): string {
  return path.join(takeDir(scriptId, takeId), 'pipeline');
}

export function pipelineStatusPath(scriptId: string, takeId: string): string {
  return path.join(takeDir(scriptId, takeId), 'pipeline-status.json');
}

export function takeStageRunDir(
  scriptId: string,
  takeId: string,
  stage: string,
  runId: string,
): string {
  return path.join(pipelineDir(scriptId, takeId), stage, runId);
}

export function publishStatePathForTake(scriptId: string, takeId: string): string {
  return path.join(takeDir(scriptId, takeId), 'publish-state.json');
}

export function takeCoversDir(scriptId: string, takeId: string): string {
  return path.join(takeDir(scriptId, takeId), 'covers');
}

export function coversIndexPath(scriptId: string, takeId: string): string {
  return path.join(takeCoversDir(scriptId, takeId), 'covers-index.json');
}

export function parseJobId(jobId: string): string {
  return jobId.startsWith('job-') ? jobId.slice(4) : jobId;
}

export function resolveTakeFromJobId(jobId: string): TakeRef | null {
  const takeId = parseJobId(jobId);
  for (const seriesDir of listScriptSeriesDirs()) {
    for (const scriptEntry of [...Deno.readDirSync(seriesDir)]) {
      if (!scriptEntry.isDirectory || isReservedSeriesEntry(scriptEntry.name)) {
        continue;
      }
      const scriptId = scriptEntry.name;
      if (fileExists(pipelineStatusPath(scriptId, takeId))) {
        return {
          scriptId,
          takeId,
          seriesId: path.basename(seriesDir) as ScriptSeriesDir,
        };
      }
      if (fileExists(takeManifestPath(scriptId, takeId))) {
        return {
          scriptId,
          takeId,
          seriesId: path.basename(seriesDir) as ScriptSeriesDir,
        };
      }
    }
  }
  return null;
}

export function jobDir(jobId: string): string {
  return path.join(JOBS_DIR, jobId);
}

export function jobJsonPath(jobId: string): string {
  return path.join(jobDir(jobId), 'job.json');
}

export function stageRunDir(jobId: string, stage: string, runId: string): string {
  const ref = resolveTakeFromJobId(jobId);
  if (ref) {
    return takeStageRunDir(ref.scriptId, ref.takeId, stage, runId);
  }
  return path.join(jobDir(jobId), 'stages', stage, runId);
}

export function publishStatePath(jobId: string): string {
  const ref = resolveTakeFromJobId(jobId);
  if (ref) {
    return publishStatePathForTake(ref.scriptId, ref.takeId);
  }
  return path.join(jobDir(jobId), 'publish', 'state.json');
}
