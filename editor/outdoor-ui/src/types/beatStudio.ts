import type { DraftBeat } from "../components/ScriptBeatEditorPanel/ScriptBeatEditorPanel.types";

/** Canonical beat presentation templates (maps to Remotion main layers + overlays). */
export type BeatTemplateKind =
  /** Lean ↔ Turn dual panel; optional render on each side. */
  | "compare-dual"
  /** Turn code centered; optional symbolic render (Turn knowledge components). */
  | "turn-focus"
  /** Manim-like motion graphics (math-board, diagrams, sub-templates). */
  | "manim-motion"
  /** Graphics / animation composited over filmed presenter footage. */
  | "presenter-overlay"
  /** Unified video-editor beat: base footage + timed front placements. */
  | "composited"
  /** Screen recording + optional camera; sync cuts align clips to spoken beats. */
  | "screen-recording"
  /** @deprecated Prefer composited — ephemeral front-layer stickers on compare shell. */
  | "stickers";

export type CodeBlockOp = "insert" | "update" | "delete" | "transform";

export type CodeBlockEdit = {
  id: string;
  op: CodeBlockOp;
  /** Beat-relative seconds when the edit applies. */
  atSeconds: number;
  language: "lean" | "turn";
  before?: string;
  after?: string;
};

export type TypingEffectConfig = {
  enabled: boolean;
  /** Characters per second for typed reveal. */
  cps?: number;
  /** Pause after a block finishes typing. */
  pauseAfterSeconds?: number;
};

export type CompareDualConfig = {
  leanEnabled: boolean;
  turnEnabled: boolean;
  leanRender: boolean;
  turnRender: boolean;
  leanEditorStyle: "default" | "minimal" | "textbook";
  turnEditorStyle: "ide" | "minimal";
  typing: TypingEffectConfig;
  codeBlockEdits: CodeBlockEdit[];
};

export type TurnFocusConfig = {
  renderEnabled: boolean;
  /** Turn-user knowledge render component id (symbolic animation). */
  renderComponentId?: string;
  editorFontScale: number;
  typing: TypingEffectConfig;
};

export type ManimSubTemplate =
  | "set-diagram"
  | "function-graph"
  | "proof-tree"
  | "equation-morph"
  | "concept-map"
  | "custom";

export type ManimMotionConfig = {
  subTemplate: ManimSubTemplate;
  /** Reference to manim-tests or shared diagram id. */
  diagramId?: string;
  durationSeconds: number;
  caption?: string;
  /** manim-web scene body — async statements using scene + manim exports. */
  manimWebCode?: string;
};

export type PresenterOverlayConfig = {
  /** AR-style depth: graphic appears in front of presenter. */
  depth: "foreground" | "mid" | "background";
  assetPath?: string;
  animationId?: string;
  anchor: "center" | "left" | "right" | "lower-third";
};

export type ScreenRecordingConfig = {
  /** Script-relative path to any screen capture (app, window, browser, etc.). */
  screenTrackPath?: string;
  /** Optional picture-in-picture or talking-head clip. */
  cameraTrackPath?: string;
  audioOnly: boolean;
  /** Cut points synced to spoken beats (beat-relative seconds). */
  syncCuts: Array<{ atSeconds: number; label?: string }>;
};

export type StickerSpec = {
  id: string;
  text: string;
  emoji?: string;
  /** Relative to script folder, e.g. assets/stickers/foo.png */
  assetPath?: string;
  atSeconds: number;
  durationSeconds: number;
  position:
    | "top-left"
    | "top-right"
    | "bottom-left"
    | "bottom-right"
    | "center";
  /** Normalized 0–1 frame position; overrides preset anchor when set. */
  x?: number;
  y?: number;
  /** Width as a fraction of the frame (images). */
  width?: number;
};

export type StickersConfig = {
  stickers: StickerSpec[];
};

export type BeatPlacementKind = "video" | "image" | "sticker" | "manim";

export type BeatPlacementSpec = {
  id: string;
  kind: BeatPlacementKind;
  /** Script-relative asset path (video, image, manim export). */
  src?: string;
  text?: string;
  emoji?: string;
  diagramId?: string;
  atSeconds: number;
  durationSeconds: number;
  /** Normalized frame position (0–1). */
  x: number;
  y: number;
  width: number;
  height?: number;
  zIndex?: number;
  objectFit?: "contain" | "cover";
  mask?: { shape: "circle" | "rectangle" };
  enter?: "none" | "fade" | "scale";
  label?: string;
};

export type CompositedConfig = {
  /** Back-layer footage (presenter, screen recording, b-roll). */
  baseFootageSrc?: string;
  baseObjectFit?: "contain" | "cover";
  baseLabel?: string;
  placements: BeatPlacementSpec[];
};

export type BeatTemplateConfig =
  | { kind: "compare-dual"; config: CompareDualConfig }
  | { kind: "turn-focus"; config: TurnFocusConfig }
  | { kind: "manim-motion"; config: ManimMotionConfig }
  | { kind: "composited"; config: CompositedConfig }
  | { kind: "presenter-overlay"; config: PresenterOverlayConfig }
  | { kind: "screen-recording"; config: ScreenRecordingConfig }
  | { kind: "stickers"; config: StickersConfig };

export type BeatCandidate = {
  id: string;
  label: string;
  template: BeatTemplateKind;
  templateConfig: BeatTemplateConfig;
  content: DraftBeat;
  source: "manual" | "ai";
  createdAt: string;
  aiPrompt?: string;
};

export type BeatStudioBeatState = {
  selectedCandidateId: string;
  candidates: BeatCandidate[];
};

export type BeatStudioDocument = {
  schemaVersion: 1;
  scriptId: string;
  updatedAt: string;
  beats: Record<string, BeatStudioBeatState>;
};
