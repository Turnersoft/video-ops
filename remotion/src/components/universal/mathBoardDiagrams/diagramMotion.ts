// /Users/johndoe/Documents/company/basic_ui/video_ops/remotion/src/components/universal/mathBoardDiagrams/diagramMotion.ts
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

export function useDiagramMotion(revealAtFrame: number, delayFrames = 0) {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    const local = Math.max(0, frame - revealAtFrame - delayFrames);
    const entrance = spring({
        frame: local,
        fps,
        config: { damping: 20, stiffness: 90, mass: 0.75 },
    });
    return {
        frame,
        local,
        entrance,
        opacity: interpolate(entrance, [0, 1], [0, 1]),
        scale: interpolate(entrance, [0, 1], [0.88, 1]),
        draw: interpolate(entrance, [0, 1], [0, 1]),
    };
}

export function staggerDelay(index: number, stepFrames = 6): number {
    return index * stepFrames;
}
