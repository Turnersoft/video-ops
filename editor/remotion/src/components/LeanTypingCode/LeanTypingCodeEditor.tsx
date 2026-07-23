// /Users/johndoe/Documents/company/basic_ui/src/shared/turn-video/editor/LeanTypingCode.tsx
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import type React from 'react';

import {
    COMPARE_HIGHLIGHT_ATTR,
} from '../../lib/tracks/compareHintLayout';
import {
    autoFitMinFontSize,
    computeWrappedCodeViewportLayout,
    TURN_EDITOR_LINE_HEIGHT_RATIO,
} from '../TurnTypingCode/computeCodeViewportLayout';
import { CodeEditorScrollTrack } from '../TurnTypingCode/CodeEditorScrollTrack';
import { useCodeViewportScroll } from '../TurnTypingCode/useCodeViewportScroll';
import { revealFullSourceFromSnippetProgress } from '../../lib/tracks/ideTrackTypes';
import {
    editorHighlightLayers,
    highlightOverlaysFromLayers,
    type HighlightOverlay,
} from '../../lib/panels/highlightTransition';
import {
    DEFAULT_LEAN_EDITOR_SCALE,
    DEFAULT_LEAN_EDITOR_THEME,
    type LeanEditorScale,
    type LeanEditorTheme,
} from './leanEditorTheme';

const LEAN_KEYWORDS = new Set([
    'theorem',
    'def',
    'lemma',
    'example',
    'axiom',
    'inductive',
    'structure',
    'class',
    'instance',
    'abbrev',
    'namespace',
    'section',
    'variable',
    'import',
    'open',
    'universe',
    'where',
    'match',
    'with',
    'fun',
    'let',
    'in',
    'if',
    'then',
    'else',
    'do',
    'by',
    'have',
    'show',
    'from',
    'partial',
    'mutual',
    'opaque',
    'private',
    'protected',
    'public',
    'scoped',
    'meta',
    'attribute',
    'deriving',
    'extends',
]);

const LEAN_TACTICS = new Set([
    'apply',
    'exact',
    'intro',
    'intros',
    'rw',
    'simp',
    'rfl',
    'sorry',
    'cases',
    'constructor',
    'split',
    'left',
    'right',
    'use',
    'refine',
    'calc',
    'assumption',
    'contradiction',
    'trivial',
    'ring',
    'linarith',
    'norm_num',
    'decide',
    'ext',
    'congr',
    'obtain',
    'rcases',
    'induction',
]);

export type LeanTypingCodeProps = {
    renderSource?: string;
    typingSnippet?: string;
    source?: string;
    charsPerSecond?: number;
    showLineNumbers?: boolean;
    fontSize?: number;
    minFontSize?: number;
    viewportHeight?: number;
    /** Soft-wrap long lines (compare panes). */
    wrapLines?: boolean;
    highlights?: Array<{ text: string; atSeconds?: number }>;
    /** When set, highlight every occurrence of each string at full opacity (v4 beat mode). */
    staticHighlights?: string[];
    gutterLineNumbers?: (number | null)[];
    frame?: number;
    fps?: number;
    theme?: LeanEditorTheme;
    scale?: LeanEditorScale;
    /** Wheel + scrollbar drag in Studio / Player (export keeps frame-driven scroll). */
    interactiveScroll?: boolean;
};

type TokenKind = 'plain' | 'keyword' | 'tactic' | 'type' | 'operator' | 'string' | 'comment';

