import type { LiveBeat, StyleKit } from "../types";
import type {
  BeatTemplateConfig,
  BeatTemplateKind,
  ScreenRecordingConfig,
  CompositedConfig,
  CompareDualConfig,
  ManimMotionConfig,
  ManimSubTemplate,
  PresenterOverlayConfig,
  StickersConfig,
  TurnFocusConfig,
  TypingEffectConfig,
} from "../types/beatStudio";
import { classifyBeatVisual, type BeatVisualKind } from "./beatVisual";

export const MANIM_SUB_TEMPLATES: ManimSubTemplate[] = [
  "set-diagram",
  "function-graph",
  "proof-tree",
  "equation-morph",
  "concept-map",
  "custom",
];

export type BeatTemplateDefinition = {
  kind: BeatTemplateKind;
  label: string;
  shortLabel: string;
  description: string;
  /** Remotion beat-template component (see editor/remotion/src/beat-templates/). */
  remotionComponent: string;
  /** Fields the editor must expose for full control. */
  controlSurfaces: string[];
  defaultForStyleKits: StyleKit[];
};

export const LEGACY_BEAT_TEMPLATE_KIND_ALIASES: Record<string, BeatTemplateKind> = {
  "coding-walkthrough": "screen-recording",
};

export function canonicalBeatTemplateKind(kind: string): BeatTemplateKind | null {
  const resolved = LEGACY_BEAT_TEMPLATE_KIND_ALIASES[kind] ?? kind;
  if (!(resolved in BEAT_TEMPLATE_REGISTRY)) {
    return null;
  }
  return resolved as BeatTemplateKind;
}

export const BEAT_TEMPLATE_REGISTRY: Record<
  BeatTemplateKind,
  BeatTemplateDefinition
> = {
  "compare-dual": {
    kind: "compare-dual",
    label: "Lean ↔ Turn compare",
    shortLabel: "Compare",
    description:
      "Side-by-side editors; optional Lean/Turn render panels; typing + code-block CRUD.",
    remotionComponent: "Compare",
    controlSurfaces: [
      "leanCode",
      "turnCode",
      "leanRender toggle",
      "turnRender toggle",
      "editor styles",
      "typing effect",
      "code block insert/update/delete/transform timeline",
      "spoken",
      "visualNotes",
    ],
    defaultForStyleKits: ["compare", "pitfall"],
  },
  "turn-focus": {
    kind: "turn-focus",
    label: "Turn focus slide",
    shortLabel: "Turn",
    description:
      "Turn code centered; optional symbolic animation from Turn knowledge render.",
    remotionComponent: "TurnFocusBeat",
    controlSurfaces: [
      "turnCode",
      "render toggle",
      "typing effect",
      "spoken",
      "visualNotes",
    ],
    defaultForStyleKits: ["syntax-spot", "ai-review"],
  },
  "manim-motion": {
    kind: "manim-motion",
    label: "Motion graphics",
    shortLabel: "Manim",
    description:
      "Reusable math/concept sub-templates (set diagrams, graphs, proof trees).",
    remotionComponent: "ManimMotionBeat",
    controlSurfaces: [
      "subTemplate picker",
      "diagramId",
      "durationSeconds",
      "caption",
      "spoken",
      "visualNotes",
    ],
    defaultForStyleKits: ["motion-essay"],
  },
  "presenter-overlay": {
    kind: "presenter-overlay",
    label: "Presenter overlay",
    shortLabel: "Overlay",
    description:
      "Legacy alias — use Composited. Graphics composited over filmed footage.",
    remotionComponent: "CompositedBeat",
    controlSurfaces: [
      "assetPath",
      "animationId",
      "depth (foreground/mid/background)",
      "anchor position",
      "spoken",
      "visualNotes",
    ],
    defaultForStyleKits: [],
  },
  composited: {
    kind: "composited",
    label: "Composited beat",
    shortLabel: "Composite",
    description:
      "Video-editor model: base footage at the back, draggable timed placements on top (stickers, manim, masked video).",
    remotionComponent: "CompositedBeat",
    controlSurfaces: [
      "baseFootageSrc",
      "placements (kind, src, timing, position, mask, enter)",
      "spoken",
      "visualNotes",
    ],
    defaultForStyleKits: ["launch-pv", "life-essay"],
  },
  "screen-recording": {
    kind: "screen-recording",
    label: "Screen recording",
    shortLabel: "Screen",
    description:
      "Any screen capture as the main beat video — optional camera clip and sync cuts.",
    remotionComponent: "ScreenRecordingBeat",
    controlSurfaces: [
      "screenTrackPath",
      "cameraTrackPath",
      "audioOnly toggle",
      "sync cut timeline",
      "spoken",
      "visualNotes",
    ],
    defaultForStyleKits: ["syntax-spot", "motion-essay"],
  },
  stickers: {
    kind: "stickers",
    label: "In-beat stickers",
    shortLabel: "Stickers",
    description:
      "Legacy alias — compare shell with ephemeral front-layer stickers.",
    remotionComponent: "StickersBeat",
    controlSurfaces: [
      "sticker list (text, emoji, at, duration, position)",
      "spoken",
      "visualNotes",
    ],
    defaultForStyleKits: ["ai-review"],
  },
};

