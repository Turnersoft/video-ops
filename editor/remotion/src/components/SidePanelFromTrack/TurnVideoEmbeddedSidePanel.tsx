// /Users/johndoe/Documents/company/basic_ui/src/shared/turn-video/panels/TurnVideoEmbeddedSidePanel.tsx
import { MathJaxProvider } from '@yozora/react-mathjax';
import { useMemo } from 'react';
import type React from 'react';

import { EmbeddedKnowledgePanel as ExternalEmbeddedKnowledgePanel } from '@turn-user/language_server/vscode_extension/src/visualization/knowledge/embedded';
import { EmbeddedProofPanel as ExternalEmbeddedProofPanel } from '@turn-user/language_server/vscode_extension/src/visualization/proof/embedded';
import type { VisualizationData } from '@turn-user/language_server/vscode_extension/src/visualization/ast/types';
import type { KnowledgeData } from '@turn-user/language_server/vscode_extension/src/visualization/knowledge/types';
import type { EmbeddedVisualizationHost } from '@turn-user/language_server/vscode_extension/src/visualization/ast/vscode';

import { createVideoVisualizationHost } from '../../lib/panels/createVideoVisualizationHost';
import '../../lib/panels/turnVideoPanelStyles';
import { KNOWLEDGE_PANEL_CHROME } from '../KnowledgePanelRender/knowledgePanelChrome';
import { PROOF_PANEL_CHROME } from '../ProofPanelRender/proofPanelChrome';
import type { TurnVideoPanelScale } from '../ProofPanelRender/videoProofRender';
import { DEFAULT_VIDEO_PANEL_SCALE } from '../ProofPanelRender/videoProofRender';

const EmbeddedKnowledgePanel = ExternalEmbeddedKnowledgePanel as unknown as React.ComponentType<{
    host: EmbeddedVisualizationHost;
    data: KnowledgeData | null;
    cursor?: {
        filePath: string;
        line: number;
        col: number;
        sources?: unknown;
    } | null;
    chromeTheme?: 'light' | 'dark';
}>;

const EmbeddedProofPanel = ExternalEmbeddedProofPanel as unknown as React.ComponentType<{
    host: EmbeddedVisualizationHost;
    data: VisualizationData | null;
    chromeTheme?: 'light' | 'dark';
}>;

type TurnVideoEmbeddedSidePanelProps = {
    mode: 'proof' | 'knowledge';
    visualizationData?: VisualizationData | null;
    knowledgeData?: KnowledgeData | null;
    /** 1-based editor line — scrolls knowledge reader to matching declaration. */
    cursorLine?: number;
    scale?: TurnVideoPanelScale;
};

/** Matches /app `knowledge_tab_stack` flex shell around embedded panels. */
const tabStackStyle = {
    display: 'flex',
    flexDirection: 'column' as const,
    minHeight: 0,
    flex: 1,
    height: '100%',
    overflow: 'hidden',
};

const tabStackChildStyle = {
    flex: 1,
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column' as const,
    overflow: 'hidden',
};

/**
 * Renders the same embedded panels as `/app` turn-side-panels (non-interactive).
 * Used when track JSON includes full LSP payloads from export tooling.
 */
export function TurnVideoEmbeddedSidePanel({
    mode,
    visualizationData = null,
    knowledgeData = null,
    cursorLine,
    scale = DEFAULT_VIDEO_PANEL_SCALE,
}: TurnVideoEmbeddedSidePanelProps) {
    const host = useMemo(() => createVideoVisualizationHost(), []);

    const nestedInCompare = (scale.knowledgeTypesetScale ?? 1.95) <= 1.05;

    const shellStyle = {
        ...tabStackStyle,
        fontSize: scale.codeFontSize,
        ...(nestedInCompare ? {} : { borderRadius: scale.px(18) }),
    };

    const knowledgeCursor = useMemo(() => {
        if (!knowledgeData?.file?.document || cursorLine == null || cursorLine < 1) {
            return null;
        }
        const filePath =
            typeof knowledgeData.file.file_path === 'string' ? knowledgeData.file.file_path : '';
        return {
            filePath,
            line: cursorLine,
            col: 0,
            sources: knowledgeData.sources,
        };
    }, [cursorLine, knowledgeData]);

    if (mode === 'knowledge' && knowledgeData?.file?.document) {
        return (
            <div style={shellStyle}>
                <div style={tabStackChildStyle}>
                    <MathJaxProvider>
                        <EmbeddedKnowledgePanel
                            host={host}
                            data={knowledgeData}
                            cursor={knowledgeCursor}
                            chromeTheme={KNOWLEDGE_PANEL_CHROME}
                        />
                    </MathJaxProvider>
                </div>
            </div>
        );
    }

    if (mode === 'proof' && visualizationData) {
        return (
            <div style={shellStyle}>
                <div style={tabStackChildStyle}>
                    <MathJaxProvider>
                        <EmbeddedProofPanel
                            host={host}
                            data={visualizationData}
                            chromeTheme={PROOF_PANEL_CHROME}
                        />
                    </MathJaxProvider>
                </div>
            </div>
        );
    }

    return null;
}

export function hasEmbeddedKnowledgePayload(data: KnowledgeData | null | undefined): boolean {
    return Boolean(data?.file?.document);
}

export function hasEmbeddedProofPayload(data: VisualizationData | null | undefined): boolean {
    return Boolean(data?.proof_panel || data?.file?.nodes?.length || data?.nodes?.length);
}
