// /Users/johndoe/Documents/company/basic_ui/src/shared/turn-video/panels/Lean4GoalPanel.tsx
import type { ComponentType } from 'react';

import type { HighlightOverlay } from '../../lib/panels/highlightTransition';
import type { Lean4GoalExport, Lean4GoalHypothesis, Lean4GoalState } from '../../lib/tracks/lean4TrackTypes';
import { goalStateAtSeconds } from '../../lib/tracks/lean4TrackTypes';
import { DEFAULT_LEAN_EDITOR_THEME } from '../LeanTypingCode/leanEditorTheme';
import { LeanMathLine } from './LeanMathLine';

export type Lean4GoalMathLineProps = {
    text: string;
    highlights?: string[];
    highlightOverlays?: HighlightOverlay[];
    inline?: boolean;
    fontSize?: number;
    textColor?: string;
};

export type Lean4GoalPanelProps = {
    exportData: Lean4GoalExport | null;
    proofSeconds: number;
    codeFontSize?: number;
    /** Tighter padding for compare / side-by-side layouts. */
    compact?: boolean;
    /** Substrings to pulse in hypotheses + target while the caption mentions them. */
    goalHighlights?: string[];
    /** Fading goal overlays (Remotion caption beats). */
    goalHighlightOverlays?: HighlightOverlay[];
    /** Optional override; defaults to Unicode Lean math (no MathJax). */
    MathLine?: ComponentType<Lean4GoalMathLineProps>;
    /** Compare v4 — defs/namespaces have no Lean knowledge render analogue. */
    renderUnavailable?: boolean;
};

/** Video script suffix after em/en dash — not part of the Lean goal proper. */
function splitGoalTargetComment(raw: string): { goal: string; comment: string | null } {
    const match = raw.trim().match(/^(.+?)\s+[—–]\s+(.+)$/);
    if (!match) {
        return { goal: raw.trim(), comment: null };
    }
    return { goal: match[1].trim(), comment: match[2].trim() };
}

function HypothesisRow({
    hypothesis,
    fontSize,
    goalHighlights,
    goalHighlightOverlays,
    MathLine,
    compact = false,
}: {
    hypothesis: Lean4GoalHypothesis;
    fontSize: number;
    goalHighlights: string[];
    goalHighlightOverlays?: HighlightOverlay[];
    MathLine: ComponentType<Lean4GoalMathLineProps>;
    compact?: boolean;
}) {
    const name = hypothesis.name?.trim() || 'h';
    const typeText = hypothesis.type?.trim() || '⊢ ?';

    return (
        <div
            style={{
                display: 'flex',
                gap: compact ? 6 : 10,
                alignItems: 'baseline',
                padding: compact ? '2px 0' : '6px 0',
                borderBottom: '1px solid rgba(60, 54, 45, 0.08)',
                fontSize,
                lineHeight: 1.55,
            }}
        >
            <span
                style={{
                    flexShrink: 0,
                    fontWeight: 700,
                    color: '#569cd6',
                    minWidth: compact ? undefined : '2.5em',
                    fontFamily: '"SF Mono", Menlo, monospace',
                }}
            >
                {name}
            </span>
            <span style={{ color: '#3D3A34', flex: 1, minWidth: 0 }}>
                <MathLine
                    text={`: ${typeText}`}
                    highlights={goalHighlights}
                    highlightOverlays={goalHighlightOverlays}
                    fontSize={fontSize}
                />
            </span>
        </div>
    );
}

