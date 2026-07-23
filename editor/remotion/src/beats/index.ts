export { BeatTemplateRenderer } from "./BeatTemplateRenderer";
export { BeatTemplateStage } from "./BeatTemplateStage";
export {
  beatTemplateStageMeta,
  isCompareShellTemplateKind,
} from "./beatTemplateStageMeta";
export type {
  BeatStudioTemplateKind,
  ParsedBeatStudioMeta,
} from "./beatStudioCompile";
export {
  parseBeatStudioFromVisualNotes,
  buildBeatMainLayerFromTemplate,
} from "./beatStudioCompile";
export {
  CompareDualBeat,
  CompareBeatContent,
  CompareBeatSession,
  compareScreenRecordingLabel,
  CompareDualLandscapeLayout,
  CompareDualPortraitLayout,
  COMPARE_LEAN_LOGO,
  COMPARE_TURN_LOGO,
} from "./Compare/CompareDualBeat";
export type {
  CompareBeatSessionProps,
  CompareDualLandscapeLayoutProps,
  CompareDualPortraitLayoutProps,
} from "./Compare/CompareDualBeat";
export { CompositedBeat } from "./Composited/CompositedBeat";
export { StickersBeat } from "./Stickers/StickersBeat";
export { ScreenRecordingBeat } from "./ScreenRecording/ScreenRecordingBeat";
export { TurnFocusBeat } from "./TurnLang/TurnFocusBeat";
export { ManimMotionBeat } from "./Manim/ManimMotionBeat";
export { PresenterOverlayBeat } from "./Overlay/OverlayBeat";
export { compareLayerFromScene } from "./compareLayerFromScene";
export type {
  BeatTemplateComponentProps,
  BeatTemplateLayer,
  BeatTemplateSceneProps,
} from "./types";
export { isBeatTemplateLayer, beatTemplateUsesCompareShell } from "./types";
