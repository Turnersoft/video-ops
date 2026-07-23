import type { ReactNode } from "react";

import type { BeatStudioTemplateKind } from "./beatStudioCompile";
import { ScreenRecordingBeat } from "./ScreenRecording/ScreenRecordingBeat";
import { CompareDualBeat } from "./Compare/CompareDualBeat";
import { ManimMotionBeat } from "./Manim/ManimMotionBeat";
import { CompositedBeat } from "./Composited/CompositedBeat";
import { StickersBeat } from "./Stickers/StickersBeat";
import { TurnFocusBeat } from "./TurnLang/TurnFocusBeat";
import type {
  BeatTemplateComponentProps,
  BeatTemplateLayer,
  BeatTemplateSceneProps,
} from "./types";

type BeatTemplateRendererProps = BeatTemplateSceneProps & {
  layer: BeatTemplateLayer;
};

function renderBeatTemplate(
  kind: BeatStudioTemplateKind,
  props: BeatTemplateComponentProps,
): ReactNode {
  switch (kind) {
    case "compare-dual":
      return <CompareDualBeat {...props} />;
    case "composited":
    case "presenter-overlay":
      return <CompositedBeat {...props} />;
    case "stickers":
      return <StickersBeat {...props} />;
    case "screen-recording":
      return <ScreenRecordingBeat {...props} />;
    case "turn-focus":
      return <TurnFocusBeat {...props} />;
    case "manim-motion":
      return <ManimMotionBeat {...props} />;
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

/** Routes beat-studio template kind → dedicated beat component tree. */
export function BeatTemplateRenderer({
  scriptId,
  scene,
  layout,
  contentRevision,
  layer,
}: BeatTemplateRendererProps): ReactNode {
  void layout;
  return renderBeatTemplate(layer.kind, {
    scriptId,
    scene,
    layout,
    contentRevision,
    kind: layer.kind,
    config: layer.config,
    turnSource: layer.turnSource,
  });
}
