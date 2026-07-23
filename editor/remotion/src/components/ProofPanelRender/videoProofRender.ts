// /Users/johndoe/Documents/company/basic_ui/src/shared/turn-video/panels/videoProofRender.ts
import type { CSSProperties } from 'react';

import type { ProofPanelGoal } from '../../lib/panels/turnKnowledgeBridge';
import type { GoalView } from '@turn-user/language_server/vscode_extension/src/visualization/proof/proofTimelineTypes';
import { PROOF_PANEL_CHROME } from './proofPanelChrome';

export const VIDEO_PROOF_PANEL_THEME_CLASS = `proof-panel-theme-${PROOF_PANEL_CHROME}`;

const VIDEO_PROOF_INK = '#ffffff';

/** Ink + CSS variables for dark proof-panel math in video (matches /app proof tab). */
export function videoProofPanelStyle(): CSSProperties {
    return {
        color: VIDEO_PROOF_INK,
        ['--vscode-foreground' as string]: VIDEO_PROOF_INK,
        ['--vscode-editor-foreground' as string]: VIDEO_PROOF_INK,
        ['--turn-math-token-color' as string]: VIDEO_PROOF_INK,
        ['--math-text-color' as string]: VIDEO_PROOF_INK,
        ['--identifier-color' as string]: VIDEO_PROOF_INK,
        ['--number-color' as string]: VIDEO_PROOF_INK,
        ['--operator-color' as string]: VIDEO_PROOF_INK,
        ['--relation-color' as string]: VIDEO_PROOF_INK,
        ['--function-color' as string]: VIDEO_PROOF_INK,
        ['--routine-name-color' as string]: VIDEO_PROOF_INK,
        ['--fraction-line-color' as string]: VIDEO_PROOF_INK,
        ['--sqrt-line-color' as string]: VIDEO_PROOF_INK,
        ['--matrix-border-color' as string]: VIDEO_PROOF_INK,
    };
}

export function contextMathToString(math: unknown): string {
    if (typeof math === 'string') {
        return math;
    }
    if (math && typeof math === 'object') {
        const rec = math as Record<string, unknown>;
        const latex = rec.Latex;
        if (typeof latex === 'string') {
            return latex;
        }
        const typst = rec.Typst;
        if (typeof typst === 'string') {
            return typst;
        }
    }
    return '[⋯]';
}

export function goalViewFromProofPanelGoal(
    goal: ProofPanelGoal | null | undefined,
): GoalView | null {
    if (!goal) {
        return null;
    }
    const ctx = (goal.context_math ?? []).map((row, i) => {
        const hyp = row.label?.trim() || `h${i + 1}`;
        const prop = contextMathToString(row.math);
        return `${hyp} : ${prop}`;
    });
    const latex = goal.export_latex?.trim() ?? '';
    const goalTxt = latex.replace(/\s+/g, ' ').slice(0, 600);
    return {
        context: ctx,
        goal: goalTxt,
        sequent_math: goal.sequent_math as GoalView['sequent_math'],
    };
}

export function presentationForVideoGoalCard(goal: ProofPanelGoal): ProofPanelGoal {
    const richText = goal.sequent_statement_rich_text;
    const segments =
        richText && typeof richText === 'object' && 'segments' in richText
            ? ((richText as { segments?: Array<{ Math?: unknown }> }).segments ?? [])
            : [];
    const firstMath = segments.find((segment) => segment.Math != null)?.Math;

    const next: ProofPanelGoal = {
        ...goal,
        export_latex: undefined,
        export_typst: undefined,
    };

    if (!next.goal_math && firstMath) {
        next.goal_math = firstMath;
        next.goal_math_lines = [firstMath];
    }

    return next;
}

export type TurnVideoPanelScale = {
    px: (value: number) => number;
    codeFontSize: number;
    tabFontSize: number;
    /** Optional boost for scoped knowledge sections in video frames. */
    knowledgeTypesetScale?: number;
};

export const DEFAULT_VIDEO_PANEL_SCALE: TurnVideoPanelScale = {
    px: (value) => value,
    codeFontSize: 22,
    tabFontSize: 14,
    knowledgeTypesetScale: 1.95,
};

/** Typography for TurnVideoKnowledgePanel — larger than IDE side panel for 1080p video. */
export function videoKnowledgePanelStyle(
    scale: TurnVideoPanelScale,
    density: 'default' | 'compact' = 'default',
): CSSProperties {
    const typesetScale =
        scale.knowledgeTypesetScale ?? (density === 'compact' ? 1.05 : 1.95);
    const padX = density === 'compact' ? scale.px(6) : scale.px(8);
    const padY = density === 'compact' ? scale.px(8) : scale.px(10);
    return {
        fontSize: density === 'compact' ? scale.px(14) : scale.px(22),
        lineHeight: density === 'compact' ? 1.42 : 1.46,
        ['--doc-typeset-scale' as string]: String(typesetScale),
        ['--doc-prose-leading' as string]: density === 'compact' ? '1.44' : '1.48',
        ['--doc-page-pad-x' as string]: `${padX}px`,
        ['--doc-page-pad-y' as string]: `${padY}px`,
    };
}

export function videoSidePanelShellStyle(
    s: TurnVideoPanelScale,
    theme: 'light' | 'dark' = 'dark',
): CSSProperties {
    const isLight = theme === 'light';
    return {
        flex: 1,
        padding: s.px(16),
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        gap: s.px(10),
        overflow: 'hidden',
        colorScheme: isLight ? 'light' : 'dark',
        fontSize: s.codeFontSize,
        background: isLight ? 'rgba(255, 255, 255, 0.96)' : 'rgba(15, 23, 42, 0.92)',
        borderRadius: s.px(18),
        color: isLight ? '#1a1a1a' : '#ffffff',
        ...(isLight
            ? {}
            : {
                  ['--turn-math-token-color' as string]: '#ffffff',
                  ['--math-text-color' as string]: '#ffffff',
                  ['--vscode-foreground' as string]: '#ffffff',
                  ['--vscode-editor-foreground' as string]: '#ffffff',
              }),
    };
}

export function videoSidePanelHeadingStyle(
    s: TurnVideoPanelScale,
    theme: 'light' | 'dark' = 'dark',
): CSSProperties {
    return {
        fontSize: Math.max(s.tabFontSize, Math.round(s.codeFontSize * 0.72)),
        fontWeight: 700,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        color: theme === 'light' ? 'rgba(60, 54, 45, 0.72)' : 'rgba(226, 232, 240, 0.78)',
        flexShrink: 0,
        paddingLeft: s.px(4),
    };
}
