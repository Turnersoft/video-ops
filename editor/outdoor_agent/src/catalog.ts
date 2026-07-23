import path from 'node:path';

import { isReservedSeriesEntry, teleprompterTitleFromScriptId } from '../../../src/scriptCollections.ts';
import { freshnessLabelFromIso } from '../../../src/scriptFreshness.ts';
import { loadAnimationV4 } from './animation-load.ts';
import { fileExists, readJson } from './fs_util.ts';
import { firstFailedStageError } from './pipeline-error.ts';
import { newJobId, type OutdoorJob } from './schema.ts';
import {
  listScriptSeriesDirs,
  outdoorCompositeMp4Path,
  outdoorScriptPath,
  pipelineStatusPath,
  seriesForScriptId,
  seriesSharedDirFor,
  scriptDirFor,
  studioExportMp4Path,
  takeDir,
  takeManifestPath,
  takeSourceVideoPath,
  VIDEO_OPS_ROOT,
} from './paths.ts';

export type SeriesMeta = {
  schemaVersion?: number;
  id: string;
  title: string;
  description?: string;
  thumbnail?: string;
  playlist?: string;
  styleKit?: string;
  growthJob?: string;
  bgmProfile?: string;
};

function parseSeriesMeta(seriesDir: string, seriesId: string): SeriesMeta {
  const metaPath = path.join(seriesDir, 'series.json');
  if (fileExists(metaPath)) {
    const meta = readJson<SeriesMeta>(metaPath);
    return {
      ...meta,
      id: meta.id ?? seriesId,
      title: meta.title ?? seriesId,
    };
  }
  return { id: seriesId, title: seriesId };
}

type AnimationDoc = {
  scenes?: Array<{
    compare?: { beats?: unknown[] };
    director?: { say?: string | string[] };
  }>;
};

function slideCountFromAnimation(animation: AnimationDoc | null): number {
  if (!animation?.scenes?.length) {
    return 0;
  }
  let count = 0;
  for (const scene of animation.scenes) {
    const compareBeats = scene.compare?.beats?.length ?? 0;
    if (compareBeats > 0) {
      count += compareBeats;
      continue;
    }
    const say = scene.director?.say;
    if (Array.isArray(say)) {
      count += say.filter((line) => typeof line === 'string' && line.trim()).length;
    } else if (typeof say === 'string' && say.trim()) {
      count += 1;
    }
  }
  return count;
}

function parseScriptTitle(scriptId: string): string {
  return teleprompterTitleFromScriptId(scriptId);
}

function ideaUpdatedAtMs(scriptDir: string): number {
  const candidates = [
    path.join(scriptDir, 'animation.md'),
    path.join(scriptDir, '.cache', 'render-props.json'),
  ];
  let best = 0;
  for (const candidate of candidates) {
    if (!fileExists(candidate)) {
      continue;
    }
    const mtime = Deno.statSync(candidate).mtime?.getTime() ?? 0;
    if (mtime > best) {
      best = mtime;
    }
  }
  return best;
}

function listTakeIds(scriptDir: string): string[] {
  const takesRoot = path.join(scriptDir, 'takes');
  const takeIds = new Set<string>();
  if (!fileExists(takesRoot)) {
    return [];
  }
  for (const entry of Deno.readDirSync(takesRoot)) {
    if (entry.isDirectory) {
      takeIds.add(entry.name);
    } else if (entry.name.endsWith('.json')) {
      takeIds.add(entry.name.replace(/\.json$/i, ''));
    }
  }
  return [...takeIds].sort();
}