function GoalTarget({
    state,
    fontSize,
    goalHighlights,
    goalHighlightOverlays,
    MathLine,
    marginTop = 14,
    padding = '12px 14px',
    commentColor = '#6a9955',
    panelKind = 'goals',
    sourceLabel,
}: {
    state: Lean4GoalState;
    fontSize: number;
    goalHighlights: string[];
    goalHighlightOverlays?: HighlightOverlay[];
    MathLine: ComponentType<Lean4GoalMathLineProps>;
    marginTop?: number;
    padding?: string;
    commentColor?: string;
    panelKind?: 'infoview' | 'goals';
    sourceLabel?: string;
}) {
    const target = state.target?.trim() || (panelKind === 'infoview' ? '?' : '⊢ sorry');
    const withoutTurnstile = target.replace(/^⊢\s*/, '');
    const { goal: inlineComment, comment: legacyComment } = splitGoalTargetComment(withoutTurnstile);
    const goal = panelKind === 'infoview' ? withoutTurnstile : inlineComment;
    const breadcrumb = sourceLabel?.trim() || legacyComment;

    return (
        <div
            style={{
                marginTop,
                padding,
                borderRadius: 10,
                background: 'rgba(86, 156, 214, 0.08)',
                border: '1px solid rgba(86, 156, 214, 0.22)',
                fontSize,
                lineHeight: 1.55,
                color: '#2B2A27',
            }}
        >
            <div
                style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'baseline',
                    gap: 0,
                }}
            >
                <MathLine
                    text={panelKind === 'infoview' ? goal : `\u22a2 ${goal}`}
                    highlights={goalHighlights}
                    highlightOverlays={goalHighlightOverlays}
                    fontSize={fontSize}
                    inline
                />
                {breadcrumb ? (
                    <MathLine
                        text={` — ${breadcrumb}`}
                        fontSize={Math.round(fontSize * 0.92)}
                        inline
                        textColor={commentColor}
                    />
                ) : null}
            </div>
        </div>
    );
}

/** Static Lean 4 infoview-style goal panel (hypotheses + target). */
export function Lean4GoalPanel({
    exportData,
    proofSeconds,
    codeFontSize = 18,
    compact = false,
    goalHighlights = [],
    goalHighlightOverlays,
    MathLine = LeanMathLine,
    renderUnavailable = false,
}: Lean4GoalPanelProps) {
    const theme = DEFAULT_LEAN_EDITOR_THEME;
    const shellPad = compact ? '8px 10px 10px' : '18px 20px 22px';
    const titleGap = compact ? 6 : 12;
    const targetMarginTop = compact ? 6 : 14;
    const targetPad = compact ? '6px 8px' : '12px 14px';
    const titleSize = Math.round(codeFontSize * (compact ? 0.68 : 0.78));

    if (!exportData) {
        return (
            <div style={{ padding: compact ? 10 : 20, opacity: 0.55, fontSize: codeFontSize }}>
                Loading goal state…
            </div>
        );
    }

    if (renderUnavailable) {
        return (
            <div
                style={{
                    flex: 1,
                    minHeight: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: shellPad,
                    background: '#FAF9F5',
                    color: '#6B6860',
                    fontSize: codeFontSize,
                    fontStyle: 'italic',
                    textAlign: 'center',
                }}
            >
                No render available for lean
            </div>
        );
    }

    const state = goalStateAtSeconds(exportData, proofSeconds);
    const panelKind = exportData.panelKind ?? 'goals';
    const title = exportData.title?.trim() || (panelKind === 'infoview' ? 'Infoview' : 'Goals');

    return (
        <div
            className={compact ? 'compare-pane-scroll' : undefined}
            style={{
                flex: 1,
                minHeight: 0,
                display: 'flex',
                flexDirection: 'column',
                padding: shellPad,
                overflow: compact ? 'auto' : 'auto',
                background: '#FAF9F5',
            }}
        >
            <div
                style={{
                    fontSize: titleSize,
                    fontWeight: 800,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: '#6B6860',
                    marginBottom: titleGap,
                }}
            >
                {title}
            </div>

            {state.hypotheses.length > 0 ? (
                <div>
                    {state.hypotheses.map((hypothesis, index) => (
                        <HypothesisRow
                            key={`${hypothesis.name ?? 'h'}-${index}`}
                            hypothesis={hypothesis}
                            fontSize={codeFontSize}
                            goalHighlights={goalHighlights}
                            goalHighlightOverlays={goalHighlightOverlays}
                            MathLine={MathLine}
                            compact={compact}
                        />
                    ))}
                </div>
            ) : (
                <div style={{ fontSize: codeFontSize, color: '#6B6860', fontStyle: 'italic' }}>
                    No hypotheses
                </div>
            )}

            <GoalTarget
                state={state}
                fontSize={codeFontSize}
                goalHighlights={goalHighlights}
                goalHighlightOverlays={goalHighlightOverlays}
                MathLine={MathLine}
                marginTop={targetMarginTop}
                padding={targetPad}
                commentColor={theme.syntax.comment}
                panelKind={panelKind}
                sourceLabel={exportData.sourceLabel}
            />

            {state.label ? (
                <div
                    style={{
                        marginTop: 12,
                        fontSize: Math.round(codeFontSize * 0.85),
                        color: theme.goalPanel.accent,
                        fontWeight: 600,
                    }}
                >
                    {state.label}
                </div>
            ) : null}
        </div>
    );
}
