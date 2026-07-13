// /Users/johndoe/Documents/company/basic_ui/video_ops/remotion/src/components/universal/MathBoardBeatSlide.tsx
import type { MathBoardDiagramId } from '@turn-video-shared/panels/mathBoardDiagramTypes';
import { AnimatedMathFormula } from '@turn-video-shared/panels/AnimatedMathFormula';

import { useCompositionScale } from '../../lib/useCompositionScale';
import { MathBoardDiagramPanel } from './mathBoardDiagrams/MathBoardDiagramPanel';

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
        <div
            style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: s.px(72),
                width: '100%',
                maxWidth: s.px(1620),
            }}
        >
            <MathBoardDiagramPanel
                diagramId={diagram}
                label={label}
                revealAtFrame={revealAtFrame}
                width={diagramW}
                height={diagramH}
            />
            <div style={{ flex: 1, minWidth: 0, display: 'flex', justifyContent: 'flex-start' }}>
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
