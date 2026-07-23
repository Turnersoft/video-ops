// /Users/johndoe/Documents/company/basic_ui/video_ops/remotion/src/components/MathBoardBeatSlide.tsx
import type { MathBoardDiagramId } from '../../lib/panels/mathBoardDiagramTypes';
import classes from './MathBoardBeatSlide.module.scss';
import { AnimatedMathFormula } from '../Lean4GoalPanel/AnimatedMathFormula';

import { scaleCss } from '../../lib/layout/scaleCss';
import { useCompositionScale } from '../../lib/layout/useCompositionScale';
import { MathBoardDiagramPanel } from '../MathBoardDiagrams/MathBoardDiagramPanel';

type MathBoardBeatSlideProps = {
    text: string;
    label: string;
    revealAtFrame: number;
    emphasis?: string[];
    diagram?: MathBoardDiagramId;
};

/** One beat: diagram left, animated formula right (3b1b layout). */
export function MathBoardBeatSlide({
    text,
    label,
    revealAtFrame,
    emphasis,
    diagram,
}: MathBoardBeatSlideProps) {
    const s = useCompositionScale();
    const diagramW = s.px(560);
    const diagramH = s.px(400);

    return (
        <div className={classes.root} style={scaleCss(s.scale)}>
            <MathBoardDiagramPanel
                diagramId={diagram}
                label={label}
                revealAtFrame={revealAtFrame}
                width={diagramW}
                height={diagramH}
            />
            <div className={classes.formulaColumn}>
                <AnimatedMathFormula
                    text={text}
                    revealAtFrame={revealAtFrame + 8}
                    fontSize={s.px(50)}
                    emphasis={emphasis}
                />
            </div>
        </div>
    );
}
