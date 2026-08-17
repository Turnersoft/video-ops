import { getRemotionEnvironment } from 'remotion';

import type { CaptionSegment, RenderScene } from '../types/renderProps';

export type NarrationStripMode = 'export' | 'preview';

export type NarrationStripConfig = {
    lines: string[];
    linesZh?: string[];
    timings?: number[];
    /** When present, burned captions use sentence segments instead of whole beats. */
    segments?: CaptionSegment[];
    mode: NarrationStripMode;
    burnCaptionsZh?: boolean;
};

/**
 * Turn Outdoor Align iframe uses `?outdoorEmbed=1` (composition canvas only).
 * Used to suppress the legacy Studio script *panel* — not burned captions.
 */
export function isOutdoorEmbedPreview(): boolean {
    if (typeof window === 'undefined') {
        return false;
    }
    try {
        const params = new URLSearchParams(window.location.search);
        return params.get('outdoorEmbed') === '1';
    } catch {
        return false;
    }
}

/** Preview shows narration for filming; file export only when burnCaptions is true. */
export function narrationStripForScene(scene: RenderScene): NarrationStripConfig | null {
    const lines = scene.director.say;
    if (!lines.length) {
        return null;
    }

    const linesZh = scene.director.sayZh?.filter((line) => line.trim()) ?? [];
    const includeInExport = Boolean(scene.burnCaptions);
    const burnCaptionsZh = scene.outdoorEdit?.burnCaptionsZh !== false;
    const env = getRemotionEnvironment();
    const outdoorSegments = scene.outdoorEdit?.captionSegments ?? scene.director.captionSegments;

    if (env.isRendering) {
        if (!includeInExport) {
            return null;
        }
        return {
            lines,
            linesZh: linesZh.length > 0 ? scene.director.sayZh : undefined,
            timings: scene.director.sayTimings,
            segments: outdoorSegments,
            mode: 'export',
            burnCaptionsZh,
        };
    }

    // Preview (Studio, outdoor embed, player): burned captions when burn-captions is on.
    if (includeInExport) {
        return {
            lines,
            linesZh: linesZh.length > 0 ? scene.director.sayZh : undefined,
            timings: scene.director.sayTimings,
            segments: outdoorSegments?.length ? outdoorSegments : undefined,
            mode: 'export',
            burnCaptionsZh,
        };
    }

    return {
        lines,
        linesZh: linesZh.length > 0 ? scene.director.sayZh : undefined,
        timings: scene.director.sayTimings,
        mode: 'preview',
        burnCaptionsZh,
    };
}
