import type { ReactNode } from 'react';

import { VideoClipBeat } from '../../components/VideoClipBeat/VideoClipBeat';
import { BeatTemplateStage } from '../BeatTemplateStage';
import { beatTemplateStageMeta } from '../beatTemplateStageMeta';
import { CompareBeatContent } from '../Compare/CompareDualBeat';
import { cfgString } from '../configHelpers';
import type { BeatTemplateComponentProps } from '../types';

/** Filmed presenter clip or compare fallback when no overlay asset is set. */
export function PresenterOverlayBeat(props: BeatTemplateComponentProps): ReactNode {
    const assetPath = cfgString(props.config, 'assetPath');
    const meta = beatTemplateStageMeta('presenter-overlay');
    const label = cfgString(props.config, 'animationId') ?? 'Presenter overlay';

    return (
        <BeatTemplateStage tone={meta.tone}>
            {assetPath?.trim() ? (
            <VideoClipBeat
                scriptId={props.scriptId}
                src={assetPath.trim()}
                objectFit="cover"
                label={label}
                beatDurationSeconds={props.scene.durationSeconds}
            />
            ) : (
                <CompareBeatContent {...props} />
            )}
        </BeatTemplateStage>
    );
}
