// /Users/johndoe/Documents/company/basic_ui/video_ops/remotion/src/components/universal/CoverEpisodeTitle.tsx
import { COVER_TITLE_FONT_FAMILY_HEAVY } from '@turn-video-shared/coverAssetPaths';
import { useMemo } from 'react';
import { useVideoConfig } from 'remotion';

import { useCoverTitleFont } from '../../lib/useCoverTitleFont';

type CoverEpisodeTitleProps = {
    text: string;
    fill: string;
    stroke: string;
    enter: number;
    scale: number;
    translateY: number;
    strokeWidth?: number;
    fontSize?: number;
};

const TITLE_FONT = `"${COVER_TITLE_FONT_FAMILY_HEAVY}", Impact, Haettenschweiler, Arial Black, sans-serif`;

/** "3 PROPER SUBSET" -> ["3 PROPER", "SUBSET"]; short titles stay on one line. */
function splitTitleLines(text: string): string[] {
    const words = text.split(' ').filter(Boolean);
    if (words.length <= 2) {
        return [text];
    }
    return [words.slice(0, 2).join(' '), words.slice(2).join(' ')];
}

type ArcLineProps = {
    text: string;
    d: string;
    rotate: number;
    fontSize: number;
    strokeWidth: number;
    gradientId: string;
    stroke: string;
    shadowColor: string;
};

function ArcLine({ text, d, rotate, fontSize, strokeWidth, gradientId, stroke, shadowColor }: ArcLineProps) {
    const pathId = useMemo(() => `${gradientId}-path`, [gradientId]);

    return (
        <g transform={`rotate(${rotate} 450 150)`}>
            <defs>
                <path id={pathId} d={d} fill="none" />
            </defs>
            <text
                fill={shadowColor}
                fontFamily={TITLE_FONT}
                fontSize={fontSize}
                letterSpacing="0.02em"
                transform="translate(6 9)"
            >
                <textPath href={`#${pathId}`} startOffset="50%" textAnchor="middle">
                    {text}
                </textPath>
            </text>
            <text
                fill={`url(#${gradientId})`}
                stroke={stroke}
                strokeWidth={strokeWidth}
                paintOrder="stroke fill"
                fontFamily={TITLE_FONT}
                fontSize={fontSize}
                letterSpacing="0.02em"
            >
                <textPath href={`#${pathId}`} startOffset="50%" textAnchor="middle">
                    {text}
                </textPath>
            </text>
        </g>
    );
}

export function CoverEpisodeTitle({
    text,
    fill,
    stroke,
    enter,
    scale,
    translateY,
    strokeWidth: strokeWidthProp,
    fontSize: fontSizeProp,
}: CoverEpisodeTitleProps) {
    useCoverTitleFont();

    const { width, height } = useVideoConfig();
    const isPortrait = height > width;
    const lines = splitTitleLines(text);
    const gradientBase = useMemo(() => text.replace(/[^a-zA-Z0-9]/g, ''), [text]);

    const maxLineLength = Math.max(...lines.map((line) => line.length));
    const fontSize =
        fontSizeProp ??
        (maxLineLength > 12
            ? isPortrait
                ? 82
                : 92
            : maxLineLength > 8
              ? isPortrait
                  ? 100
                  : 112
              : isPortrait
                ? 116
                : 128);
    const strokeWidth = strokeWidthProp ?? (isPortrait ? 12 : 14);
    const shadowColor = '#0f1e4d';

    return (
        <svg
            viewBox={lines.length === 2 ? '0 0 900 300' : '0 0 900 170'}
            width="100%"
            height="100%"
            preserveAspectRatio="xMidYMid meet"
            style={{
                opacity: enter,
                scale,
                translate: `0px ${translateY}px`,
                overflow: 'visible',
            }}
        >
            <defs>
                <linearGradient id={`cover-title-grad-${gradientBase}-0`} x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#fde047" />
                    <stop offset="55%" stopColor={fill} />
                    <stop offset="100%" stopColor="#5eead4" />
                </linearGradient>
                {lines.length === 2 && (
                    <linearGradient id={`cover-title-grad-${gradientBase}-1`} x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor={fill} />
                        <stop offset="100%" stopColor="#5eead4" />
                    </linearGradient>
                )}
            </defs>
            {lines.length === 2 ? (
                <>
                    <ArcLine
                        text={lines[0]}
                        d="M 60 130 Q 450 30 840 130"
                        rotate={-3}
                        fontSize={fontSize}
                        strokeWidth={strokeWidth}
                        gradientId={`cover-title-grad-${gradientBase}-0`}
                        stroke={stroke}
                        shadowColor={shadowColor}
                    />
                    <ArcLine
                        text={lines[1]}
                        d="M 90 270 Q 450 190 810 270"
                        rotate={2}
                        fontSize={fontSize}
                        strokeWidth={strokeWidth}
                        gradientId={`cover-title-grad-${gradientBase}-1`}
                        stroke={stroke}
                        shadowColor={shadowColor}
                    />
                </>
            ) : (
                <ArcLine
                    text={lines[0]}
                    d="M 70 138 Q 450 28 830 138"
                    rotate={-2}
                    fontSize={fontSize}
                    strokeWidth={strokeWidth}
                    gradientId={`cover-title-grad-${gradientBase}-0`}
                    stroke={stroke}
                    shadowColor={shadowColor}
                />
            )}
        </svg>
    );
}
