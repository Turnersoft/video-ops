// /Users/johndoe/Documents/company/basic_ui/video_ops/remotion/src/components/universal/VideoOpsCoverCard.tsx
import {
    COVER_SHARED_BACKGROUND,
    COVER_SHARED_FIREWORKS,
    COVER_SHARED_LEAN,
    COVER_SHARED_SERIES_TITLE,
    COVER_SHARED_TURN,
} from '@turn-video-shared/coverAssetPaths';
import {
    coverAspectFromSize,
    resolveCoverLayout,
    type CoverLayerBox,
    type CoverLayerId,
} from '@turn-video-shared/coverLayout';
import {
    mergeCoverOverrides,
    persistCoverLayoutToFile,
    readCoverOverrideFromStorage,
    writeCoverOverrideToStorage,
} from '@turn-video-shared/ide/persistCoverLayout';
import {
    mergeVideoOpsCoverOverride,
    resolveVideoOpsCover,
    type VideoOpsCoverOverride,
} from '@turn-video-shared/videoOpsCover';
import {
    AbsoluteFill,
    Easing,
    getRemotionEnvironment,
    Img,
    interpolate,
    staticFile,
    useCurrentFrame,
    useVideoConfig,
} from 'remotion';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useCompositionScale } from '../../lib/useCompositionScale';
import { ConceptCoverDiagram } from './ConceptCoverDiagram';
import { CoverEditableLayer } from './CoverEditableLayer';
import { COVER_LAYER_LABELS, CoverEditorControls } from './CoverEditorControls';
import { CoverEpisodeTitle } from './CoverEpisodeTitle';
import { CroppedSvgImage } from './CroppedSvgImage';

type VideoOpsCoverCardProps = {
    scriptId: string;
    cover?: VideoOpsCoverOverride;
};

/** Real "LEAN" wordmark occupies only this pixel box inside the full `lean.svg` canvas. */
const LEAN_LOGO_CROP_BOX = {
    canvasWidth: 472.5,
    canvasHeight: 258.749997,
    x0: 158.351562,
    x1: 270.734375,
    y0: 142.324219,
    y1: 189.523438,
};

function VsBadge({ enter }: { enter: number }) {
    const s = useCompositionScale();
    return (
        <div
            style={{
                opacity: enter,
                scale: interpolate(enter, [0, 1], [0.6, 1]),
                fontFamily: 'Impact, Haettenschweiler, sans-serif',
                fontSize: s.px(46),
                fontWeight: 900,
                fontStyle: 'italic',
                letterSpacing: '-0.04em',
                color: '#ffffff',
                WebkitTextStroke: `${Math.max(2, s.px(2.5))}px #111827`,
                textShadow: `${s.px(2)}px ${s.px(2)}px 0 #dc2626, ${s.px(-2)}px ${s.px(-2)}px 0 #2563eb`,
                lineHeight: 1,
                margin: `${s.px(6)}px 0`,
                flexShrink: 0,
            }}
        >
            VS
        </div>
    );
}

