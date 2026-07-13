// /Users/johndoe/Documents/company/basic_ui/video_ops/remotion/src/components/universal/mathBoardDiagrams/EquivalenceDiagrams.tsx
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

import { DIAGRAM } from './diagramColors';
import { staggerDelay, useDiagramMotion } from './diagramMotion';

type DiagramProps = {
    revealAtFrame: number;
    width: number;
    height: number;
};

function Dot({
    cx,
    cy,
    r,
    fill,
    label,
    revealAtFrame,
    delay,
    fontSize,
}: {
    cx: number;
    cy: number;
    r: number;
    fill: string;
    label?: string;
    revealAtFrame: number;
    delay: number;
    fontSize: number;
}) {
    const { fps } = useVideoConfig();
    const frame = useCurrentFrame();
    const local = Math.max(0, frame - revealAtFrame - delay);
    const pop = spring({ frame: local, fps, config: { damping: 14, stiffness: 160, mass: 0.45 } });
    const scale = interpolate(pop, [0, 1], [0, 1]);
    const pulse = local > Math.round(fps * 0.45) ? 0.55 + 0.45 * Math.sin(local / fps * Math.PI * 2.1) : 0;

    return (
        <g transform={`translate(${cx}, ${cy}) scale(${scale})`}>
            <circle
                cx={0}
                cy={0}
                r={r * (1.8 + pulse * 0.45)}
                fill="none"
                stroke={fill}
                strokeWidth={1.4}
                opacity={0.16 + pulse * 0.12}
            />
            <circle cx={0} cy={0} r={r} fill={fill} filter="url(#soft-glow)" />
            {label ? (
                <text
                    x={0}
                    y={fontSize * 0.35}
                    textAnchor="middle"
                    fill={DIAGRAM.white}
                    fontSize={fontSize}
                    fontFamily="Georgia, serif"
                >
                    {label}
                </text>
            ) : null}
        </g>
    );
}

function RelationArc({
    x1,
    y1,
    x2,
    y2,
    revealAtFrame,
    delay,
}: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    revealAtFrame: number;
    delay: number;
}) {
    const motion = useDiagramMotion(revealAtFrame, delay);
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2 - 28;
    const path = `M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`;
    const dash = 120;
    const local = Math.max(0, frame - revealAtFrame - delay);
    const pulse = Math.min(1, local / Math.max(1, fps * 0.8));
    const t = Math.max(0, Math.min(1, (local % Math.max(1, fps * 1.4)) / Math.max(1, fps * 1.4)));
    const traceX = (1 - t) * (1 - t) * x1 + 2 * (1 - t) * t * mx + t * t * x2;
    const traceY = (1 - t) * (1 - t) * y1 + 2 * (1 - t) * t * my + t * t * y2;

    return (
        <g opacity={motion.opacity}>
            <path
                d={path}
                fill="none"
                stroke={DIAGRAM.muted}
                strokeWidth={2}
                strokeDasharray={dash}
                strokeDashoffset={dash * (1 - motion.draw)}
            />
            <path
                d={path}
                fill="none"
                stroke={DIAGRAM.blue}
                strokeWidth={1.4}
                strokeDasharray="8 14"
                strokeDashoffset={-local * 0.7}
                opacity={0.28 * pulse}
            />
            <circle cx={traceX} cy={traceY} r={3.4} fill={DIAGRAM.blue} opacity={0.4 * pulse} />
        </g>
    );
}

function DiagramDefs() {
    return (
        <defs>
            <filter id="soft-glow" x="-80%" y="-80%" width="260%" height="260%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                </feMerge>
            </filter>
            <radialGradient id="bucket-gradient" cx="50%" cy="50%" r="60%">
                <stop offset="0%" stopColor="rgba(88, 196, 221, 0.18)" />
                <stop offset="100%" stopColor="rgba(88, 196, 221, 0.02)" />
            </radialGradient>
        </defs>
    );
}

