import type { ReactNode } from 'react';

import { BeatTemplateStage } from '../BeatTemplateStage';
import { beatTemplateStageMeta } from '../beatTemplateStageMeta';
import { CompareBeatContent } from '../Compare/CompareDualBeat';
import type { BeatTemplateSceneProps } from '../types';

/** Full-frame screen capture on the compare shell (beat.video from screenTrackPath). */
export function ScreenRecordingBeat(props: BeatTemplateSceneProps): ReactNode {
    const meta = beatTemplateStageMeta('screen-recording');
    return (
        <BeatTemplateStage tone={meta.tone}>
            <CompareBeatContent {...props} />
        </BeatTemplateStage>
    );
}
