/** Pipeline and routing */

export type PipelineStage = 'stabilize' | 'cut' | 'align' | 'composite' | 'social';

export const PIPELINE_STAGES: readonly PipelineStage[] = [
  'stabilize',
  'cut',
  'align',
  'composite',
  'social',
] as const;

export const STAGE_LABELS: Record<PipelineStage, string> = {
  stabilize: 'Stabilize handheld shake',
  cut: 'Rough + smart cut',
  align: 'Align slides to voice',
  composite: 'Composite portrait + landscape',
  social: 'Social copy pack',
};

export type RunStatus = 'pending' | 'running' | 'succeeded' | 'failed' | 'cancelled';

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

export type JobStatus =
  | 'queued'
  | 'running'
  | 'review'
  | 'published'
  | 'failed'
  | 'ingested';

export type OutdoorRoute =
  | { name: 'library' }
  | { name: 'script'; scriptId: string }
  | { name: 'take'; scriptId: string; takeId: string }
  | { name: 'film'; scriptId: string }
  | { name: 'animation'; scriptId: string }
  | { name: 'platforms' };

export type AnimationMdDocument = {
  scriptId: string;
  path: string;
  markdown: string;
  exists: boolean;
  updatedAt: string | null;
};

export type AnimationMdAiResult = {
  markdown: string;
  applied: boolean;
  document?: AnimationMdDocument;
};

export type LlmSettings = {
  baseUrl: string;
  model: string | null;
  updatedAt: string;
};

/** Outdoor script (teleprompter) */

export type OutdoorScriptMode = 'manual' | 'timed';

export type OutdoorScriptImage = {
  dataUri?: string;
  uri?: string;
  alt?: string;
};

export type OutdoorScriptSlide = {
  id: string;
  title?: string;
  body: string;
  durationSeconds?: number;
  countdownSeconds?: number;
  image?: OutdoorScriptImage;
  notes?: string;
  leanCode?: string;
  turnCode?: string;
  codeFocus?: 'lean' | 'turn';
};

export type LiveBeat = {
  id: string;
  index: number;
  title: string;
  say: string;
  leanCode: string;
  turnCode: string;
  chinese: string;
  hint: string;
  visualNotes: string;
  durationSeconds?: number;
};

export type StyleKit =
  | 'compare'
  | 'motion-essay'
  | 'pitfall'
  | 'ai-review'
  | 'syntax-spot'
  | 'launch-pv'
  | 'life-essay';

export type LiveScript = {
  schemaVersion: 1;
  id: string;
  title: string;
  language: string;
  mode: 'timed';
  countdownSeconds: number;
  source: 'animation.md';
  /** Engineering project under projects/ (series folder id). */
  projectId?: string;
  seriesId?: string;
  styleKit?: StyleKit;
  updatedAt: string | null;
  slides: OutdoorScriptSlide[];
  beats: LiveBeat[];
};

export type OutdoorScript = {
  schemaVersion: 1;
  id: string;
  title: string;
  language?: string;
  mode?: OutdoorScriptMode;
  countdownSeconds?: number;
  defaultFontScale?: number;
  slides: OutdoorScriptSlide[];
  source?: 'animation.md' | string;
  updatedAt?: string | null;
  beats?: LiveBeat[];
};

export type TakeMarkerKind = 'ng' | 'keep' | 'note';

export type TakeMarker = {
  id: string;
  kind: TakeMarkerKind;
  label: string;
  atMs: number;
};

export type SlideEvent = {
  slideId: string;
  index: number;
  atMs: number;
};

export type TakeManifest = {
  schemaVersion: 1;
  scriptId: string;
  scriptTitle: string;
  takeId: string;
  recordedAt: string;
  videoUri: string;
  thumbnailUri?: string;
  durationMs: number;
  slideEvents: SlideEvent[];
  markers: TakeMarker[];
};

export type TakeSyncStatus = 'local' | 'queued' | 'synced' | 'exported';

export type TakeDeliveryStep = 'iphone' | 'icloud' | 'mac';

export type TakeDeliveryStepState = 'done' | 'pending' | 'waiting';

/** iPhone-local take row — metadata + delivery stepstones. */
export type LocalTakeView = {
  takeId: string;
  scriptId: string;
  scriptTitle: string;
  recordedAt: string;
  durationMs: number;
  slideEventCount: number;
  markerCount: number;
  ngMarkerCount: number;
  slideEvents: SlideEvent[];
  markers: TakeMarker[];
  thumbnailUri?: string;
  syncStatus: TakeSyncStatus;
  steps: Record<TakeDeliveryStep, TakeDeliveryStepState>;
  statusLabel: string;
  metadataSummary: string;
  photoLibraryHint?: string;
  fromDevice: true;
};