export function EquivalenceBucketDiagram({ revealAtFrame, width, height }: DiagramProps) {
    const motion = useDiagramMotion(revealAtFrame);
    const fontSize = width * 0.055;
    const cx = width * 0.5;
    const cy = height * 0.52;
    const rx = width * 0.38;
    const ry = height * 0.34;

    const points = [
        { x: cx, y: cy, label: 'x', fill: DIAGRAM.gold },
        { x: cx - 70, y: cy - 42, label: 'y₁', fill: DIAGRAM.blue },
        { x: cx + 78, y: cy - 28, label: 'y₂', fill: DIAGRAM.blue },
        { x: cx - 48, y: cy + 52, label: 'y₃', fill: DIAGRAM.blue },
    ];

    return (
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
            <DiagramDefs />
            <ellipse
                cx={cx}
                cy={cy}
                rx={rx * 1.08}
                ry={ry * 1.08}
                fill="none"
                stroke={DIAGRAM.faint}
                strokeWidth={1}
                opacity={motion.opacity}
                transform={`rotate(${Math.sin(motion.frame / 50) * 1.8} ${cx} ${cy})`}
            />
            <ellipse
                cx={cx}
                cy={cy}
                rx={rx}
                ry={ry}
                fill="url(#bucket-gradient)"
                stroke={DIAGRAM.bucketStroke}
                strokeWidth={2.5}
                strokeDasharray={900}
                strokeDashoffset={900 * (1 - motion.draw)}
                opacity={motion.opacity}
            />
            <text
                x={cx}
                y={cy - ry - 14}
                textAnchor="middle"
                fill={DIAGRAM.blue}
                fontSize={fontSize * 1.1}
                fontFamily="Georgia, serif"
                opacity={motion.opacity}
            >
                [x]
            </text>
            {points.slice(1).map((p, i) => (
                <RelationArc
                    key={`rel-${i}`}
                    x1={points[0].x}
                    y1={points[0].y}
                    x2={p.x}
                    y2={p.y}
                    revealAtFrame={revealAtFrame}
                    delay={staggerDelay(i + 2, 8)}
                />
            ))}
            {points.map((p, i) => (
                <Dot
                    key={p.label}
                    cx={p.x}
                    cy={p.y}
                    r={width * 0.028}
                    fill={p.fill}
                    label={p.label}
                    revealAtFrame={revealAtFrame}
                    delay={staggerDelay(i + 1, 7)}
                    fontSize={fontSize}
                />
            ))}
        </svg>
    );
}

function FilterCandidate({
    x,
    y,
    keep,
    targetX,
    revealAtFrame,
    delay,
    dotR,
    filterX,
}: {
    x: number;
    y: number;
    keep: boolean;
    targetX: number;
    revealAtFrame: number;
    delay: number;
    dotR: number;
    filterX: number;
}) {
    const dotMotion = useDiagramMotion(revealAtFrame, delay);
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    const local = Math.max(0, frame - revealAtFrame - delay);
    const move = spring({
        frame: Math.max(0, local - Math.round(fps * 0.22)),
        fps,
        config: { damping: 18, stiffness: 90, mass: 0.75 },
    });
    const xNow = keep ? interpolate(move, [0, 1], [x, targetX]) : x;
    const yNow = keep ? y : y + interpolate(move, [0, 1], [0, 18]);
    const rejectOpacity = keep ? 1 : interpolate(move, [0, 1], [1, 0.28]);
    const gateFlash = keep ? interpolate(move, [0.2, 0.6, 1], [0, 1, 0]) : 0;
    return (
        <g opacity={dotMotion.opacity}>
            <circle
                cx={xNow}
                cy={yNow}
                r={dotR}
                fill={keep ? DIAGRAM.blue : DIAGRAM.muted}
                opacity={rejectOpacity}
                filter={keep ? 'url(#soft-glow)' : undefined}
            />
            {keep && gateFlash > 0 ? (
                <circle
                    cx={filterX}
                    cy={y}
                    r={dotR * (1.5 + gateFlash)}
                    fill="none"
                    stroke={DIAGRAM.gold}
                    strokeWidth={1.5}
                    opacity={gateFlash * 0.55}
                />
            ) : null}
        </g>
    );
}

