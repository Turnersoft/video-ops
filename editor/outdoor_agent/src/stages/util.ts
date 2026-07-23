import { writeProgress } from '../job-store.ts';
import { formatPipelineErrorFromRunDir } from '../pipeline-error.ts';
import { ensureDir, takeStageRunDir } from '../paths.ts';
import type { OutdoorJob, PipelineStage } from '../schema.ts';
import {
  logStageRunEvent,
  openStageRunLog,
  setActiveStageLogDir,
} from '../stage-run-log.ts';

type ProgressPartial = { percent?: number; step?: string; message?: string };

type ProgressReporter = (partial: ProgressPartial) => void;

type StageWorker = (report: ProgressReporter) => Promise<Record<string, string>>;

export async function runStageWorker(
  job: OutdoorJob,
  stage: PipelineStage,
  runId: string,
  worker: StageWorker,
): Promise<Record<string, string>> {
  const outDir = takeStageRunDir(job.scriptId, job.takeId, stage, runId);
  ensureDir(outDir);
  openStageRunLog(outDir, {
    jobId: job.jobId,
    scriptId: job.scriptId,
    takeId: job.takeId,
    stage,
    runId,
  });
  setActiveStageLogDir(outDir);

  const report: ProgressReporter = (partial) => {
    writeProgress(job.jobId, stage, runId, {
      percent: partial.percent ?? 0,
      step: partial.step ?? stage,
      message: partial.message ?? '',
    });
    if (partial.message) {
      logStageRunEvent(outDir, partial.message);
    }
  };

  report({ percent: 0, step: 'start', message: `Starting ${stage}` });
  try {
    const artifacts = await worker(report);
    report({ percent: 100, step: 'done', message: `${stage} complete` });
    return artifacts;
  } catch (error) {
    const fields = formatPipelineErrorFromRunDir(stage, error, outDir);
    logStageRunEvent(outDir, `FAILED: ${fields.errorTitle} — ${fields.error}`);
    report({
      percent: 100,
      step: 'failed',
      message: fields.error,
    });
    throw error;
  } finally {
    setActiveStageLogDir(null);
  }
}

export function artifactUrl(
  scriptId: string,
  takeId: string,
  stage: string,
  runId: string,
  fileName: string,
): string {
  return `/api/scripts/${encodeURIComponent(scriptId)}/takes/${encodeURIComponent(takeId)}/artifacts/${encodeURIComponent(stage)}/${encodeURIComponent(runId)}/${encodeURIComponent(fileName)}`;
}