function summarizeTake(scriptId: string, takeId: string) {
  const dir = takeDir(scriptId, takeId);
  const legacyManifest = path.join(scriptDirFor(scriptId), 'takes', `${takeId}.json`);
  const manifest =
    (fileExists(takeManifestPath(scriptId, takeId))
      ? readJson<{
        recordedAt?: string;
        durationMs?: number;
        slideEvents?: unknown[];
        markers?: unknown[];
      }>(takeManifestPath(scriptId, takeId))
      : null) ??
    (fileExists(legacyManifest) ? readJson(legacyManifest) : null);
  const statusPath = pipelineStatusPath(scriptId, takeId);
  const status = fileExists(statusPath)
    ? readJson<{ status?: string; selectedRuns?: Record<string, string> }>(statusPath)
    : null;
  const statusJob = fileExists(statusPath) ? readJson<OutdoorJob>(statusPath) : null;
  const failure = statusJob ? firstFailedStageError(statusJob) : null;
  const compositeRunId = status?.selectedRuns?.composite;
  const pipelineRoot = path.join(dir, 'pipeline');
  const portraitPath = compositeRunId
    ? outdoorCompositeMp4Path(
      path.join(pipelineRoot, 'composite', compositeRunId),
      scriptId,
      'portrait',
    )
    : '';
  const landscapePath = compositeRunId
    ? outdoorCompositeMp4Path(
      path.join(pipelineRoot, 'composite', compositeRunId),
      scriptId,
      'landscape',
    )
    : '';

  return {
    takeId,
    scriptId,
    recordedAt: manifest?.recordedAt ?? null,
    durationMs: manifest?.durationMs ?? null,
    slideEventCount: manifest?.slideEvents?.length ?? 0,
    markerCount: manifest?.markers?.length ?? 0,
    hasManifest: Boolean(manifest),
    hasSourceVideo: fileExists(takeSourceVideoPath(scriptId, takeId)),
    pipelineStatus: status?.status ?? (manifest ? 'ingested' : 'unknown'),
    pipelineError: failure?.error ?? null,
    pipelineErrorTitle: failure?.errorTitle ?? null,
    selectedRuns: status?.selectedRuns ?? {},
    hasPortrait: portraitPath ? fileExists(portraitPath) : false,
    hasLandscape: landscapePath ? fileExists(landscapePath) : false,
    publishPostCount: fileExists(path.join(dir, 'publish-state.json'))
      ? (readJson<{ posts?: unknown[] }>(path.join(dir, 'publish-state.json')).posts?.length ?? 0)
      : 0,
  };
}

function summarizeScript(scriptId: string, seriesId: string) {
  const scriptDir = scriptDirFor(scriptId);
  if (!fileExists(scriptDir)) {
    return null;
  }
  const animationMdPath = path.join(scriptDir, 'animation.md');
  const socialPostsPath = path.join(scriptDir, 'social-posts.json');
  const outdoorScript = outdoorScriptPath(scriptId);
  const animation = loadAnimationV4(scriptId);
  const social = fileExists(socialPostsPath)
    ? readJson<{ english?: Record<string, unknown>; china?: Record<string, unknown> }>(
      socialPostsPath,
    )
    : null;
  const studioRender = studioExportMp4Path(scriptDir, scriptId);
  const takes = listTakeIds(scriptDir).map((takeId) => summarizeTake(scriptId, takeId));
  const hasAnimationMd = fileExists(animationMdPath);
  const animationSlideCount = slideCountFromAnimation(animation);
  const slideCount = animationSlideCount;
  const canFilm = hasAnimationMd || slideCount > 0;
  const ideaUpdatedAtMsValue = ideaUpdatedAtMs(scriptDir);
  const ideaUpdatedAt = ideaUpdatedAtMsValue > 0
    ? new Date(ideaUpdatedAtMsValue).toISOString()
    : null;
  const freshness = freshnessLabelFromIso(ideaUpdatedAt);

  return {
    scriptId,
    seriesId,
    title: parseScriptTitle(scriptId),
    ideaUpdatedAt: freshness.ideaUpdatedAt,
    freshnessLabel: freshness.freshnessLabel,
    freshnessDaysAgo: freshness.freshnessDaysAgo,
    /** @deprecated Use seriesId */
    collection: seriesId,
    hasScriptMd: fileExists(path.join(scriptDir, 'script.md')),
    hasAnimation: Boolean(animation),
    hasAnimationMd,
    beatCount: animationSlideCount,
    slideCount,
    hasOutdoorScript: canFilm,
    hasStudioRender: fileExists(studioRender),
    hasSocialPosts: fileExists(socialPostsPath),
    socialPlatforms: {
      english: social?.english ? Object.keys(social.english) : [],
      china: social?.china ? Object.keys(social.china) : [],
    },
    takeCount: takes.length,
    takes,
    paths: {
      scriptDir,
      outdoorScript: fileExists(outdoorScript) ? outdoorScript : null,
      animationMd: hasAnimationMd ? animationMdPath : null,
      socialPosts: fileExists(socialPostsPath) ? socialPostsPath : null,
      studioRender: fileExists(studioRender) ? studioRender : null,
    },
  };
}

