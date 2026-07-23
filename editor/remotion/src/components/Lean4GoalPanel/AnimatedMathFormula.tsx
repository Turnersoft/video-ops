// /Users/johndoe/Documents/company/basic_ui/src/shared/turn-video/panels/AnimatedMathFormula.tsx
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { useMemo } from 'react';

import {
    defaultEmphasisTokens,
    isBracketToken,
    isMathSymbolToken,
    isWhitespaceToken,
    tokenizeMathFormula,
    tokenMatchesEmphasis,
} from '../../lib/panels/tokenizeMathFormula';
import { EMPHASIS_FADE_FRAMES, lerpHexColor } from '../../lib/panels/highlightTransition';

const MATH_FONT =
    '"Latin Modern Roman", "Computer Modern Unicode", "STIX Two Text", Georgia, "Times New Roman", serif';

const SYMBOL_COLOR = '#58c4dd';
const EMPHASIS_COLOR = '#f7c948';
const BASE_COLOR = '#e8e6e3';

export type AnimatedMathFormulaProps = {
    text: string;
    revealAtFrame: number;
    fontSize: number;
    /** Substrings to emphasize after the line finishes revealing. */
    emphasis?: string[];
    /** Frames between token entrances (default 5 @ 30fps). */
    staggerFrames?: number;
};

function tokenStartFrames(tokens: string[], revealAtFrame: number, staggerFrames: number): number[] {
    let cursor = revealAtFrame;
    return tokens.map((token) => {
        const start = cursor;
        if (!isWhitespaceToken(token)) {
            cursor += staggerFrames;
        }
        return start;
    });
}

function mixHexColor(from: string, to: string, amount: number): string {
    return lerpHexColor(from, to, amount);
}

function MathToken({
    token,
    startFrame,
    fontSize,
    emphasisAmount,
}: {
    token: string;
    startFrame: number;
    fontSize: number;
    emphasisAmount: number;
}) {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    const localFrame = Math.max(0, frame - startFrame);

    const entrance = spring({
        frame: localFrame,
        fps,
        config: { damping: 18, stiffness: 120, mass: 0.55 },
    });

    const opacity = interpolate(entrance, [0, 1], [0, 1]);
    const y = interpolate(entrance, [0, 1], [fontSize * 0.22, 0]);
    const bracketScale = isBracketToken(token)
        ? interpolate(entrance, [0, 1], [1.35, 1])
        : 1;

    const baseColor = isMathSymbolToken(token) ? SYMBOL_COLOR : BASE_COLOR;
    const color = mixHexColor(baseColor, EMPHASIS_COLOR, emphasisAmount);
    const glow =
        emphasisAmount > 0.02
            ? `0 0 ${fontSize * 0.28}px rgba(247, 201, 72, ${0.22 * emphasisAmount})`
            : 'none';

    return (
        <span
            style={{
                display: 'inline-block',
                opacity,
                transform: `translateY(${y}px) scale(${bracketScale})`,
                transformOrigin: 'center bottom',
                color,
                fontSize,
                fontFamily: MATH_FONT,
                lineHeight: 1.55,
                whiteSpace: 'pre',
                textShadow: glow,
            }}
        >
            {token}
        </span>
    );
}

/** Staggered token reveal for math-board slides (3b1b-style, no MathJax). */
export function AnimatedMathFormula({
    text,
    revealAtFrame,
    fontSize,
    emphasis,
    staggerFrames = 5,
}: AnimatedMathFormulaProps) {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const tokens = useMemo(() => tokenizeMathFormula(text), [text]);
    const starts = useMemo(
        () => tokenStartFrames(tokens, revealAtFrame, staggerFrames),
        [revealAtFrame, staggerFrames, tokens],
    );

    const lastStart = starts.length > 0 ? Math.max(...starts) : revealAtFrame;
    const revealDoneFrame = lastStart + Math.round(fps * 0.45);
    const emphasisNeedles = useMemo(() => {
        if (emphasis && emphasis.length > 0) {
            return emphasis;
        }
        return defaultEmphasisTokens(tokens);
    }, [emphasis, tokens]);

    const globalEmphasisFade = interpolate(
        frame,
        [revealDoneFrame, revealDoneFrame + EMPHASIS_FADE_FRAMES],
        [0, 1],
        { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
    );

    const lineEntrance = spring({
        frame: Math.max(0, frame - revealAtFrame),
        fps,
        config: { damping: 22, stiffness: 70, mass: 1 },
    });
    const lineScale = interpolate(lineEntrance, [0, 1], [0.96, 1]);

    return (
        <div
            style={{
                textAlign: 'center',
                maxWidth: '92%',
                transform: `scale(${lineScale})`,
                transformOrigin: 'center center',
            }}
        >
            {tokens.map((token, index) => {
                const isEmphasisToken =
                    frame >= revealDoneFrame && tokenMatchesEmphasis(token, emphasisNeedles);
                const emphasisAmount = isEmphasisToken ? globalEmphasisFade : 0;

                return (
                    <MathToken
                        key={`${index}-${token}-${starts[index]}`}
                        token={token}
                        startFrame={starts[index] ?? revealAtFrame}
                        fontSize={fontSize}
                        emphasisAmount={emphasisAmount}
                    />
                );
            })}
        </div>
    );
}
