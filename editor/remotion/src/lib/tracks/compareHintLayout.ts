// /Users/johndoe/Documents/company/basic_ui/src/shared/turn-video/ide/compareHintLayout.ts
import type { CompareHint, CompareHintTarget } from './captionBeats';
import { videoOpsDevApiUrl } from '../studio/videoOpsDevApi';

export const COMPARE_PANE_ATTR = 'data-compare-pane';
export const COMPARE_HIGHLIGHT_ATTR = 'data-compare-highlight';

export type CompareHintLayout = {
    /** Panel anchor as % of overlay container width. */
    xPct: number;
    /** Panel anchor as % of overlay container height. */
    yPct: number;
    /** Highlight center (% of overlay) when the layout was saved — keeps panel aligned after editor zoom. */
    highlightAnchorX?: number;
    highlightAnchorY?: number;
};

export type CompareHintLayoutsFile = {
    version: number;
    layouts: Record<string, CompareHintLayout>;
};

function hintTextSlug(hint: CompareHint): string {
    return hint.text.slice(0, 48).replace(/\s+/g, ' ').trim();
}

/** Stable key for one hint callout (drag persistence + JSON export). */
export function compareHintKey(beatIndex: number, hint: CompareHint): string {
    const slug = hintTextSlug(hint);
    const needle = hint.needle?.trim() ?? '';
    return `${beatIndex}|${hint.target}|${needle}|${slug}`;
}

/** Legacy key before compare-beat index (breaks when beat durations change). */
export function compareHintLegacyKey(beatAtSeconds: number, hint: CompareHint): string {
    const slug = hintTextSlug(hint);
    return `${beatAtSeconds}|${hint.target}|${slug}`;
}

/** Resolve saved layout — stable key first, then legacy atSeconds key, then inline hint.layout. */
export function lookupHintLayout(
    beatIndex: number,
    beatAtSeconds: number,
    hint: CompareHint,
    layouts: Record<string, CompareHintLayout>,
): CompareHintLayout | undefined {
    const stable = compareHintKey(beatIndex, hint);
    if (layouts[stable]) {
        return layouts[stable];
    }
    const legacy = compareHintLegacyKey(beatAtSeconds, hint);
    if (layouts[legacy]) {
        return layouts[legacy];
    }
    return hint.layout;
}

/** Attach highlight anchor so panel position tracks snippet after editor zoom/scroll. */
export function hintLayoutWithHighlightAnchor(
    container: HTMLElement,
    target: CompareHintTarget,
    needle: string | undefined,
    layout: CompareHintLayout,
): CompareHintLayout {
    const point = findHighlightPoint(container, target, needle);
    if (!point) {
        return layout;
    }
    const width = container.clientWidth || 1;
    const height = container.clientHeight || 1;
    return {
        ...layout,
        highlightAnchorX: (point.x / width) * 100,
        highlightAnchorY: (point.y / height) * 100,
    };
}

/** Recompute panel anchor from saved offset relative to the current highlight center. */
export function resolveAnchoredHintLayout(
    container: HTMLElement,
    target: CompareHintTarget,
    needle: string | undefined,
    layout: CompareHintLayout,
): CompareHintLayout {
    if (layout.highlightAnchorX === undefined || layout.highlightAnchorY === undefined) {
        return layout;
    }
    const point = findHighlightPoint(container, target, needle);
    if (!point) {
        return layout;
    }
    const width = container.clientWidth || 1;
    const height = container.clientHeight || 1;
    const hx = (point.x / width) * 100;
    const hy = (point.y / height) * 100;
    return {
        ...layout,
        xPct: Math.max(2, Math.min(98, layout.xPct + (hx - layout.highlightAnchorX))),
        yPct: Math.max(4, Math.min(96, layout.yPct + (hy - layout.highlightAnchorY))),
        highlightAnchorX: hx,
        highlightAnchorY: hy,
    };
}

export function compareHintStorageKey(scope: string): string {
    return `video-ops-hint-layouts:${scope}`;
}

export function dispatchHintLayoutsChanged(scope: string, layouts: Record<string, CompareHintLayout>): void {
    if (typeof window === 'undefined') {
        return;
    }
    window.dispatchEvent(
        new CustomEvent('video-ops-hint-layouts-changed', {
            detail: { scope, layouts },
        }),
    );
}

