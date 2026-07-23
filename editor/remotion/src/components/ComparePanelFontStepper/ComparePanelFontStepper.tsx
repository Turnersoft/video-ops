// /Users/johndoe/Documents/company/basic_ui/video_ops/remotion/src/components/ComparePanelFontStepper.tsx
import classes from './ComparePanelFontStepper.module.scss';

import {
    COMPARE_FONT_SCALE_STEP,
    useCompareFontScaleEditor,
    type CompareFontScaleField,
} from '../CompareFontScaleEditor/compareFontScaleEditorContext';
import { readCompareFontScaleEditorBridge } from '../CompareFontScaleEditor/compareFontScaleEditorBridge';

import { scaleCss } from '../../lib/layout/scaleCss';
import { useCompositionScale } from '../../lib/layout/useCompositionScale';

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
    const isDark = variant === 'dark';
    const buttonSize = s.px(22 * 3 * 0.5);

    return (
        <div
            className={classes.root}
            style={scaleCss(s.scale)}
            onPointerDown={(event) => event.stopPropagation()}
        >
            <button
                type="button"
                className={`${classes.button} ${isDark ? classes.buttonDark : classes.buttonLight}`}
                style={{ width: buttonSize, height: buttonSize }}
                aria-label="Decrease font size"
                onClick={() => editor.adjust(field, -COMPARE_FONT_SCALE_STEP)}
            >
                −
            </button>
            <span
                className={`${classes.value} ${isDark ? classes.valueDark : classes.valueLight}`}
            >
                {value.toFixed(2)}×
            </span>
            <button
                type="button"
                className={`${classes.button} ${isDark ? classes.buttonDark : classes.buttonLight}`}
                style={{ width: buttonSize, height: buttonSize }}
                aria-label="Increase font size"
                onClick={() => editor.adjust(field, COMPARE_FONT_SCALE_STEP)}
            >
                +
            </button>
        </div>
    );
}
