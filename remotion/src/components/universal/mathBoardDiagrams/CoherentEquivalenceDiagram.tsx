// /Users/johndoe/Documents/company/basic_ui/video_ops/remotion/src/components/universal/mathBoardDiagrams/CoherentEquivalenceDiagram.tsx
import type { MathBoardDiagramId } from '@turn-video-shared/panels/mathBoardDiagramTypes';
import { inferMathBoardDiagramId } from '@turn-video-shared/panels/mathBoardDiagramTypes';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

import { DIAGRAM } from './diagramColors';

type CoherentEquivalenceDiagramProps = {
    diagramId?: MathBoardDiagramId;
    label: string;
    revealAtFrame: number;
    width: number;
    height: number;
};

type Stage = 'bucket' | 'set-builder' | 'membership' | 'representative' | 'turn' | 'lean';

function stageFromDiagram(id: MathBoardDiagramId): Stage {
    switch (id) {
        case 'set-builder':
        case 'textbook-set':
            return 'set-builder';
        case 'membership-biconditional':
            return 'membership';
        case 'representative':
            return 'representative';
        case 'turn-structure':
            return 'turn';
        case 'lean-setoid':
            return 'lean';
        case 'equivalence-bucket':
        default:
            return 'bucket';
    }
}

function smooth(local: number, fps: number, delay = 0, duration = 0.8): number {
    return interpolate(
        Math.max(0, local - delay),
        [0, fps * duration],
        [0, 1],
        { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
    );
}

function pulse(frame: number, fps: number, speed = 1.6): number {
    return 0.5 + 0.5 * Math.sin((frame / fps) * Math.PI * 2 * speed);
}

function relationPath(x1: number, y1: number, x2: number, y2: number): string {
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2 - 44;
    return `M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`;
}

function tracePoint(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    t: number,
): { x: number; y: number } {
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2 - 44;
    return {
        x: (1 - t) * (1 - t) * x1 + 2 * (1 - t) * t * mx + t * t * x2,
        y: (1 - t) * (1 - t) * y1 + 2 * (1 - t) * t * my + t * t * y2,
    };
}

function Dot({
    x,
    y,
    r,
    fill,
    label,
    opacity,
    active,
}: {
    x: number;
    y: number;
    r: number;
    fill: string;
    label?: string;
    opacity: number;
    active: boolean;
}) {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    const p = active ? pulse(frame, fps, 1.35) : 0;
    return (
        <g opacity={opacity}>
            <circle
                cx={x}
                cy={y}
                r={r * (active ? 2 + p * 0.45 : 1.45)}
                fill="none"
                stroke={fill}
                strokeWidth={active ? 1.8 : 1}
                opacity={active ? 0.16 + p * 0.18 : 0.1}
            />
            <circle cx={x} cy={y} r={r} fill={fill} filter="url(#coherent-glow)" />
            {label ? (
                <text
                    x={x}
                    y={y + r * 0.35}
                    textAnchor="middle"
                    fill={DIAGRAM.white}
                    fontSize={r * 1.25}
                    fontFamily="Georgia, serif"
                    fontWeight={active ? 700 : 500}
                >
                    {label}
                </text>
            ) : null}
        </g>
    );
}

function RelationTrace({
    x1,
    y1,
    x2,
    y2,
    opacity,
    active,
}: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    opacity: number;
    active: boolean;
}) {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    const path = relationPath(x1, y1, x2, y2);
    const t = (frame % Math.round(fps * 1.6)) / Math.max(1, Math.round(fps * 1.6));
    const trace = tracePoint(x1, y1, x2, y2, t);
    return (
        <g opacity={opacity}>
            <path
                d={path}
                fill="none"
                stroke={active ? DIAGRAM.blue : DIAGRAM.muted}
                strokeWidth={active ? 2.4 : 1.4}
                strokeDasharray={active ? '9 13' : '4 12'}
                strokeDashoffset={active ? -frame * 0.65 : 0}
                opacity={active ? 0.78 : 0.34}
            />
            {active ? <circle cx={trace.x} cy={trace.y} r={4.5} fill={DIAGRAM.blue} opacity={0.55} /> : null}
        </g>
    );
}

function TurnOrLeanCard({
    mode,
    x,
    y,
    opacity,
}: {
    mode: 'turn' | 'lean';
    x: number;
    y: number;
    opacity: number;
}) {
    const isTurn = mode === 'turn';
    return (
        <g opacity={opacity}>
            <rect
                x={x}
                y={y}
                width={210}
                height={96}
                rx={13}
                fill={isTurn ? 'rgba(247, 201, 72, 0.09)' : 'rgba(88, 196, 221, 0.09)'}
                stroke={isTurn ? DIAGRAM.gold : DIAGRAM.blue}
                strokeWidth={1.8}
            />
            <text
                x={x + 15}
                y={y + 29}
                fill={isTurn ? DIAGRAM.gold : DIAGRAM.blue}
                fontSize={16}
                fontFamily="monospace"
                fontWeight={700}
            >
                {isTurn ? 'EquivalenceClass' : 'Setoid α'}
            </text>
            <text x={x + 15} y={y + 58} fill={DIAGRAM.white} fontSize={13} fontFamily="monospace">
                {isTurn ? 'def: y ∈ self' : 'computed eqvClass'}
            </text>
            <text x={x + 15} y={y + 78} fill={DIAGRAM.muted} fontSize={12} fontFamily="monospace">
                {isTurn ? '↔ (x,y) ∈ E' : 'unfold to see set'}
            </text>
        </g>
    );
}

