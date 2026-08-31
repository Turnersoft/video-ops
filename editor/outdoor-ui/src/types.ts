import type { VoxcpmToneId } from "../../../src/voxcpmScript";
import type { VoiceEngineId } from "./utils/voiceEngine";
import type { ScriptLanguageId } from "./utils/scriptLanguage";

/** Pipeline and routing */

export type PipelineStage =
  | "stabilize"
  | "cut"
  | "align"
  | "composite"
  | "social";

export const PIPELINE_STAGES: readonly PipelineStage[] = [
  "stabilize",
  "cut",
  "align",
  "composite",
  "social",
] as const;

export const STAGE_LABELS: Record<PipelineStage, string> = {
  stabilize: "Stabilize handheld shake",
  cut: "Rough + smart cut",
  align: "Align slides to voice",
  composite: "Composite portrait + landscape",
  social: "Social copy pack",
};

export type RunStatus =
  | "pending"
  | "running"
  | "succeeded"
  | "failed"
  | "cancelled";

export type PipelineErrorCode =
  | "cancelled"
  | "missing_script"
  | "missing_prerequisite"
  | "missing_file"
  | "transcription"
  | "subprocess"
  | "render"
  | "network"
  | "upload"
  | "unknown";

export type JobStatus =
  | "queued"
  | "running"
  | "review"
  | "published"
  | "failed"
  | "ingested";

export type OutdoorRoute =
  | { name: "library" }
  | { name: "script"; scriptId: string }
  | { name: "post"; scriptId: string }
  | { name: "beat-posters"; scriptId: string }
  | { name: "take"; scriptId: string; takeId: string }
  | { name: "film"; scriptId: string }
  | { name: "animation"; scriptId: string }
  | { name: "platforms" }
  | { name: "publish-plan" }
  | { name: "mass-publish" };

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

export type OutdoorScriptMode = "manual" | "timed";

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
  codeFocus?: "lean" | "turn";
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
  | "compare"
  | "motion-essay"
  | "pitfall"
  | "ai-review"
  | "syntax-spot"
  | "launch-pv"
  | "life-essay";

export type LiveScript = {
  schemaVersion: 1;
  id: string;
  title: string;
  language: string;
  mode: "timed";
  countdownSeconds: number;
  source: "animation.md";
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
  source?: "animation.md" | string;
  updatedAt?: string | null;
  beats?: LiveBeat[];
};

export type TakeMarkerKind = "ng" | "keep" | "note";

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

export type TakeSyncStatus = "local" | "queued" | "synced" | "exported";

export type TakeDeliveryStep = "iphone" | "icloud" | "mac";

export type TakeDeliveryStepState = "done" | "pending" | "waiting";

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

export type InboxFileStatus = "pending" | "ready" | "ingested" | "missing-pair";

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

export type PublishVisibility =
  | "live"
  | "hidden"
  | "deleted"
  | "pending"
  | "failed";

export type PublishProgressStage =
  | "queued"
  | "generating_card"
  | "uploading_video"
  | "uploading_image"
  | "uploading_thumbnail"
  | "submitting"
  | "accepted"
  | "published"
  | "failed";

export type PublishProgress = {
  stage: PublishProgressStage;
  percent: number;
  message: string;
  updatedAt: string;
};

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
  mediaKind?: "video" | "image";
  imagePath?: string;
  progress?: PublishProgress;
  error?: string;
  postizState?: "QUEUE" | "PUBLISHED" | "ERROR" | "DRAFT";
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
  status: RunStatus | "pending";
  videos: Array<{
    label: string;
    url: string;
    fileName?: string;
    stage?: PipelineStage;
    runId?: string;
  }>;
  summary: string[];
  socialTitles: Array<{
    group: string;
    platform: string;
    title: string;
    body?: string;
  }>;
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
  status: RunStatus | "pending";
  error?: string;
  errorCode?: PipelineErrorCode;
  errorTitle?: string;
  errorHint?: string;
  progress: StageProgress | null;
  logTail?: string | null;
  logUrl?: string | null;
  renderLogTails?: {
    portrait?: string | null;
    landscape?: string | null;
  };
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
  kind: "keep" | "silence" | "ng" | "other";
  reason: string;
  toggleStart: number;
  toggleEnd: number;
  toggleMode: "bad" | "good";
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

