/**
 * Parse beat template metadata from animation.md visual notes.
 * Prefer plain `key: value` hint lines — no JSON required in the markdown.
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

const HINT_LINE_RE =
  /^(beat-template|layer|lean-render|turn-render|turn-render-id|typing|manim-sub|manim-code|diagram|duration-seconds|caption|overlay-depth|overlay-anchor|walkthrough|screen-recording|audio-only|stickers|footage|placements)\s*:/i;

export function stripBeatStudioBlock(visualNotes: string): string {
  return visualNotes.replace(STUDIO_BLOCK_RE, '').trim();
}

function readHint(visualNotes: string, key: string): string | undefined {
  const match = visualNotes.match(new RegExp(`^\\s*${key}:\\s*(.+)\\s*$`, 'im'));
  const value = match?.[1]?.trim();
  return value || undefined;
}

function hintIsTrue(visualNotes: string, key: string): boolean {
  const value = readHint(visualNotes, key);
  return value === 'true' || value === 'yes' || value === '1';
}

function stripHintLines(visualNotes: string): string {
  return visualNotes
    .split('\n')
    .filter((line) => !HINT_LINE_RE.test(line.trim()))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function configFromHintLines(
  template: BeatStudioTemplateKind,
  visualNotes: string,
): Record<string, unknown> {
  switch (template) {
    case 'compare-dual':
      return {
        leanEnabled: true,
        turnEnabled: true,
        leanRender: hintIsTrue(visualNotes, 'lean-render') || !readHint(visualNotes, 'lean-render'),
        turnRender: hintIsTrue(visualNotes, 'turn-render') || !readHint(visualNotes, 'turn-render'),
        leanEditorStyle: 'default',
        turnEditorStyle: 'ide',
        typing: {
          enabled: hintIsTrue(visualNotes, 'typing') || !readHint(visualNotes, 'typing'),
          cps: 24,
        },
        screenRecording: readHint(visualNotes, 'screen-recording'),
      };
    case 'turn-focus':
      return {
        renderEnabled: hintIsTrue(visualNotes, 'turn-render') || !readHint(visualNotes, 'turn-render'),
        renderComponentId: readHint(visualNotes, 'turn-render-id'),
        editorFontScale: 1,
        typing: { enabled: true, cps: 28 },
      };
    case 'manim-motion': {
      const durationRaw = readHint(visualNotes, 'duration-seconds');
      const durationSeconds = durationRaw ? Number(durationRaw) : 6;
      return {
        subTemplate: readHint(visualNotes, 'manim-sub') ?? 'set-diagram',
        diagramId: readHint(visualNotes, 'diagram'),
        durationSeconds: Number.isFinite(durationSeconds) ? durationSeconds : 6,
        caption: readHint(visualNotes, 'caption') ?? '',
        manimWebCode: hintIsTrue(visualNotes, 'manim-code') ? '' : undefined,
      };
    }
    case 'composited':
      return {
        baseFootageSrc: readHint(visualNotes, 'footage'),
        placements: [],
      };
    case 'presenter-overlay':
      return {
        depth: readHint(visualNotes, 'overlay-depth') ?? 'foreground',
        anchor: readHint(visualNotes, 'overlay-anchor') ?? 'center',
      };
    case 'screen-recording':
      return {
        audioOnly: hintIsTrue(visualNotes, 'audio-only'),
        syncCuts: [{ atSeconds: 0, label: 'Sync' }],
      };
    case 'stickers':
      return { stickers: [] };
    default: {
      const _exhaustive: never = template;
      return _exhaustive;
    }
  }
}

/** Build studio meta from plain visual-note hint lines (`beat-template: …`). */
export function metaFromHintLines(visualNotes: string): ParsedBeatStudioMeta | null {
  const templateName = readHint(visualNotes, 'beat-template');
  const template = templateName ? canonicalBeatStudioTemplateKind(templateName) : null;
  if (!template) {
    return null;
  }
  return {
    template,
    templateConfig: {
      kind: template,
      config: configFromHintLines(template, visualNotes),
    },
    userNotes: stripHintLines(stripBeatStudioBlock(visualNotes)),
  };
}

function metaFromLegacyJson(visualNotes: string): ParsedBeatStudioMeta | null {
  const match = visualNotes.match(STUDIO_BLOCK_RE);
  if (!match) {
    return null;
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
      userNotes: stripHintLines(stripBeatStudioBlock(visualNotes)),
    };
  } catch {
    return null;
  }
}

export function parseBeatStudioFromVisualNotes(visualNotes: string | undefined): ParsedBeatStudioMeta | null {
  if (!visualNotes?.trim()) {
    return null;
  }
  // Plain hint lines are the source of truth; legacy JSON is a fallback only.
  return metaFromHintLines(visualNotes) ?? metaFromLegacyJson(visualNotes);
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
