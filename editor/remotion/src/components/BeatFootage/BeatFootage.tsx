import type { ReactNode } from 'react';
import { AbsoluteFill } from 'remotion';

import {
    DEFAULT_FILMED_AVATAR_MASK,
    DEFAULT_SCREEN_RECORDING_BOX,
    GreenAvatarFill,
    hasFootageSrc,
    StudioFilmedPlaceholders,
} from '../FilmedPlaceholders/FilmedPlaceholders';
import type { OutdoorRenderFormat, RenderScene } from '../../lib/types/renderProps';
import { scaleCss } from '../../lib/layout/scaleCss';
import { useCompositionScale } from '../../lib/layout/useCompositionScale';
import classes from './BeatFootage.module.scss';

export type BeatFootageOverlaysProps = {
    scriptId: string;
    scene: RenderScene;
    activeBeatIndex: number;
    format: OutdoorRenderFormat;
    screenRecordingLabel?: string | null;
};

const PORTRAIT_PRESENTER_BAND_RATIO = 0.33;

/** Portrait studio band — replaces outdoor presenter strip when no take is linked. */
export function BeatPortraitPresenterBand(): ReactNode {
    const s = useCompositionScale();
    return (
        <div
            className={classes.portraitPresenterBand}
            style={{
                ...scaleCss(s.scale),
                height: `${PORTRAIT_PRESENTER_BAND_RATIO * 100}%`,
            }}
        >
            <GreenAvatarFill label="Filmed take · portrait" />
        </div>
    );
}

export function showStudioFootagePlaceholders(scene: RenderScene): boolean {
    return !scene.outdoorEdit;
}

/**
 * Absolute-fill studio overlays — landscape avatar PIP + optional screen-recording box.
 * Portrait uses BeatPortraitPresenterBand for the talking-head placeholder instead.
 */
export function BeatFootageOverlays({
    scriptId,
    scene,
    activeBeatIndex,
    format,
    screenRecordingLabel = null,
}: BeatFootageOverlaysProps): ReactNode {
    if (!showStudioFootagePlaceholders(scene)) {
        return null;
    }

    const hasTalkingHeadFootage = hasFootageSrc(scene.outdoorEdit?.videoSrc);
    const label =
        screenRecordingLabel?.trim() ||
        scene.beatScreenRecordings?.[activeBeatIndex]?.trim() ||
        null;
    const presenterMask =
        scene.beatStudioPresenterMasks?.[activeBeatIndex] ??
        scene.studioPresenterMask ??
        DEFAULT_FILMED_AVATAR_MASK;
    const beatCount = scene.director?.say?.length ?? 0;

    return (
        <AbsoluteFill style={{ pointerEvents: 'none' }}>
            <StudioFilmedPlaceholders
                scriptId={scriptId}
                hasTalkingHeadFootage={format === 'portrait' ? true : hasTalkingHeadFootage}
                screenRecordingLabel={label}
                presenterMask={presenterMask}
                activeBeatIndex={activeBeatIndex}
                sceneIndex={Math.max(0, scene.index - 1)}
                beatCount={beatCount}
            />
        </AbsoluteFill>
    );
}

export { DEFAULT_FILMED_AVATAR_MASK, DEFAULT_SCREEN_RECORDING_BOX };
