// /Users/johndoe/Documents/company/basic_ui/src/shared/turn-video/panels/TurnVideoSidePanel.tsx
import { useMemo } from 'react';

import type { VisualizationData } from '@turn-user/language_server/vscode_extension/src/visualization/ast/types';
import type { KnowledgeData } from '@turn-user/language_server/vscode_extension/src/visualization/knowledge/types';

import '../../lib/panels/turnVideoPanelStyles';
import type { IdeTrack } from '../../lib/tracks/ideTrackTypes';
import { detectTurnSidePanelMode } from '../../lib/tracks/ideTrackTypes';
import {
    activeKnowledgeHighlights,
    activeProofStepFromCaptionBeats,
    captionBeatsFromTrack,
    trackHasProofStepScrub,
} from '../../lib/tracks/captionBeats';
import {
    TurnVideoEmbeddedSidePanel,
    hasEmbeddedKnowledgePayload,
    hasEmbeddedProofPayload,
} from './TurnVideoEmbeddedSidePanel';
import { TurnVideoKnowledgePanel } from '../KnowledgePanelRender/TurnVideoKnowledgePanel';
import { TurnVideoProofPanel, activeProofStepIndexFromTrack } from '../ProofPanelRender/TurnVideoProofPanel';
import type { KnowledgePanelExport, ProofPanelExport } from '../../lib/panels/panelExportTypes';
import { scopedKnowledgePanelExport } from '../../lib/panels/scopedKnowledgeFromLsp';
import type { HighlightOverlay } from '../../lib/panels/highlightTransition';
import {
    captionBeatNeedleLayers,
    highlightOverlaysFromLayers,
} from '../../lib/panels/highlightTransition';
import type { TurnVideoPanelScale } from '../ProofPanelRender/videoProofRender';
import { DEFAULT_VIDEO_PANEL_SCALE } from '../ProofPanelRender/videoProofRender';

export type TurnVideoSidePanelProps = {
    scriptId?: string;
    visibleSource?: string;
    panelMode?: 'proof' | 'knowledge';
    heading?: string;
    track?: IdeTrack | null;
    knowledgeExport?: KnowledgePanelExport | null;
    proofExport?: ProofPanelExport | null;
    visualizationData?: VisualizationData | null;
    knowledgeData?: KnowledgeData | null;
    activeProofStepIndex?: number;
    proofSeconds?: number;
    frame?: number;
    fps?: number;
    /** Gate knowledge panel until editor typing animation finishes. */
    typingComplete?: boolean;
    /** Optional precomputed overlays (otherwise derived from frame + caption beats). */
    knowledgeHighlightOverlays?: HighlightOverlay[];
    /** Side-panel density — `compact` for compare layouts. */
    panelDensity?: 'default' | 'compact';
    scale?: TurnVideoPanelScale;
};

function hasSectionExport(exportData: KnowledgePanelExport | null | undefined): boolean {
    return Boolean(exportData?.sections?.length || exportData?.items?.length);
}

/** Scoped knowledge tracks show the render panel early so caption beats can highlight both sides. */
function knowledgePanelReady(
    track: IdeTrack | null | undefined,
    typingComplete: boolean,
): boolean {
    if (typingComplete) {
        return true;
    }
    return track?.knowledgePanel?.scopedToSource === true;
}

/**
 * Unified side panel for video: scoped knowledge sections for IDE tracks; full embedded doc only when requested.
 */
