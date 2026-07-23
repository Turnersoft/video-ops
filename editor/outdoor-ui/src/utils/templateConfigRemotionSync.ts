import type { BeatTemplateConfig } from "../types/beatStudio";

/** True when a template config edit changes Remotion layout (not just sticker drag / CPS). */
export function templateConfigNeedsRemotionSync(
  previous: BeatTemplateConfig | undefined,
  next: BeatTemplateConfig,
): boolean {
  if (!previous || previous.kind !== next.kind) {
    return false;
  }
  switch (next.kind) {
    case "turn-focus": {
      if (previous.kind !== "turn-focus") {
        return false;
      }
      return previous.config.renderEnabled !== next.config.renderEnabled;
    }
    case "compare-dual": {
      if (previous.kind !== "compare-dual") {
        return false;
      }
      return (
        previous.config.leanRender !== next.config.leanRender ||
        previous.config.turnRender !== next.config.turnRender ||
        previous.config.leanEnabled !== next.config.leanEnabled ||
        previous.config.turnEnabled !== next.config.turnEnabled
      );
    }
    case "manim-motion": {
      if (previous.kind !== "manim-motion") {
        return false;
      }
      return (
        previous.config.subTemplate !== next.config.subTemplate ||
        previous.config.diagramId !== next.config.diagramId ||
        previous.config.manimWebCode !== next.config.manimWebCode
      );
    }
    case "composited":
      return false;
    case "presenter-overlay": {
      if (previous.kind !== "presenter-overlay") {
        return false;
      }
      return (
        previous.config.depth !== next.config.depth ||
        previous.config.anchor !== next.config.anchor
      );
    }
    case "screen-recording": {
      if (previous.kind !== "screen-recording") {
        return false;
      }
      return previous.config.audioOnly !== next.config.audioOnly;
    }
    case "stickers":
      return false;
    default: {
      const _exhaustive: never = next;
      return _exhaustive;
    }
  }
}