export function SetBuilderDiagram({ revealAtFrame, width, height }: DiagramProps) {
    const motion = useDiagramMotion(revealAtFrame);
    const fontSize = width * 0.05;
    const pad = width * 0.08;
    const boxW = width - pad * 2;
    const boxH = height * 0.72;
    const bx = pad;
    const by = height * 0.1;
    const filterX = bx + boxW * 0.58;

    const candidates = [
        { x: bx + 48, y: by + 58, keep: true },
        { x: bx + 42, y: by + 108, keep: true },
        { x: bx + 62, y: by + 158, keep: false },
        { x: bx + 38, y: by + 208, keep: true },
    ];

    return (
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
            <DiagramDefs />
            <rect
                x={bx}
                y={by}
                width={boxW}
                height={boxH}
                rx={12}
                fill={DIAGRAM.universeFill}
                stroke={DIAGRAM.universeStroke}
                strokeWidth={2}
                opacity={motion.opacity}
            />
            <text x={bx + 14} y={by + 26} fill={DIAGRAM.white} fontSize={fontSize} fontFamily="Georgia, serif">
                X
            </text>
            <line
                x1={filterX}
                y1={by + 12}
                x2={filterX}
                y2={by + boxH - 12}
                stroke={DIAGRAM.gold}
                strokeWidth={2.5}
                strokeDasharray={boxH}
                strokeDashoffset={boxH * (1 - motion.draw)}
                opacity={motion.opacity}
            />
            <text
                x={filterX + 10}
                y={by + boxH * 0.5}
                fill={DIAGRAM.gold}
                fontSize={fontSize * 0.85}
                fontFamily="Georgia, serif"
                opacity={motion.opacity}
            >
                x ~ y
            </text>
            {candidates.map((p, i) => (
                <FilterCandidate
                    key={i}
                    x={p.x}
                    y={p.y}
                    keep={p.keep}
                    targetX={filterX + boxW * 0.22}
                    revealAtFrame={revealAtFrame}
                    delay={staggerDelay(i, 7)}
                    dotR={width * 0.022}
                    filterX={filterX}
                />
            ))}
            <ellipse
                cx={filterX + boxW * 0.28}
                cy={by + boxH * 0.52}
                rx={boxW * 0.2}
                ry={boxH * 0.32}
                fill={DIAGRAM.bucketFill}
                stroke={DIAGRAM.bucketStroke}
                strokeWidth={2}
                opacity={interpolate(motion.entrance, [0.5, 1], [0, 1])}
            />
            <text
                x={filterX + boxW * 0.28}
                y={by + boxH * 0.56}
                textAnchor="middle"
                fill={DIAGRAM.gold}
                fontSize={fontSize}
                fontFamily="Georgia, serif"
                opacity={interpolate(motion.entrance, [0.55, 1], [0, 1])}
            >
                [x]
            </text>
        </svg>
    );
}

