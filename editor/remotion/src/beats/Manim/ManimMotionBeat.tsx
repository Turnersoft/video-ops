import type { ReactNode } from 'react';

import type { MathBoardDiagramId } from '../../lib/panels/mathBoardDiagramTypes';
import { MathBoard } from '../../components/MathBoard/MathBoard';
import type { MathBoardLayer } from '../../lib/layers/types';
import { BeatTemplateStage } from '../BeatTemplateStage';
import { beatTemplateStageMeta } from '../beatTemplateStageMeta';
import { cfgString } from '../configHelpers';
import type { BeatTemplateComponentProps } from '../types';
import { ManimWebScene } from './ManimWebScene';

/** Manim-like motion graphics via math-board slides or editable manim-web code. */
export function ManimMotionBeat({
    scriptId,
    scene,
    config,
    contentRevision,
}: BeatTemplateComponentProps): ReactNode {
    const manimWebCode = cfgString(config, 'manimWebCode')?.trim();
    const meta = beatTemplateStageMeta('manim-motion');

    if (manimWebCode) {
        return (
            <BeatTemplateStage tone={meta.tone}>
                <ManimWebScene code={manimWebCode} contentRevision={contentRevision} />
            </BeatTemplateStage>
        );
    }

    const diagramId = cfgString(config, 'diagramId') as MathBoardDiagramId | undefined;
    const layer: MathBoardLayer = {
        type: 'math-board',
        heading: cfgString(config, 'caption') ?? cfgString(config, 'subTemplate') ?? 'Motion',
        beats: [
            {
                label: diagramId ?? cfgString(config, 'subTemplate') ?? 'diagram',
                detail: cfgString(config, 'caption'),
                diagram: diagramId,
            },
        ],
    };

    return (
        <BeatTemplateStage tone={meta.tone}>
            <MathBoard scriptId={scriptId} layer={layer} durationSeconds={scene.durationSeconds} />
        </BeatTemplateStage>
    );
}
