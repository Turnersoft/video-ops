/**
 * Parse beat-studio metadata from animation.md visual notes (shared compile + UI).
 */

const STUDIO_BLOCK_RE = /<!--\s*beat-studio:\s*([\s\S]*?)\s*-->\s*/i;

export type BeatStudioTemplateKind =
  | 'compare-dual'
  | 'turn-focus'
  | 'manim-motion'
  | 'composited'
  | 'presenter-overlay'
  | 'screen-recording'
  | 'stickers';

const LEGACY_TEMPLATE_KIND_ALIASES: Record<string, BeatStudioTemplateKind> = {
  'coding-walkthrough': 'screen-recording',
};

export function canonicalBeatStudioTemplateKind(
  kind: string,
): BeatStudioTemplateKind | null {
  const resolved = LEGACY_TEMPLATE_KIND_ALIASES[kind] ?? kind;
  if (!TEMPLATE_KINDS.has(resolved)) {
    return null;
  }
  return resolved as BeatStudioTemplateKind;
}

export type BeatStudioTemplateConfig = {
  kind: BeatStudioTemplateKind;
  config: Record<string, unknown>;
};

export type ParsedBeatStudioMeta = {
  template: BeatStudioTemplateKind;
  templateConfig: BeatStudioTemplateConfig;
  userNotes: string;
};

const TEMPLATE_KINDS = new Set<string>([
  'compare-dual',
  'turn-focus',
  'manim-motion',
  'composited',
  'presenter-overlay',
  'screen-recording',
  'stickers',
]);

export function stripBeatStudioBlock(visualNotes: string): string {
  return visualNotes.replace(STUDIO_BLOCK_RE, '').trim();
}

function metaFromHintLines(visualNotes: string): ParsedBeatStudioMeta | null {
  const match = visualNotes.match(/^\s*beat-template:\s*([a-z0-9-]+)\s*$/im);
  const template = match ? canonicalBeatStudioTemplateKind(match[1]) : null;
  if (!template) {
    return null;
  }
  return {
    template,
    templateConfig: { kind: template, config: {} },
    userNotes: visualNotes
      .split('\n')
      .filter((line) => !/^\s*beat-template:/i.test(line))
      .join('\n')
      .trim(),
  };
}

export function parseBeatStudioFromVisualNotes(visualNotes: string | undefined): ParsedBeatStudioMeta | null {
  if (!visualNotes?.trim()) {
    return null;
  }
  const match = visualNotes.match(STUDIO_BLOCK_RE);
  if (!match) {
    // Fallback when markdown compile previously stripped the HTML comment.
    return metaFromHintLines(visualNotes);
  }
  try {
    const parsed = JSON.parse(match[1]) as {
      template?: string;
      templateConfig?: { kind?: string; config?: Record<string, unknown> };
    };
    const template = parsed.template
      ? canonicalBeatStudioTemplateKind(parsed.template)
      : null;
    if (!template) {
      return null;
    }
    const configKind = parsed.templateConfig?.kind
      ? canonicalBeatStudioTemplateKind(parsed.templateConfig.kind)
      : null;
    if (!configKind || configKind !== template) {
      return null;
    }
    return {
      template,
      templateConfig: {
        kind: template,
        config: parsed.templateConfig?.config ?? {},
      },
      userNotes: stripBeatStudioBlock(visualNotes),
    };
  } catch {
    return metaFromHintLines(visualNotes);
  }
}

function cfgBool(config: Record<string, unknown>, key: string, fallback = false): boolean {
  return typeof config[key] === 'boolean' ? (config[key] as boolean) : fallback;
}

function cfgNumber(config: Record<string, unknown>, key: string, fallback: number): number {
  return typeof config[key] === 'number' && !Number.isNaN(config[key]) ? (config[key] as number) : fallback;
}

function cfgString(config: Record<string, unknown>, key: string): string | undefined {
  return typeof config[key] === 'string' ? (config[key] as string) : undefined;
}

export type BeatMainLayerPayload = {
  type: string;
  [key: string]: unknown;
};

export function buildBeatMainLayerFromTemplate(
  meta: ParsedBeatStudioMeta,
  turnSource: string,
): BeatMainLayerPayload {
  return {
    type: 'beat-template',
    kind: meta.template,
    config: meta.templateConfig.config,
    turnSource,
  };
}

export {
    editorFontScale as compareDualEditorFontScale,
    leanEnabled as compareDualLeanEnabled,
    leanFontScale as compareDualLeanFontScale,
    turnEnabled as compareDualTurnEnabled,
    typingCps as compareDualTypingCps,
} from './Compare/api';

export { fontScale as turnFocusFontScale } from './TurnLang/api';
