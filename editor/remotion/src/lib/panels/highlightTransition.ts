// /Users/johndoe/Documents/company/basic_ui/src/shared/turn-video/panels/highlightTransition.ts
import { interpolate } from 'remotion';

import type { CaptionBeat } from '../tracks/captionBeats';

export const HIGHLIGHT_FADE_FRAMES = 12;
export const EMPHASIS_FADE_FRAMES = 18;

export type HighlightOverlay = {
    text: string;
    opacity: number;
};

export type BeatHighlightLayers = {
    current: string[];
    previous: string[];
    changeFrame: number;
};

/** Fade from 0 → 1 over `duration` frames starting at `startFrame`. */
export function clampedFade(frame: number, startFrame: number, duration: number): number {
    return interpolate(frame - startFrame, [0, duration], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
    });
}

/** Fade from 1 → 0 over `duration` frames starting at `startFrame`. */
export function clampedFadeOut(frame: number, startFrame: number, duration: number): number {
    return 1 - clampedFade(frame, startFrame, duration);
}

/** Linear blend between two `#rrggbb` colors. */
export function lerpHexColor(from: string, to: string, t: number): string {
    const clamped = Math.max(0, Math.min(1, t));
    const parse = (hex: string) => {
        const normalized = hex.replace('#', '');
        return [
            parseInt(normalized.slice(0, 2), 16),
            parseInt(normalized.slice(2, 4), 16),
            parseInt(normalized.slice(4, 6), 16),
        ] as const;
    };
    const [r0, g0, b0] = parse(from);
    const [r1, g1, b1] = parse(to);
    const mix = (a: number, b: number) => Math.round(a + (b - a) * clamped);
    const channel = (value: number) => value.toString(16).padStart(2, '0');
    return `#${channel(mix(r0, r1))}${channel(mix(g0, g1))}${channel(mix(b0, b1))}`;
}

function passedBeatTimes(
    items: Array<{ atSeconds?: number; text: string }>,
    seconds: number,
    visible: string,
): number[] {
    const times = new Set<number>();
    for (const item of items) {
        const at = item.atSeconds ?? 0;
        if (seconds >= at && visible.includes(item.text)) {
            times.add(at);
        }
    }
    return [...times].sort((left, right) => right - left);
}

/** Editor highlight needles for current + previous beat (for crossfade). */
export function editorHighlightLayers(
    highlights: Array<{ text: string; atSeconds?: number }>,
    seconds: number,
    visible: string,
    fps: number,
): BeatHighlightLayers {
    const sorted = passedBeatTimes(highlights, seconds, visible);
    const latestAt = sorted[0] ?? -1;
    const previousAt = sorted[1] ?? -1;

    const pick = (at: number) =>
        highlights
            .filter((item) => (item.atSeconds ?? 0) === at && visible.includes(item.text))
            .map((item) => item.text);

    return {
        current: latestAt >= 0 ? pick(latestAt) : [],
        previous: previousAt >= 0 ? pick(previousAt) : [],
        changeFrame: latestAt >= 0 ? Math.round(latestAt * fps) : 0,
    };
}

/** Caption-beat needles (goal / knowledge fields) for current + previous beat. */
export function captionBeatNeedleLayers(
    beats: CaptionBeat[],
    seconds: number,
    fps: number,
    pickNeedles: (beat: CaptionBeat) => string[],
): BeatHighlightLayers {
    const passed = beats
        .filter((beat) => seconds >= beat.atSeconds)
        .sort((a, b) => b.atSeconds - a.atSeconds);
    const currentBeat = passed[0] ?? null;
    const previousBeat = passed[1] ?? null;

    return {
        current: currentBeat ? pickNeedles(currentBeat) : [],
        previous: previousBeat ? pickNeedles(previousBeat) : [],
        changeFrame: currentBeat ? Math.round(currentBeat.atSeconds * fps) : 0,
    };
}

export function overlayOpacityForNeedle(
    needle: string,
    layers: BeatHighlightLayers,
    frame: number,
    fadeFrames: number = HIGHLIGHT_FADE_FRAMES,
): number {
    const inCurrent = layers.current.includes(needle);
    const inPrevious = layers.previous.includes(needle);
    if (inCurrent && inPrevious) {
        return 1;
    }
    if (inCurrent) {
        return clampedFade(frame, layers.changeFrame, fadeFrames);
    }
    if (inPrevious) {
        return clampedFadeOut(frame, layers.changeFrame, fadeFrames);
    }
    return 0;
}

/** Merge current + fading needles into overlay opacities for rendering. */
export function highlightOverlaysFromLayers(
    layers: BeatHighlightLayers,
    frame: number,
    fadeFrames: number = HIGHLIGHT_FADE_FRAMES,
): HighlightOverlay[] {
    const needles = [...new Set([...layers.current, ...layers.previous])];
    return needles
        .map((text) => ({
            text,
            opacity: overlayOpacityForNeedle(text, layers, frame, fadeFrames),
        }))
        .filter((overlay) => overlay.opacity > 0);
}
