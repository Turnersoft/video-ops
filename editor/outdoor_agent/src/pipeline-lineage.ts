import {
  PIPELINE_STAGES,
  STAGE_LABELS,
  nowIso,
  upsertRun,
  type OutdoorJob,
  type PipelineStage,
  type StageRunSummary,
} from './schema.ts';
import { artifactUrl } from './stages/util.ts';
import { stabilizedVideoForJob } from './stages/stabilize.ts';

/** Immediate upstream stage that invalidates this one when rerun. */
export const UPSTREAM_STAGE: Partial<Record<PipelineStage, PipelineStage>> = {
  cut: 'stabilize',
  align: 'cut',
  composite: 'align',
  social: 'composite',
};

export function findStageRun(
  job: OutdoorJob,
  stage: PipelineStage,
  runId: string | null | undefined,
): StageRunSummary | undefined {
  if (!runId) {
    return undefined;
  }
  return job.runs[stage]?.find((entry) => entry.runId === runId);
}

export function selectedStageRun(
  job: OutdoorJob,
  stage: PipelineStage,
): StageRunSummary | undefined {
  return findStageRun(job, stage, job.selectedRuns[stage]);
}

export function cutInputVideoPath(job: OutdoorJob): string {
  return stabilizedVideoForJob(job) ?? job.sourceVideoPath;
}

export function sourceVideoApiPath(job: OutdoorJob): string {
  return `/api/scripts/${encodeURIComponent(job.scriptId)}/takes/${encodeURIComponent(job.takeId)}/source`;
}

/** Preview / cut-input URL: stabilized when available (same A/V timeline as source; audio is copied). */
export function cutInputVideoUrl(job: OutdoorJob): string {
  const stabilizeRunId = job.selectedRuns.stabilize;
  if (stabilizeRunId && stabilizedVideoForJob(job)) {
    return artifactUrl(job.scriptId, job.takeId, 'stabilize', stabilizeRunId, 'stabilized.mp4');
  }
  return sourceVideoApiPath(job);
}

/**
 * Video shown in Cut · sentence keep/cut.
 * Must match the footage cut/apply use — stabilized when present — so review
 * is not stuck on the shaky source while apply rebuilds from stabilized.mp4.
 */
export function cutRunReviewVideoUrl(job: OutdoorJob, _cutRunId: string): string {
  return cutInputVideoUrl(job);
}

/** Video used when applying keep/cut selection (stabilized when available). */
export function cutApplyVideoPath(job: OutdoorJob): string {
  return cutInputVideoPath(job);
}

export function cutRunInputVideoUrl(job: OutdoorJob, cutRunId: string): string {
  return cutRunReviewVideoUrl(job, cutRunId);
}

export function cutAppliesWithStabilizedVideo(job: OutdoorJob): boolean {
  return stabilizedVideoForJob(job) !== null;
}

export function cutNeedsStabilizedApply(job: OutdoorJob, cutRunId: string): boolean {
  if (!stabilizedVideoForJob(job)) {
    return false;
  }
  const run = findStageRun(job, 'cut', cutRunId);
  const expected = cutApplyVideoPath(job);
  const lastApplied = run?.artifacts?.lastAppliedInputVideo;
  if (lastApplied === expected) {
    return false;
  }
  const inputVideo = run?.artifacts?.inputVideo;
  if (inputVideo === expected) {
    return false;
  }
  const stabilizeRunId = job.selectedRuns.stabilize;
  const recordedStabilize = run?.artifacts?.stabilizeRunId ?? run?.builtFrom?.stabilize;
  if (stabilizeRunId && recordedStabilize === stabilizeRunId && inputVideo === expected) {
    return false;
  }
  return true;
}

export function cutRunUsesStabilizedInput(job: OutdoorJob, cutRunId: string): boolean {
  const run = findStageRun(job, 'cut', cutRunId);
  const candidates = [
    run?.artifacts?.lastAppliedInputVideo,
    run?.artifacts?.inputVideo,
  ].filter((value): value is string => typeof value === 'string');
  return candidates.some(
    (value) => value.includes('/stabilize/') || value.endsWith('stabilized.mp4'),
  );
}

export function builtFromSnapshot(
  job: OutdoorJob,
  stage: PipelineStage,
): Partial<Record<PipelineStage, string>> {
  const builtFrom: Partial<Record<PipelineStage, string>> = {};
  const upstream = UPSTREAM_STAGE[stage];
  if (upstream) {
    const runId = job.selectedRuns[upstream];
    if (runId) {
      builtFrom[upstream] = runId;
    }
  }
  if (stage === 'cut') {
    const stabilizeRunId = job.selectedRuns.stabilize;
    if (stabilizeRunId && stabilizedVideoForJob(job)) {
      builtFrom.stabilize = stabilizeRunId;
    }
  }
  if (stage === 'composite') {
    const cutRunId = job.selectedRuns.cut;
    if (cutRunId) {
      builtFrom.cut = cutRunId;
    }
  }
  return builtFrom;
}

