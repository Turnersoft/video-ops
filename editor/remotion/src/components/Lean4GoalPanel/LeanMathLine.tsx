// /Users/johndoe/Documents/company/basic_ui/src/shared/turn-video/panels/LeanMathLine.tsx
import type { Lean4GoalMathLineProps } from './Lean4GoalPanel';
import { UnicodeMathLine } from './UnicodeMathLine';

/** Lean infoview-style line — Unicode math, no MathJax. */
export function LeanMathLine(props: Lean4GoalMathLineProps) {
    return <UnicodeMathLine {...props} variant="light" />;
}
