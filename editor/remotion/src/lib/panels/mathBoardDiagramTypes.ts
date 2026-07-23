// /Users/johndoe/Documents/company/basic_ui/src/shared/turn-video/panels/mathBoardDiagramTypes.ts

/** Built-in 3b1b-style diagram presets for math-board beats. */
export type MathBoardDiagramId =
    | 'equivalence-bucket'
    | 'set-builder'
    | 'set-container'
    | 'membership-biconditional'
    | 'representative'
    | 'textbook-set'
    | 'turn-structure'
    | 'lean-setoid';

export function inferMathBoardDiagramId(label: string): MathBoardDiagramId {
    const key = label.trim().toLowerCase();
    if (key.includes('set-container') || key === 'set') {
        return 'set-container';
    }
    if (key.includes('set-builder') || key.includes('set builder')) {
        return 'set-builder';
    }
    if (key.includes('membership')) {
        return 'membership-biconditional';
    }
    if (key.includes('representative')) {
        return 'representative';
    }
    if (key.includes('textbook')) {
        return 'set-container';
    }
    if (key.includes('turn')) {
        return 'turn-structure';
    }
    if (key.includes('lean')) {
        return 'lean-setoid';
    }
    return 'equivalence-bucket';
}
