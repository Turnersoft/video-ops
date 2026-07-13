// /Users/johndoe/Documents/company/video_ops/remotion/src/components/universal/VideoClipBeat.tsx
import { ScriptAssetVideo } from '../ScriptAssetVideo';
import { useCompositionScale } from '../../lib/useCompositionScale';

type VideoClipBeatProps = {
    scriptId: string;
    src: string;
    objectFit?: 'contain' | 'cover';
    label?: string;
    trimIn?: number;
    trimOut?: number;
};

/** Main-layer beat that presents a bundled video clip. */
export function VideoClipBeat({
    scriptId,
    src,
    objectFit = 'contain',
    label,
    trimIn,
    trimOut,
}: VideoClipBeatProps) {
    const s = useCompositionScale();

    return (
        <div
            style={{
                flex: 1,
                minHeight: 0,
                display: 'flex',
                flexDirection: 'column',
                borderRadius: s.px(20),
                overflow: 'hidden',
                border: '1px solid rgba(148, 163, 184, 0.22)',
                background: '#020617',
            }}
        >
            {label ? (
                <div
                    style={{
                        padding: `${s.px(10)} ${s.px(18)}`,
                        fontSize: s.px(14),
                        fontWeight: 600,
                        color: 'rgba(226, 232, 240, 0.78)',
                        borderBottom: '1px solid rgba(148, 163, 184, 0.16)',
                    }}
                >
                    {label}
                </div>
            ) : null}
            <div style={{ flex: 1, minHeight: 0 }}>
                <ScriptAssetVideo
                    scriptId={scriptId}
                    src={src}
                    objectFit={objectFit}
                    trimIn={trimIn}
                    trimOut={trimOut}
                />
            </div>
        </div>
    );
}