/** Catalog */

export type VideoOpsCatalogTake = {
  takeId: string;
  scriptId: string;
  recordedAt: string | null;
  durationMs: number | null;
  slideEventCount: number;
  markerCount: number;
  hasManifest: boolean;
  hasSourceVideo: boolean;
  pipelineStatus: string;
  pipelineError?: string | null;
  pipelineErrorTitle?: string | null;
  selectedRuns: Partial<Record<PipelineStage, string>>;
  hasPortrait: boolean;
  hasLandscape: boolean;
  publishPostCount: number;
};

export type VideoOpsCatalogScriptPaths = {
  scriptDir: string;
  outdoorScript: string | null;
  animation: string | null;
  animationMd?: string | null;
  socialPosts: string | null;
  studioRender: string | null;
};

export type VideoOpsCatalogScript = {
  scriptId: string;
  seriesId: string;
  /** @deprecated Use seriesId */
  collection: string;
  title: string;
  hasScriptMd: boolean;
  hasAnimation: boolean;
  hasAnimationMd?: boolean;
  ideaUpdatedAt?: string | null;
  freshnessLabel?: string;
  freshnessDaysAgo?: number | null;
  beatCount: number;
  slideCount: number;
  hasOutdoorScript: boolean;
  hasStudioRender: boolean;
  hasSocialPosts: boolean;
  socialPlatforms: { english: string[]; china: string[] };
  takeCount: number;
  takes: VideoOpsCatalogTake[];
  paths?: VideoOpsCatalogScriptPaths;
};

export type VideoOpsCatalogSeries = {
  id: string;
  title: string;
  description?: string;
  thumbnail?: string;
  playlist?: string;
  episodeCount: number;
  takeCount: number;
  sharedDir?: string | null;
  episodes: VideoOpsCatalogScript[];
};

export type VideoOpsCatalog = {
  schemaVersion: number;
  generatedAt: string;
  videoOpsRoot?: string;
  scriptsRoot: string;
  seriesCount: number;
  scriptCount: number;
  takeCount: number;
  series: VideoOpsCatalogSeries[];
  scripts: VideoOpsCatalogScript[];
};

export type ScriptsResyncResult = {
  scanned: number;
  compiled: string[];
  skipped: string[];
  errors: Array<{ scriptId: string; error: string }>;
  catalog: VideoOpsCatalog;
};

/** Inbox */

export type InboxFileStatus = 'pending' | 'ready' | 'ingested' | 'missing-pair';

export type InboxFileSighting = {
  takeId: string;
  inboxDir: string;
  videoPath: string | null;
  videoFileName: string | null;
  manifestPath?: string | null;
  manifestFileName?: string | null;
  scriptId: string | null;
  scriptTitle?: string | null;
  status: InboxFileStatus;
  updatedAt?: string;
  ingestedAt?: string;
  jobId?: string;
  takeDir?: string;
};

export type InboxStatusSnapshot = {
  schemaVersion?: number;
  updatedAt?: string;
  watchedFolders: string[];
  files: InboxFileSighting[];
  recentIngests: InboxFileSighting[];
};

export type InboxScanResult = {
  ok?: boolean;
  ingested: Array<{
    jobId: string;
    takeId: string;
    scriptId?: string;
    scriptTitle?: string;
  }>;
  status?: InboxStatusSnapshot;
};

/** Jobs */

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
  builtFrom?: Partial<Record<PipelineStage, string>>;
};

export type OutdoorJob = {
  schemaVersion?: number;
  jobId: string;
  takeId: string;
  scriptId: string;
  scriptTitle: string;
  status: JobStatus | string;
  createdAt: string;
  updatedAt: string;
  sourceVideoPath?: string;
  takeManifestPath?: string;
  selectedRuns: Partial<Record<PipelineStage, string>>;
  runs: Record<PipelineStage, StageRunSummary[]>;
  autoRun?: boolean;
};

export type OutdoorJobSummary = {
  jobId: string;
  takeId: string;
  scriptId: string;
  scriptTitle: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  selectedRuns: Partial<Record<PipelineStage, string>>;
  progress?: Partial<Record<PipelineStage, StageProgress | null>>;
};

export type PublishVisibility = 'live' | 'hidden' | 'deleted' | 'pending';

export type PublishRecord = {
  platform: string;
  provider?: string;
  postId: string;
  url: string;
  status: PublishVisibility;
  publishedAt?: string;
  hiddenAt?: string;
  deletedAt?: string;
  jobId?: string;
  compositeRunId?: string;
  stub?: boolean;
  coverId?: string;
};

export type PublishState = {
  schemaVersion?: number;
  jobId: string;
  scriptId?: string;
  takeId?: string;
  posts: PublishRecord[];
};