export function TurnVideoSidePanel({
    visibleSource = '',
    panelMode,
    track = null,
    knowledgeExport = null,
    proofExport = null,
    visualizationData = null,
    knowledgeData = null,
    activeProofStepIndex,
    proofSeconds = 0,
    frame,
    fps = 30,
    typingComplete = true,
    knowledgeHighlightOverlays,
    panelDensity = 'default',
    scale = DEFAULT_VIDEO_PANEL_SCALE,
}: TurnVideoSidePanelProps) {
    const mode = panelMode ?? detectTurnSidePanelMode(visibleSource);
    const knowledgeOnlyTrack =
        Boolean(track?.knowledgePanel?.exportPath) && !track?.proofPanel?.exportPath;

    const captionBeats = captionBeatsFromTrack(track);
    const knowledgeHighlights = useMemo(
        () => activeKnowledgeHighlights(captionBeats, proofSeconds),
        [captionBeats, proofSeconds],
    );

    const resolvedKnowledgeOverlays = useMemo((): HighlightOverlay[] | undefined => {
        if (knowledgeHighlightOverlays) {
            return knowledgeHighlightOverlays;
        }
        if (frame === undefined) {
            return undefined;
        }
        const layers = captionBeatNeedleLayers(
            captionBeats,
            proofSeconds,
            fps,
            (beat) => beat.knowledge ?? [],
        );
        return highlightOverlaysFromLayers(layers, frame);
    }, [captionBeats, proofSeconds, frame, fps, knowledgeHighlightOverlays]);

    const resolvedProofIndex = useMemo(() => {
        if (activeProofStepIndex !== undefined) {
            return activeProofStepIndex;
        }
        const fromBeats = activeProofStepFromCaptionBeats(captionBeats, proofSeconds);
        if (fromBeats !== undefined) {
            return fromBeats;
        }
        return activeProofStepIndexFromTrack(track, proofSeconds);
    }, [activeProofStepIndex, captionBeats, proofSeconds, track]);

    const showKnowledge = knowledgePanelReady(track, typingComplete);

    const scopedKnowledgeExport = useMemo(
        () => scopedKnowledgePanelExport(knowledgeData, track),
        [knowledgeData, track],
    );

    const knowledgePanelExport = useMemo((): KnowledgePanelExport | null => {
        if (scopedKnowledgeExport?.sections?.length) {
            return scopedKnowledgeExport;
        }
        if (hasSectionExport(knowledgeExport)) {
            return knowledgeExport;
        }
        return null;
    }, [scopedKnowledgeExport, knowledgeExport]);

    const focusLine = useMemo(() => {
        const fromPanel = track?.knowledgePanel?.focusLine;
        if (fromPanel != null && fromPanel > 0) {
            return fromPanel;
        }
        const fromRange = track?.sourceRange?.startLine;
        if (fromRange != null && fromRange > 0) {
            return fromRange;
        }
        return undefined;
    }, [track]);

    const hasEmbeddedKnowledge = hasEmbeddedKnowledgePayload(knowledgeData);

    // In compact / compare layouts, prefer the scoped section export so the panel
    // shows just the declaration under the cursor (matches AppPage side-panel focus
    // without rendering the whole chapter document in a cramped half-column).
    const preferScopedExportInCompact =
        panelDensity === 'compact' && scopedKnowledgeExport?.sections?.length;
    const preferEmbeddedInCompact =
        panelDensity === 'compact' &&
        !scopedKnowledgeExport?.sections?.length &&
        hasEmbeddedKnowledge;

    if (mode === 'knowledge' || knowledgeOnlyTrack) {
        if (preferScopedExportInCompact) {
            return (
                <TurnVideoKnowledgePanel
                    heading={track?.knowledgePanel?.heading ?? 'Knowledge'}
                    inlineExport={scopedKnowledgeExport}
                    items={track?.knowledgePanel?.items ?? []}
                    visibleSource={visibleSource}
                    typingComplete={showKnowledge}
                    activeKnowledgeHighlights={knowledgeHighlights}
                    knowledgeHighlightOverlays={resolvedKnowledgeOverlays}
                    density={panelDensity}
                    scale={scale}
                />
            );
        }

        if (preferEmbeddedInCompact) {
            return (
                <TurnVideoEmbeddedSidePanel
                    mode="knowledge"
                    knowledgeData={knowledgeData}
                    cursorLine={focusLine}
                    scale={scale}
                />
            );
        }

        if (showKnowledge && hasEmbeddedKnowledge) {
            return (
                <TurnVideoEmbeddedSidePanel
                    mode="knowledge"
                    knowledgeData={knowledgeData}
                    cursorLine={focusLine}
                    scale={scale}
                />
            );
        }

        if (knowledgePanelExport) {
            return (
                <TurnVideoKnowledgePanel
                    heading={track?.knowledgePanel?.heading ?? 'Knowledge'}
                    inlineExport={knowledgePanelExport}
                    items={track?.knowledgePanel?.items ?? []}
                    visibleSource={visibleSource}
                    typingComplete={showKnowledge}
                    activeKnowledgeHighlights={knowledgeHighlights}
                    knowledgeHighlightOverlays={resolvedKnowledgeOverlays}
                    density={panelDensity}
                    scale={scale}
                />
            );
        }

        return (
            <TurnVideoKnowledgePanel
                heading={track?.knowledgePanel?.heading ?? 'Knowledge'}
                inlineExport={knowledgeExport}
                items={track?.knowledgePanel?.items ?? []}
                visibleSource={visibleSource}
                typingComplete={showKnowledge}
                activeKnowledgeHighlights={knowledgeHighlights}
                knowledgeHighlightOverlays={resolvedKnowledgeOverlays}
                density={panelDensity}
                scale={scale}
            />
        );
    }

    const useEmbeddedProof =
        hasEmbeddedProofPayload(visualizationData) && !trackHasProofStepScrub(track);

    if (useEmbeddedProof) {
        return (
            <TurnVideoEmbeddedSidePanel
                mode="proof"
                visualizationData={visualizationData}
                scale={scale}
            />
        );
    }

    return (
        <TurnVideoProofPanel
            heading="Proof"
            inlineExport={proofExport}
            track={track}
            fallbackSteps={track?.proofPanel?.steps ?? []}
            activeStepIndex={resolvedProofIndex}
            scale={scale}
        />
    );
}
