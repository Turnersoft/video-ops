// /Users/johndoe/Documents/company/basic_ui/video_ops/remotion/src/lib/sayTiming.ts
import type { DirectorScene } from '../types/renderProps';

export function sayLineFrameOffsets(director: DirectorScene, durationSeconds: number, fps: number): number[] {
    const lines = director.say;
    if (lines.length === 0) {
        return [];
    }
    if (director.sayTimings && director.sayTimings.length === lines.length) {
        return director.sayTimings.map((seconds) => Math.round(seconds * fps));
    }
    const framesPerLine = Math.max(1, Math.round((durationSeconds * fps) / lines.length));
    return lines.map((_line, index) => index * framesPerLine);
}

export function activeSayLineIndex(director: DirectorScene, durationSeconds: number, frameInScene: number, fps: number): number {
    const offsets = sayLineFrameOffsets(director, durationSeconds, fps);
    if (offsets.length === 0) {
        return 0;
    }
    let active = 0;
    offsets.forEach((offset, index) => {
        if (frameInScene >= offset) {
            active = index;
        }
    });
    return active;
}
