// /Users/johndoe/Documents/company/basic_ui/video_ops/remotion/src/components/CompareFontScalesSaveBar.tsx
import { useCallback, useState, type CSSProperties } from 'react';

import {
    type CompareFontScales,
    persistAllCompareBeatFontScalesToFile,
    writeAllCompareBeatFontScalesToStorage,
} from '@turn-video-shared/ide/compareFontScale';
import {
    COMPARE_BODY_RELATIVE_SCALE,
    COMPARE_CHROME_FONT_SCALE,
} from '@turn-video-shared/ide/compareTypography';

import { useCompositionScale } from '../lib/useCompositionScale';

type CompareFontScalesSaveBarProps = {
    scriptId: string;
    beatCount: number;
    resolveScope: () => CompareFontScales[];
};

export function CompareFontScalesSaveBar({
    scriptId,
    beatCount,
    resolveScope,
}: CompareFontScalesSaveBarProps) {
    const s = useCompositionScale();
    const cf = (size: number) => s.px(size * COMPARE_CHROME_FONT_SCALE * COMPARE_BODY_RELATIVE_SCALE);
    const [feedback, setFeedback] = useState('');
    const [saving, setSaving] = useState(false);

    const handleSave = useCallback(async () => {
        if (beatCount === 0) {
            setFeedback('No compare beats');
            window.setTimeout(() => setFeedback(''), 2400);
            return;
        }
        const scope = resolveScope();
        if (scope.length === 0) {
            setFeedback('Nothing to save');
            window.setTimeout(() => setFeedback(''), 2400);
            return;
        }
        setSaving(true);
        writeAllCompareBeatFontScalesToStorage(scriptId, scope);
        const saved = await persistAllCompareBeatFontScalesToFile(scriptId, scope);
        setSaving(false);
        if (!saved.ok) {
            setFeedback(saved.error);
            window.setTimeout(() => setFeedback(''), 4800);
            return;
        }
        setFeedback(`Saved ${saved.beatFontScales.length} beats to animation.json`);
        window.setTimeout(() => setFeedback(''), 3200);
    }, [beatCount, resolveScope, scriptId]);

    const buttonStyle: CSSProperties = {
        border: '1px solid rgba(60, 54, 45, 0.22)',
        borderRadius: cf(8),
        background: 'rgba(255, 255, 255, 0.92)',
        color: '#3d3932',
        fontSize: cf(11),
        fontWeight: 700,
        padding: `${cf(6)}px ${cf(12)}px`,
        cursor: saving ? 'wait' : 'pointer',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.12)',
        whiteSpace: 'nowrap',
    };

    return (
        <div
            style={{
                position: 'absolute',
                top: cf(10),
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 80,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: cf(4),
                pointerEvents: 'auto',
            }}
            onPointerDown={(event) => event.stopPropagation()}
        >
            <button type="button" style={buttonStyle} disabled={saving} onClick={() => void handleSave()}>
                {saving ? 'Saving font scales…' : 'Save font scales'}
            </button>
            {feedback ? (
                <span
                    style={{
                        maxWidth: cf(360),
                        textAlign: 'center',
                        fontSize: cf(10),
                        fontWeight: 600,
                        color: '#f5f1e8',
                        background: 'rgba(16, 21, 19, 0.82)',
                        padding: `${cf(4)}px ${cf(8)}px`,
                        borderRadius: cf(6),
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
                    }}
                >
                    {feedback}
                </span>
            ) : null}
        </div>
    );
}
