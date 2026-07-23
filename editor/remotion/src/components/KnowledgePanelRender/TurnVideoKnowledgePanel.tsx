// /Users/johndoe/Documents/company/basic_ui/src/shared/turn-video/panels/TurnVideoKnowledgePanel.tsx
import { useMemo, useRef } from 'react';
import type React from 'react';
import { MathJaxProvider } from '@yozora/react-mathjax';

import type { KnowledgeUiPhrases } from '@turn-user/language_server/vscode_extension/src/visualization/knowledge/types';

import { KnowledgeSectionView } from '@turn-user/language_server/vscode_extension/src/visualization/knowledge/app';
import { createVideoKnowledgeRenderContext } from '../../lib/panels/createVideoKnowledgeRenderContext';
import '../../lib/panels/turnVideoPanelStyles';
import { revealedKnowledgeSections } from '../../lib/panels/knowledgeRevealFromSource';
import type {
    KnowledgePanelExport,
    KnowledgePanelItemExport,
    KnowledgeSectionExport,
} from '../../lib/panels/panelExportTypes';
import {
    DEFAULT_VIDEO_PANEL_SCALE,
    type TurnVideoPanelScale,
    videoKnowledgePanelStyle,
} from '../ProofPanelRender/videoProofRender';
import { KNOWLEDGE_PANEL_CHROME, knowledgePanelThemeClass } from './knowledgePanelChrome';
import { COMPARE_KNOWLEDGE_DOC_TYPESET_SCALE } from '../../lib/tracks/compareTypography';
import type { HighlightOverlay } from '../../lib/panels/highlightTransition';
import { useKnowledgePanelHighlights } from './useKnowledgePanelHighlights';

const KnowledgeSectionViewHost = KnowledgeSectionView as unknown as React.ComponentType<{
    section: KnowledgeSectionExport;
    ctx: ReturnType<typeof createVideoKnowledgeRenderContext>;
}>;

type TurnVideoKnowledgePanelProps = {
    heading?: string;
    inlineExport?: KnowledgePanelExport | null;
    items?: KnowledgePanelItemExport[];
    activeIndex?: number;
    visibleSource?: string;
    typingComplete?: boolean;
    revealFromSource?: boolean;
    /** Terms to pulse in the rendered knowledge DOM (caption sync). */
    activeKnowledgeHighlights?: string[];
    /** Fading overlays (Remotion caption beats). */
    knowledgeHighlightOverlays?: HighlightOverlay[];
    /** `compact` matches /app side-panel density in compare layouts. */
    density?: 'default' | 'compact';
    scale?: TurnVideoPanelScale;
};

function sectionsFromExport(loaded: KnowledgePanelExport | null): KnowledgeSectionExport[] {
    if (!loaded) {
        return [];
    }
    if (Array.isArray(loaded.sections) && loaded.sections.length > 0) {
        return loaded.sections;
    }
    return (loaded.items ?? [])
        .map((item) => item.section)
        .filter((section): section is KnowledgeSectionExport => section != null);
}

/** Fallback when full LSP `KnowledgeData` is unavailable — section cards only. */
export function TurnVideoKnowledgePanel({
    heading: _heading = 'Knowledge',
    inlineExport = null,
    items = [],
    activeIndex: _activeIndex = -1,
    visibleSource = '',
    typingComplete = true,
    revealFromSource = false,
    activeKnowledgeHighlights = [],
    knowledgeHighlightOverlays,
    density = 'default',
    scale = DEFAULT_VIDEO_PANEL_SCALE,
}: TurnVideoKnowledgePanelProps) {
    const loaded = inlineExport;
    const paneRef = useRef<HTMLDivElement | null>(null);
    const highlightOverlays = useMemo((): HighlightOverlay[] => {
        if (knowledgeHighlightOverlays && knowledgeHighlightOverlays.length > 0) {
            return knowledgeHighlightOverlays;
        }
        return activeKnowledgeHighlights.map((text) => ({ text, opacity: 1 }));
    }, [activeKnowledgeHighlights, knowledgeHighlightOverlays]);
    useKnowledgePanelHighlights(paneRef, highlightOverlays);

    const ctx = useMemo(
        () =>
            createVideoKnowledgeRenderContext(
                loaded?.sources ?? null,
                (loaded as { ui_phrases?: KnowledgeUiPhrases | null } | null)?.ui_phrases ?? null,
            ),
        [loaded],
    );

    const sections = useMemo(() => {
        if (!typingComplete) {
            return [];
        }
        const fromExport = sectionsFromExport(loaded);
        const base =
            fromExport.length > 0
                ? fromExport
                : items
                        .map((item) => item.section)
                        .filter((section): section is KnowledgeSectionExport => section != null);
        if (revealFromSource) {
            return revealedKnowledgeSections(base, visibleSource);
        }
        return base;
    }, [loaded, items, typingComplete, revealFromSource, visibleSource]);

    const themeClass = knowledgePanelThemeClass();
    const baseTypography = videoKnowledgePanelStyle(scale, density);
    const panelTypography =
        density === 'compact'
            ? {
                  ...baseTypography,
                  fontSize: scale.codeFontSize,
                  lineHeight: 1.42,
                  ['--doc-typeset-scale' as string]: String(COMPARE_KNOWLEDGE_DOC_TYPESET_SCALE),
                  ['--doc-prose-leading' as string]: '1.44',
              }
            : baseTypography;
    const panePadY = density === 'compact' ? scale.px(4) : scale.px(6);
    const panePadX = density === 'compact' ? scale.px(6) : scale.px(8);

    const readerContent =
        sections.length > 0 ? (
            <MathJaxProvider>
                <div className="documentReaderShell documentReaderShellNoNavigator">
                    <div className="documentReaderMain documentReaderMain--continuous">
                        <div
                            className="doc"
                            style={
                                density === 'compact'
                                    ? {
                                          padding: `${scale.px(8)}px ${scale.px(10)}px ${scale.px(10)}px`,
                                          margin: 0,
                                      }
                                    : undefined
                            }
                        >
                            {sections.map((section) => (
                                <KnowledgeSectionViewHost
                                    key={section.id ?? section.title?.segments?.[0]?.Text}
                                    section={section}
                                    ctx={ctx}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </MathJaxProvider>
        ) : null;

    return (
        <div
            className={`knowledge-view theme-textbook ${themeClass}`}
            data-layout-mode="continuous"
            style={{
                flex: 1,
                minHeight: 0,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                colorScheme: KNOWLEDGE_PANEL_CHROME,
                ...panelTypography,
            }}
        >
            <div
                ref={paneRef}
                className="pane renderedPane compare-pane-scroll"
                style={{
                    flex: 1,
                    minHeight: 0,
                    overflow: 'auto',
                    padding: `${panePadY}px ${panePadX}px`,
                }}
            >
                {readerContent}
            </div>
        </div>
    );
}

export type {
    KnowledgePanelExport,
    KnowledgePanelItemExport,
    KnowledgeSectionExport,
} from '../../lib/panels/panelExportTypes';
