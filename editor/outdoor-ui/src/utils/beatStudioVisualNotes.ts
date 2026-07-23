/**
 * Embed / extract beat-studio metadata in ### Visual notes (animation.md round-trip).
 */

import type { BeatCandidate } from "../types/beatStudio";
import { canonicalBeatTemplateKind, normalizeTemplateConfig } from "./beatTemplateRegistry";

const STUDIO_BLOCK_RE = /<!--\s*beat-studio:\s*([\s\S]*?)\s*-->\s*/i;

const AUTO_HINT_LINE_RE =
  /^(beat-template|layer|lean-render|turn-render|turn-render-id|typing|manim-sub|manim-code|diagram|overlay-depth|overlay-anchor|walkthrough|screen-recording|audio-only|stickers)\s*:/i;

export type ParsedBeatStudioMeta = {
  template: BeatCandidate["template"];
  templateConfig: BeatCandidate["templateConfig"];
  userNotes: string;
};

export function stripBeatStudioBlock(visualNotes: string): string {
  return visualNotes.replace(STUDIO_BLOCK_RE, "").trim();
}

/** Drop machine-written hint lines so re-encode does not duplicate or keep stale flags. */
export function stripAutoVisualNoteHints(visualNotes: string): string {
  return visualNotes
    .split("\n")
    .filter((line) => !AUTO_HINT_LINE_RE.test(line.trim()))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function encodeVisualNotesForSave(
  userNotes: string,
  candidate: Pick<BeatCandidate, "template" | "templateConfig">,
): string {
  const clean = stripAutoVisualNoteHints(stripBeatStudioBlock(userNotes));
  const payload = JSON.stringify({
    template: candidate.template,
    templateConfig: candidate.templateConfig,
  });
  const block = `<!-- beat-studio: ${payload} -->`;
  const hints = visualNotesHintsFromCandidate(candidate);
  const hintBlock = hints.length ? `${hints.join("\n")}\n\n` : "";
  return clean
    ? `${block}\n\n${hintBlock}${clean}`
    : `${block}\n\n${hintBlock}`.trim();
}

export function parseBeatStudioFromVisualNotes(
  visualNotes: string,
): ParsedBeatStudioMeta | null {
  const match = visualNotes.match(STUDIO_BLOCK_RE);
  if (!match) {
    return null;
  }
  try {
    const parsed = JSON.parse(match[1]) as {
      template?: BeatCandidate["template"];
      templateConfig?: BeatCandidate["templateConfig"];
    };
    if (!parsed.template || !parsed.templateConfig) {
      return null;
    }
    const template = canonicalBeatTemplateKind(parsed.template);
    if (!template) {
      return null;
    }
    return {
      template,
      templateConfig: normalizeTemplateConfig(
        template,
        parsed.templateConfig as BeatCandidate["templateConfig"],
      ),
      userNotes: stripAutoVisualNoteHints(stripBeatStudioBlock(visualNotes)),
    };
  } catch {
    return null;
  }
}

export function visualNotesHintsFromCandidate(
  candidate: Pick<BeatCandidate, "template" | "templateConfig">,
): string[] {
  const hints: string[] = [`beat-template: ${candidate.template}`];
  const cfg = candidate.templateConfig;
  switch (cfg.kind) {
    case "compare-dual":
      hints.push("layer: compare");
      if (cfg.config.leanRender) hints.push("lean-render: true");
      if (cfg.config.turnRender) hints.push("turn-render: true");
      if (cfg.config.typing.enabled) hints.push("typing: true");
      break;
    case "turn-focus":
      hints.push("layer: turn-code");
      if (cfg.config.renderEnabled) hints.push("turn-render: true");
      if (cfg.config.renderComponentId) {
        hints.push(`turn-render-id: ${cfg.config.renderComponentId}`);
      }
      break;
    case "manim-motion":
      hints.push("layer: math-board");
      hints.push(`manim-sub: ${cfg.config.subTemplate}`);
      if (cfg.config.diagramId) hints.push(`diagram: ${cfg.config.diagramId}`);
      if (cfg.config.manimWebCode?.trim()) hints.push("manim-code: true");
      break;
    case "composited":
      hints.push("layer: video-clip");
      if (cfg.config.baseFootageSrc) {
        hints.push(`footage: ${cfg.config.baseFootageSrc}`);
      }
      if (cfg.config.placements.length > 0) {
        hints.push("placements: true");
      }
      break;
    case "presenter-overlay":
      hints.push("layer: video-clip");
      hints.push(`overlay-depth: ${cfg.config.depth}`);
      hints.push(`overlay-anchor: ${cfg.config.anchor}`);
      break;
    case "screen-recording":
      hints.push("layer: compare");
      hints.push("screen-recording: true");
      if (cfg.config.audioOnly) hints.push("audio-only: true");
      break;
    case "stickers":
      hints.push("stickers: true");
      break;
    default: {
      const _exhaustive: never = cfg;
      return _exhaustive;
    }
  }
  return hints;
}