function highlightLeanLine(line: string): Array<{ text: string; kind: TokenKind }> {
    const leadingWhitespace = line.match(/^(\s+)/)?.[1] ?? '';
    const content = line.slice(leadingWhitespace.length);

    if (content.trimStart().startsWith('--') || content.trimStart().startsWith('/-')) {
        return [{ text: line, kind: 'comment' }];
    }

    const tokens: Array<{ text: string; kind: TokenKind }> = [];
    if (leadingWhitespace) {
        tokens.push({ text: leadingWhitespace, kind: 'plain' });
    }

    const parts = content.split(/(\s+|[{}()[\],:;]|"[^"]*")/g).filter((part) => part.length > 0);

    parts.forEach((part) => {
        if (part.startsWith('"') && part.endsWith('"')) {
            tokens.push({ text: part, kind: 'string' });
            return;
        }
        if (part === '=>' || part === '→' || part === '∀' || part === '∃' || part === ':=') {
            tokens.push({ text: part, kind: 'operator' });
            return;
        }
        if (LEAN_KEYWORDS.has(part)) {
            tokens.push({ text: part, kind: 'keyword' });
            return;
        }
        if (LEAN_TACTICS.has(part)) {
            tokens.push({ text: part, kind: 'tactic' });
            return;
        }
        if (/^[A-Z][A-Za-z0-9_'.]*$/.test(part)) {
            tokens.push({ text: part, kind: 'type' });
            return;
        }
        tokens.push({ text: part, kind: 'plain' });
    });

    return tokens;
}

function renderHighlightedNeedle(
    needle: string,
    opacity: number,
    lineTokens: Array<{ text: string; kind: TokenKind }>,
    tokenColor: Record<TokenKind, string>,
    key: string,
): React.ReactNode {
    return (
        <span
            key={key}
            {...{ [COMPARE_HIGHLIGHT_ATTR]: 'true' }}
            style={{
                background: `rgba(247, 201, 72, ${0.2 * opacity})`,
                borderRadius: 4,
                boxShadow: `0 0 0 2px rgba(247, 201, 72, ${0.27 * opacity})`,
            }}
        >
            {lineTokens.map((token, tokenIndex) => (
                <span key={`${key}-${tokenIndex}`} style={{ color: tokenColor[token.kind] }}>
                    {token.text}
                </span>
            ))}
        </span>
    );
}

function renderLineWithHighlights(
    line: string,
    lineTokens: Array<{ text: string; kind: TokenKind }>,
    highlightOverlays: HighlightOverlay[],
    tokenColor: Record<TokenKind, string>,
): React.ReactNode {
    const active = highlightOverlays.filter(
        (item) => item.opacity > 0 && item.text.length > 0 && line.includes(item.text),
    );
    if (active.length === 0) {
        return lineTokens.map((token, tokenIndex) => (
            <span key={`${tokenIndex}`} style={{ color: tokenColor[token.kind] }}>
                {token.text}
            </span>
        ));
    }

    type Span = { start: number; end: number; opacity: number; text: string };
    const spans: Span[] = [];
    for (const overlay of active) {
        let searchFrom = 0;
        while (searchFrom < line.length) {
            const index = line.indexOf(overlay.text, searchFrom);
            if (index < 0) {
                break;
            }
            spans.push({
                start: index,
                end: index + overlay.text.length,
                opacity: overlay.opacity,
                text: overlay.text,
            });
            searchFrom = index + overlay.text.length;
        }
    }
    spans.sort((left, right) => left.start - right.start || right.end - left.end);

    const nodes: React.ReactNode[] = [];
    let cursor = 0;
    spans.forEach((span, spanIndex) => {
        if (span.end <= cursor) {
            return;
        }
        const gapStart = cursor;
        const gapEnd = Math.max(cursor, span.start);
        if (gapEnd > gapStart) {
            const segment = line.slice(gapStart, gapEnd);
            nodes.push(
                <span key={`gap-${spanIndex}`}>
                    {highlightLeanLine(segment).map((token, tokenIndex) => (
                        <span key={`gap-${spanIndex}-${tokenIndex}`} style={{ color: tokenColor[token.kind] }}>
                            {token.text}
                        </span>
                    ))}
                </span>,
            );
        }
        nodes.push(
            renderHighlightedNeedle(
                line.slice(span.start, span.end),
                span.opacity,
                highlightLeanLine(span.text),
                tokenColor,
                `hl-${spanIndex}`,
            ),
        );
        cursor = Math.max(cursor, span.end);
    });
    if (cursor < line.length) {
        const tail = line.slice(cursor);
        nodes.push(
            <span key="tail">
                {highlightLeanLine(tail).map((token, tokenIndex) => (
                    <span key={`tail-${tokenIndex}`} style={{ color: tokenColor[token.kind] }}>
                        {token.text}
                    </span>
                ))}
            </span>,
        );
    }
    return nodes;
}

/** Lean 4 typing animation with lightweight syntax highlighting (SSR-safe, no Monaco). */
export function LeanTypingCode({
    renderSource,
    typingSnippet,
    source,
    charsPerSecond = 28,
    showLineNumbers = true,
    fontSize: maxFontSizeProp,
    minFontSize: minFontSizeProp,
    viewportHeight: viewportHeightProp,
    wrapLines = false,
    highlights = [],
    staticHighlights,
    gutterLineNumbers,
    frame = 0,
    fps = 30,
    theme = DEFAULT_LEAN_EDITOR_THEME,
    scale = DEFAULT_LEAN_EDITOR_SCALE,
    interactiveScroll = false,
}: LeanTypingCodeProps) {
    const maxFontSize = maxFontSizeProp ?? scale.codeFontSize;
    const minFontSize = minFontSizeProp ?? scale.codeFontSizeMin;
    const autoFitMin = autoFitMinFontSize(maxFontSize, minFontSize);
    const viewportHeight = viewportHeightProp ?? scale.codeViewportHeight;

    const fullRender = renderSource ?? source ?? '';
    const snippet = typingSnippet ?? source ?? fullRender;

    const visibleSnippetChars = Math.min(snippet.length, Math.floor((frame / fps) * charsPerSecond));
    const { text: visible, activeLineIndex } = useMemo(
        () => revealFullSourceFromSnippetProgress(fullRender, snippet, visibleSnippetChars),
        [fullRender, snippet, visibleSnippetChars],
    );

    const lines = visible.split('\n');
    const activeLine = activeLineIndex;

    const viewportShellRef = useRef<HTMLDivElement>(null);
    const [measuredViewport, setMeasuredViewport] = useState({ width: 0, height: 0 });

    useLayoutEffect(() => {
        const shell = viewportShellRef.current;
        if (!shell) {
            return;
        }
        const update = () => {
            setMeasuredViewport({
                width: shell.clientWidth,
                height: shell.clientHeight,
            });
        };
        update();
        const observer = new ResizeObserver(update);
        observer.observe(shell);
        return () => {
            observer.disconnect();
        };
    }, [lines.length, wrapLines, visible]);

    const gutterDigitCount = Math.max(
        2,
        String(
            Math.max(
                lines.length,
                1,
                ...(gutterLineNumbers?.filter((lineNum): lineNum is number => lineNum != null) ?? []),
            ),
        ).length,
    );

    const effectiveViewportHeight =
        measuredViewport.height > 0 ? measuredViewport.height : viewportHeight;
    const effectiveViewportWidth =
        measuredViewport.width > 0 ? measuredViewport.width : Math.round(viewportHeight * 1.35);

    const layout = useMemo(
        () =>
            computeWrappedCodeViewportLayout({
                lines,
                activeLineIndex: activeLine,
                viewportHeight: effectiveViewportHeight,
                viewportWidth: effectiveViewportWidth,
                maxFontSize,
                minFontSize: autoFitMin,
                wrapLines,
                gutterDigitCount,
            }),
        [
            lines,
            activeLine,
            effectiveViewportHeight,
            effectiveViewportWidth,
            maxFontSize,
            autoFitMin,
            wrapLines,
            gutterDigitCount,
        ],
    );

    const { scrollTop, setScrollTop, onWheel } = useCodeViewportScroll({
        autoScrollTop: layout.scrollTop,
        maxScroll: layout.maxScroll,
        interactive: interactiveScroll,
        resetKey: `${activeLine}:${lines.length}:${visible.length}`,
    });

    const showGutter = showLineNumbers;

    const lineRowStyle = {
        borderRadius: 6,
        padding: '0 8px',
        margin: 0,
        whiteSpace: wrapLines ? 'pre-wrap' : 'pre',
        overflowWrap: wrapLines ? ('break-word' as const) : undefined,
        wordBreak: wrapLines ? ('break-word' as const) : undefined,
        tabSize: 4,
        height: 'auto' as const,
    };

    const highlighted = useMemo(() => lines.map((line) => highlightLeanLine(line)), [lines]);

    const tokenColor: Record<TokenKind, string> = {
        plain: theme.syntax.plain,
        keyword: theme.syntax.keyword,
        tactic: theme.syntax.tactic,
        type: theme.syntax.type,
        operator: theme.syntax.operator,
        string: theme.syntax.string,
        comment: theme.syntax.comment,
    };

    const highlightOverlays = useMemo(() => {
        if (staticHighlights?.length) {
            return staticHighlights.map((text) => ({ text, opacity: 1 }));
        }
        const layers = editorHighlightLayers(highlights, frame / fps, visible, fps);
        return highlightOverlaysFromLayers(layers, frame);
    }, [frame, fps, highlights, staticHighlights, visible]);

    const gutterLabel = (lineIndex: number): string | number => {
        if (!gutterLineNumbers) {
            return lineIndex + 1;
        }
        const lineNum = gutterLineNumbers[lineIndex];
        return lineNum ?? '';
    };

    const gutterDigitCountForWidth = gutterDigitCount;
    const gutterWidth = Math.round(layout.fontSize * (0.95 + gutterDigitCountForWidth * 0.85));

    const gutterNumberStyle = {
        margin: 0,
        padding: 0,
        whiteSpace: 'nowrap' as const,
        lineHeight: TURN_EDITOR_LINE_HEIGHT_RATIO,
        alignSelf: 'flex-start' as const,
    };

    const gutterCellStyle = {
        flexShrink: 0,
        width: gutterWidth,
        minWidth: gutterWidth,
        padding: `0 ${Math.round(layout.gutterPad * 0.7)}px 0 ${layout.gutterPad}px`,
        background: 'transparent',
        color: theme.ide.gutterText,
        textAlign: 'right' as const,
        userSelect: 'none' as const,
        borderRight: `1px solid ${theme.ide.windowBorder}`,
    };

    const viewportChromeBackground = (
        <div
            aria-hidden
            style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                pointerEvents: 'none',
            }}
        >
            {showGutter ? (
                <div
                    style={{
                        flexShrink: 0,
                        width: gutterWidth,
                        minWidth: gutterWidth,
                        height: '100%',
                        background: theme.ide.gutter,
                        borderRight: `1px solid ${theme.ide.windowBorder}`,
                    }}
                />
            ) : null}
            <div
                style={{
                    flex: 1,
                    minWidth: 0,
                    height: '100%',
                    background: theme.ide.codeBg,
                }}
            />
        </div>
    );

    const editorShellStyle = {
        display: 'flex' as const,
        flexDirection: 'column' as const,
        flex: 1,
        minHeight: 0,
        width: '100%',
        height: '100%',
        overflow: 'hidden' as const,
        fontFamily: '"SF Mono", "Cascadia Code", Menlo, monospace',
        fontSize: layout.fontSize,
        lineHeight: TURN_EDITOR_LINE_HEIGHT_RATIO,
        color: theme.syntax.plain,
    };

    if (wrapLines) {
        return (
            <div style={editorShellStyle}>
                <div
                    ref={viewportShellRef}
                    onWheel={onWheel}
                    style={{
                        flex: 1,
                        minHeight: 0,
                        overflow: 'hidden',
                        position: 'relative',
                        paddingRight: layout.maxScroll > 0 ? 12 : 0,
                    }}
                >
                    {viewportChromeBackground}
                    <div
                        style={{
                            position: 'relative',
                            zIndex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            paddingTop: layout.gutterPad,
                            paddingBottom: layout.gutterPad,
                            transform: `translateY(-${scrollTop}px)`,
                            willChange: 'transform',
                        }}
                    >
                        {highlighted.map((lineTokens, lineIndex) => (
                            <div
                                key={`row-${lineIndex}`}
                                style={{ display: 'flex', alignItems: 'stretch', width: '100%' }}
                            >
                                {showGutter ? (
                                    <div style={gutterCellStyle}>
                                        <div style={gutterNumberStyle}>
                                            {gutterLabel(lineIndex)}
                                        </div>
                                    </div>
                                ) : null}
                                <div
                                    style={{
                                        flex: 1,
                                        minWidth: 0,
                                        background:
                                            lineIndex === activeLine
                                                ? theme.ide.lineHighlight
                                                : 'transparent',
                                        ...lineRowStyle,
                                        paddingLeft: 8,
                                        paddingRight: layout.gutterPad + 4,
                                    }}
                                >
                                    {renderLineWithHighlights(
                                        lines[lineIndex] ?? '',
                                        lineTokens,
                                        highlightOverlays,
                                        tokenColor,
                                    )}
                                </div>
                            </div>
                        ))}
                        <div style={{ display: 'flex', width: '100%' }}>
                            {showGutter ? <div style={{ ...gutterCellStyle, borderRight: 'none' }} /> : null}
                            <div style={{ flex: 1, minWidth: 0, padding: `0 ${layout.gutterPad + 4}px` }}>
                                <span
                                    style={{
                                        color: theme.syntax.cursor,
                                        opacity: frame % 30 < 15 ? 1 : 0,
                                    }}
                                >
                                    ▍
                                </span>
                            </div>
                        </div>
                    </div>
                    <CodeEditorScrollTrack
                        scrollTop={scrollTop}
                        maxScroll={layout.maxScroll}
                        viewportHeight={effectiveViewportHeight}
                        contentHeight={layout.contentHeight}
                        variant="dark"
                        interactive={interactiveScroll}
                        onScrollTopChange={setScrollTop}
                    />
                </div>
            </div>
        );
    }

    return (
        <div style={editorShellStyle}>
            <div
                ref={viewportShellRef}
                onWheel={onWheel}
                style={{
                    flex: 1,
                    minHeight: 0,
                    overflow: 'hidden',
                    position: 'relative',
                    paddingRight: layout.maxScroll > 0 ? 12 : 0,
                }}
            >
                {viewportChromeBackground}
                <div
                    style={{
                        position: 'relative',
                        zIndex: 1,
                        display: 'flex',
                        alignItems: 'flex-start',
                        transform: `translateY(-${scrollTop}px)`,
                        willChange: 'transform',
                    }}
                >
                    {showGutter ? (
                        <div
                            style={{
                                ...gutterCellStyle,
                                padding: `${layout.gutterPad}px ${Math.round(layout.gutterPad * 0.7)}px ${layout.gutterPad}px ${layout.gutterPad}px`,
                                alignSelf: 'flex-start',
                            }}
                        >
                            {lines.map((_line, index) => (
                                <div key={`gutter-${index}`} style={lineRowStyle}>
                                    {gutterLabel(index)}
                                </div>
                            ))}
                        </div>
                    ) : null}
                    <div
                        style={{
                            flex: 1,
                            minWidth: 0,
                            padding: `${layout.gutterPad}px ${layout.gutterPad + 4}px`,
                            whiteSpace: 'pre',
                            tabSize: 4,
                            alignSelf: 'flex-start',
                            background: 'transparent',
                        }}
                    >
                        {highlighted.map((lineTokens, lineIndex) => (
                            <div
                                key={`line-${lineIndex}`}
                                style={{
                                    ...lineRowStyle,
                                    background:
                                        lineIndex === activeLine
                                            ? theme.ide.lineHighlight
                                            : 'transparent',
                                }}
                            >
                                {renderLineWithHighlights(
                                    lines[lineIndex] ?? '',
                                    lineTokens,
                                    highlightOverlays,
                                    tokenColor,
                                )}
                            </div>
                        ))}
                        <span style={{ color: theme.syntax.cursor, opacity: frame % 30 < 15 ? 1 : 0 }}>
                            ▍
                        </span>
                    </div>
                </div>
                <CodeEditorScrollTrack
                    scrollTop={scrollTop}
                    maxScroll={layout.maxScroll}
                    viewportHeight={effectiveViewportHeight}
                    contentHeight={layout.contentHeight}
                    variant="dark"
                    interactive={interactiveScroll}
                    onScrollTopChange={setScrollTop}
                />
            </div>
        </div>
    );
}
