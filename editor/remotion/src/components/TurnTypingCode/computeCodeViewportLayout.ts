// /Users/johndoe/Documents/company/basic_ui/src/shared/turn-video/editor/computeCodeViewportLayout.ts

const LINE_HEIGHT_RATIO = 1.32;
const GUTTER_PAD_RATIO = 0.65;

/** Auto-fit floor — shrink below themed min when long excerpts still overflow. */
export function autoFitMinFontSize(maxFontSize: number, configuredMin: number): number {
    const aggressive = Math.max(6, Math.floor(maxFontSize * 0.42));
    return Math.min(configuredMin, aggressive);
}

export type CodeViewportLayoutInput = {
    lineCount: number;
    activeLineIndex: number;
    viewportHeight: number;
    maxFontSize: number;
    minFontSize: number;
};

export type CodeViewportLayout = {
    fontSize: number;
    lineHeightPx: number;
    gutterPad: number;
    scrollTop: number;
    fitsAllLines: boolean;
    /** Total code block height in px (lines + vertical padding). */
    contentHeight: number;
    /** Maximum scroll offset in px (0 when everything fits). */
    maxScroll: number;
};

function verticalPadding(fontSize: number): number {
    return Math.round(fontSize * GUTTER_PAD_RATIO) * 2;
}

function contentHeight(lineCount: number, lineHeightPx: number): number {
    return lineCount * lineHeightPx;
}

/** Monospace char width ≈ 0.58× font size — good enough for soft-wrap fit in compare panes. */
export function estimateWrappedVisualLineCount(
    lines: string[],
    fontSize: number,
    contentWidth: number,
): number {
    const charWidth = fontSize * 0.58;
    const usable = Math.max(48, contentWidth);
    let total = 0;
    for (const line of lines) {
        const length = Math.max(line.length, 1);
        total += Math.max(1, Math.ceil((length * charWidth) / usable));
    }
    return Math.max(1, total);
}

function estimateGutterWidth(fontSize: number, gutterDigitCount: number): number {
    return Math.round(fontSize * (0.95 + gutterDigitCount * 0.85));
}

function wrappedContentWidth(viewportWidth: number, fontSize: number, gutterDigitCount: number): number {
    const gutterPad = Math.round(fontSize * GUTTER_PAD_RATIO);
    const gutterWidth = estimateGutterWidth(fontSize, gutterDigitCount);
    return Math.max(48, viewportWidth - gutterWidth - gutterPad - 12);
}

function scrollTopForWrappedLines(
    lines: string[],
    activeLineIndex: number,
    fontSize: number,
    contentWidth: number,
    viewportHeight: number,
): number {
    const lineHeightPx = fontSize * LINE_HEIGHT_RATIO;
    const gutterPad = Math.round(fontSize * GUTTER_PAD_RATIO);
    const available = Math.max(lineHeightPx, viewportHeight - verticalPadding(fontSize));

    let beforeActive = 0;
    for (let index = 0; index < activeLineIndex; index += 1) {
        beforeActive +=
            estimateWrappedVisualLineCount([lines[index] ?? ''], fontSize, contentWidth) *
            lineHeightPx;
    }
    const activeRows = estimateWrappedVisualLineCount(
        [lines[activeLineIndex] ?? ''],
        fontSize,
        contentWidth,
    );
    const activeCenter = beforeActive + (activeRows * lineHeightPx) / 2;

    let totalHeight = 0;
    for (const line of lines) {
        totalHeight +=
            estimateWrappedVisualLineCount([line], fontSize, contentWidth) * lineHeightPx;
    }

    const scrollTop = activeCenter - available / 2;
    const maxScroll = Math.max(0, totalHeight - available);
    return Math.max(0, Math.min(scrollTop, maxScroll));
}

export type WrappedCodeViewportLayoutInput = {
    lines: string[];
    activeLineIndex: number;
    viewportHeight: number;
    viewportWidth: number;
    maxFontSize: number;
    minFontSize: number;
    wrapLines?: boolean;
    gutterDigitCount?: number;
};

function longestLineLength(lines: string[]): number {
    return Math.max(1, ...lines.map((line) => line.length));
}

/** Shrink font until longest source line fits viewport width (no wrap) and all lines fit height. */
export function computeUnwrappedCodeViewportLayout(
    input: Omit<WrappedCodeViewportLayoutInput, 'wrapLines'>,
): CodeViewportLayout {
    const {
        lines,
        activeLineIndex,
        viewportHeight,
        viewportWidth,
        maxFontSize,
        minFontSize,
        gutterDigitCount = 2,
    } = input;
    const safeLines = lines.length > 0 ? lines : [''];
    const safeActive = Math.min(Math.max(0, activeLineIndex), safeLines.length - 1);
    const maxChars = longestLineLength(safeLines);

    let fontSize = maxFontSize;
    while (fontSize > minFontSize) {
        const contentWidth = wrappedContentWidth(viewportWidth, fontSize, gutterDigitCount);
        const charWidth = fontSize * 0.58;
        const widthFits = maxChars * charWidth <= contentWidth;
        const lineHeightPx = fontSize * LINE_HEIGHT_RATIO;
        const heightFits =
            safeLines.length * lineHeightPx + verticalPadding(fontSize) <= viewportHeight;
        if (widthFits && heightFits) {
            break;
        }
        fontSize -= 1;
    }

    return computeCodeViewportLayout({
        lineCount: safeLines.length,
        activeLineIndex: safeActive,
        viewportHeight,
        maxFontSize: fontSize,
        minFontSize,
    });
}

