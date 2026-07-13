import { describe, expect, it } from 'vitest';

import {
    computeCodeViewportLayout,
    computeUnwrappedCodeViewportLayout,
} from './computeCodeViewportLayout';

describe('computeCodeViewportLayout', () => {
    it('shrinks font so a medium excerpt fits the viewport', () => {
        const layout = computeCodeViewportLayout({
            lineCount: 17,
            activeLineIndex: 10,
            viewportHeight: 520,
            maxFontSize: 24,
            minFontSize: 14,
        });
        expect(layout.fontSize).toBeLessThan(24);
        expect(layout.fitsAllLines).toBe(true);
        expect(layout.scrollTop).toBe(0);
    });

    it('scrolls to the active line when content stays taller than the viewport', () => {
        const layout = computeCodeViewportLayout({
            lineCount: 48,
            activeLineIndex: 30,
            viewportHeight: 520,
            maxFontSize: 24,
            minFontSize: 14,
        });
        expect(layout.fontSize).toBe(14);
        expect(layout.fitsAllLines).toBe(false);
        expect(layout.scrollTop).toBeGreaterThan(0);
    });
});

describe('computeUnwrappedCodeViewportLayout', () => {
    it('shrinks font so the longest line fits viewport width without wrapping', () => {
        const layout = computeUnwrappedCodeViewportLayout({
            lines: [
                '-- short',
                '-- class HasSSubset (α : Type u) where SSubset : α → α → Prop',
            ],
            activeLineIndex: 1,
            viewportHeight: 520,
            viewportWidth: 360,
            maxFontSize: 24,
            minFontSize: 8,
        });
        expect(layout.fontSize).toBeLessThan(24);
        expect(layout.fitsAllLines).toBe(true);
    });
});
