// /Users/johndoe/Documents/company/basic_ui/video_ops/remotion/src/components/SceneComposer.tsx
import { AbsoluteFill, Audio, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';

import { DirectorTeleprompter } from './DirectorTeleprompter';
import { OutdoorFilmedClipMask } from './OutdoorFilmedClipMask';
import { OutdoorPortraitCompare } from './OutdoorPortraitCompare';
import { OutdoorPresenterVideo } from './OutdoorPresenterVideo';
import { CompareBeatVideoPanel } from './CompareBeatVideoPanel';
import { SceneNarrationAudio } from './SceneNarrationAudio';
import { TextbookPaperOverlay } from './TextbookPaperOverlay';
import { TalkingHeadLayer } from './TalkingHeadLayer';
import { BurnedCaption } from './universal/BurnedCaption';
import { TURN_VIDEO_THEME } from '../lib/turnVideoTheme';
import { narrationStripForScene } from '../lib/narrationStrip';
import { OutdoorLayoutProvider } from '../lib/outdoorLayoutContext';
import {
    outdoorBeatIndexAtTime,
    resolveOutdoorBeatLayout,
} from '../lib/resolveOutdoorBeatLayout';
import { useCompositionScale } from '../lib/useCompositionScale';
import type { OutdoorRenderFormat, RenderScene } from '../lib/renderProps';
import { staticPathForScriptAsset } from '../lib/scriptAssetPath';
import { LayoutShell } from '../video-kit/LayoutShell';
import { MainLayerRenderer } from '../video-kit/MainLayerRenderer';
import { PresenterColumn } from '../video-kit/PresenterColumn';
import {
    findMainLayer,
    findOverlayLayers,
    inferLayoutPreset,
    type CompareLayer,
} from '../video-kit/types';

type SceneComposerProps = {
    scriptId: string;
    scene: RenderScene;
    width: number;
    height: number;
    showDirector?: boolean;
    contentRevision?: number;
    outdoorFormat?: OutdoorRenderFormat;
};

export function SceneComposer({
    scriptId,
    scene,
    width,
    height,
    showDirector,
    contentRevision,
    outdoorFormat = 'landscape',
}: SceneComposerProps) {
    const t = TURN_VIDEO_THEME;
    const s = useCompositionScale();
    const frame = useCurrentFrame();
    const { durationInFrames, fps } = useVideoConfig();
    const layout = inferLayoutPreset(scene);
    const mainLayer = findMainLayer(scene.layers);
    const overlayLayers = findOverlayLayers(scene.layers);
    const narrationStrip = narrationStripForScene(scene);
    const compareTextbookOverlay =
        mainLayer?.type === 'compare' ? (mainLayer as CompareLayer).textbookOverlay : undefined;

    const talkingHead = scene.layers.find((layer) => layer.type === 'talking-head');
    const pip = scene.layers.find((layer) => layer.type === 'pip');
    const hasPresenterColumn =
        pip?.type === 'pip' ||
        (talkingHead?.type === 'talking-head' && talkingHead.position !== 'background');

    const fadeOut = interpolate(
        frame,
        [Math.max(0, durationInFrames - 15), durationInFrames],
        [1, 0],
        { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
    );
    const sceneEnter = spring({
        frame,
        fps,
        config: { damping: 22, stiffness: 85 },
    });
    const sceneScale = interpolate(sceneEnter, [0, 1], [0.96, 1]);
    const sceneOpacity = fadeOut * sceneEnter;
    const outdoorEdit = scene.outdoorEdit;
    const isOutdoorPortrait = Boolean(outdoorEdit) && outdoorFormat === 'portrait';
    const isOutdoorLandscape = Boolean(outdoorEdit) && outdoorFormat === 'landscape';
    const outdoorBeatIndex = outdoorBeatIndexAtTime(
        frame / fps,
        outdoorEdit?.beatDurationsSeconds,
    );
    const outdoorBeatLayout = resolveOutdoorBeatLayout(outdoorEdit, outdoorBeatIndex);
    const presenterMode = outdoorBeatLayout.presenterMode;
    const scriptFullscreen = outdoorBeatLayout.scriptFullscreen;
    const isFullClipPresenter = !scriptFullscreen && presenterMode === 'full-clip';
    const compareLayer = mainLayer?.type === 'compare' ? (mainLayer as CompareLayer) : undefined;
    const activeBeatVideo = compareLayer?.beatVideos?.[outdoorBeatIndex];

    const mainContent = mainLayer ? (
        <MainLayerRenderer
            scriptId={scriptId}
            scene={scene}
            layer={mainLayer}
            layout={layout}
            contentRevision={contentRevision}
        />
    ) : (
        <div style={{ flex: 1, padding: 24, opacity: 0.5 }}>No main layer</div>
    );

    const sceneVisual = (
        <AbsoluteFill
            style={{
                background: `radial-gradient(120% 90% at 50% 0%, ${t.canvas.bgGradientTop} 0%, ${t.canvas.bg} 45%, ${t.canvas.bgGradientBottom} 100%)`,
                color: t.syntax.plain,
                fontFamily: 'Inter, system-ui, sans-serif',
                boxSizing: 'border-box',
                opacity: sceneOpacity,
                transform: `scale(${sceneScale})`,
                transformOrigin: 'center center',
            }}
        >
            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    background: `radial-gradient(ellipse at center, transparent 55%, ${t.canvas.vignette} 100%)`,
                    pointerEvents: 'none',
                }}
            />

            {/* Outdoor voice is a sibling <Audio> — keep clip video muted to avoid double play. */}

            {talkingHead?.type === 'talking-head' &&
            talkingHead.position === 'background' &&
            !outdoorEdit ? (
                <TalkingHeadLayer
                    scriptId={scriptId}
                    src={String(talkingHead.src)}
                    trimIn={talkingHead.trimIn as number | undefined}
                    trimOut={talkingHead.trimOut as number | undefined}
                    position="background"
                    widthFraction={talkingHead.widthFraction as number | undefined}
                    compositionWidth={width}
                    compositionHeight={height}
                />
            ) : null}

            {isOutdoorPortrait ? (
                scriptFullscreen ? (
                    <div
                        style={{
                            position: 'absolute',
                            inset: s.px(16),
                            display: 'flex',
                            flexDirection: 'column',
                            boxSizing: 'border-box',
                        }}
                    >
                        <div style={{ position: 'relative', flex: 1, minHeight: 0 }}>
                            {activeBeatVideo ? (
                                <CompareBeatVideoPanel scriptId={scriptId} video={activeBeatVideo} />
                            ) : compareLayer ? (
                                <OutdoorPortraitCompare
                                    scriptId={scriptId}
                                    leanTrack={String(compareLayer.leanTrack)}
                                    turnTrack={String(compareLayer.turnTrack)}
                                    editorFontScale={compareLayer.editorFontScale}
                                    leanEditorFontScale={compareLayer.leanEditorFontScale}
                                    renderFontScale={compareLayer.renderFontScale}
                                    director={scene.director}
                                    durationSeconds={scene.durationSeconds}
                                    contentRevision={contentRevision}
                                    compiledTracks={compareLayer.compiledTracks}
                                    focusBeats={compareLayer.focusBeats}
                                    portraitBottomTargets={compareLayer.portraitBottomTargets}
                                />
                            ) : (
                                mainContent
                            )}
                            <OutdoorFilmedClipMask
                                scriptId={scriptId}
                                src={outdoorEdit!.videoSrc}
                                pipMask={outdoorBeatLayout.pipMask}
                                beatIndex={outdoorBeatIndex}
                            />
                        </div>
                    </div>
                ) : (
                <div
                    style={{
                        position: 'absolute',
                        inset: s.px(16),
                        display: 'flex',
                        flexDirection: 'column',
                        gap: s.px(10),
                        boxSizing: 'border-box',
                    }}
                >
                    <div
                        style={
                            isFullClipPresenter
                                ? {
                                      width: '100%',
                                      aspectRatio: '16 / 9',
                                      borderRadius: s.px(18),
                                      overflow: 'hidden',
                                      border: '1px solid rgba(148, 163, 184, 0.22)',
                                      flexShrink: 0,
                                      background: '#020617',
                                  }
                                : {
                                      height: '33.33%',
                                      borderRadius: s.px(18),
                                      overflow: 'hidden',
                                      border: '1px solid rgba(148, 163, 184, 0.22)',
                                      flexShrink: 0,
                                  }
                        }
                    >
                        <OutdoorPresenterVideo
                            scriptId={scriptId}
                            src={outdoorEdit!.videoSrc}
                            muted
                            objectFit={isFullClipPresenter ? 'contain' : 'cover'}
                        />
                    </div>
                    <div
                        style={{
                            flex: 1,
                            minHeight: 0,
                            display: 'flex',
                            flexDirection: 'column',
                        }}
                    >
                        {activeBeatVideo ? (
                            <CompareBeatVideoPanel scriptId={scriptId} video={activeBeatVideo} />
                        ) : compareLayer ? (
                            <OutdoorPortraitCompare
                                scriptId={scriptId}
                                leanTrack={String(compareLayer.leanTrack)}
                                turnTrack={String(compareLayer.turnTrack)}
                                editorFontScale={compareLayer.editorFontScale}
                                leanEditorFontScale={compareLayer.leanEditorFontScale}
                                renderFontScale={compareLayer.renderFontScale}
                                director={scene.director}
                                durationSeconds={scene.durationSeconds}
                                contentRevision={contentRevision}
                                compiledTracks={compareLayer.compiledTracks}
                                focusBeats={compareLayer.focusBeats}
                                portraitBottomTargets={compareLayer.portraitBottomTargets}
                            />
                        ) : (
                            mainContent
                        )}
                    </div>
                </div>
                )
            ) : isOutdoorLandscape ? (
                <div
                    style={{
                        position: 'absolute',
                        top: s.px(40),
                        left: s.px(40),
                        right: s.px(40),
                        bottom: s.px(48),
                        display: 'flex',
                        flexDirection: 'column',
                        boxSizing: 'border-box',
                    }}
                >
                    <div
                        style={{
                            position: 'relative',
                            flex: 1,
                            minHeight: 0,
                            width: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                        }}
                    >
                        {scriptFullscreen || !isFullClipPresenter ? mainContent : null}
                        {isFullClipPresenter ? (
                            <div
                                style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    aspectRatio: '16 / 9',
                                    borderRadius: s.px(16),
                                    overflow: 'hidden',
                                    border: '1px solid rgba(148, 163, 184, 0.22)',
                                    background: '#020617',
                                    zIndex: 2,
                                }}
                            >
                                <OutdoorPresenterVideo
                                    scriptId={scriptId}
                                    src={outdoorEdit!.videoSrc}
                                    muted
                                    objectFit="contain"
                                />
                            </div>
                        ) : (
                            <OutdoorFilmedClipMask
                                scriptId={scriptId}
                                src={outdoorEdit!.videoSrc}
                                pipMask={outdoorBeatLayout.pipMask}
                                beatIndex={outdoorBeatIndex}
                            />
                        )}
                    </div>
                </div>
            ) : (
                <div
                    style={{
                        position: 'absolute',
                        inset: s.px(40),
                        display: 'flex',
                        gap: s.px(24),
                        boxSizing: 'border-box',
                    }}
                >
                    <LayoutShell
                        layout={layout}
                        presenterColumn={
                            hasPresenterColumn ? (
                                <PresenterColumn
                                    scriptId={scriptId}
                                    layers={overlayLayers}
                                    compositionWidth={width}
                                    compositionHeight={height}
                                />
                            ) : undefined
                        }
                    >
                        {mainContent}
                    </LayoutShell>
                </div>
            )}

            {compareTextbookOverlay ? <TextbookPaperOverlay {...compareTextbookOverlay} /> : null}

            {scene.director.beatVoiceSrc?.length && !outdoorEdit ? (
                <SceneNarrationAudio
                    scriptId={scriptId}
                    beatVoiceSrc={scene.director.beatVoiceSrc}
                    sayTimings={scene.director.sayTimings ?? [0]}
                    fps={fps}
                />
            ) : null}

            {narrationStrip ? (
                <BurnedCaption
                    lines={narrationStrip.lines}
                    linesZh={narrationStrip.linesZh}
                    timings={narrationStrip.timings}
                    segments={narrationStrip.segments}
                    durationSeconds={scene.durationSeconds}
                    mode={narrationStrip.mode}
                    scriptId={scriptId}
                    beatComments={scene.director.beatComments}
                    beatAllowScriptChange={scene.director.beatAllowScriptChange}
                />
            ) : null}

            {showDirector && !narrationStrip ? (
                <DirectorTeleprompter
                    director={scene.director}
                    durationSeconds={scene.durationSeconds}
                />
            ) : null}
        </AbsoluteFill>
    );

    const outdoorAudioSrc = outdoorEdit?.audioSrc ?? outdoorEdit?.videoSrc;
    const sceneBody = (
        <>
            {outdoorAudioSrc ? (
                <Audio
                    src={staticFile(staticPathForScriptAsset(scriptId, outdoorAudioSrc))}
                    volume={1}
                />
            ) : null}
            {sceneVisual}
        </>
    );

    if (outdoorEdit && outdoorFormat) {
        return (
            <OutdoorLayoutProvider format={outdoorFormat} hintPanel={outdoorBeatLayout.hintPanel}>
                {sceneBody}
            </OutdoorLayoutProvider>
        );
    }

    return sceneBody;
}