export function MembershipBiconditionalDiagram({ revealAtFrame, width, height }: DiagramProps) {
    const motion = useDiagramMotion(revealAtFrame);
    const fontSize = width * 0.06;
    const leftCx = width * 0.22;
    const rightCx = width * 0.78;
    const cy = height * 0.52;

    return (
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
            <DiagramDefs />
            <ellipse
                cx={leftCx}
                cy={cy}
                rx={width * 0.17}
                ry={height * 0.28}
                fill={DIAGRAM.bucketFill}
                stroke={DIAGRAM.bucketStroke}
                strokeWidth={2}
                opacity={motion.opacity}
            />
            <Dot
                cx={leftCx - 18}
                cy={cy + 8}
                r={width * 0.024}
                fill={DIAGRAM.blue}
                label="y"
                revealAtFrame={revealAtFrame}
                delay={staggerDelay(1, 8)}
                fontSize={fontSize}
            />
            <text
                x={leftCx}
                y={cy - height * 0.22}
                textAnchor="middle"
                fill={DIAGRAM.gold}
                fontSize={fontSize * 0.9}
                fontFamily="Georgia, serif"
                opacity={motion.opacity}
            >
                [x]
            </text>
            <text
                x={width * 0.5}
                y={cy + fontSize * 0.35}
                textAnchor="middle"
                fill={DIAGRAM.gold}
                fontSize={fontSize * 1.35}
                fontFamily="Georgia, serif"
                opacity={interpolate(motion.entrance, [0.35, 1], [0, 1])}
            >
                ↔
            </text>
            <Dot
                cx={rightCx - 28}
                cy={cy}
                r={width * 0.024}
                fill={DIAGRAM.gold}
                label="x"
                revealAtFrame={revealAtFrame}
                delay={staggerDelay(3, 8)}
                fontSize={fontSize}
            />
            <Dot
                cx={rightCx + 28}
                cy={cy}
                r={width * 0.024}
                fill={DIAGRAM.blue}
                label="y"
                revealAtFrame={revealAtFrame}
                delay={staggerDelay(4, 8)}
                fontSize={fontSize}
            />
            <RelationArc
                x1={rightCx - 28}
                y1={cy}
                x2={rightCx + 28}
                y2={cy}
                revealAtFrame={revealAtFrame}
                delay={staggerDelay(5, 8)}
            />
            <text
                x={rightCx}
                y={cy + 38}
                textAnchor="middle"
                fill={DIAGRAM.muted}
                fontSize={fontSize * 0.7}
                fontFamily="Georgia, serif"
                opacity={interpolate(motion.entrance, [0.6, 1], [0, 1])}
            >
                ~
            </text>
        </svg>
    );
}

export function RepresentativeDiagram({ revealAtFrame, width, height }: DiagramProps) {
    const motion = useDiagramMotion(revealAtFrame);
    const fontSize = width * 0.055;
    const cx = width * 0.5;
    const cy = height * 0.55;

    return (
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
            <DiagramDefs />
            <ellipse
                cx={cx}
                cy={cy}
                rx={width * 0.36}
                ry={height * 0.32}
                fill={DIAGRAM.bucketFill}
                stroke={DIAGRAM.bucketStroke}
                strokeWidth={2.5}
                strokeDasharray={800}
                strokeDashoffset={800 * (1 - motion.draw)}
                opacity={motion.opacity}
            />
            <text
                x={cx}
                y={cy + fontSize * 0.4}
                textAnchor="middle"
                fill={DIAGRAM.gold}
                fontSize={fontSize * 2.2}
                fontFamily="Georgia, serif"
                fontWeight={700}
                opacity={interpolate(motion.entrance, [0.2, 1], [0, 1])}
            >
                x
            </text>
            <text
                x={cx}
                y={cy - height * 0.24}
                textAnchor="middle"
                fill={DIAGRAM.blue}
                fontSize={fontSize}
                fontFamily="Georgia, serif"
                opacity={motion.opacity}
            >
                label for the bucket
            </text>
            {[
                { x: cx - 90, y: cy + 20 },
                { x: cx + 95, y: cy - 10 },
                { x: cx - 30, y: cy + 62 },
            ].map((p, i) => (
                <Dot
                    key={i}
                    cx={p.x}
                    cy={p.y}
                    r={width * 0.018}
                    fill={DIAGRAM.muted}
                    revealAtFrame={revealAtFrame}
                    delay={staggerDelay(i + 2, 6)}
                    fontSize={fontSize * 0.7}
                />
            ))}
        </svg>
    );
}

export function TextbookSetDiagram({ revealAtFrame, width, height }: DiagramProps) {
    return <SetBuilderDiagram revealAtFrame={revealAtFrame} width={width} height={height} />;
}

