import type { ReactNode } from 'react';
import { AbsoluteFill } from 'remotion';

import {
    DEFAULT_FILMED_AVATAR_MASK,
    DEFAULT_SCREEN_RECORDING_BOX,
    hasFootageSrc,
    StudioFilmedPlaceholders,
} from '../FilmedPlaceholders/FilmedPlaceholders';
import { PortraitPresenterBand } from '../PortraitPresenterBand/PortraitPresenterBand';
import type { OutdoorRenderFormat, RenderScene } from '../../lib/types/renderProps';

export type BeatFootageOverlaysProps = {
    scriptId: string;
    scene: RenderScene;
    activeBeatIndex: number;
    format: OutdoorRenderFormat;
    screenRecordingLabel?: string | null;
};

/** @deprecated Prefer PortraitPresenterBand — kept for existing imports. */
export function BeatPortraitPresenterBand(): ReactNode {
    return <PortraitPresenterBand />;
}

export function showStudioFootagePlaceholders(scene: RenderScene): boolean {
    return !scene.outdoorEdit;
}

/**
 * Absolute-fill studio overlays.
 * Landscape: editable circle/rect PiP (original script framing).
 * Portrait: talking-head lives in PortraitPresenterBand — only screen-recording box here.
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

    const label =
        screenRecordingLabel?.trim() ||
        scene.beatScreenRecordings?.[activeBeatIndex]?.trim() ||
        null;

    // Portrait presenter is the top band in CompareDualPortraitLayout — never bottom PiP.
    if (format === 'portrait') {
        if (!label?.trim()) {
            return null;
        }
        return (
            <AbsoluteFill style={{ pointerEvents: 'none' }}>
                <StudioFilmedPlaceholders
                    scriptId={scriptId}
                    hasTalkingHeadFootage
                    screenRecordingLabel={label}
                    activeBeatIndex={activeBeatIndex}
                    sceneIndex={Math.max(0, scene.index - 1)}
                    beatCount={scene.director?.say?.length ?? 0}
                />
            </AbsoluteFill>
        );
    }

    const hasTalkingHeadFootage = hasFootageSrc(scene.outdoorEdit?.videoSrc);
    const presenterMask =
        scene.beatStudioPresenterMasks?.[activeBeatIndex] ??
        scene.studioPresenterMask ??
        DEFAULT_FILMED_AVATAR_MASK;
    const beatCount = scene.director?.say?.length ?? 0;

    return (
        <AbsoluteFill style={{ pointerEvents: 'none' }}>
            <StudioFilmedPlaceholders
                scriptId={scriptId}
                hasTalkingHeadFootage={hasTalkingHeadFootage}
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