function isEpisodeDirectory(seriesDir: string, entry: Deno.DirEntry): boolean {
  if (isReservedSeriesEntry(entry.name)) {
    return false;
  }
  if (entry.isDirectory) {
    return true;
  }
  // Directory symlinks often report isDirectory=false — follow and check.
  if (entry.isSymlink) {
    try {
      return Deno.statSync(path.join(seriesDir, entry.name)).isDirectory;
    } catch {
      return false;
    }
  }
  return false;
}

function realEpisodeKey(episodeDir: string): string {
  try {
    return Deno.realPathSync(episodeDir);
  } catch {
    return episodeDir;
  }
}

export function scanVideoOpsSeries() {
  const series = [];
  const seenRealPaths = new Set<string>();
  for (const seriesDir of listScriptSeriesDirs()) {
    const seriesId = path.basename(seriesDir);
    const meta = parseSeriesMeta(seriesDir, seriesId);
    const sharedDir = seriesSharedDirFor(seriesId as ReturnType<typeof seriesForScriptId>);
    const episodes = [];
    for (const entry of Deno.readDirSync(seriesDir)) {
      if (!isEpisodeDirectory(seriesDir, entry)) {
        continue;
      }
      const episodeDir = path.join(seriesDir, entry.name);
      const animationMd = path.join(episodeDir, 'animation.md');
      if (!fileExists(animationMd)) {
        continue;
      }
      const realKey = realEpisodeKey(episodeDir);
      if (seenRealPaths.has(realKey)) {
        continue;
      }
      // Attribute to the series that owns the realpath (canonical over legacy alias).
      const ownerSeriesId = seriesForScriptId(entry.name);
      if (ownerSeriesId !== seriesId) {
        continue;
      }
      seenRealPaths.add(realKey);
      const summary = summarizeScript(entry.name, seriesId);
      if (summary) {
        episodes.push(summary);
      }
    }
    episodes.sort((left, right) => left.scriptId.localeCompare(right.scriptId));
    series.push({
      ...meta,
      episodeCount: episodes.length,
      takeCount: episodes.reduce((sum, episode) => sum + episode.takeCount, 0),
      sharedDir: fileExists(sharedDir) ? sharedDir : null,
      episodes,
    });
  }
  series.sort((left, right) => left.title.localeCompare(right.title));
  return series;
}

export function scanVideoOpsCatalog() {
  const seriesList = scanVideoOpsSeries();
  const scripts = seriesList.flatMap((item) => item.episodes);
  scripts.sort((left, right) => left.scriptId.localeCompare(right.scriptId));
  return {
    schemaVersion: 2,
    generatedAt: new Date().toISOString(),
    videoOpsRoot: VIDEO_OPS_ROOT,
    scriptsRoot: 'projects',
    seriesCount: seriesList.length,
    scriptCount: scripts.length,
    takeCount: scripts.reduce((sum, script) => sum + script.takeCount, 0),
    series: seriesList,
    scripts,
  };
}

export function resolveSeriesSharedAsset(seriesId: string, relativePath: string): string | null {
  const sharedDir = seriesSharedDirFor(seriesId as ReturnType<typeof seriesForScriptId>);
  const clean = relativePath.replace(/^\/+/, '');
  if (!clean || clean.includes('..')) {
    return null;
  }
  const filePath = path.join(sharedDir, clean);
  return fileExists(filePath) ? filePath : null;
}