export const BEAT_TEMPLATE_KINDS = Object.keys(
  BEAT_TEMPLATE_REGISTRY,
) as BeatTemplateKind[];

export function defaultCompareDualConfig(): CompareDualConfig {
  return {
    leanEnabled: true,
    turnEnabled: true,
    leanRender: true,
    turnRender: true,
    leanEditorStyle: "default",
    turnEditorStyle: "ide",
    typing: { enabled: true, cps: 24, pauseAfterSeconds: 0.3 },
    codeBlockEdits: [],
  };
}

export function defaultTurnFocusConfig(): TurnFocusConfig {
  return {
    renderEnabled: true,
    renderComponentId: undefined,
    editorFontScale: 1,
    typing: { enabled: true, cps: 28 },
  };
}

export const DEFAULT_MANIM_WEB_CODE = `const square = new Square({ sideLength: 3, color: "#58a6ff" });
const circle = new Circle({ radius: 1.5, color: "#f97316" });
await scene.play(new Create(square));
await scene.play(new Transform(square, circle));
await scene.play(new FadeOut(circle));`;

export function defaultManimMotionConfig(): ManimMotionConfig {
  return {
    subTemplate: "set-diagram",
    diagramId: undefined,
    durationSeconds: 6,
    caption: "",
    manimWebCode: undefined,
  };
}

export function defaultCompositedConfig(): CompositedConfig {
  return {
    baseFootageSrc: undefined,
    baseObjectFit: "cover",
    baseLabel: undefined,
    placements: [],
  };
}

export function defaultPresenterOverlayConfig(): PresenterOverlayConfig {
  return {
    depth: "foreground",
    assetPath: undefined,
    animationId: undefined,
    anchor: "center",
  };
}

export function defaultStickersConfig(): StickersConfig {
  return { stickers: [] };
}

export function defaultScreenRecordingConfig(): ScreenRecordingConfig {
  return {
    screenTrackPath: undefined,
    cameraTrackPath: undefined,
    audioOnly: false,
    syncCuts: [{ atSeconds: 0, label: "Sync" }],
  };
}

/** Walkthrough / screen-recording beats always have at least one sync cut. */
export function ensureScreenRecordingSyncCuts(
  syncCuts: ScreenRecordingConfig["syncCuts"],
): ScreenRecordingConfig["syncCuts"] {
  return syncCuts.length > 0
    ? syncCuts
    : defaultScreenRecordingConfig().syncCuts;
}

/** @deprecated Use ensureScreenRecordingSyncCuts */
export const ensureWalkthroughSyncCuts = ensureScreenRecordingSyncCuts;

