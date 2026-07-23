// /Users/johndoe/Documents/company/basic_ui/video_ops/remotion/src/components/SidePanelFromTrack.tsx
import { continueRender, delayRender, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import classes from './SidePanelFromTrack.module.scss';
import { useEffect, useLayoutEffect, useMemo, useState } from 'react';

import { TurnVideoSidePanel } from './TurnVideoSidePanel';
import type { VisualizationData } from '@turn-user/language_server/vscode_extension/src/visualization/ast/types';
import type { KnowledgeData } from '@turn-user/language_server/vscode_extension/src/visualization/knowledge/types';
import { knowledgeDataForTurnSource } from '../../lib/tracks/turnSnippetKnowledgeCache';
import { fetchVideoOpsStaticJson } from '../../lib/studio/fetchVideoOpsStatic';

import { loadIdeTrack, type TrackLoadOptions } from '../../lib/tracks/loadIdeTrack';
import type { IdeTrack } from '../../lib/tracks/ideTrackTypes';
import {
    activeBeatCodeSegment,
    activeIdeFocusSegment,
    isIdeTypingComplete,
    resolveFocusedSourceDisplay,
    typingSnippetFromTrack,
} from '../../lib/tracks/ideTrackTypes';
import type { KnowledgePanelExport } from '../KnowledgePanelRender/KnowledgePanelRender';
import type { ProofPanelExport } from '../ProofPanelRender/ProofPanelRender';
import { useCompositionScale } from '../../lib/layout/useCompositionScale';
import { staticPathForScriptAsset } from '../../lib/assets/scriptAssetPath';
import { compareBodyFontSize } from '../../lib/tracks/compareTypography';

type SidePanelFromTrackProps = {
    scriptId: string;
    trackPath: string;
    /** Multiply panel typography in compact compare layouts. */
    fontScale?: number;
    /** When true, use /app side-panel density (compare scene). */
    compact?: boolean;
    trackLoad?: TrackLoadOptions;
};

async function fetchJsonAsset<T>(
    scriptId: string,
    relativePath: string,
    contentRevision?: number,
): Promise<T | null> {
    return fetchVideoOpsStaticJson<T>(staticPathForScriptAsset(scriptId, relativePath), staticFile, {
        cacheBust: contentRevision,
    });
}

async function fetchPublicJson<T>(relativePath: string): Promise<T | null> {
    return fetchVideoOpsStaticJson<T>(relativePath, staticFile);
}

export function SidePanelFromTrack({
    scriptId,
    trackPath,
    fontScale = 1,
    compact = false,
    trackLoad,
}: SidePanelFromTrackProps) {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    const s = useCompositionScale();
    const [track, setTrack] = useState<IdeTrack | null>(null);
    const [fullSource, setFullSource] = useState('');
    const [renderSource, setRenderSource] = useState('');
    const [typingSnippet, setTypingSnippet] = useState('');
    const [knowledgeExport, setKnowledgeExport] = useState<KnowledgePanelExport | null>(null);
    const [proofExport, setProofExport] = useState<ProofPanelExport | null>(null);
    const [visualizationData, setVisualizationData] = useState<VisualizationData | null>(null);
    const [knowledgeData, setKnowledgeData] = useState<KnowledgeData | null>(null);
    const [knowledgeLoading, setKnowledgeLoading] = useState(false);
    const [panelReady, setPanelReady] = useState(false);
    const [handle] = useState(() =>
        delayRender(`side-track:${scriptId}:${trackPath}`, {
            timeoutInMilliseconds: 180_000,
        }),
    );

    useEffect(() => {
        let cancelled = false;
        setPanelReady(false);

        async function loadSidePanelData() {
            try {
                const loaded = await loadIdeTrack(scriptId, trackPath, trackLoad);
                if (!loaded || cancelled) {
                    return;
                }
                setTrack(loaded.track);
                setFullSource(loaded.fullSource);
                setRenderSource(loaded.renderSource);
                setTypingSnippet(loaded.typingSnippet);

                const knowledgePath = loaded.track.knowledgePanel?.exportPath;
                if (knowledgePath) {
                    setKnowledgeExport(
                        await fetchJsonAsset<KnowledgePanelExport>(
                            scriptId,
                            knowledgePath,
                            trackLoad?.contentRevision,
                        ),
                    );
                }

                const knowledgeDataPath = loaded.track.knowledgePanel?.knowledgeDataPath;
                if (knowledgeDataPath) {
                    setKnowledgeData(
                        await fetchJsonAsset<KnowledgeData>(
                            scriptId,
                            knowledgeDataPath,
                            trackLoad?.contentRevision,
                        ),
                    );
                }
                // generateFromSource knowledge is loaded in the effect below so WASM
                // analysis never blocks delayRender for the whole composition.

                const proofPath = loaded.track.proofPanel?.exportPath;
                if (proofPath) {
                    setProofExport(await fetchJsonAsset<ProofPanelExport>(scriptId, proofPath));
                }

                const visualizationDataPath = loaded.track.proofPanel?.visualizationDataPath;
                if (visualizationDataPath) {
                    setVisualizationData(
                        await fetchJsonAsset<VisualizationData>(scriptId, visualizationDataPath),
                    );
                }
            } catch {
                // Keep fallback items when exports are missing.
            } finally {
                if (!cancelled) {
                    setPanelReady(true);
                }
            }
        }

        void loadSidePanelData();

        return () => {
            cancelled = true;
        };
    }, [scriptId, trackLoad?.contentRevision, trackLoad?.inlineTrack, trackPath]);

    useLayoutEffect(() => {
        if (panelReady) {
            continueRender(handle);
        }
    }, [handle, panelReady]);

    const seconds = frame / fps;
    const beatCode = useMemo(
        () => activeBeatCodeSegment(track, seconds),
        [track, seconds],
    );

    const snippet = beatCode?.code || typingSnippet || typingSnippetFromTrack(track);
    const charsPerSecond = track?.typing?.charsPerSecond ?? 28;
    const visibleSnippetChars = Math.min(snippet.length, Math.floor((frame / fps) * charsPerSecond));

    const focusedSource = useMemo(
        () =>
            resolveFocusedSourceDisplay(
                fullSource,
                track,
                seconds,
                renderSource || snippet,
            ).text,
        [fullSource, track, seconds, renderSource, snippet],
    );

    useEffect(() => {
        if (!track?.knowledgePanel?.generateFromSource) {
            return;
        }
        const analysisSource = beatCode?.code ?? (fullSource.length > 0 ? fullSource : renderSource);
        if (!analysisSource) {
            return;
        }

        let cancelled = false;
        setKnowledgeLoading(true);
        void knowledgeDataForTurnSource(track.sourceFile, analysisSource, {
            fetchJson: fetchPublicJson,
        })
            .then((generatedKnowledgeData) => {
                if (!cancelled) {
                    setKnowledgeData(generatedKnowledgeData);
                }
            })
            .finally(() => {
                if (!cancelled) {
                    setKnowledgeLoading(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [track, beatCode?.code, fullSource, renderSource]);

    const focusedTrack = useMemo((): IdeTrack | null => {
        if (!track) {
            return null;
        }
        if (beatCode) {
            return {
                ...track,
                knowledgePanel: {
                    ...track.knowledgePanel,
                    focusLine: 1,
                    scopedToSource: true,
                },
            };
        }
        const segment = activeIdeFocusSegment(track, seconds);
        if (!segment) {
            return track;
        }
        return {
            ...track,
            sourceRange: { startLine: segment.startLine, endLine: segment.endLine },
            knowledgePanel: {
                ...track.knowledgePanel,
                focusLine: segment.focusLine ?? segment.startLine,
                scopedToSource: true,
            },
        };
    }, [track, beatCode, seconds]);

    const typingComplete = isIdeTypingComplete(snippet, visibleSnippetChars);

    const panelScale = useMemo(
        () => ({
            px: (value: number) => s.px(value * fontScale),
            codeFontSize: compact
                ? Math.round(compareBodyFontSize(s.codeFontSize) * fontScale)
                : Math.round(s.codeFontSize * fontScale),
            tabFontSize: Math.round(s.tabFontSize * fontScale),
            knowledgeTypesetScale: compact ? 1 : 2.05 * fontScale,
        }),
        [s.px, s.codeFontSize, s.tabFontSize, fontScale, compact],
    );

    if (knowledgeLoading && track?.knowledgePanel?.generateFromSource && !knowledgeData) {
        return (
            <div
                className={classes.root}
                style={{
                    fontSize: Math.round(compareBodyFontSize(s.codeFontSize) * fontScale * 0.85),
                }}
            >
                Loading knowledge…
            </div>
        );
    }

    return (
        <div className={classes.panelHost}>
            <TurnVideoSidePanel
                visibleSource={focusedSource}
                track={focusedTrack}
                knowledgeExport={knowledgeExport}
                proofExport={proofExport}
                visualizationData={visualizationData}
                knowledgeData={knowledgeData}
                proofSeconds={frame / fps}
                frame={frame}
                fps={fps}
                typingComplete={typingComplete}
                scale={panelScale}
                panelDensity={compact ? 'compact' : 'default'}
            />
        </div>
    );
}
