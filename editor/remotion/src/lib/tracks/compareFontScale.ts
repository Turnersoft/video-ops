// /Users/johndoe/Documents/company/basic_ui/src/shared/turn-video/ide/compareFontScale.ts
import { videoOpsDevApiUrl } from '../studio/videoOpsDevApi';

export type CompareFontScales = {
    /** Turn-Lang code editor multiplier. */
    editorFontScale: number;
    /** Lean 4 code editor multiplier. */
    leanEditorFontScale: number;
    /** Goal + knowledge side panels multiplier. */
    renderFontScale: number;
};

export const DEFAULT_COMPARE_FONT_SCALES: CompareFontScales = {
    editorFontScale: 1,
    leanEditorFontScale: 1,
    renderFontScale: 1,
};

export const COMPARE_FONT_SCALE_MIN = 0.5;
export const COMPARE_FONT_SCALE_MAX = 2;
export const COMPARE_FONT_SCALE_STEP = 0.05;

export function compareFontScaleStorageKey(scriptId: string): string {
    return `video-ops-compare-font-scales:${scriptId}`;
}

export type CompareBeatFontScalesStorage = {
    beats: Record<string, CompareFontScales>;
};

export function readCompareBeatFontScalesStorage(
    scriptId: string,
): CompareBeatFontScalesStorage | null {
    if (typeof window === 'undefined') {
        return null;
    }
    try {
        const raw = window.localStorage.getItem(compareFontScaleStorageKey(scriptId));
        if (!raw) {
            return null;
        }
        const parsed = JSON.parse(raw) as CompareBeatFontScalesStorage | CompareFontScales;
        if ('beats' in parsed && parsed.beats) {
            return parsed;
        }
        return null;
    } catch {
        return null;
    }
}

export function readCompareBeatFontScalesFromStorage(
    scriptId: string,
    beatIndex: number,
): CompareFontScales | null {
    const storage = readCompareBeatFontScalesStorage(scriptId);
    return storage?.beats[String(beatIndex)] ?? null;
}

export function writeCompareBeatFontScalesToStorage(
    scriptId: string,
    beatIndex: number,
    scales: CompareFontScales,
): void {
    if (typeof window === 'undefined') {
        return;
    }
    const existing = readCompareBeatFontScalesStorage(scriptId);
    const beats = { ...(existing?.beats ?? {}), [String(beatIndex)]: scales };
    window.localStorage.setItem(
        compareFontScaleStorageKey(scriptId),
        JSON.stringify({ beats } satisfies CompareBeatFontScalesStorage),
    );
}

export function writeAllCompareBeatFontScalesToStorage(
    scriptId: string,
    beatFontScales: CompareFontScales[],
): void {
    if (typeof window === 'undefined') {
        return;
    }
    const beats: Record<string, CompareFontScales> = {};
    beatFontScales.forEach((scales, index) => {
        beats[String(index)] = scales;
    });
    window.localStorage.setItem(
        compareFontScaleStorageKey(scriptId),
        JSON.stringify({ beats } satisfies CompareBeatFontScalesStorage),
    );
}

/** @deprecated Scene-wide storage — migrated reads only. */
export function readCompareFontScalesFromStorage(scriptId: string): Partial<CompareFontScales> | null {
    if (typeof window === 'undefined') {
        return null;
    }
    try {
        const raw = window.localStorage.getItem(compareFontScaleStorageKey(scriptId));
        if (!raw) {
            return null;
        }
        const parsed = JSON.parse(raw) as Partial<CompareFontScales>;
        return parsed;
    } catch {
        return null;
    }
}

export function clampCompareFontScale(value: number): number {
    const stepped = Math.round(value / COMPARE_FONT_SCALE_STEP) * COMPARE_FONT_SCALE_STEP;
    return Math.min(COMPARE_FONT_SCALE_MAX, Math.max(COMPARE_FONT_SCALE_MIN, stepped));
}

/** @deprecated Scene-wide storage — use writeCompareBeatFontScalesToStorage. */
export function writeCompareFontScalesToStorage(scriptId: string, scales: CompareFontScales): void {
    writeCompareBeatFontScalesToStorage(scriptId, 0, scales);
}

