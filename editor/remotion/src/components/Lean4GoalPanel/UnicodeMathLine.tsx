// /Users/johndoe/Documents/company/basic_ui/src/shared/turn-video/panels/UnicodeMathLine.tsx
import { useMemo, type ReactNode } from 'react';

import type { HighlightOverlay } from '../../lib/panels/highlightTransition';
import { COMPARE_HIGHLIGHT_ATTR } from '../../lib/tracks/compareHintLayout';
import { mathHighlightOverlayStyle } from '../../lib/panels/highlightOverlayStyle';

const MATH_FONT =
    '"Latin Modern Roman", "Computer Modern Unicode", "STIX Two Text", Georgia, "Times New Roman", serif';

export type UnicodeMathLineProps = {
    text: string;
    highlights?: string[];
    /** Fading caption-sync overlays (preferred in Remotion). */
    highlightOverlays?: HighlightOverlay[];
    inline?: boolean;
    fontSize?: number;
    variant?: 'light' | 'dark';
    /** Override default body color (e.g. goal-panel comment tone). */
    textColor?: string;
};

function overlaysFromProps(
    highlights: string[],
    highlightOverlays: HighlightOverlay[] | undefined,
): HighlightOverlay[] {
    if (highlightOverlays && highlightOverlays.length > 0) {
        return highlightOverlays;
    }
    return highlights.map((text) => ({ text, opacity: 1 }));
}

function pickOverlay(line: string, overlays: HighlightOverlay[]): HighlightOverlay | undefined {
    return overlays
        .filter((item) => line.includes(item.text) && item.opacity > 0.01)
        .reduce<HighlightOverlay | undefined>((best, item) => {
            if (!best || item.opacity > best.opacity) {
                return item;
            }
            return best;
        }, undefined);
}

function renderPlainText(text: string, fontSize: number | undefined, textColor: string): ReactNode {
    return (
        <span style={{ fontSize, color: textColor }}>
            {text}
        </span>
    );
}

function renderLineWithOverlays(
    line: string,
    overlays: HighlightOverlay[],
    fontSize: number | undefined,
    textColor: string,
    variant: 'light' | 'dark',
): ReactNode {
    const overlay = pickOverlay(line, overlays);
    if (!overlay) {
        return renderPlainText(line, fontSize, textColor);
    }

    const needle = overlay.text;
    const parts = line.split(needle);
    const nodes: ReactNode[] = [];
    let offset = 0;

    parts.forEach((part, partIndex) => {
        const segment = line.slice(offset, offset + part.length);
        offset += part.length + needle.length;
        if (segment) {
            nodes.push(renderPlainText(segment, fontSize, textColor));
        }
        if (partIndex < parts.length - 1) {
            nodes.push(
                <span
                    key={`hl-${partIndex}`}
                    {...{ [COMPARE_HIGHLIGHT_ATTR]: 'true' }}
                    style={{
                        ...mathHighlightOverlayStyle(variant, overlay.opacity),
                        fontSize,
                        color: textColor,
                    }}
                >
                    {needle}
                </span>,
            );
        }
    });

    return nodes;
}

/** Unicode math line for video panels — no MathJax, stable text color under highlights. */
export function UnicodeMathLine({
    text,
    highlights = [],
    highlightOverlays,
    fontSize,
    inline = true,
    variant = 'light',
    textColor: textColorProp,
}: UnicodeMathLineProps) {
    const overlays = useMemo(
        () => overlaysFromProps(highlights, highlightOverlays),
        [highlights, highlightOverlays],
    );
    const textColor = textColorProp ?? (variant === 'dark' ? '#e8e6e3' : '#2B2A27');
    const body = useMemo(
        () => renderLineWithOverlays(text, overlays, fontSize, textColor, variant),
        [text, overlays, fontSize, textColor, variant],
    );

    return (
        <span
            style={{
                display: inline ? 'inline' : 'block',
                fontFamily: MATH_FONT,
                fontSize,
                lineHeight: 1.55,
                color: textColor,
                whiteSpace: 'pre-wrap',
            }}
        >
            {body}
        </span>
    );
}
