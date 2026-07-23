/**
 * turn-focus beat — types and compile helpers tied to animation.md visual notes.
 *
 * Hint lines:
 * - beat-template: turn-focus
 * - layer: turn-code
 * - turn-render: true
 * - turn-render-id: …
 * - screen-recording: …
 */

import type { ParsedBeatStudioMeta } from "../beatStudioCompile";
import { cfgBool, cfgNumber, cfgString } from "../configHelpers";
import {
  parseBeatCommentDirectives,
  parseVisualNotesDirective,
} from "../../components/BeatDirectives/beatDirectives";

export const KIND = "turn-focus" as const;

export type TurnFocusTypingConfig = {
  enabled?: boolean;
  cps?: number;
};

export type TurnFocusConfig = {
  renderEnabled?: boolean;
  renderComponentId?: string;
  editorFontScale?: number;
  typing?: TurnFocusTypingConfig;
  screenRecording?: string;
};

export type TurnFocusBeatMeta = ParsedBeatStudioMeta & {
  template: typeof KIND;
};

export function defaultConfig(): TurnFocusConfig {
  return {
    renderEnabled: true,
    editorFontScale: 1,
    typing: { enabled: true, cps: 28 },
  };
}

export function parseConfig(raw: Record<string, unknown>): TurnFocusConfig {
  const typing = (raw.typing as TurnFocusTypingConfig | undefined) ?? {};
  const editorFontScale = raw.editorFontScale;
  return {
    renderEnabled: cfgBool(raw, "renderEnabled", true),
    renderComponentId: cfgString(raw, "renderComponentId"),
    editorFontScale:
      typeof editorFontScale === "number" && editorFontScale > 0
        ? editorFontScale
        : 1,
    typing: {
      enabled: cfgBool(typing as Record<string, unknown>, "enabled", true),
      cps: cfgNumber(typing as Record<string, unknown>, "cps", 28),
    },
    screenRecording: cfgString(raw, "screenRecording"),
  };
}

export function enrichConfigFromVisualNotes(
  config: TurnFocusConfig,
  visualNotes: string | undefined,
): TurnFocusConfig {
  const directives = parseBeatCommentDirectives(visualNotes);
  const screenRecording =
    config.screenRecording ??
    directives["screen-recording"] ??
    parseVisualNotesDirective(visualNotes, "screen-recording");
  const renderEnabled =
    directives["turn-render"] === "true"
      ? true
      : directives["turn-render"] === "false"
        ? false
        : config.renderEnabled;
  const renderComponentId =
    directives["turn-render-id"] ?? config.renderComponentId;
  return {
    ...config,
    ...(screenRecording ? { screenRecording } : {}),
    ...(renderEnabled !== undefined ? { renderEnabled } : {}),
    ...(renderComponentId ? { renderComponentId } : {}),
  };
}

export function visualNotesHints(config: TurnFocusConfig): string[] {
  const hints = [`beat-template: ${KIND}`, "layer: turn-code"];
  if (config.renderEnabled !== false) {
    hints.push("turn-render: true");
  }
  if (config.renderComponentId?.trim()) {
    hints.push(`turn-render-id: ${config.renderComponentId.trim()}`);
  }
  if (config.screenRecording?.trim()) {
    hints.push(`screen-recording: ${config.screenRecording.trim()}`);
  }
  return hints;
}

export function screenRecordingLabel(
  meta: TurnFocusBeatMeta | null,
  visualNotes?: string,
): string | undefined {
  if (!meta || meta.template !== KIND) {
    return parseVisualNotesDirective(visualNotes, "screen-recording");
  }
  const config = enrichConfigFromVisualNotes(
    parseConfig(meta.templateConfig.config),
    visualNotes ?? meta.userNotes,
  );
  return config.screenRecording?.trim() || undefined;
}

export function fontScale(meta: TurnFocusBeatMeta | null): number | undefined {
  if (!meta || meta.template !== KIND) {
    return undefined;
  }
  const scale = parseConfig(meta.templateConfig.config).editorFontScale;
  return typeof scale === "number" && scale > 0 ? scale : undefined;
}

export function typingCps(config: TurnFocusConfig): number {
  if (config.typing?.enabled === false) {
    return 999;
  }
  return config.typing?.cps ?? 28;
}

export function renderEnabled(config: TurnFocusConfig): boolean {
  return config.renderEnabled !== false;
}