export function defaultTemplateConfig(
  kind: BeatTemplateKind,
): BeatTemplateConfig {
  switch (kind) {
    case "compare-dual":
      return { kind, config: defaultCompareDualConfig() };
    case "turn-focus":
      return { kind, config: defaultTurnFocusConfig() };
    case "manim-motion":
      return { kind, config: defaultManimMotionConfig() };
    case "composited":
      return { kind, config: defaultCompositedConfig() };
    case "presenter-overlay":
      return { kind, config: defaultPresenterOverlayConfig() };
    case "screen-recording":
      return { kind, config: defaultScreenRecordingConfig() };
    case "stickers":
      return { kind, config: defaultStickersConfig() };
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

function normalizeTypingEffect(
  partial: Partial<TypingEffectConfig> | undefined,
  defaults: TypingEffectConfig,
): TypingEffectConfig {
  return {
    ...defaults,
    ...(partial ?? {}),
    enabled: partial?.enabled ?? defaults.enabled,
  };
}

/** Merge persisted / hand-edited config with defaults (reload-safe). */
export function normalizeTemplateConfig(
  template: BeatTemplateKind,
  raw: BeatTemplateConfig | undefined | null,
): BeatTemplateConfig {
  const canonicalTemplate =
    canonicalBeatTemplateKind(template) ?? template;
  if (!raw) {
    return defaultTemplateConfig(canonicalTemplate);
  }
  const rawKind = canonicalBeatTemplateKind(raw.kind) ?? raw.kind;
  if (rawKind !== canonicalTemplate) {
    return defaultTemplateConfig(canonicalTemplate);
  }
  switch (canonicalTemplate) {
    case "compare-dual": {
      const base = defaultCompareDualConfig();
      const cfg = raw.config as CompareDualConfig;
      return {
        kind: "compare-dual",
        config: {
          leanEnabled: cfg.leanEnabled ?? base.leanEnabled,
          turnEnabled: cfg.turnEnabled ?? base.turnEnabled,
          leanRender: cfg.leanRender ?? base.leanRender,
          turnRender: cfg.turnRender ?? base.turnRender,
          leanEditorStyle: cfg.leanEditorStyle ?? base.leanEditorStyle,
          turnEditorStyle: cfg.turnEditorStyle ?? base.turnEditorStyle,
          typing: normalizeTypingEffect(cfg.typing, base.typing),
          codeBlockEdits: cfg.codeBlockEdits ?? base.codeBlockEdits,
        },
      };
    }
    case "turn-focus": {
      const base = defaultTurnFocusConfig();
      const cfg = raw.config as TurnFocusConfig;
      return {
        kind: "turn-focus",
        config: {
          renderEnabled: cfg.renderEnabled ?? base.renderEnabled,
          renderComponentId: cfg.renderComponentId ?? base.renderComponentId,
          editorFontScale: cfg.editorFontScale ?? base.editorFontScale,
          typing: normalizeTypingEffect(cfg.typing, base.typing),
        },
      };
    }
    case "manim-motion": {
      const base = defaultManimMotionConfig();
      const cfg = raw.config as ManimMotionConfig;
      return {
        kind: "manim-motion",
        config: {
          subTemplate: cfg.subTemplate ?? base.subTemplate,
          diagramId: cfg.diagramId ?? base.diagramId,
          durationSeconds: cfg.durationSeconds ?? base.durationSeconds,
          caption: cfg.caption ?? base.caption,
          manimWebCode: cfg.manimWebCode ?? base.manimWebCode,
        },
      };
    }
    case "composited": {
      const base = defaultCompositedConfig();
      const cfg = raw.config as CompositedConfig;
      return {
        kind: "composited",
        config: {
          baseFootageSrc: cfg.baseFootageSrc ?? base.baseFootageSrc,
          baseObjectFit: cfg.baseObjectFit ?? base.baseObjectFit,
          baseLabel: cfg.baseLabel ?? base.baseLabel,
          placements: cfg.placements ?? base.placements,
        },
      };
    }
    case "presenter-overlay": {
      const base = defaultPresenterOverlayConfig();
      const cfg = raw.config as PresenterOverlayConfig;
      return {
        kind: "presenter-overlay",
        config: {
          depth: cfg.depth ?? base.depth,
          assetPath: cfg.assetPath ?? base.assetPath,
          animationId: cfg.animationId ?? base.animationId,
          anchor: cfg.anchor ?? base.anchor,
        },
      };
    }
    case "screen-recording": {
      const base = defaultScreenRecordingConfig();
      const cfg = raw.config as ScreenRecordingConfig;
      return {
        kind: "screen-recording",
        config: {
          screenTrackPath: cfg.screenTrackPath ?? base.screenTrackPath,
          cameraTrackPath: cfg.cameraTrackPath ?? base.cameraTrackPath,
          audioOnly: cfg.audioOnly ?? base.audioOnly,
          syncCuts: ensureScreenRecordingSyncCuts(cfg.syncCuts ?? base.syncCuts),
        },
      };
    }
    case "stickers": {
      const base = defaultStickersConfig();
      const cfg = raw.config as StickersConfig;
      return {
        kind: "stickers",
        config: {
          stickers: cfg.stickers ?? base.stickers,
        },
      };
    }
    default: {
      const _exhaustive: never = canonicalTemplate;
      return _exhaustive;
    }
  }
}

/** Map beat template to visual kind for accent colors and thumbnail previews. */
export function visualKindForTemplate(
  template: BeatTemplateKind,
): BeatVisualKind {
  switch (template) {
    case "compare-dual":
      return "compare";
    case "turn-focus":
      return "code";
    case "screen-recording":
      return "hero";
    case "manim-motion":
      return "chapter";
    case "composited":
    case "presenter-overlay":
      return "hero";
    case "stickers":
      return "meme";
    default: {
      const _exhaustive: never = template;
      return _exhaustive;
    }
  }
}

export function templateShortLabel(template: BeatTemplateKind): string {
  return BEAT_TEMPLATE_REGISTRY[template].shortLabel.toUpperCase();
}

export function inferTemplateKind(
  beat: LiveBeat,
  styleKit: StyleKit,
): BeatTemplateKind {
  const visual = classifyBeatVisual(beat, styleKit);
  if (visual === "compare") {
    return "compare-dual";
  }
  if (visual === "code" || visual === "terminal") {
    return beat.turnCode.trim() ? "turn-focus" : "compare-dual";
  }
  if (visual === "hero" || visual === "still") {
    return "composited";
  }
  if (visual === "meme" || visual === "quote") {
    return "composited";
  }
  if (visual === "news" || visual === "reject") {
    return "turn-focus";
  }
  if (visual === "chapter") {
    return "manim-motion";
  }
  const kitDefault = BEAT_TEMPLATE_KINDS.find((kind) =>
    BEAT_TEMPLATE_REGISTRY[kind].defaultForStyleKits.includes(styleKit),
  );
  return kitDefault ?? "compare-dual";
}