/** One persistent equivalence-class scene that refocuses instead of replacing diagrams. */
export function CoherentEquivalenceDiagram({
    diagramId,
    label,
    revealAtFrame,
    width,
    height,
}: CoherentEquivalenceDiagramProps) {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    const stage = stageFromDiagram(diagramId ?? inferMathBoardDiagramId(label));
    const local = frame - revealAtFrame;
    const sceneEntrance = spring({
        frame,
        fps,
        config: { damping: 24, stiffness: 78, mass: 0.9 },
    });

    const stageEntrance = spring({
        frame: Math.max(0, local),
        fps,
        config: { damping: 24, stiffness: 78, mass: 0.9 },
    });

    const cx = width * 0.45;
    const cy = height * 0.54;
    const rx = width * 0.27;
    const ry = height * 0.27;
    const universeX = width * 0.07;
    const universeY = height * 0.16;
    const universeW = width * 0.72;
    const universeH = height * 0.68;
    const gateX = universeX + universeW * 0.42;
    const xDot = { x: cx, y: cy, label: 'x' };
    const yDots = [
        { x: cx - 116, y: cy - 70, label: 'y₁', keep: true },
        { x: cx - 110, y: cy + 78, label: 'y₂', keep: true },
        { x: cx + 98, y: cy - 50, label: 'y', keep: true },
        { x: universeX + 58, y: universeY + universeH - 50, label: 'z', keep: false },
    ];

    const showGate =
        stage === 'set-builder' ||
        stage === 'membership' ||
        stage === 'representative' ||
        stage === 'turn' ||
        stage === 'lean';
    const focusBucket = stage === 'bucket' || stage === 'representative';
    const focusMembership = stage === 'membership';
    const gateProgress = showGate
        ? stage === 'set-builder'
            ? smooth(local, fps, fps * 0.08, 0.65)
            : 1
        : 0;
    const bucketOpacity = interpolate(sceneEntrance, [0, 1], [0, 1]);
    const relationOpacity = stage === 'set-builder' || stage === 'membership' ? 0.95 : 0.48;
    const highlight = pulse(frame, fps, 1.2);
    const gateFlash = showGate ? pulse(frame - revealAtFrame, fps, 1.8) : 0;
    const cameraX = interpolate(sceneEntrance, [0, 1], [-width * 0.035, 0]);
    const cameraScale = interpolate(sceneEntrance, [0, 1], [0.97, 1]);
    const focusNudge = interpolate(stageEntrance, [0, 1], [0, stage === 'membership' ? -width * 0.015 : 0]);

    return (
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
            <defs>
                <filter id="coherent-glow" x="-100%" y="-100%" width="300%" height="300%">
                    <feGaussianBlur stdDeviation="4.5" result="blur" />
                    <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
                <radialGradient id="coherent-bucket" cx="50%" cy="50%" r="62%">
                    <stop offset="0%" stopColor="rgba(88, 196, 221, 0.2)" />
                    <stop offset="100%" stopColor="rgba(88, 196, 221, 0.035)" />
                </radialGradient>
                <marker id="coherent-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                    <path d="M0,0 L6,3 L0,6 Z" fill={DIAGRAM.gold} />
                </marker>
            </defs>

            <g transform={`translate(${cameraX + focusNudge} 0) scale(${cameraScale})`}>
                <rect
                    x={universeX}
                    y={universeY}
                    width={universeW}
                    height={universeH}
                    rx={20}
                    fill={DIAGRAM.universeFill}
                    stroke={DIAGRAM.universeStroke}
                    strokeWidth={2}
                    opacity={0.95}
                />
                <text x={universeX + 18} y={universeY + 34} fill={DIAGRAM.white} fontSize={22} fontFamily="Georgia, serif">
                    X
                </text>

                <line
                    x1={gateX}
                    y1={universeY + 18}
                    x2={gateX}
                    y2={universeY + universeH - 18}
                    stroke={DIAGRAM.gold}
                    strokeWidth={2.5 + gateFlash * 1.4}
                    opacity={0.22 + gateProgress * 0.75}
                    strokeDasharray={universeH}
                    strokeDashoffset={universeH * (1 - gateProgress)}
                />
                <text
                    x={gateX + 14}
                    y={universeY + universeH * 0.48}
                    fill={DIAGRAM.gold}
                    fontSize={20}
                    fontFamily="Georgia, serif"
                    opacity={0.15 + gateProgress * 0.85}
                >
                    x ~ y
                </text>

                <ellipse
                    cx={cx}
                    cy={cy}
                    rx={rx * (focusBucket ? 1.03 + highlight * 0.02 : 1)}
                    ry={ry * (focusBucket ? 1.03 + highlight * 0.02 : 1)}
                    fill="url(#coherent-bucket)"
                    stroke={focusMembership ? DIAGRAM.gold : DIAGRAM.bucketStroke}
                    strokeWidth={focusMembership ? 3.2 : 2.4}
                    opacity={bucketOpacity}
                />
                <ellipse
                    cx={cx}
                    cy={cy}
                    rx={rx * 1.12}
                    ry={ry * 1.12}
                    fill="none"
                    stroke={focusBucket ? DIAGRAM.blueGlow : DIAGRAM.faint}
                    strokeWidth={1.3}
                    opacity={focusBucket ? 0.38 + highlight * 0.18 : 0.18}
                />
                <text
                    x={cx}
                    y={cy - ry - 20}
                    textAnchor="middle"
                    fill={focusMembership ? DIAGRAM.gold : DIAGRAM.blue}
                    fontSize={28}
                    fontFamily="Georgia, serif"
                    fontWeight={700}
                    opacity={bucketOpacity}
                >
                    [x]
                </text>

                {yDots.filter((p) => p.keep).map((p, i) => (
                    <RelationTrace
                        key={`relation-${p.label}`}
                        x1={xDot.x}
                        y1={xDot.y}
                        x2={p.x}
                        y2={p.y}
                        opacity={relationOpacity}
                        active={stage === 'bucket' || stage === 'membership'}
                    />
                ))}

                <Dot
                    x={xDot.x}
                    y={xDot.y}
                    r={18}
                    fill={DIAGRAM.gold}
                    label="x"
                    opacity={1}
                    active={stage === 'representative' || stage === 'bucket'}
                />
                {yDots.map((p, i) => {
                    const moveThroughGate = showGate && p.keep;
                    const move =
                        showGate && stage !== 'set-builder'
                            ? 1
                            : smooth(local, fps, fps * (0.18 + i * 0.08), 0.75);
                    const targetX = p.keep ? cx + (i - 1) * 34 : p.x;
                    const targetY = p.keep ? cy + (i - 1) * 54 : p.y + 20;
                    const x = moveThroughGate ? interpolate(move, [0, 1], [Math.min(p.x, gateX - 38), targetX]) : p.x;
                    const y = moveThroughGate ? interpolate(move, [0, 1], [p.y, targetY]) : p.y;
                    const active = focusMembership && p.label === 'y';
                    return (
                        <Dot
                            key={p.label}
                            x={x}
                            y={y}
                            r={p.keep ? 15 : 12}
                            fill={p.keep ? DIAGRAM.blue : DIAGRAM.muted}
                            label={p.label}
                            opacity={p.keep ? 1 : 0.42}
                            active={active}
                        />
                    );
                })}

                {focusMembership ? (
                    <g opacity={smooth(local, fps, fps * 0.24, 0.5)}>
                        <text x={width * 0.08} y={height * 0.93} fill={DIAGRAM.blue} fontSize={18} fontFamily="Georgia, serif">
                            y ∈ [x]
                        </text>
                        <text x={width * 0.38} y={height * 0.93} fill={DIAGRAM.gold} fontSize={22} fontFamily="Georgia, serif">
                            ↔
                        </text>
                        <text x={width * 0.47} y={height * 0.93} fill={DIAGRAM.blue} fontSize={18} fontFamily="Georgia, serif">
                            x ~ y
                        </text>
                    </g>
                ) : null}

                {stage === 'turn' ? (
                    <g>
                        <path
                            d={`M ${width * 0.72} ${height * 0.35} L ${cx + rx * 0.72} ${cy - ry * 0.05}`}
                            fill="none"
                            stroke={DIAGRAM.gold}
                            strokeWidth={2}
                            markerEnd="url(#coherent-arrow)"
                            opacity={smooth(local, fps, fps * 0.2, 0.5)}
                        />
                        <TurnOrLeanCard mode="turn" x={width * 0.58} y={height * 0.12} opacity={smooth(local, fps, fps * 0.08, 0.55)} />
                    </g>
                ) : null}

                {stage === 'lean' ? (
                    <g>
                        <path
                            d={`M ${width * 0.71} ${height * 0.33} L ${cx + rx * 0.72} ${cy - ry * 0.05}`}
                            fill="none"
                            stroke={DIAGRAM.gold}
                            strokeWidth={2}
                            markerEnd="url(#coherent-arrow)"
                            opacity={smooth(local, fps, fps * 0.2, 0.5)}
                        />
                        <TurnOrLeanCard mode="lean" x={width * 0.58} y={height * 0.12} opacity={smooth(local, fps, fps * 0.08, 0.55)} />
                    </g>
                ) : null}
            </g>
        </svg>
    );
}
