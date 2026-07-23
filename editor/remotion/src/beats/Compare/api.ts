/**
 * compare-dual beat — types and compile helpers tied to animation.md visual notes.
 *
 * Visual notes carry `<!-- beat-studio: {"template":"compare-dual",…} -->` plus hint lines:
 * - beat-template: compare-dual
 * - layer: compare
 * - lean-render / turn-render / typing
 * - screen-recording: Label for the studio screen-recording placeholder
 */

import type { ParsedBeatStudioMeta } from '../beatStudioCompile';
import { cfgBool, cfgNumber, cfgString } from '../configHelpers';
import { parseBeatCommentDirectives, parseVisualNotesDirective } from '../../components/BeatDirectives/beatDirectives';

export const KIND = 'compare-dual' as const;

export type CompareDualTypingConfig = {
    enabled?: boolean;
    cps?: number;
};

export type CompareDualConfig = {
    leanEnabled?: boolean;
    turnEnabled?: boolean;
    leanRender?: boolean;
    turnRender?: boolean;
    leanEditorStyle?: 'default' | 'minimal' | 'textbook';
    turnEditorStyle?: 'ide' | 'minimal';
    typing?: CompareDualTypingConfig;
    /** Opt-in screen-recording placeholder label (animation.md `screen-recording:`). */
    screenRecording?: string;
};

export type CompareDualBeatMeta = ParsedBeatStudioMeta & {
    template: typeof KIND;
};

export function defaultConfig(): CompareDualConfig {
    return {
        leanEnabled: true,
        turnEnabled: true,
        leanRender: true,
        turnRender: true,
        leanEditorStyle: 'default',
        turnEditorStyle: 'ide',
        typing: { enabled: true, cps: 24 },
    };
}

export function parseConfig(raw: Record<string, unknown>): CompareDualConfig {
    const typing = (raw.typing as CompareDualTypingConfig | undefined) ?? {};
    return {
        leanEnabled: cfgBool(raw, 'leanEnabled', true),
        turnEnabled: cfgBool(raw, 'turnEnabled', true),
        leanRender: cfgBool(raw, 'leanRender', true),
        turnRender: cfgBool(raw, 'turnRender', true),
        leanEditorStyle:
            cfgString(raw, 'leanEditorStyle') === 'minimal' ||
            cfgString(raw, 'leanEditorStyle') === 'textbook'
                ? (cfgString(raw, 'leanEditorStyle') as CompareDualConfig['leanEditorStyle'])
                : 'default',
        turnEditorStyle:
            cfgString(raw, 'turnEditorStyle') === 'minimal' ? 'minimal' : 'ide',
        typing: {
            enabled: cfgBool(typing as Record<string, unknown>, 'enabled', true),
            cps: cfgNumber(typing as Record<string, unknown>, 'cps', 24),
        },
        screenRecording: cfgString(raw, 'screenRecording'),
    };
}

/** Merge animation.md directive lines into template config at compile time. */
export function enrichConfigFromVisualNotes(
    config: CompareDualConfig,
    visualNotes: string | undefined,
): CompareDualConfig {
    const directives = parseBeatCommentDirectives(visualNotes);
    const screenRecording =
        config.screenRecording ??
        directives['screen-recording'] ??
        parseVisualNotesDirective(visualNotes, 'screen-recording');
    return screenRecording ? { ...config, screenRecording } : config;
}

export function visualNotesHints(config: CompareDualConfig): string[] {
    const hints = [`beat-template: ${KIND}`, 'layer: compare'];
    if (config.leanRender) {
        hints.push('lean-render: true');
    }
    if (config.turnRender) {
        hints.push('turn-render: true');
    }
    if (config.typing?.enabled !== false) {
        hints.push('typing: true');
    }
    if (config.screenRecording?.trim()) {
        hints.push(`screen-recording: ${config.screenRecording.trim()}`);
    }
    return hints;
}

export function screenRecordingLabel(
    meta: CompareDualBeatMeta | null,
    visualNotes?: string,
): string | undefined {
    if (!meta || meta.template !== KIND) {
        return parseVisualNotesDirective(visualNotes, 'screen-recording');
    }
    const config = parseConfig(meta.templateConfig.config);
    const enriched = enrichConfigFromVisualNotes(config, visualNotes ?? meta.userNotes);
    return enriched.screenRecording?.trim() || undefined;
}

export function typingCps(meta: CompareDualBeatMeta | null): number | undefined {
    if (!meta || meta.template !== KIND) {
        return undefined;
    }
    const typing = parseConfig(meta.templateConfig.config).typing ?? {};
    if (typing.enabled === false) {
        return undefined;
    }
    return typing.cps ?? 24;
}

export function leanEnabled(meta: CompareDualBeatMeta | null): boolean {
    if (!meta || meta.template !== KIND) {
        return true;
    }
    return cfgBool(meta.templateConfig.config, 'leanEnabled', true);
}

export function turnEnabled(meta: CompareDualBeatMeta | null): boolean {
    if (!meta || meta.template !== KIND) {
        return true;
    }
    return cfgBool(meta.templateConfig.config, 'turnEnabled', true);
}

export function editorFontScale(meta: CompareDualBeatMeta | null): number | undefined {
    if (!meta || meta.template !== KIND) {
        return undefined;
    }
    const style = cfgString(meta.templateConfig.config, 'turnEditorStyle');
    if (style === 'minimal') {
        return 0.92;
    }
    return undefined;
}

export function leanFontScale(meta: CompareDualBeatMeta | null): number | undefined {
    if (!meta || meta.template !== KIND) {
        return undefined;
    }
    const style = cfgString(meta.templateConfig.config, 'leanEditorStyle');
    if (style === 'minimal') {
        return 0.92;
    }
    if (style === 'textbook') {
        return 1.08;
    }
    return undefined;
}