export type MaskShape = "circle" | "rectangle";

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
  presenterMode?: "split-crop" | "full-clip";
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

export type CoverSource =
  | "browser"
  | "iphone"
  | "import"
  | "duplicate"
  | "composite";

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
    group: "english" | "china";
    coverId: string | null;
    platforms: string[];
  };
};

export type CaptureCoverOptions = {
  format?: "portrait" | "landscape";
  atSeconds?: number;
  label?: string;
};

/** Script-level publish covers — four fixed JPG slots per episode folder. */

export type ScriptCoverSlot =
  | "portrait-en"
  | "portrait-zh"
  | "landscape-en"
  | "landscape-zh";

export type ScriptCoverSlotInfo = {
  slot: ScriptCoverSlot;
  fileName: string;
  label: string;
  exists: boolean;
  updatedAt: string | null;
  url: string;
};

export type ScriptCoversResponse = {
  scriptId: string;
  folder: string;
  slots: ScriptCoverSlotInfo[];
};

/** Platforms */

export type PlatformConnectionStatus =
  | "connected"
  | "configured"
  | "missing_credentials"
  | "manual"
  | "stub";

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
  provider: "postiz" | "social-auto-upload" | "unknown" | "zernio";
  mode: "stub" | "live";
  status: PlatformConnectionStatus | string;
  accountLabel: string | null;
  accountMasked: string | null;
  envHints?: string[];
  dashboardUrl?: string | null;
  loginCommand?: string | null;
  loginKind?: "qr" | "portal" | "browser" | null;
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
    postiz: {
      mode: "stub" | "live";
      hasApiKey: boolean;
      dashboardUrl: string;
      signupUrl?: string;
      apiKeysUrl?: string;
      connectGuideUrl?: string;
      envDocs: string[];
      loginLinks?: LoginLink[];
      signupSteps?: SignupStep[];
      liveIntegrations?: PostizConnectedIntegration[];
      suggestedIntegrationsJson?: Record<string, string> | null;
      suggestedIntegrationsExport?: string | null;
    };
    sau: {
      mode: "stub" | "live";
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

export type PlatformLoginKind = "qr" | "portal" | "browser";

export type PlatformLoginStatus =
  | "starting"
  | "waiting_scan"
  | "waiting_portal"
  | "succeeded"
  | "failed"
  | "cancelled";

export type PlatformLoginSession = {
  platform: string;
  provider: "postiz" | "social-auto-upload";
  kind: PlatformLoginKind;
  status: PlatformLoginStatus;
  message: string;
  qrImageUrl: string | null;
  portalUrl: string | null;
  startedAt: string;
  updatedAt: string;
};

export type PostizSyncResult = {
  integrations?: PostizConnectedIntegration[];
  suggestedIntegrationsJson: Record<string, string>;
  suggestedAccountsJson?: Record<string, string>;
  exportCommand: string;
  applied?: boolean;
  postizPublishMode?: "stub" | "live";
};

/** @deprecated Use PostizSyncResult */
export type ZernioSyncResult = PostizSyncResult;

export type PublishCredentialsPublic = {
  hasPostizApiKey: boolean;
  postizApiKeyHint: string | null;
  postizIntegrationsJson: Record<string, string>;
  postizIntegrationTypesJson: Record<string, string>;
  postizIntegrationCount: number;
  postizPublishMode: "stub" | "live";
  postizApiBase: string;
  postizDashboardUrl: string;
  sauPublishMode: "stub" | "live";
  sauAccount: string;
  updatedAt: string;
  storedPath: string;
};

export type PostizConnectedIntegration = {
  id: string;
  identifier: string;
  outdoorPlatform: string | null;
  name: string | null;
  picture: string | null;
};

export type PostizIntegrationSettings = {
  rules: string;
  maxLength: number | null;
  settings: unknown;
  tools: Array<{
    methodName: string;
    description: string;
  }>;
};

export type PostizRecentPost = {
  id: string;
  content: string;
  publishDate: string | null;
  releaseURL: string | null;
  state: "QUEUE" | "PUBLISHED" | "ERROR" | "DRAFT" | "UNKNOWN";
  integration: {
    id: string;
    identifier: string;
    name: string;
  } | null;
};

export type PostizNotification = {
  id: string;
  content: string;
  link: string | null;
  createdAt: string;
};

export type PostizOverview = {
  checkedAt: string;
  apiConnected: boolean;
  message: string;
  mode: "stub" | "live";
  dashboardUrl: string;
  integrations: Array<
    PostizConnectedIntegration & {
      settings: PostizIntegrationSettings | null;
      settingsError: string | null;
    }
  >;
  recentPosts: PostizRecentPost[];
  notifications: PostizNotification[];
  errors: string[];
};

/** Publish */

export type PublishFormat = "portrait" | "landscape";

/** Exact per-platform payload from GET /api/jobs/:id/publish-preview */
export type PublishPlanPlatform = {
  platform: string;
  group: "english" | "china" | "fallback";
  provider: "postiz" | "social-auto-upload" | null;
  format: PublishFormat;
  videoFileName: string;
  videoUrl: string | null;
  videoExists: boolean;
  title: string;
  body: string;
  apiContent: string;
  apiTitle: string | null;
  apiSettings: Record<string, unknown> | null;
  coverId: string | null;
  coverUrl: string | null;
  coverAppliesAsThumbnail: boolean;
  canPublish: boolean;
  blockers: string[];
  postizMode?: "stub" | "live";
  hasIntegration?: boolean;
};

export type PublishPlan = {
  jobId: string;
  scriptId: string;
  takeId: string;
  compositeRunId: string | null;
  socialRunId: string | null;
  ready: boolean;
  error: string | null;
  platforms: PublishPlanPlatform[];
};

export type SocialCardFormat = "portrait" | "landscape" | "square";

export type SocialCardLang = "en" | "zh";

export type SocialCardListItem = {
  id: string;
  format: SocialCardFormat;
  lang: SocialCardLang;
  width: number;
  height: number;
  pngUrl: string;
  htmlUrl: string;
  createdAt: string;
};

export type SocialCardPlatformRow = {
  platform: string;
  format: SocialCardFormat;
  lang: SocialCardLang;
  cardId: string | null;
  imageUrl: string | null;
  postizImageSupported: boolean;
};

export type SocialCardsResponse = {
  manifest: {
    schemaVersion?: number;
    updatedAt: string;
    cards: SocialCardListItem[];
  };
  cards: SocialCardListItem[];
  platforms: SocialCardPlatformRow[];
};

export type BeatPosterLang = 'en' | 'zh';

export type BeatPosterListItem = {
  beatId: string;
  beatIndex: number;
  beatTitle: string;
  lang: BeatPosterLang;
  width: number;
  height: number;
  pngUrl: string;
  htmlUrl: string;
  createdAt: string;
};

export type BeatPosterBeatRow = {
  id: string;
  index: number;
  title: string;
  hasEn: boolean;
  hasZh: boolean;
};

export type BeatPosterPublishRecord = {
  platform: string;
  beatId: string;
  lang: BeatPosterLang;
  postId?: string;
  status: PublishVisibility | string;
  url?: string;
  stub?: boolean;
  publishedAt?: string;
  imageCount?: number;
  error?: string;
};

export type BeatPosterPublishState = {
  scriptId: string;
  posts: BeatPosterPublishRecord[];
};

export type BeatPosterPublishAlbumResult = {
  publishState: BeatPosterPublishState;
  record: BeatPosterPublishRecord;
};

export type BeatPosterPublishAllResult = {
  publishState: BeatPosterPublishState;
  published: Array<{
    platform: string;
    postId: string;
    url: string;
    status: 'pending' | 'live';
  }>;
  failed: Array<{
    platform: string;
    error: string;
    step?: string;
    hint?: string;
    details?: string;
  }>;
  skipped: Array<{ platform: string; reason: string }>;
};

export type BeatPosterRevertPublishResult = {
  publishState: BeatPosterPublishState;
  removed: BeatPosterPublishRecord | null;
};

export type BeatPosterPlatformPreview = {
  platform: string;
  lang: BeatPosterLang;
  title: string;
  body: string;
  imageUrls: string[];
  imageCount: number;
  postizImageSupported: boolean;
  provider: 'postiz' | 'sau' | 'manual';
  publishMode: 'auto' | 'manual';
  characterCount: number;
  reviewNotes: string[];
};

export type BeatPosterPublishPreview = {
  scriptId: string;
  lang: BeatPosterLang;
  beatCount: number;
  platforms: BeatPosterPlatformPreview[];
};

export type BeatPosterPublishPreviewResponse = {
  preview: BeatPosterPublishPreview;
  publishState: BeatPosterPublishState;
};

export type BeatPostersResponse = {
  manifest: {
    schemaVersion?: number;
    scriptId: string;
    updatedAt: string;
    beatCount: number;
    posters: BeatPosterListItem[];
  };
  beats: BeatPosterBeatRow[];
  posters: BeatPosterListItem[];
  platforms: string[];
  publishState: BeatPosterPublishState;
};

export type BeatPosterGenerateProgress = {
  scriptId: string;
  status: "idle" | "clearing" | "running" | "done" | "error";
  current: number;
  total: number;
  percent: number;
  label: string;
  error?: string;
  updatedAt: string;
};

export type PublishResult = {
  url: string;
  stub?: boolean;
  status?: PublishVisibility | string;
};

export type PublishAllResult = {
  published: Array<{ platform: string; record?: PublishRecord }>;
  skippedLive: string[];
  skippedNoTitle: string[];
  skippedUnavailable: Array<{ platform: string; reason: string }>;
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

export type VoxcpmTrialResponse = {
  accepted: boolean;
  jobId: string;
  takeId: string;
  referenceAudioPath: string;
};

export type VoxcpmHealthResponse = {
  ok: boolean;
  url: string;
  loaded?: boolean;
  device?: string;
  error?: string;
};

export type VoxcpmLogsResponse = {
  ok: boolean;
  url: string;
  lines?: string[];
  text?: string;
  lineCount?: number;
  error?: string;
};

export type VoxcpmEditorSentenceStatus =
  | "idle"
  | "queued"
  | "rendering"
  | "ready"
  | "failed";

export type VoxcpmEditorSentence = {
  id: string;
  text: string;
  tone: VoxcpmToneId;
  pauseAfterMs: number;
  fingerprint: string;
  status: VoxcpmEditorSentenceStatus;
  /** True when cached audio matches the current sentence text + tone + reference. */
  hasLatestAudio: boolean;
  /** 0–100 progress toward latest VoxCPM audio for this sentence. */
  progressPercent: number;
  audioUrl: string | null;
  durationSeconds: number | null;
  error: string | null;
};

export type VoxcpmEditorBeat = {
  beatIndex: number;
  beatId: string;
  title: string;
  sentences: VoxcpmEditorSentence[];
  beatAudioUrl: string | null;
  beatDurationSeconds: number | null;
  /** Stable Remotion-relative path when preview voice has been published. */
  previewVoiceSrc: string | null;
  readySentenceCount: number;
};

export type VoxcpmEditorDocument = {
  schemaVersion: 1;
  scriptId: string;
  title: string;
  animationMdUpdatedAt: string | null;
  referenceTakeId: string | null;
  voiceEngine: VoiceEngineId;
  scriptLanguage: ScriptLanguageId;
  /** Engine currently wired into Remotion preview. */
  previewVoiceEngine: VoiceEngineId;
  /** Whether each engine has published preview WAVs. */
  previewEnginesReady: Record<VoiceEngineId, boolean>;
  /** Changes when preview voice files or beat durations are republished. */
  previewRevision: string;
  beats: VoxcpmEditorBeat[];
};

export type VoxcpmEditorRenderResponse = {
  accepted: boolean;
  scriptId: string;
  beatIndex: number;
  sentenceId?: string;
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

export type NewAccountPublishPlanPost = {
  index: number;
  seriesId: string;
  seriesTitle: string;
  scriptId: string;
  episodeIndex: number | null;
  episodeTitle: string;
  kind: "infographic" | "video";
  lang: "en" | "zh";
  title: string;
  reason: string;
  ready: boolean;
  blockers: string[];
};

export type NewAccountPublishPlanAccountSlot = {
  accountId: string;
  label: string;
  platform: string;
  connected: boolean;
};

export type NewAccountPublishPlan = {
  schemaVersion: 1;
  mode: "new-account";
  createdAt: string;
  seriesId: string;
  platform: string;
  lang: "en" | "zh";
  accountSlots: NewAccountPublishPlanAccountSlot[];
  posts: NewAccountPublishPlanPost[];
  summary: {
    episodeCount: number;
    postCount: number;
    readyCount: number;
    blockedCount: number;
  };
};

export type SavedPublishPlanRef = {
  id: string;
  path: string;
};

export type SaveNewAccountPublishPlanResult = {
  id: string;
  path: string;
  plan: NewAccountPublishPlan;
};

export type MassPublishKind = "infographic" | "video";
export type MassPublishLang = "en" | "zh";
export type MassPublishStatus = "pending" | "published" | "failed" | "blocked";
export type MassPublishProvider = "postiz" | "sau" | "manual" | "browser";
export type MassPublishMode = "auto" | "manual";
export type MassDispatchItemStatus =
  | "queued"
  | "running"
  /** Creator page is open; the squat waits for you to publish or skip. */
  | "awaiting_manual"
  | "published"
  | "failed"
  | "skipped"
  | "cancelled";

export type MassPublishItem = {
  id: string;
  seriesId: string;
  seriesTitle: string;
  scriptId: string;
  episodeIndex: number | null;
  episodeTitle: string;
  kind: MassPublishKind;
  lang: MassPublishLang;
  platform: string;
  title: string;
  captionTitle?: string;
  captionBody?: string;
  ready: boolean;
  blockers: string[];
  provider: MassPublishProvider;
  publishMode: MassPublishMode;
  status: MassPublishStatus;
  canDispatch: boolean;
  publishedAt: string | null;
  url: string | null;
  openUrl?: string | null;
  postId: string | null;
  stub: boolean;
  jobId: string | null;
  takeId: string | null;
  coverUrl: string | null;
};

export type MassPublishEpisodeRow = {
  scriptId: string;
  seriesId: string;
  seriesTitle: string;
  episodeIndex: number | null;
  episodeTitle: string;
  coverUrl: string | null;
  infographicReady: boolean;
  videoReady: boolean;
  infographicBlockers: string[];
  videoBlockers: string[];
  jobId: string | null;
  takeId: string | null;
  itemIds: string[];
};

export type MassDispatchEvent = {
  at: string;
  itemId?: string;
  level: "info" | "warn" | "error";
  message: string;
  detail?: string;
};

export type MassDispatchItem = {
  id: string;
  title: string;
  episodeTitle?: string;
  kind: MassPublishKind;
  lang: MassPublishLang;
  platform: string;
  scriptId: string;
  status: MassDispatchItemStatus;
  progress?: string;
  error?: string;
  errorDetail?: string;
  url?: string;
  postId?: string;
  startedAt?: string;
  finishedAt?: string;
};

export type MassDispatch = {
  id: string;
  startedAt: string;
  finishedAt?: string;
  status: "running" | "waiting" | "done" | "failed" | "cancelled";
  items: MassDispatchItem[];
  events?: MassDispatchEvent[];
  summary: {
    queued: number;
    awaiting: number;
    published: number;
    failed: number;
    skipped: number;
    cancelled: number;
  };
};

export type MassDispatchRef = {
  id: string;
  startedAt: string;
  finishedAt?: string;
  status: MassDispatch["status"];
  summary: MassDispatch["summary"];
};

export type MassPublishBoard = {
  schemaVersion: 1;
  generatedAt: string;
  seriesId: string;
  lang: MassPublishLang | "all";
  platforms: string[];
  episodes: MassPublishEpisodeRow[];
  items: MassPublishItem[];
  summary: {
    episodeCount: number;
    itemCount: number;
    pendingAuto: number;
    pendingManual: number;
    published: number;
    blocked: number;
    failed: number;
    posterPending: number;
    videoPending: number;
  };
  activeDispatch: MassDispatch | null;
};

export type MassDispatchResponse = {
  dispatch: MassDispatch | null;
};

export type MassDispatchListResponse = {
  dispatches: MassDispatchRef[];
  activeDispatch: MassDispatch | null;
};
