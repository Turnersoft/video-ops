/**
 * Embed / extract beat template metadata in ### Visual notes (animation.md).
 * Prefer plain `key: value` hint lines — do not write JSON into the markdown.
 */

import type { BeatCandidate, BeatTemplateConfig, BeatTemplateKind } from "../types/beatStudio";
import {
  canonicalBeatTemplateKind,
  defaultTemplateConfig,
  normalizeTemplateConfig,
} from "./beatTemplateRegistry";

const STUDIO_BLOCK_RE = /<!--\s*beat-studio:\s*([\s\S]*?)\s*-->\s*/i;

const AUTO_HINT_LINE_RE =
  /^(beat-template|layer|lean-render|turn-render|turn-render-id|typing|manim-sub|manim-code|diagram|duration-seconds|caption|overlay-depth|overlay-anchor|walkthrough|screen-recording|audio-only|stickers|footage|placements)\s*:/i;

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

function readHint(visualNotes: string, key: string): string | undefined {
  const match = visualNotes.match(new RegExp(`^\\s*${key}:\\s*(.+)\\s*$`, "im"));
  const value = match?.[1]?.trim();
  return value || undefined;
}

function hintIsTrue(visualNotes: string, key: string): boolean {
  const value = readHint(visualNotes, key);
  return value === "true" || value === "yes" || value === "1";
}

function hintPresent(visualNotes: string, key: string): boolean {
  return readHint(visualNotes, key) !== undefined;
}

function configFromHintLines(
  template: BeatTemplateKind,
  visualNotes: string,
): BeatTemplateConfig {
  const base = defaultTemplateConfig(template);
  switch (template) {
    case "compare-dual": {
      const typingEnabled = hintPresent(visualNotes, "typing")
        ? hintIsTrue(visualNotes, "typing")
        : base.config.typing.enabled;
      return {
        kind: "compare-dual",
        config: {
          ...base.config,
          leanRender: hintPresent(visualNotes, "lean-render")
            ? hintIsTrue(visualNotes, "lean-render")
            : base.config.leanRender,
          turnRender: hintPresent(visualNotes, "turn-render")
            ? hintIsTrue(visualNotes, "turn-render")
            : base.config.turnRender,
          typing: {
            ...base.config.typing,
            enabled: typingEnabled,
          },
        },
      };
    }
    case "turn-focus":
      return {
        kind: "turn-focus",
        config: {
          ...base.config,
          renderEnabled: hintPresent(visualNotes, "turn-render")
            ? hintIsTrue(visualNotes, "turn-render")
            : base.config.renderEnabled,
          renderComponentId:
            readHint(visualNotes, "turn-render-id") ?? base.config.renderComponentId,
        },
      };
    case "manim-motion": {
      const durationRaw = readHint(visualNotes, "duration-seconds");
      const durationSeconds = durationRaw ? Number(durationRaw) : base.config.durationSeconds;
      return {
        kind: "manim-motion",
        config: {
          ...base.config,
          subTemplate:
            (readHint(visualNotes, "manim-sub") as typeof base.config.subTemplate) ??
            base.config.subTemplate,
          diagramId: readHint(visualNotes, "diagram") ?? base.config.diagramId,
          durationSeconds: Number.isFinite(durationSeconds)
            ? durationSeconds
            : base.config.durationSeconds,
          caption: readHint(visualNotes, "caption") ?? base.config.caption,
        },
      };
    }
    case "composited":
      return {
        kind: "composited",
        config: {
          ...base.config,
          baseFootageSrc: readHint(visualNotes, "footage") ?? base.config.baseFootageSrc,
        },
      };
    case "presenter-overlay":
      return {
        kind: "presenter-overlay",
        config: {
          ...base.config,
          depth:
            (readHint(visualNotes, "overlay-depth") as typeof base.config.depth) ??
            base.config.depth,
          anchor:
            (readHint(visualNotes, "overlay-anchor") as typeof base.config.anchor) ??
            base.config.anchor,
        },
      };
    case "screen-recording":
      return {
        kind: "screen-recording",
        config: {
          ...base.config,
          audioOnly: hintIsTrue(visualNotes, "audio-only"),
        },
      };
    case "stickers":
      return base;
    default: {
      const _exhaustive: never = template;
      return _exhaustive;
    }
  }
}

function metaFromHintLines(visualNotes: string): ParsedBeatStudioMeta | null {
  const templateName = readHint(visualNotes, "beat-template");
  const template = templateName ? canonicalBeatTemplateKind(templateName) : null;
  if (!template) {
    return null;
  }
  return {
    template,
    templateConfig: normalizeTemplateConfig(
      template,
      configFromHintLines(template, visualNotes),
    ),
    userNotes: stripAutoVisualNoteHints(stripBeatStudioBlock(visualNotes)),
  };
}

function metaFromLegacyJson(visualNotes: string): ParsedBeatStudioMeta | null {
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

/** Encode template choice as plain hint lines only (no JSON in animation.md). */
export function encodeVisualNotesForSave(
  userNotes: string,
  candidate: Pick<BeatCandidate, "template" | "templateConfig">,
): string {
  const clean = stripAutoVisualNoteHints(stripBeatStudioBlock(userNotes));
  const hints = visualNotesHintsFromCandidate(candidate);
  const hintBlock = hints.length ? `${hints.join("\n")}\n\n` : "";
  return clean ? `${hintBlock}${clean}` : hintBlock.trim();
}

export function parseBeatStudioFromVisualNotes(
  visualNotes: string,
): ParsedBeatStudioMeta | null {
  return metaFromHintLines(visualNotes) ?? metaFromLegacyJson(visualNotes);
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
      if (cfg.config.durationSeconds != null) {
        hints.push(`duration-seconds: ${cfg.config.durationSeconds}`);
      }
      if (cfg.config.caption?.trim()) {
        hints.push(`caption: ${cfg.config.caption.trim()}`);
      }
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
