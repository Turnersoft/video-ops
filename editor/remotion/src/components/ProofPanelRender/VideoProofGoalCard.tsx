// /Users/johndoe/Documents/company/basic_ui/src/shared/turn-video/panels/VideoProofGoalCard.tsx
import type { KnowledgeUiPhrases } from '@turn-user/language_server/vscode_extension/src/visualization/knowledge/types';

import {
    DEFAULT_PROOF_PANEL_PHRASES,
    GoalRow,
    type ProofPanelGoal,
    type RenderContext,
} from '../../lib/panels/turnKnowledgeBridge';
import {
    DEFAULT_VIDEO_PANEL_SCALE,
    goalViewFromProofPanelGoal,
    presentationForVideoGoalCard,
    type TurnVideoPanelScale,
    videoProofPanelStyle,
} from './videoProofRender';
import { knowledgePanelThemeClass } from '../KnowledgePanelRender/knowledgePanelChrome';
import { proofPanelThemeClass } from './proofPanelChrome';

type VideoProofGoalCardProps = {
    title: string;
    presentation: ProofPanelGoal;
    motionToken: string;
    sources: RenderContext['sources'];
    mathUiPhrases?: KnowledgeUiPhrases | null;
    scale?: TurnVideoPanelScale;
    /** Match /app panel chrome: knowledge = light, proof = dark. */
    chromeTheme?: 'light' | 'dark';
};

/** Shared knowledge + proof card shell — same GoalRow path as /app side panels. */
export function VideoProofGoalCard({
    title,
    presentation,
    motionToken,
    sources,
    mathUiPhrases = null,
    scale = DEFAULT_VIDEO_PANEL_SCALE,
    chromeTheme = 'dark',
}: VideoProofGoalCardProps) {
    const cardPresentation = presentationForVideoGoalCard(presentation);
    const goalView = goalViewFromProofPanelGoal(cardPresentation) ?? { context: [], goal: title };
    const themeClass =
        chromeTheme === 'light' ? knowledgePanelThemeClass() : proofPanelThemeClass();

    return (
        <div
            style={{
                minWidth: 0,
                maxWidth: '100%',
                overflowX: 'auto',
                fontSize: scale.codeFontSize,
                lineHeight: 1.58,
                WebkitFontSmoothing: 'antialiased',
            }}
        >
            <div
                className={`vis-panel-root vis-panel-root--proof-math ${themeClass}`}
                style={chromeTheme === 'dark' ? videoProofPanelStyle() : undefined}
            >
                <GoalRow
                    title={title}
                    goalView={goalView}
                    goalPresentation={cardPresentation}
                    showDiff={false}
                    pipelineHighlights={[]}
                    motionToken={motionToken}
                    emptyLabel={DEFAULT_PROOF_PANEL_PHRASES.noGoal}
                    proofMathSources={sources}
                    proofMathFilePath={null}
                    proofMathUiPhrases={mathUiPhrases}
                    proofSelectedMathNodeId={null}
                    onProofMathNavigate={null}
                    proofPanelPhrases={DEFAULT_PROOF_PANEL_PHRASES}
                />
            </div>
        </div>
    );
}
