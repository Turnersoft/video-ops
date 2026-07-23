// /Users/johndoe/Documents/company/video_ops/remotion/src/components/CompareBeatVideoPanel.tsx
import type { CompareBeatVideo } from '../../lib/types/renderProps';
import classes from './CompareBeatVideoPanel.module.scss';
import { scaleCss } from '../../lib/layout/scaleCss';
import { useCompositionScale } from '../../lib/layout/useCompositionScale';
import { ScriptAssetVideo } from '../ScriptAssetVideo/ScriptAssetVideo';

type CompareBeatVideoPanelProps = {
    scriptId: string;
    video: CompareBeatVideo;
};

/** Full-pane video beat inside compare / outdoor portrait layouts. */
export function CompareBeatVideoPanel({ scriptId, video }: CompareBeatVideoPanelProps) {
    const s = useCompositionScale();

    return (
        <div className={classes.root} style={scaleCss(s.scale)}>
            {video.label ? <div className={classes.label}>{video.label}</div> : null}
            <div className={classes.video}>
                <ScriptAssetVideo
                    scriptId={scriptId}
                    src={video.src}
                    objectFit={video.objectFit ?? 'contain'}
                    muted
                />
            </div>
        </div>
    );
}
