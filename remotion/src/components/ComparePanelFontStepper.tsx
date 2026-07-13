// /Users/johndoe/Documents/company/basic_ui/video_ops/remotion/src/components/ComparePanelFontStepper.tsx
import type { CSSProperties } from 'react';

import {
    COMPARE_FONT_SCALE_STEP,
    useCompareFontScaleEditor,
    type CompareFontScaleField,
} from '@turn-video-shared/ide/compareFontScaleEditorContext';
import { readCompareFontScaleEditorBridge } from '@turn-video-shared/ide/compareFontScaleEditorBridge';

import {
    COMPARE_BODY_RELATIVE_SCALE,
    COMPARE_CHROME_FONT_SCALE,
} from '@turn-video-shared/ide/compareTypography';
import { useCompositionScale } from '../lib/useCompositionScale';

type ComparePanelFontStepperProps = {
    field: CompareFontScaleField;
    /** Dark code editor header vs light render header. */
    variant?: 'dark' | 'light';
};

export function ComparePanelFontStepper({ field, variant = 'light' }: ComparePanelFontStepperProps) {
    const contextEditor = useCompareFontScaleEditor();
    const editor = contextEditor ?? readCompareFontScaleEditorBridge();
    const s = useCompositionScale();

    if (!editor) {
        return null;
    }

    const value = editor.scales[field];
    const cf = (size: number) => s.px(size * COMPARE_CHROME_FONT_SCALE * COMPARE_BODY_RELATIVE_SCALE);
    const buttonSize = cf(22);
    const fontSize = cf(10);

    const buttonStyle: CSSProperties = {
        width: buttonSize,
        height: buttonSize,
        padding: 0,
        border:
            variant === 'dark'
                ? '1px solid rgba(255, 255, 255, 0.14)'
                : '1px solid rgba(60, 54, 45, 0.16)',
        borderRadius: cf(6),
        background: variant === 'dark' ? 'rgba(255, 255, 255, 0.06)' : 'rgba(60, 54, 45, 0.06)',
        color: variant === 'dark' ? '#c5c5c5' : '#5C574F',
        fontSize: cf(14),
        lineHeight: 1,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    };

    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: cf(4),
                flexShrink: 0,
            }}
            onPointerDown={(event) => event.stopPropagation()}
        >
            <button
                type="button"
                style={buttonStyle}
                aria-label="Decrease font size"
                onClick={() => editor.adjust(field, -COMPARE_FONT_SCALE_STEP)}
            >
                −
            </button>
            <span
                style={{
                    minWidth: cf(34),
                    textAlign: 'center',
                    fontSize,
                    fontWeight: 700,
                    fontVariantNumeric: 'tabular-nums',
                    color: variant === 'dark' ? '#9cdcfe' : '#6B6860',
                }}
            >
                {value.toFixed(2)}×
            </span>
            <button
                type="button"
                style={buttonStyle}
                aria-label="Increase font size"
                onClick={() => editor.adjust(field, COMPARE_FONT_SCALE_STEP)}
            >
                +
            </button>
        </div>
    );
}
