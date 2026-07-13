// /Users/johndoe/Documents/company/basic_ui/video_ops/remotion/src/video-kit/useSceneClock.ts
import { useCurrentFrame, useVideoConfig } from 'remotion';

/** Seconds elapsed in the current scene sequence. */
export function useSceneClock(): { frame: number; fps: number; seconds: number } {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    return {
        frame,
        fps,
        seconds: frame / fps,
    };
}

export type TimedEvent = {
    atSeconds: number;
    [key: string]: unknown;
};

/** Latest event whose atSeconds has passed (for step indices, morphs, etc.). */
export function activeEventIndex<T extends TimedEvent>(events: T[] | undefined, seconds: number): number {
    if (!events?.length) {
        return 0;
    }
    let active = 0;
    for (let index = 0; index < events.length; index += 1) {
        if (seconds >= events[index].atSeconds) {
            active = index;
        }
    }
    return active;
}
