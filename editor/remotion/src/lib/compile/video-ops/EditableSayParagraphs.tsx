// /Users/johndoe/Documents/company/basic_ui/src/pages/VideoOpsPage/EditableSayParagraphs.tsx
import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    type CSSProperties,
    type ChangeEvent,
} from 'react';

import { persistCompareBeatSayToFile } from '../../studio/persistCompareBeatSay';
import { joinSayParagraphs, sayParagraphsForDisplay } from './parseVideoOpsMarkdown';

type AutoSizeSayRowProps = {
    value: string;
    onChange: (value: string) => void;
    style?: CSSProperties;
    autoFocus?: boolean;
    /** 0–1 beat elapsed — fills row background left-to-right while filming. */
    beatProgress?: number;
};

/** One teleprompter sentence — wraps inside the panel and grows the row height. */
function AutoSizeSayRow({ value, onChange, style, autoFocus, beatProgress }: AutoSizeSayRowProps) {
    const ref = useRef<HTMLTextAreaElement>(null);

    const syncSize = useCallback(() => {
        const element = ref.current;
        if (!element) {
            return;
        }
        element.style.height = '0px';
        element.style.height = `${element.scrollHeight}px`;
    }, []);

    useEffect(() => {
        syncSize();
    }, [value, syncSize]);

    useEffect(() => {
        if (!autoFocus) {
            return;
        }
        ref.current?.focus();
    }, [autoFocus]);

    useEffect(() => {
        const element = ref.current;
        if (!element || typeof ResizeObserver === 'undefined') {
            return;
        }
        const observer = new ResizeObserver(() => {
            syncSize();
        });
        observer.observe(element);
        return () => observer.disconnect();
    }, [syncSize]);

    const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
        onChange(event.target.value);
        requestAnimationFrame(syncSize);
    };

    const progressPct =
        beatProgress !== undefined ? Math.max(0, Math.min(1, beatProgress)) * 100 : undefined;

    return (
        <div
            style={{
                position: 'relative',
                flex: 1,
                minWidth: 0,
                borderRadius: style?.borderRadius ?? 6,
                overflow: 'hidden',
            }}
        >
            {progressPct !== undefined ? (
                <div
                    aria-hidden
                    style={{
                        position: 'absolute',
                        inset: 0,
                        background: `linear-gradient(to right,
                            rgba(128, 217, 200, 0.28) 0%,
                            rgba(128, 217, 200, 0.16) ${progressPct}%,
                            rgba(255, 255, 255, 0.04) ${progressPct}%,
                            rgba(255, 255, 255, 0.04) 100%)`,
                        pointerEvents: 'none',
                        transition: 'background 0.12s linear',
                    }}
                />
            ) : null}
            <textarea
                ref={ref}
                value={value}
                rows={1}
                onChange={handleChange}
                style={{
                    position: 'relative',
                    display: 'block',
                    flex: 1,
                    minWidth: 0,
                    width: '100%',
                    boxSizing: 'border-box',
                    whiteSpace: 'pre-wrap',
                    overflowWrap: 'break-word',
                    wordBreak: 'break-word',
                    overflow: 'hidden',
                    resize: 'none',
                    background: progressPct !== undefined ? 'transparent' : style?.background,
                    ...style,
                }}
            />
        </div>
    );
}

const insertButtonStyle: CSSProperties = {
    fontSize: 12,
    fontWeight: 700,
    lineHeight: 1,
    width: 26,
    height: 22,
    padding: 0,
    borderRadius: 5,
    border: '1px solid rgba(245, 241, 232, 0.22)',
    background: 'rgba(255, 255, 255, 0.06)',
    color: '#f5f1e8',
    cursor: 'pointer',
    flexShrink: 0,
};

type EditableSayParagraphsProps = {
    text: string;
    className?: string;
    style?: CSSProperties;
    paragraphStyle?: CSSProperties;
    editable?: boolean;
    scriptId?: string;
    beatIndex?: number;
    sceneIndex?: number;
    onSaved?: (say: string) => void;
    /** Elapsed fraction of the active beat (0–1) for teleprompter progress fill. */
    beatProgress?: number;
};

