import { loadJob, saveJob } from './job-store.ts';
import { builtFromSnapshot, recordCutApplyInput } from './pipeline-lineage.ts';
import { formatPipelineErrorFromRunDir } from './pipeline-error.ts';
import { abortSubprocess } from './subprocess.ts';
import { appendTakeAgentLog } from './stage-run-log.ts';
import {
  isPipelineStage,
  newRunId,
  nowIso,
  PIPELINE_STAGES,
  type OutdoorJob,
  type PipelineStage,
  upsertRun,
} from './schema.ts';
import { takeStageRunDir } from './paths.ts';
import { runAlignStage } from './stages/align.ts';
import { runCompositeStage } from './stages/composite.ts';
import { runStabilizeStage } from './stages/stabilize.ts';
import { runCutStage } from './stages/cut.ts';
import { runSocialStage } from './stages/social.ts';

const jobLocks = new Map<string, Promise<void>>();
const cancelledJobs = new Set<string>();

export function isJobCancelled(jobId: string): boolean {
  return cancelledJobs.has(jobId);
}

export function requestJobCancel(jobId: string): void {
  cancelledJobs.add(jobId);
  abortSubprocess(jobId);
}

function clearJobCancel(jobId: string): void {
  cancelledJobs.delete(jobId);
}

async function withJobLock(jobId: string, fn: () => Promise<void>): Promise<void> {
  const previous = jobLocks.get(jobId) ?? Promise.resolve();
  let release!: () => void;
  const next = new Promise<void>((resolve) => {
    release = resolve;
  });
  jobLocks.set(jobId, previous.then(() => next));
  await previous;
  try {
    await fn();
  } finally {
    release();
    if (jobLocks.get(jobId) === next) {
      jobLocks.delete(jobId);
    }
  }
}

type StageRunner = (
  job: OutdoorJob,
  runId: string,
  options?: Record<string, unknown>,
) => Promise<Record<string, string>>;

function stageRunner(stage: PipelineStage): StageRunner {
  switch (stage) {
    case 'stabilize':
      return runStabilizeStage;
    case 'cut':
      return runCutStage;
    case 'align':
      return runAlignStage;
    case 'composite':
      return runCompositeStage;
    case 'social':
      return runSocialStage;
    default: {
      const never: never = stage;
      throw new Error(`Unknown stage: ${never}`);
    }
  }
}

type RunStageParams = {
  rerun?: boolean;
  options?: Record<string, unknown>;
};

export async function runStage(
  jobId: string,
  stage: PipelineStage,
  params: RunStageParams = {},
): Promise<void> {
  clearJobCancel(jobId);
  if (isJobCancelled(jobId)) {
    throw new Error('Pipeline cancelled');
  }
  await withJobLock(jobId, async () => {
    const job = loadJob(jobId);
    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }
    if (isJobCancelled(jobId)) {
      throw new Error('Pipeline cancelled');
    }
    if (stage === 'align' && job.takeId.startsWith('take-voxcpm-')) {
      throw new Error(
        'AI clone narration comes from VoxCPM — use Re-synthesize voice in the AI clone panel, or rerun Remotion composite for preview only.',
      );
    }

    const runId = params.rerun ? newRunId(stage) : job.selectedRuns[stage] ?? newRunId(stage);
    upsertRun(job, stage, runId, { status: 'running' });
    job.status = 'running';
    saveJob(job);
    appendTakeAgentLog(job.scriptId, job.takeId, `stage ${stage} run ${runId} started`);

    try {
      const runner = stageRunner(stage);
      const artifacts = await runner(job, runId, params.options ?? {});
      if (isJobCancelled(jobId)) {
        throw new Error('Pipeline cancelled');
      }
      upsertRun(job, stage, runId, {
        status: 'succeeded',
        finishedAt: nowIso(),
        artifacts,
        builtFrom: builtFromSnapshot(job, stage),
      });
      if (stage === 'cut') {
        const inputVideo = artifacts.inputVideo;
        if (
          typeof inputVideo === 'string' &&
          (inputVideo.includes('/stabilize/') || inputVideo.endsWith('stabilized.mp4'))
        ) {
          recordCutApplyInput(job, runId, inputVideo);
        }
      }
      job.selectedRuns[stage] = runId;
      job.status = 'review';
      saveJob(job);
      appendTakeAgentLog(job.scriptId, job.takeId, `stage ${stage} run ${runId} succeeded`);
    } catch (error) {
      const cancelled = isJobCancelled(jobId);
      const runDir = takeStageRunDir(job.scriptId, job.takeId, stage, runId);
      const fields = cancelled
        ? {
            error: 'Stopped from iPhone before this stage finished.',
            errorCode: 'cancelled' as const,
            errorTitle: 'Pipeline aborted',
            errorHint: undefined,
          }
        : formatPipelineErrorFromRunDir(stage, error, runDir);
      upsertRun(job, stage, runId, {
        status: cancelled ? 'cancelled' : 'failed',
        finishedAt: nowIso(),
        ...fields,
      });
      job.status = 'failed';
      saveJob(job);
      appendTakeAgentLog(
        job.scriptId,
        job.takeId,
        `stage ${stage} run ${runId} ${cancelled ? 'cancelled' : 'failed'}: ${fields.errorTitle} — ${fields.error}`,
      );
      if (cancelled) {
        clearJobCancel(jobId);
      }
      throw error;
    }
  });
}

export async function runDefaultPipeline(
  jobId: string,
  options: { rerun?: boolean } = {},
): Promise<void> {
  clearJobCancel(jobId);
  const rerun = options.rerun ?? false;
  for (const stage of PIPELINE_STAGES) {
    if (isJobCancelled(jobId)) {
      return;
    }
    await runStage(jobId, stage, { rerun });
    if (isJobCancelled(jobId)) {
      return;
    }
  }
}

export async function cancelJob(jobId: string): Promise<OutdoorJob> {
  requestJobCancel(jobId);
  const job = loadJob(jobId);
  if (!job) {
    clearJobCancel(jobId);
    throw new Error(`Job not found: ${jobId}`);
  }
  for (const stage of PIPELINE_STAGES) {
    for (const run of job.runs[stage] ?? []) {
      if (run.status === 'running') {
        upsertRun(job, stage, run.runId, {
          status: 'cancelled',
          finishedAt: nowIso(),
          error: 'Stopped from iPhone before this stage finished.',
          errorCode: 'cancelled',
          errorTitle: 'Pipeline aborted',
        });
      }
    }
  }
  if (job.status === 'running' || job.status === 'queued') {
    job.status = 'failed';
  }
  saveJob(job);
  appendTakeAgentLog(job.scriptId, job.takeId, `pipeline cancel requested for ${jobId}`);
  return job;
}

export function setStageSelection(
  jobId: string,
  selection: Partial<Record<PipelineStage, string>>,
): OutdoorJob {
  const job = loadJob(jobId);
  if (!job) {
    throw new Error(`Job not found: ${jobId}`);
  }
  for (const [stage, runId] of Object.entries(selection)) {
    if (!isPipelineStage(stage) || !runId) {
      continue;
    }
    const runs = job.runs[stage] ?? [];
    if (!runs.some((entry) => entry.runId === runId)) {
      throw new Error(`Run ${runId} not found for stage ${stage}`);
    }
    job.selectedRuns[stage] = runId;
  }
  saveJob(job);
  return job;
}