export function readHintLayoutsFromStorage(scriptId: string): Record<string, CompareHintLayout> {
    if (typeof window === 'undefined') {
        return {};
    }
    try {
        const raw = window.localStorage.getItem(compareHintStorageKey(scriptId));
        if (!raw) {
            return {};
        }
        const parsed = JSON.parse(raw) as unknown;
        if (typeof parsed === 'object' && parsed !== null && 'layouts' in parsed) {
            return (parsed as CompareHintLayoutsFile).layouts ?? {};
        }
        return parsed as Record<string, CompareHintLayout>;
    } catch {
        return {};
    }
}

export function writeHintLayoutToStorage(
    scope: string,
    hintKey: string,
    layout: CompareHintLayout,
): void {
    if (typeof window === 'undefined') {
        return;
    }
    const merged = {
        ...readHintLayoutsFromStorage(scope),
        [hintKey]: layout,
    };
    window.localStorage.setItem(
        compareHintStorageKey(scope),
        JSON.stringify({ version: 1, layouts: merged }),
    );
    dispatchHintLayoutsChanged(scope, merged);
}

/** Merge file + in-browser overrides; local wins for preview editing. */
export function mergeHintLayoutRecords(
    fileLayouts: Record<string, CompareHintLayout>,
    localLayouts: Record<string, CompareHintLayout>,
): Record<string, CompareHintLayout> {
    return { ...fileLayouts, ...localLayouts };
}

/** Write hint positions to the script JSON file (used by Remotion export). */
export async function persistHintLayoutsToFile(
    scriptId: string,
    relativePath: string,
    layouts: Record<string, CompareHintLayout>,
): Promise<Record<string, CompareHintLayout> | null> {
    if (typeof fetch === 'undefined') {
        return null;
    }
    const body = JSON.stringify({ scriptId, path: relativePath, layouts });
    const endpoints: string[] = [];
    if (typeof window !== 'undefined') {
        // Remotion Studio (webpack dev server) and Video Editor (Vite) — same origin.
        endpoints.push('/video_ops/api/hint-layouts');
    }
    endpoints.push(videoOpsDevApiUrl('/video_ops/api/hint-layouts'));
    for (const endpoint of endpoints) {
        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body,
            });
            if (!response.ok) {
                continue;
            }
            const payload = (await response.json()) as {
                layouts?: Record<string, CompareHintLayout>;
            };
            return payload.layouts ?? null;
        } catch {
            // Try next endpoint (e.g. Remotion Studio → VideoOps dev API on :3021).
        }
    }
    return null;
}

/** Read every saved hint layout for a script path from browser storage. */
export function readHintLayoutScope(
    scriptId: string,
    hintLayoutsPath: string,
): Record<string, CompareHintLayout> {
    return readHintLayoutsFromStorage(`${scriptId}:${hintLayoutsPath}`);
}

const FALLBACK: Record<CompareHintTarget, CompareHintLayout> = {
    'lean-code': { xPct: 18, yPct: 38 },
    'lean-goal': { xPct: 18, yPct: 72 },
    'turn-code': { xPct: 82, yPct: 38 },
    'turn-knowledge': { xPct: 82, yPct: 72 },
};

export function compareHintFallbackLayout(target: CompareHintTarget): CompareHintLayout {
    return FALLBACK[target];
}

/** Highlight center in container-local pixel coordinates. */
export function findHighlightPoint(
    container: HTMLElement,
    target: CompareHintTarget,
    needle?: string,
): { x: number; y: number } | null {
    const pane = container.querySelector(`[${COMPARE_PANE_ATTR}="${target}"]`);
    if (!pane) {
        return null;
    }

    const selectors = [
        `[${COMPARE_HIGHLIGHT_ATTR}="true"]`,
        '[data-video-knowledge-highlight="true"]',
    ].join(',');

    const candidates = [...pane.querySelectorAll<HTMLElement>(selectors)];
    if (!candidates.length) {
        return null;
    }

    const normalizedNeedle = needle?.trim();
    const match =
        normalizedNeedle && normalizedNeedle.length > 0
            ? candidates.find((el) => (el.textContent ?? '').includes(normalizedNeedle))
            : candidates[0];
    const el = match ?? candidates[0];
    const containerRect = container.getBoundingClientRect();
    const rect = el.getBoundingClientRect();
    return {
        x: rect.left + rect.width / 2 - containerRect.left,
        y: rect.top + rect.height / 2 - containerRect.top,
    };
}

