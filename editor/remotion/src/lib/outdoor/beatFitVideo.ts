/** How a bundled clip fills its beat / scene slot in Remotion. */
export type BeatVideoFit = 'stretch' | 'hold-end';

export type BeatVideoTiming = {
    playbackRate: number;
    /** Frame index (composition-local) where playback stops; omit to run through source end. */
    endAt?: number;
};

/**
 * Map a source clip duration onto a beat slot.
 *
 * - `stretch`: parametric speed — `playbackRate = source / beat` (slow when beat is longer).
 * - `hold-end`: play at 1×; trim if beat is shorter; hold last frame if beat is longer.
 */
export function resolveBeatVideoTiming(options: {
    beatDurationSeconds: number;
    sourceDurationSeconds: number;
    fit: BeatVideoFit;
    fps: number;
    trimInSeconds?: number;
}): BeatVideoTiming {
    const { beatDurationSeconds, sourceDurationSeconds, fit, fps, trimInSeconds = 0 } = options;
    const availableSourceSeconds = Math.max(0, sourceDurationSeconds - trimInSeconds);

    if (availableSourceSeconds <= 0 || beatDurationSeconds <= 0) {
        return { playbackRate: 1 };
    }

    if (fit === 'stretch') {
        return {
            playbackRate: availableSourceSeconds / beatDurationSeconds,
        };
    }

    if (beatDurationSeconds < availableSourceSeconds) {
        return {
            playbackRate: 1,
            endAt: Math.round((trimInSeconds + beatDurationSeconds) * fps),
        };
    }

    return { playbackRate: 1 };
}
