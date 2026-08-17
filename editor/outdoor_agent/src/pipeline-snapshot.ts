import { readProgress } from './job-store.ts';
import { isStageStale, staleReason } from './pipeline-lineage.ts';
import { stageErrorFieldsFromRun, firstFailedStageError } from './pipeline-error.ts';
import { takeStageRunDir } from './paths.ts';
import {
  readCompositeRenderLogTails,
  readStageRunLogTail,
  readTakeAgentLogTail,
  stageRunLogExists,
  STAGE_RUN_LOG,
} from './stage-run-log.ts';
import { artifactUrl } from './stages/util.ts';
import {
  PIPELINE_STAGES,
  type JobStatus,
  type OutdoorJob,
  type PipelineErrorCode,
  type PipelineStage,
  type RunStatus,
  type StageProgress,
} from './schema.ts';

export type PipelineStageSnapshot = {
  stage: PipelineStage;
  runId: string | null;
  status: RunStatus | 'pending';
  error?: string;
  errorCode?: PipelineErrorCode;
  errorTitle?: string;
  errorHint?: string;
  progress: StageProgress | null;
  logTail: string | null;
  logUrl: string | null;
  renderLogTails?: {
    portrait: string | null;
    landscape: string | null;
  };
  stale: boolean;
  staleReason: string | null;
};

export type PipelineSnapshot = {
  jobId: string;
  scriptId: string;
  takeId: string;
  jobStatus: JobStatus;
  updatedAt: string;
  failedStage: PipelineStage | null;
  failureTitle: string | null;
  failureMessage: string | null;
  failureHint: string | null;
  agentLogTail: string | null;
  stages: PipelineStageSnapshot[];
};

function activeRunId(job: OutdoorJob, stage: PipelineStage): string | null {
  const runs = job.runs[stage] ?? [];
  const running = runs.find((entry) => entry.status === 'running');
  if (running) {
    return running.runId;
  }
  if (job.selectedRuns[stage]) {
    return job.selectedRuns[stage] ?? null;
  }
  return runs[0]?.runId ?? null;
}

export function buildPipelineSnapshot(job: OutdoorJob): PipelineSnapshot {
  const failure = firstFailedStageError(job);
  return {
    jobId: job.jobId,
    scriptId: job.scriptId,
    takeId: job.takeId,
    jobStatus: job.status,
    updatedAt: job.updatedAt,
    failedStage: failure?.stage ?? null,
    failureTitle: failure?.errorTitle ?? null,
    failureMessage: failure?.error ?? null,
    failureHint: failure?.errorHint ?? null,
    agentLogTail: readTakeAgentLogTail(job.scriptId, job.takeId),
    stages: PIPELINE_STAGES.map((stage) => {
      const runId = activeRunId(job, stage);
      const run = runId ? job.runs[stage]?.find((entry) => entry.runId === runId) : undefined;
      const runDir = runId ? takeStageRunDir(job.scriptId, job.takeId, stage, runId) : null;
      const logTail = runDir ? readStageRunLogTail(runDir) : null;
      const renderLogTails =
        stage === 'composite' && runDir ? readCompositeRenderLogTails(runDir) : undefined;
      const errorFields = stageErrorFieldsFromRun(stage, run, logTail);
      return {
        stage,
        runId,
        status: run?.status ?? 'pending',
        error: errorFields?.error ?? run?.error,
        errorCode: errorFields?.errorCode ?? run?.errorCode,
        errorTitle: errorFields?.errorTitle ?? run?.errorTitle,
        errorHint: errorFields?.errorHint ?? run?.errorHint,
        progress: runId ? readProgress(job.jobId, stage, runId) : null,
        logTail,
        renderLogTails,
        logUrl:
          runId && runDir && stageRunLogExists(runDir)
            ? artifactUrl(job.scriptId, job.takeId, stage, runId, STAGE_RUN_LOG)
            : null,
        stale: isStageStale(job, stage),
        staleReason: staleReason(job, stage),
      };
    }),
  };
}
