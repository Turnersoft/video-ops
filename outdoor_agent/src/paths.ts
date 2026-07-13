import path from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';

import { fileExists } from './fs_util.ts';
import {
  defaultSeriesForScriptId,
  isReservedSeriesEntry,
  SCRIPTS_ROOT,
  SCRIPT_SERIES_DIRS,
  seriesSharedRelative,
  type ScriptSeriesDir,
} from '../../src/scriptCollections.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const AGENT_ROOT = path.resolve(__dirname, '..');
export const VIDEO_OPS_ROOT = path.resolve(AGENT_ROOT, '..');
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

/** @deprecated Legacy jobs dir — new work uses scripts/<series>/<episode>/takes/ */
export const JOBS_DIR = path.join(VIDEO_OPS_ROOT, 'jobs');

export type TakeRef = { scriptId: string; takeId: string; seriesId?: ScriptSeriesDir };

export function seriesDirFor(seriesId: ScriptSeriesDir): string {
  return path.join(SCRIPTS_DIR, seriesId);
}

export function seriesSharedDirFor(seriesId: ScriptSeriesDir): string {
  return path.join(VIDEO_OPS_ROOT, seriesSharedRelative(seriesId));
}

export function seriesForScriptId(scriptId: string): ScriptSeriesDir {
  for (const seriesId of SCRIPT_SERIES_DIRS) {
    const dir = path.join(seriesDirFor(seriesId), scriptId);
    if (
      fileExists(path.join(dir, 'animation.md')) ||
      fileExists(path.join(dir, 'script.md')) ||
      fileExists(path.join(dir, 'animation.json'))
    ) {
      return seriesId;
    }
  }
  return defaultSeriesForScriptId(scriptId);
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
  return path.join(seriesDirFor(seriesForScriptId(scriptId)), scriptId);
}

/** Absolute paths to each series folder under `scripts/`. */
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

export function outdoorScriptPath(scriptId: string): string {
  const dir = scriptDirFor(scriptId);
  const exportPath = path.join(dir, 'export', `${scriptId}-outdoor-script.json`);
  if (fileExists(exportPath)) {
    return exportPath;
  }
  // Never fall back to bundled teleprompter JSON when live animation sources exist —
  // those assets go stale and were the iPhone "script not updating" bug.
  if (fileExists(animationMdPath(scriptId)) || fileExists(path.join(dir, 'animation.json'))) {
    return exportPath;
  }
  const teleprompterPath = path.join(
    VIDEO_OPS_ROOT,
    'ios-teleprompter/assets/scripts',
    `${scriptId}.json`,
  );
  if (fileExists(teleprompterPath)) {
    return teleprompterPath;
  }
  return exportPath;
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