function compareBeatFontScaleEndpoints(): string[] {
    const endpoints: string[] = [];
    if (typeof window !== 'undefined') {
        // Video Editor (Vite) — same origin, any dev port.
        endpoints.push('/video_ops/api/compare-beat-font-scales');
    }
    endpoints.push(videoOpsDevApiUrl('/video_ops/api/compare-beat-font-scales'));
    if (typeof window === 'undefined' || window.location.port !== '5173') {
        endpoints.push('http://localhost:5173/video_ops/api/compare-beat-font-scales');
    }
    return endpoints;
}

export type PersistBeatFontScalesResult =
    | { ok: true; beatFontScales: CompareFontScales[] }
    | { ok: false; error: string };

function notifyAnimationJsonChanged(scriptId: string): void {
    if (typeof window === 'undefined') {
        return;
    }
    window.dispatchEvent(
        new CustomEvent('video-ops-animation-changed', { detail: { scriptId } }),
    );
}

/** Write every beat's font scales into animation.json (used by Remotion export). */
export async function persistAllCompareBeatFontScalesToFile(
    scriptId: string,
    beatFontScales: CompareFontScales[],
    sceneIndex = 0,
): Promise<PersistBeatFontScalesResult> {
    if (typeof fetch === 'undefined') {
        return { ok: false, error: 'Fetch is unavailable in this environment.' };
    }
    const body = JSON.stringify({
        scriptId,
        sceneIndex,
        beatFontScales,
    });

    let lastError = 'Video Ops write API is not reachable. Run `npm run dev` (Video Editor) or restart Remotion Studio.';

    for (const endpoint of compareBeatFontScaleEndpoints()) {
        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body,
            });
            const contentType = response.headers.get('content-type') ?? '';
            if (!contentType.includes('application/json')) {
                lastError =
                    endpoint.startsWith('/')
                        ? 'Save API is not on this dev server.'
                        : `Unexpected response from ${endpoint}`;
                continue;
            }
            const payload = (await response.json()) as {
                ok?: boolean;
                beatFontScales?: CompareFontScales[];
                error?: string;
            };
            if (!response.ok || !payload.ok) {
                lastError = payload.error ?? `Save failed (${response.status})`;
                continue;
            }
            notifyAnimationJsonChanged(scriptId);
            return {
                ok: true,
                beatFontScales: payload.beatFontScales ?? beatFontScales,
            };
        } catch {
            if (endpoint.includes(':3021')) {
                lastError =
                    'Video Ops write API on port 3021 is stale or not running. Restart `npm run dev` or kill port 3021 and run `npm run studio`.';
            }
        }
    }
    return { ok: false, error: lastError };
}

/** @deprecated Prefer persistAllCompareBeatFontScalesToFile with the full beat list. */
export async function persistCompareBeatFontScalesToFile(
    scriptId: string,
    beatIndex: number,
    scales: CompareFontScales,
    sceneIndex = 0,
    beatFontScales?: CompareFontScales[],
): Promise<CompareFontScales | null> {
    if (beatFontScales && beatFontScales.length > 0) {
        const result = await persistAllCompareBeatFontScalesToFile(
            scriptId,
            beatFontScales,
            sceneIndex,
        );
        return result.ok ? (result.beatFontScales[beatIndex] ?? scales) : null;
    }

    if (typeof fetch === 'undefined') {
        return null;
    }
    const body = JSON.stringify({
        scriptId,
        beatIndex,
        sceneIndex,
        ...scales,
    });

    for (const endpoint of compareBeatFontScaleEndpoints()) {
        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body,
            });
            if (!response.ok) {
                continue;
            }
            notifyAnimationJsonChanged(scriptId);
            return scales;
        } catch {
            // Try next endpoint.
        }
    }
    return null;
}

/** @deprecated Use persistCompareBeatFontScalesToFile — saves beat 0 only. */
export async function persistCompareFontScalesToFile(
    scriptId: string,
    scales: CompareFontScales,
): Promise<CompareFontScales | null> {
    return persistCompareBeatFontScalesToFile(scriptId, 0, scales);
}