export function TurnStructureDiagram({ revealAtFrame, width, height }: DiagramProps) {
    const motion = useDiagramMotion(revealAtFrame);
    const fontSize = width * 0.045;
    const x = width * 0.12;
    const y = height * 0.22;
    const w = width * 0.76;
    const h = height * 0.56;

    return (
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
            <rect
                x={x}
                y={y}
                width={w}
                height={h}
                rx={14}
                fill="rgba(247, 201, 72, 0.08)"
                stroke={DIAGRAM.gold}
                strokeWidth={2}
                strokeDasharray={1200}
                strokeDashoffset={1200 * (1 - motion.draw)}
                opacity={motion.opacity}
            />
            <text x={x + 16} y={y + 32} fill={DIAGRAM.gold} fontSize={fontSize} fontFamily="monospace">
                structure EquivalenceClass
            </text>
            <text x={x + 16} y={y + 68} fill={DIAGRAM.white} fontSize={fontSize * 0.85} fontFamily="monospace">
                laws.def
            </text>
            <text x={x + 24} y={y + 100} fill={DIAGRAM.blue} fontSize={fontSize * 0.8} fontFamily="Georgia, serif">
                y ∈ self ↔ (x,y) ∈ E
            </text>
            <ellipse
                cx={x + w * 0.72}
                cy={y + h * 0.62}
                rx={w * 0.18}
                ry={h * 0.22}
                fill={DIAGRAM.bucketFill}
                stroke={DIAGRAM.bucketStroke}
                strokeWidth={1.5}
                opacity={interpolate(motion.entrance, [0.45, 1], [0, 1])}
            />
        </svg>
    );
}

export function LeanSetoidDiagram({ revealAtFrame, width, height }: DiagramProps) {
    const motion = useDiagramMotion(revealAtFrame);
    const fontSize = width * 0.045;
    const x = width * 0.1;
    const y = height * 0.28;

    return (
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
            <defs>
                <marker id="lean-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                    <path d="M0,0 L6,3 L0,6 Z" fill={DIAGRAM.gold} />
                </marker>
            </defs>
            <rect
                x={x}
                y={y}
                width={width * 0.38}
                height={height * 0.44}
                rx={12}
                fill="rgba(86, 156, 214, 0.1)"
                stroke={DIAGRAM.blue}
                strokeWidth={2}
                opacity={motion.opacity}
            />
            <text x={x + 14} y={y + 30} fill={DIAGRAM.blue} fontSize={fontSize} fontFamily="monospace">
                Setoid α
            </text>
            <text x={x + 14} y={y + 62} fill={DIAGRAM.muted} fontSize={fontSize * 0.8} fontFamily="monospace">
                s x y
            </text>
            <path
                d={`M ${x + width * 0.42} ${y + height * 0.22} L ${x + width * 0.58} ${y + height * 0.22}`}
                stroke={DIAGRAM.gold}
                strokeWidth={2.5}
                markerEnd="url(#lean-arrow)"
                strokeDasharray={80}
                strokeDashoffset={80 * (1 - motion.draw)}
                opacity={motion.opacity}
            />
            <ellipse
                cx={x + width * 0.72}
                cy={y + height * 0.48}
                rx={width * 0.2}
                ry={height * 0.26}
                fill={DIAGRAM.bucketFill}
                stroke={DIAGRAM.bucketStroke}
                strokeWidth={2}
                opacity={interpolate(motion.entrance, [0.4, 1], [0, 1])}
            />
            <text
                x={x + width * 0.72}
                y={y + height * 0.52}
                textAnchor="middle"
                fill={DIAGRAM.white}
                fontSize={fontSize * 0.85}
                fontFamily="monospace"
                opacity={interpolate(motion.entrance, [0.5, 1], [0, 1])}
            >
                eqvClass x
            </text>
        </svg>
    );
}
