// /Users/johndoe/Documents/company/basic_ui/src/shared/turn-video/ide/compareFontScaleEditorContext.tsx
import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';

import {
    clampCompareFontScale,
    COMPARE_FONT_SCALE_STEP,
    type CompareFontScales,
} from '../../lib/tracks/compareFontScale';

export type CompareFontScaleField = keyof CompareFontScales;

type CompareFontScaleEditorContextValue = {
    scales: CompareFontScales;
    adjust: (field: CompareFontScaleField, delta: number) => void;
};

const CompareFontScaleEditorContext = createContext<CompareFontScaleEditorContextValue | null>(
    null,
);

type CompareFontScaleEditorProviderProps = {
    scales: CompareFontScales;
    onChange: (scales: CompareFontScales) => void;
    children: ReactNode;
};

/** VideoOps editor only — not used during Remotion export. */
export function CompareFontScaleEditorProvider({
    scales,
    onChange,
    children,
}: CompareFontScaleEditorProviderProps) {
    const adjust = useCallback(
        (field: CompareFontScaleField, delta: number) => {
            onChange({
                ...scales,
                [field]: clampCompareFontScale(scales[field] + delta),
            });
        },
        [onChange, scales],
    );

    const value = useMemo(() => ({ scales, adjust }), [adjust, scales]);

    return (
        <CompareFontScaleEditorContext.Provider value={value}>
            {children}
        </CompareFontScaleEditorContext.Provider>
    );
}

export function useCompareFontScaleEditor(): CompareFontScaleEditorContextValue | null {
    return useContext(CompareFontScaleEditorContext);
}

export { COMPARE_FONT_SCALE_STEP };
