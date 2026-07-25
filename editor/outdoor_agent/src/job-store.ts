import path from 'node:path';

import { scanVideoOpsCatalog } from './catalog.ts';
import { copyFile, fileExists, readJson, writeJson } from './fs_util.ts';
import {
  ensureDir,
  canonicalizeScriptId,
  jobJsonPath,
  JOBS_DIR,
  listScriptSeriesDirs,
  pipelineDir,
  pipelineStatusPath,
  publishStatePathForTake,
  takeDir,
  takeManifestPath,
  takeScriptPriority,
  takeSourceVideoDest,
  takeSourceVideoPath,
  takeStageRunDir,
} from './paths.ts';
import { isReservedSeriesEntry } from '../../../src/scriptCollections.ts';
import { createJob, newJobId, nowIso, PIPELINE_STAGES, type OutdoorJob, type PublishState, type StageProgress } from './schema.ts';

function normalizeJobRuns(job: OutdoorJob): OutdoorJob {
  const runs = { ...job.runs } as OutdoorJob['runs'];
  for (const stage of PIPELINE_STAGES) {
    runs[stage] = runs[stage] ?? [];
  }
  return { ...job, runs };
}

function loadLegacyJob(jobId: string): OutdoorJob | null {
  const jsonPath = jobJsonPath(jobId);
  if (!fileExists(jsonPath)) {
    return null;
  }
  try {
    return readJson<OutdoorJob>(jsonPath);
  } catch {
    return null;
  }
}

function pipelineStatusToJob(status: OutdoorJob, ref: { scriptId: string; takeId: string }): OutdoorJob {
  const scriptId = canonicalizeScriptId(ref.scriptId);
  return {
    ...status,
    jobId: newJobId(ref.takeId),
    takeId: ref.takeId,
    scriptId,
    sourceVideoPath: takeSourceVideoPath(scriptId, ref.takeId),
    takeManifestPath: takeManifestPath(scriptId, ref.takeId),
  };
}

