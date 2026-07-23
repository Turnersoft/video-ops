import { useEffect, useState } from 'react';
import classes from './BeatCommentEditor.module.scss';

import { persistCompareBeatEditorNotesToFile } from '../../lib/studio/persistCompareBeatEditorNotes';
import { scaleCss } from '../../lib/layout/scaleCss';
import { useCompositionScale } from '../../lib/layout/useCompositionScale';

type BeatCommentEditorProps = {
    scriptId: string;
    sceneIndex: number;
    beatIndex: number;
    comment: string;
    allowScriptChange: boolean;
};

/** Remotion-native per-beat comment editor; visible only in the Studio script overlay. */
export function BeatCommentEditor({
    scriptId,
    sceneIndex,
    beatIndex,
    comment,
    allowScriptChange,
}: BeatCommentEditorProps) {
    const s = useCompositionScale();
    const [draft, setDraft] = useState(comment);
    const [allowChange, setAllowChange] = useState(allowScriptChange);
    const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    const [error, setError] = useState('');

    useEffect(() => {
        setDraft(comment);
        setAllowChange(allowScriptChange);
        setStatus('idle');
        setError('');
    }, [allowScriptChange, beatIndex, comment, sceneIndex, scriptId]);

    const save = async () => {
        setStatus('saving');
        setError('');
        const result = await persistCompareBeatEditorNotesToFile({
            scriptId,
            sceneIndex,
            beatIndex,
            comment: draft,
            allowScriptChange: allowChange,
        });
        if (!result.ok) {
            setStatus('error');
            setError(result.error);
            return;
        }
        setDraft(result.comment);
        setAllowChange(result.allowScriptChange);
        setStatus('saved');
        window.setTimeout(() => setStatus('idle'), 1500);
    };

    return (
        <div className={classes.root} style={scaleCss(s.scale)}>
            <label
                htmlFor={`beat-comment-${sceneIndex}-${beatIndex}`}
                className={classes.label}
            >
                Comment · beat {beatIndex + 1}
            </label>
            <textarea
                id={`beat-comment-${sceneIndex}-${beatIndex}`}
                rows={2}
                value={draft}
                placeholder="Notes for rewriting this beat…"
                onChange={(event) => {
                    setDraft(event.target.value);
                    setStatus('idle');
                }}
                className={classes.textarea}
            />
            <div className={classes.actions}>
                <label className={classes.checkboxLabel}>
                    <input
                        type="checkbox"
                        checked={allowChange}
                        onChange={(event) => {
                            setAllowChange(event.target.checked);
                            setStatus('idle');
                        }}
                    />
                    Allow changing this beat’s script
                </label>
                <button
                    type="button"
                    disabled={status === 'saving'}
                    onClick={() => void save()}
                    className={`${classes.saveButton} ${status === 'saving' ? classes.saveButtonSaving : ''}`}
                >
                    {status === 'saving' ? 'Saving…' : 'Save comment'}
                </button>
            </div>
            {status === 'saved' ? (
                <span className={classes.statusSaved}>Saved</span>
            ) : null}
            {status === 'error' ? (
                <span className={classes.statusError}>{error}</span>
            ) : null}
        </div>
    );
}
