export {
  OutdoorApi,
  OutdoorApiError,
  formatOutdoorApiError,
  type OutdoorApiOptions,
} from "./api/client";

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
} from "./api/urls";

export {
  remotionEmbedFromOrigin,
  resolveOutdoorTransport,
  raceFirstHealthy,
  type OutdoorTransportPick,
  type OutdoorEndpointsResponse,
} from "./api/transport";

export {
  OutdoorUiProvider,
  useOutdoorUi,
  type OutdoorUiContextValue,
  type OutdoorUiProviderProps,
  type PickedImage,
} from "./context/OutdoorUiContext";

export { colors, radii, sharedStyles, spacing, typography } from "./theme";

export {
  layoutStylesFor,
  isMobileLayout,
  layoutChrome,
  pipelineStudioHeight,
  type OutdoorLayout,
  type OutdoorLayoutStyles,
} from "./layout";

export {
  fmtDate,
  fmtDuration,
  platformLabel,
  publishStatusLabel,
  stageLabel,
  takeStatusLabel,
} from "./utils/format";

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
  NewAccountPublishPlan,
  MassPublishBoard,
  MassPublishItem,
  MassDispatch,
  MassDispatchEvent,
  MassDispatchRef,
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
  VoxcpmEditorBeat,
  VoxcpmEditorDocument,
  VoxcpmEditorRenderResponse,
  VoxcpmEditorSentence,
  VoxcpmEditorSentenceStatus,
} from "./types";

export { PIPELINE_STAGES, STAGE_LABELS } from "./types";

export { OutdoorApp, type OutdoorAppProps } from "./OutdoorApp";

export {
  OutdoorRouteProvider,
  parseRoute,
  routeToHash,
  useOutdoorRoute,
  type OutdoorRouteApi,
  type OutdoorRouteProviderProps,
} from "./hooks/useOutdoorRoute";

export { LibraryScreen } from "./pages/LibraryScreen/LibraryScreen";
export {
  ScriptDetailScreen,
  type ScriptDetailScreenProps,
} from "./pages/ScriptDetailScreen/ScriptDetailScreen";
export {
  TakePipelineScreen,
  type TakePipelineScreenProps,
} from "./pages/TakePipelineScreen/TakePipelineScreen";
export {
  AnimationEditorScreen,
  type AnimationEditorScreenProps,
} from "./pages/AnimationEditorScreen/AnimationEditorScreen";
export { PlatformsScreen } from "./pages/PlatformsScreen/PlatformsScreen";
export { PublishPlanScreen } from "./pages/PublishPlanScreen/PublishPlanScreen";
export { MassPublishScreen } from "./pages/MassPublishScreen/MassPublishScreen";

export {
  Header,
  type HeaderAction,
  type HeaderProps,
} from "./components/Header/Header";
export {
  InboxBanner,
  type InboxBannerProps,
} from "./components/InboxBanner/InboxBanner";
export {
  ScreenShell,
  type ScreenShellProps,
} from "./components/ScreenShell/ScreenShell";
export {
  BeatCandidateRail,
  type BeatCandidateRailProps,
} from "./components/BeatCandidateRail/BeatCandidateRail";
export {
  BeatTemplateSwitcher,
  type BeatTemplateSwitcherProps,
} from "./components/BeatTemplateSwitcher/BeatTemplateSwitcher";
export {
  Button,
  type ButtonProps,
  type ButtonVariant,
} from "./components/Button/Button";
export { Badge, type BadgeProps } from "./components/Badge/Badge";
export {
  SectionLabel,
  type SectionLabelProps,
} from "./components/SectionLabel/SectionLabel";
export { CollapsibleSection } from "./components/CollapsibleSection/CollapsibleSection";
export {
  AutoGrowTextInput,
  type AutoGrowTextInputProps,
} from "./components/AutoGrowTextInput/AutoGrowTextInput";
export { BeatOverviewStrip } from "./components/BeatOverviewStrip/BeatOverviewStrip";
export {
  ScriptRemotionPreview,
  type ScriptRemotionPreviewProps,
} from "./components/ScriptRemotionPreview/ScriptRemotionPreview";
export { BeatThumbnailCard } from "./components/BeatThumbnailCard/BeatThumbnailCard";
export {
  KIT_CHROME,
  kindAccent,
  type KitChrome,
} from "./components/kitThemes/kitThemes";
export {
  PipelineVideo,
  type PipelineVideoHandle,
  type PipelineVideoProps,
} from "./components/PipelineVideo/PipelineVideo";
export {
  RemotionEmbed,
  type RemotionEmbedHandle,
  type RemotionEmbedProps,
} from "./components/RemotionEmbed/RemotionEmbed";
export {
  CutReviewPanel,
  type CutReviewPanelProps,
} from "./components/CutReviewPanel/CutReviewPanel";
export {
  AlignReviewPanel,
  type AlignReviewPanelProps,
} from "./components/AlignReviewPanel/AlignReviewPanel";
export {
  CompositeBlock,
  type CompositeBlockProps,
} from "./components/CompositeBlock/CompositeBlock";
export { AlignFilmedClipControls } from "./components/AlignFilmedClipControls/AlignFilmedClipControls";
export {
  AbortStageButton,
  type AbortStageButtonProps,
} from "./components/AbortStageButton/AbortStageButton";
export {
  SocialSetupPanel,
  type SocialSetupPanelProps,
} from "./components/SocialSetupPanel/SocialSetupPanel";
export {
  StaleBanner,
  type StaleBannerProps,
} from "./components/StaleBanner/StaleBanner";
export {
  StabilizePanel,
  type StabilizePanelProps,
} from "./components/StabilizePanel/StabilizePanel";
export {
  CoverLibraryPanel,
  type CoverLibraryPanelProps,
} from "./components/CoverLibraryPanel/CoverLibraryPanel";
export {
  ScriptCoversPanel,
  type ScriptCoversPanelProps,
} from "./components/ScriptCoversPanel/ScriptCoversPanel";
export {
  SocialPublishPreviewSection,
  type SocialPublishPreviewSectionProps,
} from "./components/SocialPublishPreviewSection/SocialPublishPreviewSection";
export {
  SocialPublishPreviewGrid,
  type SocialPublishPreviewGridProps,
} from "./components/SocialPublishPreviewGrid/SocialPublishPreviewGrid";
export {
  PipelineStagesPanel,
  type PipelineStagesPanelProps,
} from "./components/PipelineStagesPanel/PipelineStagesPanel";
export { StageErrorBlock } from "./components/StageErrorBlock/StageErrorBlock";
export {
  TakeResults,
  type TakeResultsExtras,
  type TakeResultsProps,
} from "./components/TakeResults/TakeResults";
export { TakeCard, type TakeCardProps } from "./components/TakeCard/TakeCard";
export {
  LocalTakeCard,
  type LocalTakeCardProps,
} from "./components/LocalTakeCard/LocalTakeCard";
export { TakeStepstones } from "./components/TakeStepstones/TakeStepstones";
export {
  ScriptBeatEditorPanel,
  type ScriptBeatEditorPanelProps,
} from "./components/ScriptBeatEditorPanel/ScriptBeatEditorPanel";
