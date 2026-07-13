export {
  OutdoorApi,
  OutdoorApiError,
  formatOutdoorApiError,
  type OutdoorApiOptions,
} from './api/client';

export {
  absoluteAgentUrl,
  artifactPath,
  artifactUrl,
  jobArtifactPath,
  jobArtifactUrl,
  remotionStudioEmbedUrl,
  remotionStudioOrigin,
  seriesSharedAssetPath,
  seriesSharedAssetUrl,
  sourcePath,
  sourceUrl,
  type RemotionCompositionPath,
} from './api/urls';

export {
  remotionEmbedFromOrigin,
  resolveOutdoorTransport,
  raceFirstHealthy,
  type OutdoorTransportPick,
  type OutdoorEndpointsResponse,
} from './api/transport';

export {
  OutdoorUiContext,
  OutdoorUiProvider,
  useOutdoorUi,
  type OutdoorUiContextValue,
  type OutdoorUiProviderProps,
  type PickedImage,
} from './context/OutdoorUiContext';

export {
  colors,
  radii,
  sharedStyles,
  spacing,
  typography,
} from './theme';

export {
  layoutStylesFor,
  isMobileLayout,
  layoutChrome,
  pipelineStudioHeight,
  type OutdoorLayout,
  type OutdoorLayoutStyles,
} from './layout';

export {
  fmtDate,
  fmtDuration,
  platformLabel,
  publishStatusLabel,
  stageLabel,
  takeStatusLabel,
} from './utils/format';

export type {
  AlignBeatLayout,
  AlignBoxLayout,
  AlignHintLayout,
  AlignLayout,
  AlignReviewPayload,
  AlignSaidLine,
  AlignSlidePreview,
  AlignSyncStudioResponse,
  CaptureCoverOptions,
  ConnectProgress,
  CoverListItem,
  CoverMeta,
  CoverPlatformMapPatch,
  CoverSource,
  CoversListResponse,
  CutInterval,
  CutReviewPayload,
  CutSelection,
  CutSlideTranscript,
  CutTranscriptLine,
  HealthResponse,
  InboxFileSighting,
  InboxFileStatus,
  InboxScanResult,
  InboxStatusSnapshot,
  JobResultsPreview,
  LiveBeat,
  LiveScript,
  LocalTakeView,
  JobStatus,
  LoginLink,
  MaskShape,
  ZernioSyncResult,
  OutdoorJob,
  OutdoorJobDetail,
  OutdoorJobSummary,
  OutdoorRoute,
  OutdoorScript,
  OutdoorScriptImage,
  OutdoorScriptMode,
  OutdoorScriptSlide,
  PipelineStage,
  PlatformConnectionStatus,
  PlatformStatus,
  PlatformTestResult,
  PlatformsHealthResponse,
  PublishAllResult,
  PublishFormat,
  PublishRecord,
  PublishResult,
  PublishState,
  PublishVisibility,
  RunStageOptions,
  RunStageResponse,
  RunStatus,
  SelectionUpdateResponse,
  SignupStep,
  SlideEvent,
  SocialPatch,
  SocialPlatformCopy,
  SocialPosts,
  StageProgress,
  StageResultPreview,
  StageRunSummary,
  TakeManifest,
  TakeMarker,
  TakeMarkerKind,
  TakeSyncStatus,
  TakeDeliveryStep,
  TakeDeliveryStepState,
  UploadTakeResult,
  VideoOpsCatalog,
  VideoOpsCatalogScript,
  VideoOpsCatalogScriptPaths,
  VideoOpsCatalogSeries,
  VideoOpsCatalogTake,
} from './types';

export {
  PIPELINE_STAGES,
  STAGE_LABELS,
} from './types';

export { OutdoorApp, type OutdoorAppProps } from './OutdoorApp';

export {
  OutdoorRouteProvider,
  parseRoute,
  routeToHash,
  useOutdoorRoute,
  type OutdoorRouteApi,
  type OutdoorRouteProviderProps,
} from './hooks/useOutdoorRoute';

export { LibraryScreen } from './screens/LibraryScreen';
export { ScriptDetailScreen, type ScriptDetailScreenProps } from './screens/ScriptDetailScreen';
export { TakePipelineScreen, type TakePipelineScreenProps } from './screens/TakePipelineScreen';
export { AnimationEditorScreen, type AnimationEditorScreenProps } from './screens/AnimationEditorScreen';
export { PlatformsScreen } from './screens/PlatformsScreen';

export * from './components';