export function VideoOpsCoverCard({ scriptId, cover: coverFromFile }: VideoOpsCoverCardProps) {
    const frame = useCurrentFrame();
    const { fps, width, height } = useVideoConfig();
    const s = useCompositionScale();
    const remotionEnv = getRemotionEnvironment();
    const canEdit = !remotionEnv.isRendering && (remotionEnv.isStudio || remotionEnv.isPlayer);

    const [editorCover, setEditorCover] = useState<VideoOpsCoverOverride>(() =>
        mergeCoverOverrides(coverFromFile, readCoverOverrideFromStorage(scriptId)),
    );
    const [selectedLayer, setSelectedLayer] = useState<CoverLayerId | null>('episodeTitle');
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const editorCoverRef = useRef(editorCover);
    editorCoverRef.current = editorCover;

    useEffect(() => {
        setEditorCover(mergeCoverOverrides(coverFromFile, readCoverOverrideFromStorage(scriptId)));
    }, [coverFromFile, scriptId]);

    useEffect(() => {
        return () => {
            if (persistTimerRef.current) {
                clearTimeout(persistTimerRef.current);
            }
        };
    }, []);

    const flushPersist = useCallback(
        (cover: VideoOpsCoverOverride) => {
            if (persistTimerRef.current) {
                clearTimeout(persistTimerRef.current);
                persistTimerRef.current = null;
            }
            setSaveStatus('saving');
            void persistCoverLayoutToFile(scriptId, cover).then((saved) => {
                if (saved) {
                    setSaveStatus('saved');
                    setEditorCover(saved);
                    writeCoverOverrideToStorage(scriptId, saved);
                } else {
                    setSaveStatus('error');
                }
            });
        },
        [scriptId],
    );

    const schedulePersist = useCallback(
        (cover: VideoOpsCoverOverride) => {
            if (persistTimerRef.current) {
                clearTimeout(persistTimerRef.current);
            }
            persistTimerRef.current = setTimeout(() => {
                flushPersist(cover);
            }, 350);
        },
        [flushPersist],
    );

    const patchEditorCover = useCallback(
        (patch: VideoOpsCoverOverride) => {
            setEditorCover((previous) => {
                const next = mergeVideoOpsCoverOverride(previous, patch);
                writeCoverOverrideToStorage(scriptId, next);
                schedulePersist(next);
                return next;
            });
        },
        [schedulePersist, scriptId],
    );

    const onBoxChange = useCallback(
        (layerId: CoverLayerId, box: CoverLayerBox) => {
            patchEditorCover({ layers: { [layerId]: box } });
        },
        [patchEditorCover],
    );

    const onBoxCommit = useCallback(() => {
        flushPersist(editorCoverRef.current);
    }, [flushPersist]);

    const aspect = coverAspectFromSize(width, height);
    const layout = resolveCoverLayout(aspect, editorCover.layers);
    const spec = resolveVideoOpsCover(scriptId, editorCover);
    const isPortrait = height > width;
    const titleStyle = editorCover.episodeTitleStyle ?? {};

    const layerBox = useMemo(
        () => ({
            seriesTitle: layout.seriesTitle,
            logoCluster: layout.logoCluster,
            concept: layout.concept,
            episodeTitle: layout.episodeTitle,
        }),
        [layout],
    );

    const bgScale = interpolate(frame, [0, fps * 1.2], [1.08, 1], {
        extrapolateRight: 'clamp',
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    });
    const bgOpacity = interpolate(frame, [0, fps * 0.35], [0, 1], {
        extrapolateRight: 'clamp',
    });

    const fireworksOpacity = interpolate(
        frame,
        [fps * 0.15, fps * 0.5, fps * 2.2, fps * 3.6],
        [0, 0.95, 0.75, 0.55],
        { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
    );
    const fireworksPulse =
        1 +
        Math.sin((frame / fps) * Math.PI * 2.2) * 0.04 +
        interpolate(frame, [fps * 0.4, fps * 0.9], [0.08, 0], { extrapolateRight: 'clamp' });

    const seriesEnter = interpolate(frame, [fps * 0.1, fps * 0.65], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
        easing: Easing.bezier(0.16, 1, 0.3, 1),
    });
    const seriesY = interpolate(seriesEnter, [0, 1], [s.px(-28), 0]);

    const logoEnter = interpolate(frame, [fps * 0.35, fps * 0.95], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
        easing: Easing.bezier(0.34, 1.56, 0.64, 1),
    });
    const turnX = interpolate(logoEnter, [0, 1], [s.px(-40), 0]);
    const leanX = interpolate(logoEnter, [0, 1], [s.px(40), 0]);

    const titleEnter = interpolate(frame, [fps * 0.75, fps * 1.35], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
        easing: Easing.bezier(0.22, 1.24, 0.36, 1),
    });
    const titleScale = interpolate(titleEnter, [0, 1], [0.78, 1]);
    const titleY = interpolate(titleEnter, [0, 1], [s.px(22), 0]);

    const fadeOut = interpolate(frame, [fps * 3.2, fps * 4], [1, 0], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
    });

    const renderLayer = (layerId: CoverLayerId, content: React.ReactNode) => (
        <CoverEditableLayer
            key={layerId}
            layerId={layerId}
            label={COVER_LAYER_LABELS[layerId]}
            box={layerBox[layerId]}
            selected={selectedLayer === layerId}
            canEdit={canEdit}
            onSelect={setSelectedLayer}
            onBoxChange={onBoxChange}
            onBoxCommit={onBoxCommit}
        >
            {content}
        </CoverEditableLayer>
    );

    return (
        <AbsoluteFill
            style={{
                backgroundColor: '#87ceeb',
                overflow: 'hidden',
                opacity: fadeOut,
            }}
        >
            <AbsoluteFill
                style={{
                    scale: bgScale,
                    opacity: bgOpacity,
                }}
            >
                <Img
                    src={staticFile(COVER_SHARED_BACKGROUND)}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
            </AbsoluteFill>

            <AbsoluteFill
                style={{
                    opacity: fireworksOpacity,
                    scale: fireworksPulse,
                    mixBlendMode: 'screen',
                    pointerEvents: 'none',
                }}
            >
                <Img
                    src={staticFile(COVER_SHARED_FIREWORKS)}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
            </AbsoluteFill>

            {renderLayer(
                'seriesTitle',
                <Img
                    src={staticFile(COVER_SHARED_SERIES_TITLE)}
                    style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                        opacity: seriesEnter,
                        translate: `0px ${seriesY}px`,
                        filter: 'drop-shadow(0 8px 18px rgba(15, 23, 42, 0.22))',
                    }}
                />,
            )}

            {renderLayer(
                'concept',
                <ConceptCoverDiagram conceptId={spec.conceptId} enterFrame={Math.round(fps * 0.55)} />,
            )}

            {renderLayer(
                'logoCluster',
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '100%',
                        height: '100%',
                        gap: s.px(8),
                    }}
                >
                    <Img
                        src={staticFile(COVER_SHARED_TURN)}
                        style={{
                            width: '100%',
                            maxHeight: '42%',
                            objectFit: 'contain',
                            opacity: logoEnter,
                            translate: `${turnX}px 0px`,
                            flexShrink: 0,
                            filter: 'drop-shadow(0 6px 14px rgba(15, 23, 42, 0.25))',
                        }}
                    />
                    <VsBadge enter={logoEnter} />
                    <CroppedSvgImage
                        src={staticFile(COVER_SHARED_LEAN)}
                        box={LEAN_LOGO_CROP_BOX}
                        style={{
                            width: isPortrait ? '62%' : '70%',
                            maxHeight: '28%',
                            opacity: logoEnter,
                            translate: `${leanX}px 0px`,
                            flexShrink: 0,
                            mixBlendMode: 'multiply',
                        }}
                    />
                </div>,
            )}

            {renderLayer(
                'episodeTitle',
                <CoverEpisodeTitle
                    text={spec.episodeTitle}
                    fill={spec.titleColor}
                    stroke={spec.titleStroke}
                    enter={titleEnter}
                    scale={titleScale}
                    translateY={titleY}
                    strokeWidth={titleStyle.strokeWidth}
                    fontSize={titleStyle.fontSize}
                />,
            )}

            <CoverEditorControls
                selectedLayer={selectedLayer}
                cover={editorCover}
                canEdit={canEdit}
                saveStatus={saveStatus}
                onSelectLayer={setSelectedLayer}
                onStyleChange={patchEditorCover}
            />
        </AbsoluteFill>
    );
}
