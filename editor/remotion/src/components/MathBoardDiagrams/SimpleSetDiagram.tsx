// /Users/johndoe/Documents/company/basic_ui/video_ops/remotion/src/components/universal/mathBoardDiagrams/SimpleSetDiagram.tsx
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

import { DIAGRAM } from './diagramColors';

type SimpleSetDiagramProps = {
    revealAtFrame: number;
    width: number;
    height: number;
};

/** Minimal set-as-container illustration — one circle with member dots. */
export function SimpleSetDiagram({ revealAtFrame, width, height }: SimpleSetDiagramProps) {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    const local = frame - revealAtFrame;

    const entrance = spring({
        frame: Math.max(0, local),
        fps,
        config: { damping: 22, stiffness: 82, mass: 0.85 },
    });

    const cx = width * 0.5;
    const cy = height * 0.54;
    const radius = Math.min(width, height) * 0.24;
    const circleScale = interpolate(entrance, [0, 1], [0.88, 1]);
    const circleOpacity = interpolate(entrance, [0, 1], [0, 1]);
    const memberDelay = fps * 0.18;

    const members = [
        { x: cx - radius * 0.35, y: cy - radius * 0.12, label: 'a' },
        { x: cx + radius * 0.28, y: cy - radius * 0.22, label: 'b' },
        { x: cx - radius * 0.05, y: cy + radius * 0.32, label: 'c' },
    ];

    return (
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
            <defs>
                <filter id="set-container-glow" x="-100%" y="-100%" width="300%" height="300%">
                    <feGaussianBlur stdDeviation="5" result="blur" />
                    <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
                <radialGradient id="set-container-fill" cx="50%" cy="50%" r="60%">
                    <stop offset="0%" stopColor="rgba(88, 196, 221, 0.16)" />
                    <stop offset="100%" stopColor="rgba(88, 196, 221, 0.04)" />
                </radialGradient>
            </defs>

            <g opacity={circleOpacity} transform={`translate(${cx} ${cy}) scale(${circleScale}) translate(${-cx} ${-cy})`}>
                <circle
                    cx={cx}
                    cy={cy}
                    r={radius}
                    fill="url(#set-container-fill)"
                    stroke={DIAGRAM.bucketStroke}
                    strokeWidth={2.6}
                />
                <text
                    x={cx}
                    y={cy - radius - 18}
                    textAnchor="middle"
                    fill={DIAGRAM.blue}
                    fontSize={28}
                    fontFamily="Georgia, serif"
                    fontWeight={700}
                >
                    S
                </text>
                {members.map((member, index) => {
                    const memberEntrance = spring({
                        frame: Math.max(0, local - memberDelay * (index + 1)),
                        fps,
                        config: { damping: 20, stiffness: 90, mass: 0.7 },
                    });
                    const memberOpacity = interpolate(memberEntrance, [0, 1], [0, 1]);
                    const memberScale = interpolate(memberEntrance, [0, 1], [0.6, 1]);
                    return (
                        <g
                            key={member.label}
                            opacity={memberOpacity}
                            transform={`translate(${member.x} ${member.y}) scale(${memberScale}) translate(${-member.x} ${-member.y})`}
                        >
                            <circle
                                cx={member.x}
                                cy={member.y}
                                r={14}
                                fill={DIAGRAM.gold}
                                filter="url(#set-container-glow)"
                            />
                            <text
                                x={member.x}
                                y={member.y + 5}
                                textAnchor="middle"
                                fill={DIAGRAM.white}
                                fontSize={16}
                                fontFamily="Georgia, serif"
                                fontWeight={600}
                            >
                                {member.label}
                            </text>
                        </g>
                    );
                })}
            </g>
        </svg>
    );
}
