import type { ReactNode } from 'react';
import { Easing, interpolate, useCurrentFrame } from 'remotion';

import { scaleCss } from '../lib/layout/scaleCss';
import { useCompositionScale } from '../lib/layout/useCompositionScale';
import classes from './BeatTemplateStage.module.scss';

export type BeatTemplateStageTone =
    | 'compare'
    | 'stickers'
    | 'coding'
    | 'motion'
    | 'presenter';

type BeatTemplateStageProps = {
    tone: BeatTemplateStageTone;
    /** Tighter chrome for outdoor portrait panes. */
    compact?: boolean;
    children: ReactNode;
};

const TONE_CLASS: Record<BeatTemplateStageTone, string> = {
    compare: classes.compare,
    stickers: classes.stickers,
    coding: classes.coding,
    motion: classes.motion,
    presenter: classes.presenter,
};

/** Template tone shell — background chrome only; beats own their own titles. */
export function BeatTemplateStage({
    tone,
    compact = false,
    children,
}: BeatTemplateStageProps): ReactNode {
    const frame = useCurrentFrame();
    const s = useCompositionScale();
    const contentEntrance = interpolate(frame, [0, 18], [0, 1], {
        easing: Easing.bezier(0.16, 1, 0.3, 1),
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
    });

    return (
        <section
            className={`${classes.stage} ${TONE_CLASS[tone]} ${compact ? classes.compact : ''}`}
            style={scaleCss(s.scale)}
        >
            <div
                className={classes.content}
                style={{
                    opacity: contentEntrance,
                    translate: `0 ${Math.round((1 - contentEntrance) * s.px(12))}px`,
                }}
            >
                {children}
            </div>
        </section>
    );
}
