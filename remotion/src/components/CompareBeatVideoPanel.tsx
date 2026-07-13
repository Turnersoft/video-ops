// /Users/johndoe/Documents/company/video_ops/remotion/src/components/CompareBeatVideoPanel.tsx
import type { CompareBeatVideo } from '../lib/renderProps';
import { useCompositionScale } from '../lib/useCompositionScale';
import { ScriptAssetVideo } from './ScriptAssetVideo';

type CompareBeatVideoPanelProps = {
    scriptId: string;
    video: CompareBeatVideo;
};

/** Full-pane video beat inside compare / outdoor portrait layouts. */
export function CompareBeatVideoPanel({ scriptId, video }: CompareBeatVideoPanelProps) {
    const s = useCompositionScale();

    return (
        <div
            style={{
                flex: 1,
                minHeight: 0,
                display: 'flex',
                flexDirection: 'column',
                borderRadius: s.px(18),
                overflow: 'hidden',
                border: '1px solid rgba(148, 163, 184, 0.22)',
                background: '#020617',
            }}
        >
            {video.label ? (
                <div
                    style={{
                        padding: `${s.px(8)} ${s.px(14)}`,
                        fontSize: s.px(13),
                        fontWeight: 600,
                        letterSpacing: '0.04em',
                        textTransform: 'uppercase',
                        color: 'rgba(226, 232, 240, 0.72)',
                        borderBottom: '1px solid rgba(148, 163, 184, 0.16)',
                    }}
                >
                    {video.label}
                </div>
            ) : null}
            <div style={{ flex: 1, minHeight: 0 }}>
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