export function listJobs(): OutdoorJob[] {
  const catalog = scanVideoOpsCatalog();
  const jobs: OutdoorJob[] = [];
  for (const script of catalog.scripts) {
    for (const take of script.takes) {
      const ref = { scriptId: script.scriptId, takeId: take.takeId };
      const statusPath = pipelineStatusPath(ref.scriptId, ref.takeId);
      if (fileExists(statusPath)) {
        try {
          jobs.push(pipelineStatusToJob(readJson<OutdoorJob>(statusPath), ref));
        } catch {
          // skip corrupt
        }
      } else if (take.hasManifest) {
        jobs.push(
          pipelineStatusToJob(
            createJob({
              jobId: newJobId(ref.takeId),
              takeId: ref.takeId,
              scriptId: ref.scriptId,
              scriptTitle: script.title,
              sourceVideoPath: takeSourceVideoPath(ref.scriptId, ref.takeId),
              takeManifestPath: takeManifestPath(ref.scriptId, ref.takeId),
              status: 'ingested',
            }),
            ref,
          ),
        );
      }
    }
  }
  if (fileExists(JOBS_DIR)) {
    for (const entry of Deno.readDirSync(JOBS_DIR)) {
      if (!entry.isDirectory) {
        continue;
      }
      const legacy = loadLegacyJob(entry.name);
      if (legacy && !jobs.some((job) => job.jobId === legacy.jobId)) {
        jobs.push(legacy);
      }
    }
  }
  return jobs.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export function loadJob(jobId: string): OutdoorJob | null {
  const takeId = jobId.startsWith('job-') ? jobId.slice(4) : jobId;
  const matches: OutdoorJob[] = [];
  for (const seriesDir of listScriptSeriesDirs()) {
    for (const entry of Deno.readDirSync(seriesDir)) {
      if (!entry.isDirectory || isReservedSeriesEntry(entry.name)) {
        continue;
      }
      const scriptId = entry.name;
      const statusPath = pipelineStatusPath(scriptId, takeId);
      if (!fileExists(statusPath)) {
        continue;
      }
      try {
        const job = normalizeJobRuns(
          pipelineStatusToJob(readJson<OutdoorJob>(statusPath), { scriptId, takeId }),
        );
        if (job.jobId === jobId || job.takeId === takeId) {
          matches.push(job);
        }
      } catch {
        // skip corrupt status
      }
    }
  }
  if (matches.length > 0) {
    matches.sort(
      (left, right) => takeScriptPriority(left.scriptId) - takeScriptPriority(right.scriptId),
    );
    return matches[0];
  }
  const legacy = loadLegacyJob(jobId);
  if (legacy && (legacy.jobId === jobId || legacy.takeId === takeId)) {
    return normalizeJobRuns(legacy);
  }
  return null;
}

export function saveJob(job: OutdoorJob): OutdoorJob {
  const normalized = normalizeJobRuns(job);
  normalized.updatedAt = nowIso();
  normalized.schemaVersion = 2;
  writeJson(pipelineStatusPath(normalized.scriptId, normalized.takeId), normalized);
  return normalized;
}

export function writeProgress(
  jobId: string,
  stage: string,
  runId: string,
  progress: Omit<StageProgress, 'updatedAt'>,
): void {
  const job = loadJob(jobId);
  if (!job) {
    return;
  }
  writeJson(path.join(takeStageRunDir(job.scriptId, job.takeId, stage, runId), 'progress.json'), {
    ...progress,
    updatedAt: nowIso(),
  });
}

export function readProgress(jobId: string, stage: string, runId: string): StageProgress | null {
  const job = loadJob(jobId);
  if (!job) {
    return null;
  }
  const progressPath = path.join(
    takeStageRunDir(job.scriptId, job.takeId, stage, runId),
    'progress.json',
  );
  if (!fileExists(progressPath)) {
    return null;
  }
  return readJson<StageProgress>(progressPath);
}

export function loadPublishState(jobId: string): PublishState {
  const job = loadJob(jobId);
  if (!job) {
    return { schemaVersion: 1, jobId, posts: [] };
  }
  const statePath = publishStatePathForTake(job.scriptId, job.takeId);
  if (!fileExists(statePath)) {
    return { schemaVersion: 1, jobId, scriptId: job.scriptId, takeId: job.takeId, posts: [] };
  }
  return readJson<PublishState>(statePath);
}

export function savePublishState(state: PublishState): PublishState {
  const job = loadJob(state.jobId);
  if (!job) {
    throw new Error(`Cannot resolve take for job ${state.jobId}`);
  }
  writeJson(publishStatePathForTake(job.scriptId, job.takeId), state);
  return state;
}

export function createJobFromTake(params: {
  takeId: string;
  scriptId: string;
  scriptTitle: string;
  videoPath: string;
  takeManifestPath: string;
}): OutdoorJob {
  const jobId = newJobId(params.takeId);
  ensureDir(takeDir(params.scriptId, params.takeId));
  ensureDir(pipelineDir(params.scriptId, params.takeId));
  const manifestDest = takeManifestPath(params.scriptId, params.takeId);
  const videoDest = takeSourceVideoDest(params.scriptId, params.takeId, params.videoPath);
  copyFile(params.takeManifestPath, manifestDest);
  copyFile(params.videoPath, videoDest);
  const job = createJob({
    jobId,
    takeId: params.takeId,
    scriptId: params.scriptId,
    scriptTitle: params.scriptTitle,
    sourceVideoPath: videoDest,
    takeManifestPath: manifestDest,
  });
  saveJob(job);
  savePublishState({ schemaVersion: 1, jobId, scriptId: params.scriptId, takeId: params.takeId, posts: [] });
  return job;
}

export function jobExistsForTake(takeId: string): boolean {
  for (const seriesDir of listScriptSeriesDirs()) {
    for (const entry of Deno.readDirSync(seriesDir)) {
      if (!entry.isDirectory || isReservedSeriesEntry(entry.name)) {
        continue;
      }
      const scriptId = entry.name;
      if (
        fileExists(pipelineStatusPath(scriptId, takeId)) ||
        fileExists(takeManifestPath(scriptId, takeId))
      ) {
        return true;
      }
    }
  }
  if (fileExists(JOBS_DIR)) {
    for (const entry of Deno.readDirSync(JOBS_DIR)) {
      if (entry.isDirectory && (entry.name === `job-${takeId}` || entry.name === takeId)) {
        return true;
      }
    }
  }
  return false;
}
