import {
    getRemotionEnvironment,
    interpolate,
    spring,
    useCurrentFrame,
    useVideoConfig,
} from 'remotion';
import {
    useCallback,
    useEffect,
    useRef,
    useState,
    type PointerEvent as ReactPointerEvent,
} from 'react';

import { loadMathJax3, type IMathJax3 } from '@yozora/react-mathjax';

import { scaleCss } from '../../lib/layout/scaleCss';
import { useCompositionScale } from '../../lib/layout/useCompositionScale';
import {
    VIDEO_MATHJAX_CONFIG,
    VIDEO_MATHJAX_SRC,
} from '../../lib/panels/videoMathJaxConfig';
import {
    AATA_BOOK_AUTHOR,
    AATA_BOOK_TITLE,
    humanizeAataExcerptId,
} from './aataExcerptAsset';
import {
    defaultTextbookPanelLayout,
    readTextbookPanelLayoutFromStorage,
    textbookPanelStorageKey,
    writeTextbookPanelLayoutToStorage,
    type TextbookPanelLayout,
} from './textbookPanelLayout';
import {
    textbookOverlayVisibleAt,
    type TextbookOverlayConfig,
} from './textbookOverlayTypes';
import classes from './TextbookPanel.module.scss';

export type TextbookPanelProps = {
    scriptId: string;
    sceneIndex: number;
    overlay: TextbookOverlayConfig;
};

function clampPct(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}

function TextbookMathParagraph({ text, className }: { text: string; className?: string }) {
    const nodeRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const node = nodeRef.current;
        if (!node) {
            return;
        }
        let cancelled = false;
        let MathJax3: IMathJax3 | null = null;
        void loadMathJax3(VIDEO_MATHJAX_SRC, VIDEO_MATHJAX_CONFIG)
            .then((loaded) => {
                MathJax3 = loaded;
                if (cancelled || !loaded) {
                    return;
                }
                return loaded.startup.promise.then(() => {
                    if (cancelled) {
                        return;
                    }
                    loaded.typesetClear([node]);
                    return loaded.typesetPromise([node]);
                });
            })
            .catch((err: unknown) => {
                console.error('Textbook MathJax typeset failed:', err);
            });
        return () => {
            cancelled = true;
            MathJax3?.typesetClear([node]);
        };
    }, [text]);

    return (
        <div ref={nodeRef} className={className}>
            {text}
        </div>
    );
}

function TextbookLatexBody({ latex }: { latex: string }) {
    const paragraphs = latex.split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean);
    return (
        <div className={classes.latexBody}>
            {paragraphs.map((paragraph) => (
                <TextbookMathParagraph
                    key={paragraph}
                    text={paragraph}
                    className={classes.latexParagraph}
                />
            ))}
        </div>
    );
}