/** Fit font + scroll when long lines soft-wrap (compare panes). */
export function computeWrappedCodeViewportLayout(
    input: WrappedCodeViewportLayoutInput,
): CodeViewportLayout {
    const {
        lines,
        activeLineIndex,
        viewportHeight,
        viewportWidth,
        maxFontSize,
        minFontSize,
        wrapLines = false,
        gutterDigitCount = 2,
    } = input;
    const safeLines = lines.length > 0 ? lines : [''];
    const safeActive = Math.min(Math.max(0, activeLineIndex), safeLines.length - 1);

    if (!wrapLines && viewportWidth > 0 && viewportHeight > 0) {
        return computeUnwrappedCodeViewportLayout({
            lines: safeLines,
            activeLineIndex: safeActive,
            viewportHeight,
            viewportWidth,
            maxFontSize,
            minFontSize,
            gutterDigitCount,
        });
    }

    if (!wrapLines || viewportWidth <= 0 || viewportHeight <= 0) {
        return computeCodeViewportLayout({
            lineCount: safeLines.length,
            activeLineIndex: safeActive,
            viewportHeight,
            maxFontSize,
            minFontSize,
        });
    }

    let fontSize = maxFontSize;
    while (fontSize > minFontSize) {
        const contentWidth = wrappedContentWidth(viewportWidth, fontSize, gutterDigitCount);
        const visualLines = estimateWrappedVisualLineCount(safeLines, fontSize, contentWidth);
        const lineHeightPx = fontSize * LINE_HEIGHT_RATIO;
        const total = visualLines * lineHeightPx + verticalPadding(fontSize);
        if (total <= viewportHeight) {
            break;
        }
        fontSize -= 1;
    }

    const lineHeightPx = fontSize * LINE_HEIGHT_RATIO;
    const gutterPad = Math.round(fontSize * GUTTER_PAD_RATIO);
    const contentWidth = wrappedContentWidth(viewportWidth, fontSize, gutterDigitCount);
    const visualLines = estimateWrappedVisualLineCount(safeLines, fontSize, contentWidth);
    const innerHeight = visualLines * lineHeightPx;
    const available = Math.max(lineHeightPx, viewportHeight - verticalPadding(fontSize));
    const fitsAllLines = innerHeight <= available;
    const maxScroll = Math.max(0, innerHeight - available);
    const scrollTop = fitsAllLines
        ? 0
        : scrollTopForWrappedLines(
              safeLines,
              safeActive,
              fontSize,
              contentWidth,
              viewportHeight,
          );

    return {
        fontSize,
        lineHeightPx,
        gutterPad,
        scrollTop,
        fitsAllLines,
        contentHeight: innerHeight + verticalPadding(fontSize),
        maxScroll,
    };
}

/** Shrink font to fit short excerpts; scroll to the active line for long excerpts. */
export function computeCodeViewportLayout(input: CodeViewportLayoutInput): CodeViewportLayout {
    const { lineCount, activeLineIndex, viewportHeight, maxFontSize, minFontSize } = input;
    const safeLineCount = Math.max(1, lineCount);
    const safeActive = Math.min(Math.max(0, activeLineIndex), safeLineCount - 1);

    let fontSize = maxFontSize;
    while (fontSize > minFontSize) {
        const lineHeightPx = fontSize * LINE_HEIGHT_RATIO;
        const total = contentHeight(safeLineCount, lineHeightPx) + verticalPadding(fontSize);
        if (total <= viewportHeight) {
            break;
        }
        fontSize -= 1;
    }

    const lineHeightPx = fontSize * LINE_HEIGHT_RATIO;
    const gutterPad = Math.round(fontSize * GUTTER_PAD_RATIO);
    const innerHeight = contentHeight(safeLineCount, lineHeightPx);
    const available = Math.max(lineHeightPx, viewportHeight - verticalPadding(fontSize));
    const fitsAllLines = innerHeight <= available;
    const maxScroll = Math.max(0, innerHeight - available);

    let scrollTop = 0;
    if (!fitsAllLines) {
        const activeTop = safeActive * lineHeightPx;
        const activeCenter = activeTop + lineHeightPx / 2;
        scrollTop = activeCenter - available / 2;
        scrollTop = Math.max(0, Math.min(scrollTop, maxScroll));
    }

    return {
        fontSize,
        lineHeightPx,
        gutterPad,
        scrollTop,
        fitsAllLines,
        contentHeight: innerHeight + verticalPadding(fontSize),
        maxScroll,
    };
}

export const TURN_EDITOR_LINE_HEIGHT_RATIO = LINE_HEIGHT_RATIO;