export type StageResultPreview = {
  stage: PipelineStage;
  runId: string | null;
  status: RunStatus | 'pending';
  videos: Array<{ label: string; url: string }>;
  summary: string[];
  socialTitles: Array<{ group: string; platform: string; title: string; body?: string }>;
  social?: SocialPosts | null;
  stale?: boolean;
  staleReason?: string | null;
};

export type JobResultsPreview = {
  jobId: string;
  scriptId: string;
  takeId: string;
  stages: StageResultPreview[];
};

export type OutdoorJobDetail = {
  job: OutdoorJob;
  publish: PublishState;
  progress: Partial<Record<PipelineStage, StageProgress | null>>;
  results?: JobResultsPreview;
};

export type PipelineStageSnapshot = {
  stage: PipelineStage;
  runId: string | null;
  status: RunStatus | 'pending';
  error?: string;
  errorCode?: PipelineErrorCode;
  errorTitle?: string;
  errorHint?: string;
  progress: StageProgress | null;
  logTail?: string | null;
  logUrl?: string | null;
  stale?: boolean;
  staleReason?: string | null;
};

export type PipelineSnapshot = {
  jobId: string;
  scriptId?: string;
  takeId?: string;
  jobStatus: JobStatus | string;
  updatedAt: string;
  failedStage?: PipelineStage | null;
  failureTitle?: string | null;
  failureMessage?: string | null;
  failureHint?: string | null;
  agentLogTail?: string | null;
  stages: PipelineStageSnapshot[];
};

export type CancelJobResponse = {
  ok: boolean;
  job: OutdoorJob;
  snapshot: PipelineSnapshot;
};

/** Cut review */

export type CutInterval = {
  start: number;
  end: number;
  reason?: string;
};

export type CutTranscriptLine = {
  id: string;
  start: number;
  end: number;
  text: string;
  kept: boolean;
  kind: 'keep' | 'silence' | 'ng' | 'other';
  reason: string;
  toggleStart: number;
  toggleEnd: number;
  toggleMode: 'bad' | 'good';
};

export type CutSlideTranscript = {
  slideId: string;
  slideTitle: string;
  sourceStart: number;
  sourceEnd: number;
  lines: CutTranscriptLine[];
};

export type CutSelection = {
  schemaVersion: 1;
  restoreBad: CutInterval[];
  dropGood: CutInterval[];
  updatedAt: string;
};

export type CutReviewPayload = {
  runId: string;
  analysisPath?: string;
  selectionPath?: string;
  sourceVideoUrl: string;
  /** Footage shown in Cut review (stabilized when available). */
  previewVideoUrl?: string;
  previewUsesStabilized?: boolean;
  editedVideoUrl: string | null;
  durationSeconds: number;
  slides: CutSlideTranscript[];
  badIntervals?: CutInterval[];
  goodIntervals?: CutInterval[];
  selection: CutSelection;
  usesStabilizedInput?: boolean;
  appliesWithStabilizedVideo?: boolean;
  needsStabilizedApply?: boolean;
  stale?: boolean;
  staleReason?: string | null;
};

/** Align review */

export type MaskShape = 'circle' | 'rectangle';

export type AlignBoxLayout = {
  shape: MaskShape;
  /** Mask net — visible crop window (0–1). */
  x: number;
  y: number;
  w: number;
  h: number;
  /** Video net — underlying filmed clip rectangle (0–1). */
  videoX?: number;
  videoY?: number;
  videoW?: number;
  videoH?: number;
  objectPositionX: number;
  objectPositionY: number;
  scale: number;
};

export type AlignHintLayout = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type AlignBeatLayout = {
  pip: AlignBoxLayout;
  hintPanel: AlignHintLayout;
  presenterMode?: 'split-crop' | 'full-clip';
  scriptFullscreen?: boolean;
};

export type AlignLayout = {
  schemaVersion: 1;
  updatedAt: string;
  pip: AlignBoxLayout;
  hintPanel: AlignHintLayout;
  beats?: Record<string, AlignBeatLayout>;
};

export type AlignSaidLine = {
  id: string;
  text: string;
  start: number;
  end: number;
};

export type AlignSlidePreview = {
  beatIndex: number;
  slideId: string;
  slideTitle: string;
  editedStart: number;
  editedEnd: number;
  durationSeconds: number;
  say?: string;
  saidLines?: AlignSaidLine[];
  videoUrl: string;
  remotionStudioHint: string;
  remotionStudioUrl?: string | null;
  remotionPortraitUrl?: string | null;
  layout?: AlignBeatLayout;
};

export type AlignReviewPayload = {
  runId: string;
  editedVideoUrl: string;
  layoutPath: string;
  layout: AlignLayout;
  remotionStudioUrl?: string | null;
  remotionCompositionUrl?: string | null;
  remotionPortraitUrl?: string | null;
  slides: AlignSlidePreview[];
};