function runFinishedAt(run: StageRunSummary | undefined): string | null {
  if (!run) {
    return null;
  }
  return run.finishedAt ?? run.createdAt ?? null;
}

function isDirectlyStale(job: OutdoorJob, stage: PipelineStage): boolean {
  const upstream = UPSTREAM_STAGE[stage];
  if (!upstream) {
    return false;
  }

  const downstreamRunId = job.selectedRuns[stage];
  if (!downstreamRunId) {
    return false;
  }
  const downstreamRun = findStageRun(job, stage, downstreamRunId);
  if (!downstreamRun || downstreamRun.status !== 'succeeded') {
    return false;
  }

  const upstreamRunId = job.selectedRuns[upstream];
  if (!upstreamRunId) {
    return false;
  }

  const upstreamRun = findStageRun(job, upstream, upstreamRunId);
  if (!upstreamRun || upstreamRun.status !== 'succeeded') {
    return false;
  }

  const recordedUpstream = downstreamRun.builtFrom?.[upstream];
  if (recordedUpstream) {
    if (recordedUpstream !== upstreamRunId) {
      return true;
    }
    const upFin = runFinishedAt(upstreamRun);
    const downFin = runFinishedAt(downstreamRun);
    if (upFin && downFin && upFin > downFin) {
      return true;
    }
    return false;
  }

  const upFin = runFinishedAt(upstreamRun);
  const downFin = runFinishedAt(downstreamRun);
  if (upFin && downFin && upFin > downFin) {
    return true;
  }

  if (upstream === 'cut') {
    const lastApplied = upstreamRun.artifacts?.lastAppliedAt;
    const downFin = runFinishedAt(downstreamRun);
    if (lastApplied && downFin && lastApplied > downFin) {
      return true;
    }
  }

  return false;
}

export function isStageStale(job: OutdoorJob, stage: PipelineStage): boolean {
  if (stage === 'cut') {
    const cutRunId = job.selectedRuns.cut;
    if (cutRunId && cutNeedsStabilizedApply(job, cutRunId)) {
      return true;
    }
  }
  if (isDirectlyStale(job, stage)) {
    return true;
  }
  const index = PIPELINE_STAGES.indexOf(stage);
  for (let i = 0; i < index; i += 1) {
    const upstream = PIPELINE_STAGES[i];
    if (isDirectlyStale(job, upstream)) {
      return true;
    }
  }
  return false;
}

export function staleReason(job: OutdoorJob, stage: PipelineStage): string | null {
  if (!isStageStale(job, stage)) {
    return null;
  }
  if (stage === 'cut') {
    const cutRunId = job.selectedRuns.cut;
    if (cutRunId && cutNeedsStabilizedApply(job, cutRunId)) {
      return 'Edited cut is still from the pre-stabilize take — use Apply selection & rebuild cut (stabilized).';
    }
  }
  if (isDirectlyStale(job, stage)) {
    const upstream = UPSTREAM_STAGE[stage];
    if (!upstream) {
      return null;
    }
    const upstreamLabel = STAGE_LABELS[upstream];
    const stageLabel = STAGE_LABELS[stage];
    if (upstream === 'stabilize' && stage === 'cut') {
      return `${upstreamLabel} was updated — apply selection or rerun cut to rebuild from stabilized footage.`;
    }
    if (upstream === 'cut') {
      const cutRun = findStageRun(job, 'cut', job.selectedRuns.cut);
      if (cutRun?.artifacts?.lastAppliedAt) {
        return `Cut was rebuilt after this ${stageLabel.toLowerCase()} — rerun ${stageLabel.toLowerCase()} to refresh.`;
      }
    }
    return `${upstreamLabel} was updated — rerun ${stageLabel.toLowerCase()} (and downstream stages) to refresh.`;
  }
  const stageLabel = STAGE_LABELS[stage];
  for (let i = PIPELINE_STAGES.indexOf(stage) - 1; i >= 0; i -= 1) {
    const upstream = PIPELINE_STAGES[i];
    if (!isStageStale(job, upstream)) {
      continue;
    }
    return `Upstream ${STAGE_LABELS[upstream].toLowerCase()} is outdated — rerun ${stageLabel.toLowerCase()} after refreshing earlier stages.`;
  }
  return `${stageLabel} is outdated — rerun to refresh.`;
}

export function downstreamStages(stage: PipelineStage): PipelineStage[] {
  const index = PIPELINE_STAGES.indexOf(stage);
  if (index < 0) {
    return [];
  }
  return PIPELINE_STAGES.slice(index + 1);
}

export function staleDownstreamStages(job: OutdoorJob, fromStage: PipelineStage): PipelineStage[] {
  return downstreamStages(fromStage).filter((stage) => isStageStale(job, stage));
}

export function recordCutApplyInput(job: OutdoorJob, cutRunId: string, inputVideo: string): void {
  const run = findStageRun(job, 'cut', cutRunId);
  upsertRun(job, 'cut', cutRunId, {
    artifacts: {
      ...(run?.artifacts ?? {}),
      lastAppliedInputVideo: inputVideo,
      lastAppliedAt: nowIso(),
    },
  });
}
