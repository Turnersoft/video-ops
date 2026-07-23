// /Users/johndoe/Documents/company/basic_ui/src/shared/turn-video/ide/compareFontScaleEditorBridge.ts
import {
    clampCompareFontScale,
    type CompareFontScales,
} from '../../lib/tracks/compareFontScale';
import type { CompareFontScaleField } from './compareFontScaleEditorContext';

type CompareFontScaleEditorBridge = {
    scales: CompareFontScales;
    adjust: (field: CompareFontScaleField, delta: number) => void;
};

let activeBridge: CompareFontScaleEditorBridge | null = null;
let activeOnChange: ((scales: CompareFontScales) => void) | null = null;

/** VideoOps editor — Remotion Player may not pass React context; bridge is the fallback. */
export function registerCompareFontScaleEditorBridge(
    scales: CompareFontScales | null,
    onChange: ((scales: CompareFontScales) => void) | null,
): void {
    if (!scales || !onChange) {
        activeBridge = null;
        activeOnChange = null;
        return;
    }
    activeOnChange = onChange;
    activeBridge = {
        scales,
        adjust(field, delta) {
            if (!activeBridge || !activeOnChange) {
                return;
            }
            const next = {
                ...activeBridge.scales,
                [field]: clampCompareFontScale(activeBridge.scales[field] + delta),
            };
            activeBridge = { ...activeBridge, scales: next };
            activeOnChange(next);
        },
    };
}

/** Refresh bridge scales when the active beat changes without re-registering onChange. */
export function syncCompareFontScaleEditorBridgeScales(scales: CompareFontScales): void {
    if (!activeBridge) {
        return;
    }
    activeBridge = { ...activeBridge, scales };
}

export function readCompareFontScaleEditorBridge(): CompareFontScaleEditorBridge | null {
    return activeBridge;
}
