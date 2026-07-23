// /Users/johndoe/Documents/company/basic_ui/video_ops/remotion/src/components/CompareFontScalesSaveBar.tsx
import { useCallback, useState } from 'react';
import classes from './CompareFontScalesSaveBar.module.scss';

import {
    type CompareFontScales,
    persistAllCompareBeatFontScalesToFile,
    writeAllCompareBeatFontScalesToStorage,
} from '../../lib/tracks/compareFontScale';

import { scaleCss } from '../../lib/layout/scaleCss';
import { useCompositionScale } from '../../lib/layout/useCompositionScale';

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
        setFeedback(`Saved ${saved.beatFontScales.length} beats to animation.md`);
        window.setTimeout(() => setFeedback(''), 3200);
    }, [beatCount, resolveScope, scriptId]);

    return (
        <div
            className={classes.root}
            style={scaleCss(s.scale)}
            onPointerDown={(event) => event.stopPropagation()}
        >
            <button
                type="button"
                className={`${classes.button} ${saving ? classes.buttonSaving : ''}`}
                disabled={saving}
                onClick={() => void handleSave()}
            >
                {saving ? 'Saving font scales…' : 'Save font scales'}
            </button>
            {feedback ? <span className={classes.feedback}>{feedback}</span> : null}
        </div>
    );
}
