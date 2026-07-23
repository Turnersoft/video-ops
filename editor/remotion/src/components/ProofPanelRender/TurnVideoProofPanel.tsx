// /Users/johndoe/Documents/company/basic_ui/src/shared/turn-video/panels/TurnVideoProofPanel.tsx
import { MathJaxProvider } from '@yozora/react-mathjax';
import { useMemo } from 'react';

import type { ProofPanelGoal } from '../../lib/panels/turnKnowledgeBridge';
import { createVideoKnowledgeRenderContext } from '../../lib/panels/createVideoKnowledgeRenderContext';
import type { IdeTrack } from '../../lib/tracks/ideTrackTypes';
import { VideoProofGoalCard } from './VideoProofGoalCard';
import type { ProofPanelExport, ProofPanelStepExport } from '../../lib/panels/panelExportTypes';
import {
    DEFAULT_VIDEO_PANEL_SCALE,
    type TurnVideoPanelScale,
    videoSidePanelHeadingStyle,
    videoSidePanelShellStyle,
} from './videoProofRender';
import { PROOF_PANEL_CHROME, proofPanelThemeClass } from './proofPanelChrome';

type TurnVideoProofPanelProps = {
    heading?: string;
    inlineExport?: ProofPanelExport | null;
    track?: IdeTrack | null;
    fallbackSteps?: Array<{ label: string; goal?: string }>;
    activeStepIndex?: number;
    scale?: TurnVideoPanelScale;
};

function fallbackGoalPresentation(detail: string): ProofPanelGoal {
    return {
        goal_index: 0,
        sequent_statement_rich_text: {
            segments: [{ Text: detail }],
            alignment: null,
        },
    };
}

export function activeProofStepIndexFromTrack(track: IdeTrack | null | undefined, seconds: number): number {
    if (!track?.interactions?.length) {
        return 0;
    }
    let step = 0;
    for (const event of track.interactions) {
        if (
            seconds >= event.atSeconds &&
            event.kind === 'click-proof-step' &&
            event.stepIndex !== undefined
        ) {
            step = event.stepIndex;
        }
    }
    return step;
}

export function TurnVideoProofPanel({
    heading = 'Proof',
    inlineExport = null,
    track = null,
    fallbackSteps = [],
    activeStepIndex,
    scale = DEFAULT_VIDEO_PANEL_SCALE,
}: TurnVideoProofPanelProps) {
    const ctx = useMemo(
        () =>
            createVideoKnowledgeRenderContext(
                inlineExport?.sources ?? null,
                inlineExport?.math_ui_phrases ?? null,
            ),
        [inlineExport?.math_ui_phrases, inlineExport?.sources],
    );

    const exportedSteps = inlineExport?.steps ?? [];
    const resolvedIndex = activeStepIndex ?? 0;

    const stepsToRender: ProofPanelStepExport[] =
        exportedSteps.length > 0
            ? exportedSteps
            : fallbackSteps.map((step) => ({
                  label: step.label,
                  goal: fallbackGoalPresentation(step.goal ?? 'goal state'),
              }));

    const visibleStep = stepsToRender[Math.min(resolvedIndex, stepsToRender.length - 1)] ?? null;

    return (
        <div
            className={`knowledge-view theme-textbook ${proofPanelThemeClass()}`}
            style={videoSidePanelShellStyle(scale, PROOF_PANEL_CHROME)}
        >
            <div style={videoSidePanelHeadingStyle(scale, PROOF_PANEL_CHROME)}>{heading}</div>

            <div
                className="video-proof-goal-document"
                style={{
                    flex: 1,
                    minHeight: 0,
                    overflow: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: scale.px(8),
                }}
            >
                {visibleStep ? (
                    <MathJaxProvider>
                        <VideoProofGoalCard
                            title={visibleStep.label}
                            presentation={visibleStep.goal}
                            motionToken={`video-proof:${resolvedIndex}`}
                            sources={ctx.sources}
                            mathUiPhrases={ctx.uiPhrases ?? null}
                            scale={scale}
                            chromeTheme={PROOF_PANEL_CHROME}
                        />
                    </MathJaxProvider>
                ) : null}
            </div>
        </div>
    );
}
