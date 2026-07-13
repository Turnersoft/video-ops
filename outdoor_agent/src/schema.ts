export type PipelineStage = 'stabilize' | 'cut' | 'align' | 'composite' | 'social';
export type RunStatus = 'pending' | 'running' | 'succeeded' | 'failed' | 'cancelled';
export type JobStatus = 'queued' | 'running' | 'review' | 'published' | 'failed' | 'ingested';
export type PublishVisibility = 'live' | 'hidden' | 'deleted' | 'pending';

export type PipelineErrorCode =
  | 'cancelled'
  | 'missing_script'
  | 'missing_prerequisite'
  | 'missing_file'
  | 'transcription'
  | 'subprocess'
  | 'render'
  | 'network'
  | 'upload'
  | 'unknown';

export type StageProgress = {
  percent: number;
  step: string;
  message: string;
  updatedAt: string;
};

export type StageRunSummary = {
  runId: string;
  status: RunStatus;
  createdAt: string;
  finishedAt?: string;
  error?: string;
  errorCode?: PipelineErrorCode;
  errorTitle?: string;
  errorHint?: string;
  artifacts?: Record<string, string>;
  /** Selected upstream run ids this output was built from. */
  builtFrom?: Partial<Record<PipelineStage, string>>;
};

export type OutdoorJob = {
  schemaVersion: number;
  jobId: string;
  takeId: string;
  scriptId: string;
  scriptTitle: string;
  status: JobStatus;
  createdAt: string;
  updatedAt: string;
  sourceVideoPath: string;
  takeManifestPath: string;
  selectedRuns: Partial<Record<PipelineStage, string>>;
  runs: Record<PipelineStage, StageRunSummary[]>;
  autoRun: boolean;
};

export type PublishRecord = {
  platform: string;
  provider?: string;
  postId: string;
  url: string;
  status: PublishVisibility;
  publishedAt: string;
  hiddenAt?: string;
  deletedAt?: string;
  jobId?: string;
  compositeRunId?: string;
  stub?: boolean;
  coverId?: string;
};

export type PublishState = {
  schemaVersion: number;
  jobId: string;
  scriptId?: string;
  takeId?: string;
  posts: PublishRecord[];
};

export const PIPELINE_STAGES: PipelineStage[] = ['stabilize', 'cut', 'align', 'composite', 'social'];

export const STAGE_LABELS: Record<PipelineStage, string> = {
  stabilize: 'Stabilize handheld shake',
  cut: 'Rough + smart cut',
  align: 'Align slides to voice',
  composite: 'Composite portrait + landscape',
  social: 'Social copy pack',
};

export function nowIso(): string {
  return new Date().toISOString();
}

export function newRunId(prefix = 'run'): string {
  return `${prefix}-${Date.now().toString(36)}`;
}

export function newJobId(takeId: string): string {
  return `job-${takeId}`;
}

export function createJob(
  partial: Partial<OutdoorJob> &
    Pick<
      OutdoorJob,
      'jobId' | 'takeId' | 'scriptId' | 'scriptTitle' | 'sourceVideoPath' | 'takeManifestPath'
    >,
): OutdoorJob {
  const timestamp = nowIso();
  return {
    schemaVersion: 2,
    status: 'queued',
    createdAt: timestamp,
    updatedAt: timestamp,
    selectedRuns: {},
    runs: { stabilize: [], cut: [], align: [], composite: [], social: [] },
    autoRun: true,
    ...partial,
  };
}

export function upsertRun(
  job: OutdoorJob,
  stage: PipelineStage,
  runId: string,
  summary: Partial<StageRunSummary>,
): void {
  const existing = job.runs[stage] ?? [];
  const index = existing.findIndex((entry) => entry.runId === runId);
  const next: StageRunSummary = {
    runId,
    status: 'pending',
    createdAt: nowIso(),
    ...summary,
  };
  if (index >= 0) {
    existing[index] = { ...existing[index], ...next };
  } else {
    existing.unshift(next);
  }
  job.runs[stage] = existing;
  job.updatedAt = nowIso();
}

export function isPipelineStage(value: string): value is PipelineStage {
  return (PIPELINE_STAGES as string[]).includes(value);
}
