// /Users/johndoe/Documents/company/basic_ui/video_ops/remotion/src/lib/narrationStrip.ts
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
};

/**
 * Turn Outdoor embeds Remotion with `?outdoorEmbed=1` (composition canvas only).
 * Standalone Studio keeps the editable narration overlay.
 */
export function isOutdoorEmbedPreview(): boolean {
    if (typeof window === 'undefined') {
        return false;
    }
    try {
        const params = new URLSearchParams(window.location.search);
        if (params.get('outdoorEmbed') === '1') {
            return true;
        }
        // Fallback when older embed URLs omit the query flag.
        if (window.self !== window.top) {
            return true;
        }
    } catch {
        // Cross-origin / sandboxed iframe — treat as embed.
        return true;
    }
    return false;
}

/** Preview shows narration for filming; file export only when burnCaptions is true.
 * Outdoor: hide overlay only inside Turn Outdoor iframe; show editable strip in standalone Studio. */
export function narrationStripForScene(scene: RenderScene): NarrationStripConfig | null {
    const lines = scene.director.say;
    if (!lines.length) {
        return null;
    }

    const linesZh = scene.director.sayZh?.filter((line) => line.trim()) ?? [];
    const includeInExport = Boolean(scene.burnCaptions);
    const env = getRemotionEnvironment();
    const isOutdoor = Boolean(scene.outdoorEdit);

    if (env.isRendering) {
        if (!includeInExport) {
            return null;
        }
        return {
            lines,
            linesZh: linesZh.length > 0 ? scene.director.sayZh : undefined,
            timings: scene.director.sayTimings,
            segments: scene.outdoorEdit?.captionSegments ?? scene.director.captionSegments,
            mode: 'export',
        };
    }

    // Turn Outdoor Align iframe: composition only (Script|Said lives in outdoor UI).
    if (isOutdoor && isOutdoorEmbedPreview()) {
        return null;
    }

    // Outdoor take: ad-lib tail (e.g. subscribe CTA) lives in captionSegments, not beat `say`.
    const outdoorSegments = scene.outdoorEdit?.captionSegments;
    if (isOutdoor && includeInExport && outdoorSegments?.length) {
        return {
            lines,
            linesZh: linesZh.length > 0 ? scene.director.sayZh : undefined,
            timings: scene.director.sayTimings,
            segments: outdoorSegments,
            mode: 'export',
        };
    }

    return {
        lines,
        linesZh: linesZh.length > 0 ? scene.director.sayZh : undefined,
        timings: scene.director.sayTimings,
        mode: 'preview',
    };
}
