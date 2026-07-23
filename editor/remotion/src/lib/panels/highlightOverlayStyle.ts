// /Users/johndoe/Documents/company/basic_ui/src/shared/turn-video/panels/highlightOverlayStyle.ts
import type { CSSProperties } from 'react';

/** Background-only caption highlight — keeps token / variable colors stable. */
export function codeHighlightOverlayStyle(
    accentRgb: string,
    strength: number,
): CSSProperties {
    const s = Math.max(0, Math.min(1, strength));
    if (s <= 0) {
        return {};
    }
    return {
        background: `rgba(${accentRgb}, ${0.22 * s})`,
        borderRadius: 4,
        boxShadow: `0 0 0 ${Math.max(1, 2 * s)}px rgba(${accentRgb}, ${0.28 * s})`,
    };
}

/** Softer math-line highlight — base text color unchanged. */
export function mathHighlightOverlayStyle(
    variant: 'light' | 'dark',
    strength: number,
): CSSProperties {
    const s = Math.max(0, Math.min(1, strength));
    if (s <= 0) {
        return {};
    }
    if (variant === 'dark') {
        return {
            background: `rgba(247, 201, 72, ${0.14 * s})`,
            borderRadius: 3,
            padding: '0 3px',
            boxShadow: `inset 0 -2px 0 rgba(247, 201, 72, ${0.55 * s})`,
        };
    }
    return {
        background: `rgba(86, 156, 214, ${0.12 * s})`,
        borderRadius: 3,
        padding: '0 2px',
        boxShadow: `inset 0 -2px 0 rgba(26, 111, 176, ${0.45 * s})`,
    };
}