/** Default panel anchor (% of container) offset from the highlighted snippet. */
export function defaultHintPanelLayout(
    container: HTMLElement,
    target: CompareHintTarget,
    needle?: string,
): CompareHintLayout {
    const point = findHighlightPoint(container, target, needle);
    if (!point) {
        return FALLBACK[target];
    }

    const width = container.clientWidth || 1;
    const height = container.clientHeight || 1;
    const hx = (point.x / width) * 100;
    const hy = (point.y / height) * 100;
    const isLeft = target.startsWith('lean');

    return {
        xPct: Math.max(4, Math.min(96, isLeft ? hx - 6 : hx + 6)),
        yPct: Math.max(8, Math.min(92, hy - 14)),
    };
}

/** Estimate panel box from layout anchor (bottom-center at xPct/yPct). */
export function estimateHintPanelBox(
    containerWidth: number,
    containerHeight: number,
    layout: CompareHintLayout,
    textLength: number,
    scale = 1,
): { centerX: number; bottomY: number; width: number; height: number } {
    const maxWidth = Math.round(420 * scale);
    const width = Math.min(maxWidth, Math.max(Math.round(140 * scale), textLength * 7.5 * scale));
    const height = Math.max(
        Math.round(48 * scale),
        Math.round(20 * scale) + Math.ceil(textLength / 28) * Math.round(22 * scale),
    );
    return {
        centerX: (layout.xPct / 100) * containerWidth,
        bottomY: (layout.yPct / 100) * containerHeight,
        width,
        height,
    };
}

export type CompareHintArrow = {
    key: string;
    x1: number;
    y1: number;
    x2: number;
    y2: number;
};

/** Arrow segments from panel edge to highlighted snippet — no setState, safe during render. */
export function computeCompareHintArrows(
    container: HTMLElement,
    hints: Array<{
        key: string;
        target: CompareHintTarget;
        needle?: string;
        text: string;
        layout: CompareHintLayout;
    }>,
    scale = 1,
): CompareHintArrow[] {
    const width = container.clientWidth || 1;
    const height = container.clientHeight || 1;
    const arrows: CompareHintArrow[] = [];

    for (const hint of hints) {
        const highlight = findHighlightPoint(container, hint.target, hint.needle);
        if (!highlight) {
            continue;
        }

        const box = estimateHintPanelBox(width, height, hint.layout, hint.text.length, scale);
        const centerY = box.bottomY - box.height / 2;
        const edge = panelEdgeTowardPoint(
            box.centerX,
            centerY,
            box.width,
            box.height,
            highlight.x,
            highlight.y,
        );
        arrows.push({
            key: hint.key,
            x1: edge.x,
            y1: edge.y,
            x2: highlight.x,
            y2: highlight.y,
        });
    }

    return arrows;
}

/** Closest point on panel box edge toward a target point (for arrow origin). */
export function panelEdgeTowardPoint(
    panelCenterX: number,
    panelCenterY: number,
    panelWidth: number,
    panelHeight: number,
    targetX: number,
    targetY: number,
): { x: number; y: number } {
    const halfW = panelWidth / 2;
    const halfH = panelHeight / 2;
    const dx = targetX - panelCenterX;
    const dy = targetY - panelCenterY;
    if (Math.abs(dx) * panelHeight > Math.abs(dy) * panelWidth) {
        return {
            x: panelCenterX + (dx > 0 ? halfW : -halfW),
            y: panelCenterY + (dy / Math.max(Math.abs(dx), 1)) * halfW,
        };
    }
    return {
        x: panelCenterX + (dx / Math.max(Math.abs(dy), 1)) * halfH,
        y: panelCenterY + (dy > 0 ? halfH : -halfH),
    };
}
