// /Users/johndoe/Documents/company/basic_ui/video_ops/remotion/src/components/universal/SplitReceipt.tsx
import { continueRender, delayRender, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { useEffect, useMemo, useState } from 'react';

import {
    KnowledgePanelRender,
    type KnowledgePanelExport,
} from '../KnowledgePanelRender';
import { ProofPanelRender, type ProofPanelExport } from '../ProofPanelRender';
import { TurnCodeFromTrack } from '../TurnCodeFromTrack';
import { TurnVideoFrame } from '../TurnVideoFrame';
import { loadIdeTrack, type LoadedIdeTrack } from '../../lib/loadIdeTrack';
import type { IdeTrack } from '../../lib/ideTrackTypes';
import { isIdeTypingComplete, typingSnippetFromTrack } from '../../lib/ideTrackTypes';
import { TURN_VIDEO_THEME } from '../../lib/turnVideoTheme';
import { useCompositionScale } from '../../lib/useCompositionScale';
import { staticPathForScriptAsset } from '../../lib/scriptAssetPath';

type SplitReceiptProps = {
    scriptId: string;
    leftHeading?: string;
    rightHeading?: string;
    knowledgeExportPath?: string;
    proofExportPath?: string;
    /** IDE track driving the source editor + proof step scrubbing (defaults from proof export path). */
    ideTrackPath?: string;
    leftSectionIds?: string[];
};

function defaultIdeTrackPath(proofExportPath: string): string {
    if (proofExportPath.endsWith('-proof.json')) {
        return proofExportPath.replace('-proof.json', '-ide.json');
    }
    return proofExportPath.replace(/proof\.json$/, 'ide.json');
}

export function SplitReceipt({
    scriptId,
    leftHeading = 'Partition laws',
    rightHeading = 'Theorem receipt',
    knowledgeExportPath = 'tracks/scene-2-knowledge.json',
    proofExportPath = 'tracks/scene-3-proof.json',
    ideTrackPath,
    leftSectionIds = ['partition-disjoint', 'partition-cover'],
}: SplitReceiptProps) {
    const t = TURN_VIDEO_THEME;
    const s = useCompositionScale();
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const resolvedIdeTrackPath = ideTrackPath ?? defaultIdeTrackPath(proofExportPath);

    const [knowledgeExport, setKnowledgeExport] = useState<KnowledgePanelExport | null>(null);
    const [proofExport, setProofExport] = useState<ProofPanelExport | null>(null);
    const [ideTrack, setIdeTrack] = useState<LoadedIdeTrack | null>(null);
    const [handle] = useState(() => delayRender(`split-receipt:${scriptId}`));

    useEffect(() => {
        let cancelled = false;

        async function loadReceiptData() {
            try {
                const [knowledgeResponse, proofResponse, loadedTrack] = await Promise.all([
                    fetch(staticFile(staticPathForScriptAsset(scriptId, knowledgeExportPath))),
                    fetch(staticFile(staticPathForScriptAsset(scriptId, proofExportPath))),
                    loadIdeTrack(scriptId, resolvedIdeTrackPath),
                ]);
                if (!cancelled && knowledgeResponse.ok) {
                    setKnowledgeExport((await knowledgeResponse.json()) as KnowledgePanelExport);
                }
                if (!cancelled && proofResponse.ok) {
                    setProofExport((await proofResponse.json()) as ProofPanelExport);
                }
                if (!cancelled && loadedTrack) {
                    setIdeTrack(loadedTrack);
                }
            } finally {
                if (!cancelled) {
                    continueRender(handle);
                }
            }
        }

        void loadReceiptData();
        return () => {
            cancelled = true;
        };
    }, [handle, knowledgeExportPath, proofExportPath, resolvedIdeTrackPath, scriptId]);

    const leftExport = useMemo(() => {
        if (!knowledgeExport?.sections) {
            return knowledgeExport;
        }
        const filtered = knowledgeExport.sections.filter((section) =>
            leftSectionIds.includes(section.id ?? ''),
        );
        return { ...knowledgeExport, sections: filtered.length > 0 ? filtered : knowledgeExport.sections };
    }, [knowledgeExport, leftSectionIds]);

    const snippet = ideTrack?.typingSnippet ?? typingSnippetFromTrack(ideTrack?.track ?? null);
    const charsPerSecond = ideTrack?.track.typing?.charsPerSecond ?? 28;
    const visibleSnippetChars = Math.min(snippet.length, Math.floor((frame / fps) * charsPerSecond));
    const typingComplete = isIdeTypingComplete(snippet, visibleSnippetChars);

    const proofTrack = useMemo((): IdeTrack | null => {
        if (!ideTrack?.track) {
            return null;
        }
        // Receipt scene: hold the opening goal while the editor types the theorem source.
        return {
            ...ideTrack.track,
            proofPanel: {
                exportPath: proofExportPath,
                steps: ideTrack.track.proofPanel?.steps ?? [],
            },
            interactions: [],
        };
    }, [ideTrack, proofExportPath]);

    const leftEntrance = spring({ frame, fps, config: { damping: 20, stiffness: 90 } });
    const rightEntrance = spring({ frame: Math.max(0, frame - 8), fps, config: { damping: 20, stiffness: 90 } });
    const bridgeOpacity = interpolate(frame, [20, 35], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

    const panelShell = {
        flex: 1,
        minWidth: 0,
        minHeight: 0,
        display: 'flex' as const,
        flexDirection: 'column' as const,
        borderRadius: s.px(16),
        overflow: 'hidden' as const,
        background: 'rgba(255, 255, 255, 0.9)',
        border: `1px solid ${t.ide.windowBorder}`,
        boxShadow: t.ide.windowShadow,
    };

    const receiptColumn = (
        <div
            style={{
                flex: 1,
                minHeight: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: s.px(12),
            }}
        >
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: s.px(14),
                    flexShrink: 0,
                    paddingLeft: s.px(4),
                }}
            >
                <span
                    style={{
                        fontSize: s.px(22),
                        fontWeight: 750,
                        color: t.syntax.plain,
                        letterSpacing: '-0.02em',
                    }}
                >
                    Turn-Lang
                </span>
                <span style={{ fontSize: s.px(14), color: t.mathBoard.muted }}>Define once → spread → prove</span>
            </div>
            <div
                style={{
                    flex: 1,
                    minHeight: 0,
                    display: 'flex',
                    gap: s.px(16),
                    alignItems: 'stretch',
                }}
            >
                <div
                    style={{
                        ...panelShell,
                        transform: `translateX(${interpolate(leftEntrance, [0, 1], [-s.px(40), 0])}px)`,
                        opacity: leftEntrance,
                    }}
                >
                    <div
                        style={{
                            padding: `${s.px(14)}px ${s.px(18)}px`,
                            fontSize: s.px(14),
                            fontWeight: 800,
                            letterSpacing: '0.1em',
                            textTransform: 'uppercase',
                            color: t.mathBoard.accentBlue,
                            borderBottom: `1px solid ${t.ide.windowBorder}`,
                            flexShrink: 0,
                        }}
                    >
                        {leftHeading}
                    </div>
                    <div style={{ flex: 1, minHeight: 0 }}>
                        <KnowledgePanelRender
                            scriptId={scriptId}
                            heading=""
                            inlineExport={leftExport}
                            typingComplete={typingComplete}
                        />
                    </div>
                </div>

                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        opacity: bridgeOpacity,
                    }}
                >
                    <div
                        style={{
                            fontSize: s.px(28),
                            color: t.mathBoard.accentGold,
                            fontWeight: 700,
                        }}
                    >
                        →
                    </div>
                </div>

                <div
                    style={{
                        ...panelShell,
                        transform: `translateX(${interpolate(rightEntrance, [0, 1], [s.px(40), 0])}px)`,
                        opacity: rightEntrance,
                    }}
                >
                    <div
                        style={{
                            padding: `${s.px(14)}px ${s.px(18)}px`,
                            fontSize: s.px(14),
                            fontWeight: 800,
                            letterSpacing: '0.1em',
                            textTransform: 'uppercase',
                            color: t.accent.claude,
                            borderBottom: `1px solid ${t.ide.windowBorder}`,
                            flexShrink: 0,
                        }}
                    >
                        {rightHeading}
                    </div>
                    <div style={{ flex: 1, minHeight: 0 }}>
                        <ProofPanelRender
                            heading=""
                            inlineExport={proofExport}
                            track={proofTrack}
                        />
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <TurnVideoFrame
            main={
                <TurnCodeFromTrack
                    scriptId={scriptId}
                    trackPath={resolvedIdeTrackPath}
                    fontSize={s.codeFontSize}
                    minFontSize={s.codeFontSizeMin}
                    viewportHeight={s.codeViewportHeight}
                />
            }
            side={receiptColumn}
        />
    );
}
