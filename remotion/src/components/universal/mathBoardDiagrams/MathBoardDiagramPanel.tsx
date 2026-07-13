// /Users/johndoe/Documents/company/basic_ui/video_ops/remotion/src/components/universal/mathBoardDiagrams/MathBoardDiagramPanel.tsx
import type { MathBoardDiagramId } from '@turn-video-shared/panels/mathBoardDiagramTypes';
import { inferMathBoardDiagramId } from '@turn-video-shared/panels/mathBoardDiagramTypes';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

import { CoherentEquivalenceDiagram } from './CoherentEquivalenceDiagram';
import { SimpleSetDiagram } from './SimpleSetDiagram';

type MathBoardDiagramPanelProps = {
    diagramId?: MathBoardDiagramId;
    label: string;
    revealAtFrame: number;
    width: number;
    height: number;
};

/** Animated SVG illustration synced with a math-board beat. */
export function MathBoardDiagramPanel({
    diagramId,
    label,
    revealAtFrame,
    width,
    height,
}: MathBoardDiagramPanelProps) {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const local = frame;
    const entrance = spring({
        frame: local,
        fps,
        config: { damping: 22, stiffness: 80, mass: 0.9 },
    });
    const slideX = interpolate(entrance, [0, 1], [-width * 0.08, 0]);
    const scale = interpolate(entrance, [0, 1], [0.96, 1]);
    const opacity = interpolate(entrance, [0, 1], [0, 1]);
    const shimmer = 0.5 + 0.5 * Math.sin(local / fps * Math.PI * 0.7);
    const resolvedId = diagramId ?? inferMathBoardDiagramId(label);
    const useSimpleSet = resolvedId === 'set-container';

    return (
        <div
            style={{
                flexShrink: 0,
                opacity,
                transform: `translateX(${slideX}px) scale(${scale})`,
                position: 'relative',
                width,
                height,
            }}
        >
            <div
                style={{
                    position: 'absolute',
                    inset: -width * 0.06,
                    borderRadius: width * 0.12,
                    background:
                        'radial-gradient(circle at 50% 50%, rgba(88, 196, 221, 0.13), rgba(0, 0, 0, 0) 66%)',
                    opacity: 0.45 + shimmer * 0.12,
                    filter: 'blur(6px)',
                }}
            />
            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: width * 0.08,
                    border: '1px solid rgba(232, 230, 227, 0.08)',
                    background:
                        'linear-gradient(135deg, rgba(255,255,255,0.035), rgba(255,255,255,0.005))',
                }}
            />
            {useSimpleSet ? (
                <SimpleSetDiagram revealAtFrame={revealAtFrame} width={width} height={height} />
            ) : (
                <CoherentEquivalenceDiagram
                    diagramId={resolvedId}
                    label={label}
                    revealAtFrame={revealAtFrame}
                    width={width}
                    height={height}
                />
            )}
        </div>
    );
}
