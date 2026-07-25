import {
    beatPipMaskToRenderMask,
    DEFAULT_BEAT_PIP_MASK,
} from './pipMaskTransform';
import type { OutdoorPipMask, RenderScene } from '../types/renderProps';

type OutdoorEdit = NonNullable<RenderScene['outdoorEdit']>;

type ScenePipMaskSource = Pick<
    RenderScene,
    'outdoorEdit' | 'beatStudioPresenterMasks' | 'studioPresenterMask'
>;

/** Script / studio mask chain for outdoor filmed footage (take beat layout → scene outdoor → animation.md). */
export function resolveOutdoorPipMask(
    scene: ScenePipMaskSource,
    beatIndex: number,
): OutdoorPipMask | undefined {
    const outdoorEdit = scene.outdoorEdit;
    const beatLayout = outdoorEdit?.beatLayouts?.[beatIndex];
    return (
        scene.beatStudioPresenterMasks?.[beatIndex] ??
        scene.studioPresenterMask ??
        beatLayout?.pipMask ??
        outdoorEdit?.pipMask ??
        beatPipMaskToRenderMask(DEFAULT_BEAT_PIP_MASK)
    );
}

export type OutdoorBeatLayout = {
    pipMask: OutdoorEdit['pipMask'];
    hintPanel: OutdoorEdit['hintPanel'];
    presenterMode: import('../types/renderProps').OutdoorPresenterMode;
    scriptFullscreen: boolean;
};

export function outdoorBeatIndexAtTime(
    seconds: number,
    beatDurationsSeconds: number[] | undefined,
): number {
    if (!beatDurationsSeconds?.length) {
        return 0;
    }
    let cursor = 0;
    for (let i = 0; i < beatDurationsSeconds.length; i++) {
        cursor += beatDurationsSeconds[i] ?? 0;
        if (seconds < cursor) {
            return i;
        }
    }
    return beatDurationsSeconds.length - 1;
}

export function resolveOutdoorBeatLayout(
    outdoorEdit: OutdoorEdit | undefined,
    beatIndex: number,
    scene?: ScenePipMaskSource,
): OutdoorBeatLayout {
    const beat = outdoorEdit?.beatLayouts?.[beatIndex];
    return {
        pipMask: scene
            ? resolveOutdoorPipMask(scene, beatIndex)
            : (beat?.pipMask ?? outdoorEdit?.pipMask),
        hintPanel: beat?.hintPanel ?? outdoorEdit?.hintPanel,
        presenterMode:
            beat?.presenterMode ?? outdoorEdit?.presenterMode ?? 'split-crop',
        scriptFullscreen: beat?.scriptFullscreen ?? false,
    };
}