/** Social */

export type SocialPlatformCopy = {
  title?: string;
  body?: string;
};

export type SocialPosts = {
  titleEnglish?: string;
  titleChina?: string;
  title?: string;
  english?: Record<string, SocialPlatformCopy>;
  china?: Record<string, SocialPlatformCopy>;
  updatedAt?: string;
};

export type SocialPatch = {
  titleEnglish?: string;
  titleChina?: string;
  title?: string;
  english?: Record<string, SocialPlatformCopy>;
  china?: Record<string, SocialPlatformCopy>;
};

/** Covers */

export type CoverSource = 'browser' | 'iphone' | 'import' | 'duplicate' | 'composite';

export type CoverMeta = {
  id: string;
  label: string;
  createdAt: string;
  source: CoverSource;
  fileName: string;
  contentType?: string;
  width?: number;
  height?: number;
};

export type CoverListItem = {
  id: string;
  label: string;
  path: string;
  url: string;
  usedBy: string[];
  meta?: CoverMeta;
};

export type CoversListResponse = {
  covers: CoverListItem[];
  platformCovers: Record<string, string>;
};

export type CoverPlatformMapPatch = {
  platformCovers?: Record<string, string | null>;
  batch?: {
    group: 'english' | 'china';
    coverId: string | null;
    platforms: string[];
  };
};

export type CaptureCoverOptions = {
  format?: 'portrait' | 'landscape';
  atSeconds?: number;
  label?: string;
};

/** Platforms */

export type PlatformConnectionStatus =
  | 'connected'
  | 'configured'
  | 'missing_credentials'
  | 'manual'
  | 'stub';

export type LoginLink = {
  label: string;
  url?: string;
  command?: string;
};

export type SignupStep = {
  step: number;
  title: string;
  detail: string;
  url?: string;
  command?: string;
};

export type PlatformStatus = {
  platform: string;
  provider: 'zernio' | 'social-auto-upload' | 'unknown';
  mode: 'stub' | 'live';
  status: PlatformConnectionStatus | string;
  accountLabel: string | null;
  accountMasked: string | null;
  envHints?: string[];
  dashboardUrl?: string | null;
  loginCommand?: string | null;
  loginLinks?: LoginLink[];
  signupUrl?: string | null;
  signupSteps?: SignupStep[];
  notes: string[];
};

export type ConnectProgress = {
  total: number;
  ready: number;
  missing: string[];
  manual: string[];
  stubOnly: boolean;
};

export type PlatformsHealthResponse = {
  checkedAt: string;
  platformIds: string[];
  connectProgress: ConnectProgress;
  providers: {
    zernio: {
      mode: 'stub' | 'live';
      hasApiKey: boolean;
      dashboardUrl: string;
      signupUrl?: string;
      apiKeysUrl?: string;
      connectGuideUrl?: string;
      envDocs: string[];
      loginLinks?: LoginLink[];
      signupSteps?: SignupStep[];
      suggestedAccountsJson?: Record<string, string> | null;
      suggestedAccountsExport?: string | null;
    };
    sau: {
      mode: 'stub' | 'live';
      dashboardHint: string;
      installHint?: string;
      envDocs: string[];
      loginLinks?: LoginLink[];
      signupSteps?: SignupStep[];
    };
  };
  entries: PlatformStatus[];
  platforms?: PlatformStatus[];
  manualPlatforms: string[];
};

export type PlatformTestResult = {
  ok: boolean;
  message: string;
  provider?: string | null;
  platform?: string;
};

export type ZernioSyncResult = {
  accounts?: Array<{ id: string; platform: string; name: string | null }>;
  suggestedAccountsJson: Record<string, string>;
  exportCommand: string;
};

/** Publish */

export type PublishFormat = 'portrait' | 'landscape';

export type PublishResult = {
  url: string;
  stub?: boolean;
  status?: PublishVisibility | string;
};

export type PublishAllResult = {
  published: Array<{ platform: string; record?: PublishRecord }>;
  skippedLive: string[];
  skippedNoTitle: string[];
  failed: Array<{ platform: string; error: string }>;
};

/** Stage run */

export type RunStageOptions = {
  rerun?: boolean;
  options?: Record<string, unknown>;
};

export type RunStageResponse = {
  accepted: boolean;
  jobId: string;
  stage?: PipelineStage;
};

export type SelectionUpdateResponse = {
  job: OutdoorJob;
};

export type AlignSyncStudioResponse = {
  layout?: AlignLayout;
  review?: AlignReviewPayload;
};

export type UploadTakeResult = {
  jobId: string;
};

export type HealthResponse = {
  ok: boolean;
  service?: string;
};