/** Teleprompter rows — read-only or one textarea per sentence with save. */
export function EditableSayParagraphs({
    text,
    className,
    style,
    paragraphStyle,
    editable = false,
    scriptId,
    beatIndex,
    sceneIndex = 0,
    onSaved,
    beatProgress,
}: EditableSayParagraphsProps) {
    const displayRows = useMemo(() => sayParagraphsForDisplay(text), [text]);
    const [rows, setRows] = useState<string[]>(displayRows);
    const [saveFeedback, setSaveFeedback] = useState('');
    const [saving, setSaving] = useState(false);
    const [focusRowIndex, setFocusRowIndex] = useState<number | null>(null);

    useEffect(() => {
        setRows(displayRows);
        setSaveFeedback('');
        setFocusRowIndex(null);
    }, [text, beatIndex, displayRows]);

    useEffect(() => {
        if (focusRowIndex === null) {
            return;
        }
        setFocusRowIndex(null);
    }, [rows, focusRowIndex]);

    const savedJoined = useMemo(() => joinSayParagraphs(sayParagraphsForDisplay(text)), [text]);
    const joinedDraft = useMemo(() => joinSayParagraphs(rows), [rows]);
    const dirty = joinedDraft !== savedJoined && joinedDraft.length > 0;

    const updateRow = useCallback((index: number, value: string) => {
        setRows((previous) => previous.map((row, rowIndex) => (rowIndex === index ? value : row)));
        setSaveFeedback('');
    }, []);

    const addRow = useCallback(() => {
        setRows((previous) => [...previous, '']);
        setFocusRowIndex(rows.length);
        setSaveFeedback('');
    }, [rows.length]);

    const insertRowAbove = useCallback((index: number) => {
        setRows((previous) => {
            const next = [...previous];
            next.splice(index, 0, '');
            return next;
        });
        setFocusRowIndex(index);
        setSaveFeedback('');
    }, []);

    const insertRowBelow = useCallback((index: number) => {
        setRows((previous) => {
            const next = [...previous];
            next.splice(index + 1, 0, '');
            return next;
        });
        setFocusRowIndex(index + 1);
        setSaveFeedback('');
    }, []);

    const save = useCallback(async () => {
        if (!scriptId || beatIndex === undefined || !dirty) {
            return;
        }
        setSaving(true);
        setSaveFeedback('');
        const saved = await persistCompareBeatSayToFile({
            scriptId,
            beatIndex,
            sceneIndex,
            say: joinedDraft,
        });
        setSaving(false);
        if (!saved.ok) {
            setSaveFeedback(saved.error);
            return;
        }
        setSaveFeedback('Saved');
        onSaved?.(saved.say);
        window.setTimeout(() => setSaveFeedback(''), 2000);
    }, [beatIndex, dirty, joinedDraft, onSaved, sceneIndex, scriptId]);

    if (rows.length === 0 && !editable) {
        return null;
    }

    const rowStyle: CSSProperties = {
        width: '100%',
        boxSizing: 'border-box',
        background: editable ? 'rgba(255, 255, 255, 0.06)' : undefined,
        border: editable ? '1px solid rgba(255, 255, 255, 0.14)' : undefined,
        borderRadius: editable ? 6 : undefined,
        padding: editable ? '6px 8px' : undefined,
        color: 'inherit',
        font: 'inherit',
        lineHeight: 1.35,
        ...paragraphStyle,
    };

    return (
        <div className={className} style={style}>
            {rows.map((row, index) =>
                editable ? (
                    <div
                        key={`say-row-${index}`}
                        style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 6,
                            ...(index > 0 ? { marginTop: '0.35em' } : undefined),
                        }}
                    >
                        <div
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 4,
                                paddingTop: 4,
                            }}
                        >
                            <button
                                type="button"
                                title="Add sentence above"
                                aria-label="Add sentence above"
                                onClick={() => insertRowAbove(index)}
                                style={insertButtonStyle}
                            >
                                ↑
                            </button>
                            <button
                                type="button"
                                title="Add sentence below"
                                aria-label="Add sentence below"
                                onClick={() => insertRowBelow(index)}
                                style={insertButtonStyle}
                            >
                                ↓
                            </button>
                        </div>
                        <AutoSizeSayRow
                            value={row}
                            onChange={(value) => updateRow(index, value)}
                            autoFocus={focusRowIndex === index}
                            beatProgress={beatProgress}
                            style={rowStyle}
                        />
                    </div>
                ) : (
                    <div
                        key={`say-row-${index}`}
                        style={{
                            ...paragraphStyle,
                            ...(index > 0 ? { marginTop: '0.35em' } : undefined),
                        }}
                    >
                        {row}
                    </div>
                ),
            )}
            {editable ? (
                <div
                    style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        gap: 8,
                        marginTop: 10,
                    }}
                >
                    <button
                        type="button"
                        disabled={!dirty || saving}
                        onClick={() => void save()}
                        style={{
                            fontSize: 13,
                            fontWeight: 600,
                            padding: '6px 12px',
                            borderRadius: 8,
                            border: '1px solid rgba(128, 217, 200, 0.35)',
                            background: dirty
                                ? 'rgba(128, 217, 200, 0.18)'
                                : 'rgba(255,255,255,0.04)',
                            color: dirty ? '#80d9c8' : 'rgba(245, 241, 232, 0.45)',
                            cursor: dirty && !saving ? 'pointer' : 'not-allowed',
                        }}
                    >
                        {saving ? 'Saving…' : 'Save script'}
                    </button>
                    <button
                        type="button"
                        onClick={addRow}
                        style={{
                            fontSize: 13,
                            fontWeight: 600,
                            padding: '6px 12px',
                            borderRadius: 8,
                            border: '1px solid rgba(245, 241, 232, 0.22)',
                            background: 'rgba(255, 255, 255, 0.06)',
                            color: '#f5f1e8',
                            cursor: 'pointer',
                        }}
                    >
                        Add sentence
                    </button>
                    {saveFeedback ? (
                        <span style={{ fontSize: 13, color: '#80d9c8', fontWeight: 600 }}>
                            {saveFeedback}
                        </span>
                    ) : null}
                </div>
            ) : null}
        </div>
    );
}
