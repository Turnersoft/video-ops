import { AbsoluteFill, Audio, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import classes from './SceneComposer.module.scss';

import { SceneNarrationAudio } from '../SceneNarrationAudio/SceneNarrationAudio';
import { BurnedCaption } from '../BurnedCaption/BurnedCaption';
import { TURN_VIDEO_THEME } from '../../lib/layout/turnVideoTheme';
import { narrationStripForScene } from '../../lib/outdoor/narrationStrip';
import { OutdoorLayoutProvider } from '../../lib/outdoor/outdoorLayoutContext';
import {
    outdoorBeatIndexAtTime,
    resolveOutdoorBeatLayout,
} from '../../lib/outdoor/resolveOutdoorBeatLayout';
import { activeSayLineIndex } from '../../lib/outdoor/sayTiming';
import type { OutdoorRenderFormat, RenderLayer, RenderScene } from '../../lib/types/renderProps';
import { staticPathForScriptAsset } from '../../lib/assets/scriptAssetPath';
import { OutdoorLandscapeSceneView } from '../../lib/sceneViews/OutdoorLandscapeSceneView';
import { OutdoorPortraitSceneView } from '../../lib/sceneViews/OutdoorPortraitSceneView';
import { StudioSceneView } from '../../lib/sceneViews/StudioSceneView';
import { MainLayerRenderer } from '../../lib/layers/MainLayerRenderer';
import { beatTemplateUsesCompareShell, isBeatTemplateLayer } from '../../beats';
import { findCompareLayer, findMainLayer, inferLayoutPreset } from '../../lib/layers/types';

type SceneComposerProps = {
    scriptId: string;
    scene: RenderScene;
    width: number;
    height: number;
    showDirector?: boolean;
    contentRevision?: number;
    outdoorFormat?: OutdoorRenderFormat;
};

/** Beat templates that ship their own full-frame chrome (BeatTemplateStage). */
function studioBeatFillsFrame(layer: RenderLayer | null | undefined): boolean {
    if (!layer) {
        return false;
    }
    if (layer.type === 'compare') {
        return true;
    }
    if (!isBeatTemplateLayer(layer)) {
        return false;
    }
    switch (layer.kind) {
        case 'compare-dual':
        case 'stickers':
        case 'screen-recording':
        case 'composited':
        case 'manim-motion':
        case 'presenter-overlay':
        case 'turn-focus':
            return true;
        default: {
            const _exhaustive: never = layer.kind;
            return _exhaustive;
        }
    }
}

export function SceneComposer({
    scriptId,
    scene,
    outdoorFormat = 'landscape',
    contentRevision,
}: SceneComposerProps) {
    const t = TURN_VIDEO_THEME;
    const frame = useCurrentFrame();
    const { durationInFrames, fps } = useVideoConfig();
    const layout = inferLayoutPreset(scene);
    const frameSeconds = frame / fps;
    const outdoorEdit = scene.outdoorEdit;
    const activeBeatIndex = outdoorEdit?.beatDurationsSeconds?.length
        ? outdoorBeatIndexAtTime(frameSeconds, outdoorEdit.beatDurationsSeconds)
        : activeSayLineIndex(scene.director, scene.durationSeconds, frame, fps);
    const beatLayerOverride = scene.beatMainLayers?.[activeBeatIndex] ?? null;
    const mainLayer = beatLayerOverride ?? findMainLayer(scene.layers);
    const effectiveMainLayer = mainLayer as RenderLayer | null;
    const activeBeatTemplateKind =
        beatLayerOverride && isBeatTemplateLayer(beatLayerOverride)
            ? beatLayerOverride.kind
            : null;
    const useCompareShell = beatTemplateUsesCompareShell(activeBeatTemplateKind);
    const selfContainedBeatStage = !outdoorEdit && studioBeatFillsFrame(effectiveMainLayer);
    const narrationStrip = narrationStripForScene(scene);
    const compareLayer = findCompareLayer(scene.layers);

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
    const isStudioPortraitPreview =
        !outdoorEdit && outdoorFormat === 'portrait' && useCompareShell && Boolean(compareLayer);
    const isOutdoorPortrait =
        outdoorFormat === 'portrait' && (Boolean(outdoorEdit) || isStudioPortraitPreview);
    const isOutdoorLandscape = Boolean(outdoorEdit) && outdoorFormat === 'landscape';
    const outdoorBeatIndex = outdoorBeatIndexAtTime(
        frameSeconds,
        outdoorEdit?.beatDurationsSeconds,
    );
    const outdoorBeatLayout = resolveOutdoorBeatLayout(outdoorEdit, outdoorBeatIndex);

    const mainContent = effectiveMainLayer ? (
        <MainLayerRenderer
            scriptId={scriptId}
            scene={scene}
            layer={effectiveMainLayer}
            layout={layout}
            contentRevision={contentRevision}
        />
    ) : (
        <div className={classes.noMainLayer}>No beat layer</div>
    );

    const narrationAndCaptions = (
        <>
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
        </>
    );

    const sceneVisual = selfContainedBeatStage ? (
        <AbsoluteFill className={classes.beatStageHost}>
            {mainContent}
            {narrationAndCaptions}
        </AbsoluteFill>
    ) : (
        <AbsoluteFill
            className={classes.sceneVisual}
            style={{
                background: `radial-gradient(120% 90% at 50% 0%, ${t.canvas.bgGradientTop} 0%, ${t.canvas.bg} 45%, ${t.canvas.bgGradientBottom} 100%)`,
                color: t.syntax.plain,
                opacity: sceneOpacity,
                transform: `scale(${sceneScale})`,
                transformOrigin: 'center center',
            }}
        >
            <div
                className={classes.vignette}
                style={{
                    background: `radial-gradient(ellipse at center, transparent 55%, ${t.canvas.vignette} 100%)`,
                }}
            />

            {isOutdoorPortrait ? (
                <OutdoorPortraitSceneView
                    scriptId={scriptId}
                    scene={scene}
                    outdoorEdit={outdoorEdit}
                    outdoorBeatIndex={outdoorBeatIndex}
                    outdoorBeatLayout={outdoorBeatLayout}
                    compareLayer={compareLayer ?? undefined}
                    mainContent={mainContent}
                    useCompareShell={useCompareShell}
                    activeBeatTemplateKind={activeBeatTemplateKind}
                    contentRevision={contentRevision}
                    sceneDirector={scene.director}
                    sceneDurationSeconds={scene.durationSeconds}
                />
            ) : isOutdoorLandscape ? (
                <OutdoorLandscapeSceneView
                    scriptId={scriptId}
                    outdoorEdit={outdoorEdit!}
                    outdoorBeatIndex={outdoorBeatIndex}
                    outdoorBeatLayout={outdoorBeatLayout}
                    mainContent={mainContent}
                />
            ) : (
                <StudioSceneView mainContent={mainContent} />
            )}

            {narrationAndCaptions}
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

    if (outdoorFormat) {
        return (
            <OutdoorLayoutProvider format={outdoorFormat} hintPanel={outdoorBeatLayout.hintPanel}>
                {sceneBody}
            </OutdoorLayoutProvider>
        );
    }

    return sceneBody;
}
