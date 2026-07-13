// /Users/johndoe/Documents/company/basic_ui/video_ops/remotion/src/components/universal/CoverEditorControls.tsx
import type { CoverLayerId } from '@turn-video-shared/coverLayout';
import type { VideoOpsCoverOverride } from '@turn-video-shared/videoOpsCover';

import { useCompositionScale } from '../../lib/useCompositionScale';

const LAYER_LABELS: Record<CoverLayerId, string> = {
    seriesTitle: 'Series title',
    logoCluster: 'Logos + VS',
    concept: 'Concept badge',
    episodeTitle: 'Episode title',
};

type CoverEditorControlsProps = {
    selectedLayer: CoverLayerId | null;
    cover: VideoOpsCoverOverride;
    canEdit: boolean;
    saveStatus: 'idle' | 'saving' | 'saved' | 'error';
    onSelectLayer: (layerId: CoverLayerId) => void;
    onStyleChange: (patch: VideoOpsCoverOverride) => void;
};

export function CoverEditorControls({
    selectedLayer,
    cover,
    canEdit,
    saveStatus,
    onSelectLayer,
    onStyleChange,
}: CoverEditorControlsProps) {
    const s = useCompositionScale();

    if (!canEdit) {
        return null;
    }

    const style = cover.episodeTitleStyle ?? {};
    const strokeWidth = style.strokeWidth ?? 14;
    const fontSize = style.fontSize ?? 98;

    return (
        <div
            style={{
                position: 'absolute',
                right: s.px(16),
                bottom: s.px(16),
                zIndex: 100,
                width: s.px(280),
                padding: s.px(14),
                borderRadius: s.px(10),
                background: 'rgba(15, 23, 42, 0.92)',
                border: '1px solid rgba(148, 163, 184, 0.35)',
                color: '#f8fafc',
                fontFamily: 'Inter, system-ui, sans-serif',
                fontSize: s.px(12),
                boxShadow: '0 12px 40px rgba(0,0,0,0.35)',
                pointerEvents: 'auto',
            }}
        >
            <div style={{ fontWeight: 700, marginBottom: s.px(8), fontSize: s.px(13) }}>
                Cover layout
            </div>
            <div style={{ opacity: 0.75, marginBottom: s.px(10), lineHeight: 1.4 }}>
                Click a layer to select. Drag to move; use corner/edge handles to resize.
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: s.px(6), marginBottom: s.px(12) }}>
                {(Object.keys(LAYER_LABELS) as CoverLayerId[]).map((layerId) => (
                    <button
                        key={layerId}
                        type="button"
                        onClick={() => onSelectLayer(layerId)}
                        style={{
                            padding: `${s.px(4)}px ${s.px(8)}px`,
                            borderRadius: s.px(6),
                            border:
                                selectedLayer === layerId
                                    ? '1px solid #a78bfa'
                                    : '1px solid rgba(148,163,184,0.4)',
                            background:
                                selectedLayer === layerId ? 'rgba(124,58,237,0.35)' : 'transparent',
                            color: '#f8fafc',
                            cursor: 'pointer',
                            fontSize: s.px(11),
                        }}
                    >
                        {LAYER_LABELS[layerId]}
                    </button>
                ))}
            </div>

            {selectedLayer === 'episodeTitle' && (
                <div style={{ borderTop: '1px solid rgba(148,163,184,0.25)', paddingTop: s.px(10) }}>
                    <div style={{ fontWeight: 600, marginBottom: s.px(8) }}>Title text style</div>

                    <label style={{ display: 'block', marginBottom: s.px(8) }}>
                        <span style={{ display: 'block', marginBottom: s.px(4), opacity: 0.85 }}>
                            Font size ({fontSize})
                        </span>
                        <input
                            type="range"
                            min={91}
                            max={98}
                            step={1}
                            value={fontSize}
                            onChange={(event) =>
                                onStyleChange({
                                    episodeTitleStyle: {
                                        ...style,
                                        fontSize: Number(event.target.value),
                                    },
                                })
                            }
                            style={{ width: '100%' }}
                        />
                    </label>

                    <label style={{ display: 'block', marginBottom: s.px(8) }}>
                        <span style={{ display: 'block', marginBottom: s.px(4), opacity: 0.85 }}>
                            Border thickness ({strokeWidth}px)
                        </span>
                        <input
                            type="range"
                            min={4}
                            max={24}
                            step={1}
                            value={strokeWidth}
                            onChange={(event) =>
                                onStyleChange({
                                    episodeTitleStyle: {
                                        ...style,
                                        strokeWidth: Number(event.target.value),
                                    },
                                })
                            }
                            style={{ width: '100%' }}
                        />
                    </label>

                    <label style={{ display: 'block', marginBottom: s.px(8) }}>
                        <span style={{ display: 'block', marginBottom: s.px(4), opacity: 0.85 }}>
                            Fill accent color
                        </span>
                        <input
                            type="color"
                            value={style.titleColor ?? cover.titleColor ?? '#b8ff2e'}
                            onChange={(event) =>
                                onStyleChange({
                                    episodeTitleStyle: {
                                        ...style,
                                        titleColor: event.target.value,
                                    },
                                })
                            }
                            style={{ width: '100%', height: s.px(32), cursor: 'pointer' }}
                        />
                    </label>

                    <label style={{ display: 'block' }}>
                        <span style={{ display: 'block', marginBottom: s.px(4), opacity: 0.85 }}>
                            Border color
                        </span>
                        <input
                            type="color"
                            value={style.titleStroke ?? cover.titleStroke ?? '#1a4fd8'}
                            onChange={(event) =>
                                onStyleChange({
                                    episodeTitleStyle: {
                                        ...style,
                                        titleStroke: event.target.value,
                                    },
                                })
                            }
                            style={{ width: '100%', height: s.px(32), cursor: 'pointer' }}
                        />
                    </label>
                </div>
            )}

            <div
                style={{
                    marginTop: s.px(10),
                    fontSize: s.px(11),
                    opacity: 0.7,
                }}
            >
                {saveStatus === 'saving' && 'Saving to animation.json…'}
                {saveStatus === 'saved' && 'Saved to script.'}
                {saveStatus === 'error' && 'Save failed — is the dev API on port 3021 running?'}
                {saveStatus === 'idle' && 'Changes auto-save to animation.json.'}
            </div>
        </div>
    );
}

export { LAYER_LABELS as COVER_LAYER_LABELS };
