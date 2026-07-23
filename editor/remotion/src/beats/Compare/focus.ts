import type { CompareFocusBeat, CompareFocusSide } from '../../lib/layers/types';

const LANDSCAPE_EMPHASIZED_COLUMN_FLEX = 1.45;
const LANDSCAPE_COMPACT_COLUMN_FLEX = 0.85;

/** Last focus side active at `seconds` (scene-relative). `null` = no focus authored. */
export function activeFocusSide(
    focusBeats: CompareFocusBeat[] | undefined,
    seconds: number,
): CompareFocusSide | null {
    if (!focusBeats?.length) {
        return null;
    }
    let current: CompareFocusSide | null = null;
    for (const beat of focusBeats) {
        if (seconds >= beat.atSeconds) {
            current = beat.side;
            continue;
        }
        break;
    }
    return current;
}

export function columnFlexGrow(
    columnSide: 'lean' | 'turn',
    focusSide: CompareFocusSide | null,
): number {
    if (!focusSide || focusSide === 'both') {
        return 1;
    }
    if (focusSide === columnSide) {
        return LANDSCAPE_EMPHASIZED_COLUMN_FLEX;
    }
    return LANDSCAPE_COMPACT_COLUMN_FLEX;
}

export function columnIsFocused(
    columnSide: 'lean' | 'turn',
    focusSide: CompareFocusSide | null,
): boolean {
    return focusSide === columnSide || focusSide === 'both';
}