function TextbookPanelCard({
    overlay,
    layout,
    fontScale,
    canDrag,
    onLayoutChange,
    onLayoutCommit,
}: {
    overlay: TextbookOverlayConfig;
    layout: TextbookPanelLayout;
    fontScale: number;
    canDrag: boolean;
    onLayoutChange: (layout: TextbookPanelLayout) => void;
    onLayoutCommit: (layout: TextbookPanelLayout) => void;
}) {
    const s = useCompositionScale();
    const panelRef = useRef<HTMLDivElement | null>(null);
    const dragOrigin = useRef<{ x: number; y: number; layout: TextbookPanelLayout } | null>(null);
    const [dragLayout, setDragLayout] = useState<TextbookPanelLayout | null>(null);
    const shownLayout = dragLayout ?? layout;

    const bookTitle = overlay.bookTitle ?? (overlay.aataExcerpt ? AATA_BOOK_TITLE : undefined);
    const bookAuthor = overlay.bookAuthor ?? (overlay.aataExcerpt ? AATA_BOOK_AUTHOR : undefined);
    const sectionKicker = overlay.source ?? overlay.section;
    const showDefinitionTitle = Boolean(overlay.definitionLabel) && !overlay.latex;
    const title =
        overlay.definitionLabel ??
        (overlay.aataExcerpt ? humanizeAataExcerptId(overlay.aataExcerpt) : 'Textbook excerpt');
    const body = overlay.body ?? (!overlay.latex ? 'Add LaTeX under the overlay in animation.md.' : '');

    const onPointerDown = useCallback(
        (event: ReactPointerEvent<HTMLDivElement>) => {
            if (!canDrag) {
                return;
            }
            event.stopPropagation();
            dragOrigin.current = {
                x: event.clientX,
                y: event.clientY,
                layout: shownLayout,
            };
            event.currentTarget.setPointerCapture(event.pointerId);
        },
        [canDrag, shownLayout],
    );

    const onPointerMove = useCallback(
        (event: ReactPointerEvent<HTMLDivElement>) => {
            if (!dragOrigin.current || !panelRef.current?.parentElement) {
                return;
            }
            const parent = panelRef.current.parentElement;
            const rect = parent.getBoundingClientRect();
            const dx = event.clientX - dragOrigin.current.x;
            const dy = event.clientY - dragOrigin.current.y;
            const nextLayout: TextbookPanelLayout = {
                ...dragOrigin.current.layout,
                xPct: clampPct(
                    dragOrigin.current.layout.xPct + (dx / Math.max(rect.width, 1)) * 100,
                    8,
                    92,
                ),
                yPct: clampPct(
                    dragOrigin.current.layout.yPct + (dy / Math.max(rect.height, 1)) * 100,
                    8,
                    92,
                ),
            };
            setDragLayout(nextLayout);
            onLayoutChange(nextLayout);
        },
        [onLayoutChange],
    );

    const onPointerUp = useCallback(
        (event: ReactPointerEvent<HTMLDivElement>) => {
            if (!dragOrigin.current) {
                return;
            }
            const committed = dragLayout ?? dragOrigin.current.layout;
            dragOrigin.current = null;
            setDragLayout(null);
            event.currentTarget.releasePointerCapture(event.pointerId);
            onLayoutCommit(committed);
        },
        [dragLayout, onLayoutCommit],
    );

    return (
        <div
            ref={panelRef}
            className={`${classes.panel} ${canDrag ? classes.panelDraggable : classes.panelReadonly}`}
            style={{
                ...scaleCss(s.scale * fontScale),
                left: `${shownLayout.xPct}%`,
                top: `${shownLayout.yPct}%`,
                width: `${shownLayout.wPct}%`,
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
        >
            <div className={classes.paper}>
                {canDrag ? <div className={classes.handle}>drag</div> : null}
                <div className={classes.content}>
                    {sectionKicker ? <p className={classes.sectionKicker}>{sectionKicker}</p> : null}
                    {showDefinitionTitle ? <h3 className={classes.title}>{title}</h3> : null}
                    {overlay.latex ? (
                        <TextbookLatexBody latex={overlay.latex} />
                    ) : body ? (
                        <p className={classes.body}>{body}</p>
                    ) : null}
                </div>
                {bookTitle || bookAuthor ? (
                    <div className={classes.footer}>
                        {bookTitle ? <p className={classes.footerBook}>{bookTitle}</p> : null}
                        {bookAuthor ? <p className={classes.footerAuthor}>{bookAuthor}</p> : null}
                    </div>
                ) : null}
            </div>
        </div>
    );
}

/** Draggable AATA / textbook paper card over compare beats. */
export function TextbookPanel({ scriptId, sceneIndex, overlay }: TextbookPanelProps) {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    const sceneSeconds = frame / fps;
    const remotionEnv = getRemotionEnvironment();
    const canDrag = !remotionEnv.isRendering && (remotionEnv.isStudio || remotionEnv.isPlayer);
    const storageKey = textbookPanelStorageKey(scriptId, sceneIndex);
    const placement = overlay.placement ?? 'center';
    const [layout, setLayout] = useState<TextbookPanelLayout>(() =>
        readTextbookPanelLayoutFromStorage(storageKey) ?? defaultTextbookPanelLayout(placement),
    );

    useEffect(() => {
        setLayout(readTextbookPanelLayoutFromStorage(storageKey) ?? defaultTextbookPanelLayout(placement));
    }, [placement, storageKey]);

    const visible = textbookOverlayVisibleAt(overlay, sceneSeconds);
    const revealAt = overlay.revealAtSeconds ?? 0;
    const enter = spring({
        frame: Math.max(0, frame - Math.round(revealAt * fps)),
        fps,
        config: { damping: 18, stiffness: 120, mass: 0.75 },
    });
    const opacity = visible ? interpolate(enter, [0, 1], [0, 1]) : 0;

    const onLayoutCommit = useCallback(
        (next: TextbookPanelLayout) => {
            setLayout(next);
            writeTextbookPanelLayoutToStorage(storageKey, next);
        },
        [storageKey],
    );

    if (!visible && opacity <= 0) {
        return null;
    }

    return (
        <div className={classes.overlay} style={{ opacity }}>
            <TextbookPanelCard
                overlay={overlay}
                layout={layout}
                fontScale={overlay.fontScale ?? 1}
                canDrag={canDrag}
                onLayoutChange={setLayout}
                onLayoutCommit={onLayoutCommit}
            />
        </div>
    );
}
