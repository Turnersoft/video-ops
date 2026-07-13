import type { RenderScene } from './renderProps';

type OutdoorEdit = NonNullable<RenderScene['outdoorEdit']>;

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
): {
    pipMask: OutdoorEdit['pipMask'];
    hintPanel: OutdoorEdit['hintPanel'];
    presenterMode: import('./renderProps').OutdoorPresenterMode;
    scriptFullscreen: boolean;
} {
    const beat = outdoorEdit?.beatLayouts?.[beatIndex];
    return {
        pipMask: beat?.pipMask ?? outdoorEdit?.pipMask,
        hintPanel: beat?.hintPanel ?? outdoorEdit?.hintPanel,
        presenterMode:
            beat?.presenterMode ?? outdoorEdit?.presenterMode ?? 'split-crop',
        scriptFullscreen: beat?.scriptFullscreen ?? false,
    };
}
