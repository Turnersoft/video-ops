import type { ReactNode } from 'react';

import { BeatTemplateStage } from '../BeatTemplateStage';
import { beatTemplateStageMeta } from '../beatTemplateStageMeta';
import { CompareBeatContent } from '../Compare/CompareDualBeat';
import type { BeatTemplateSceneProps } from '../types';

/** Compare base layer with ephemeral sticker overlays (timing from beat.stickers). */
export function StickersBeat(props: BeatTemplateSceneProps): ReactNode {
    const meta = beatTemplateStageMeta('stickers');
    return (
        <BeatTemplateStage tone={meta.tone}>
            <CompareBeatContent {...props} />
        </BeatTemplateStage>
    );
}
