import { useEffect, useState } from 'react';

import { persistCompareBeatEditorNotesToFile } from '../../../../basic_ui/src/shared/turn-video/ide/persistCompareBeatEditorNotes';
import { useCompositionScale } from '../lib/useCompositionScale';

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
        <div
            style={{
                paddingTop: s.px(10),
                borderTop: `${s.px(1)}px solid rgba(148, 163, 184, 0.2)`,
                display: 'flex',
                flexDirection: 'column',
                gap: s.px(8),
            }}
        >
            <label
                htmlFor={`beat-comment-${sceneIndex}-${beatIndex}`}
                style={{
                    fontSize: s.px(11),
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: 'rgba(245, 241, 232, 0.72)',
                }}
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
                style={{
                    width: '100%',
                    minHeight: s.px(80),
                    resize: 'vertical',
                    boxSizing: 'border-box',
                    borderRadius: s.px(8),
                    border: `${s.px(1)}px solid rgba(148, 163, 184, 0.3)`,
                    background: 'rgba(15, 23, 42, 0.72)',
                    color: '#f5f1e8',
                    padding: `${s.px(8)}px ${s.px(10)}px`,
                    fontFamily: 'Inter, system-ui, sans-serif',
                    fontSize: s.px(24),
                    fontWeight: 650,
                    lineHeight: 1.35,
                }}
            />
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: s.px(12),
                    flexWrap: 'wrap',
                }}
            >
                <label
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: s.px(7),
                        color: 'rgba(245, 241, 232, 0.8)',
                        fontSize: s.px(14),
                        cursor: 'pointer',
                    }}
                >
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
                    style={{
                        border: `${s.px(1)}px solid rgba(128, 217, 200, 0.4)`,
                        background: 'rgba(128, 217, 200, 0.15)',
                        color: '#dff7f0',
                        borderRadius: s.px(8),
                        padding: `${s.px(7)}px ${s.px(12)}px`,
                        fontSize: s.px(13),
                        fontWeight: 600,
                        cursor: status === 'saving' ? 'default' : 'pointer',
                        opacity: status === 'saving' ? 0.6 : 1,
                    }}
                >
                    {status === 'saving' ? 'Saving…' : 'Save comment'}
                </button>
            </div>
            {status === 'saved' ? (
                <span style={{ color: '#80d9c8', fontSize: s.px(12) }}>Saved</span>
            ) : null}
            {status === 'error' ? (
                <span style={{ color: '#fca5a5', fontSize: s.px(12) }}>{error}</span>
            ) : null}
        </div>
    );
}
