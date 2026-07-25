// /Users/johndoe/Documents/company/basic_ui/src/pages/VideoOpsPage/videoOpsAnimationBeats.ts
import type { CompareHint, CompareHintTarget, CaptionBeat } from '../../tracks/captionBeats';
import type { CompareHintLayout } from '../../tracks/compareHintLayout';
import { compareHintKey } from '../../tracks/compareHintLayout';
import type { IdeTrack, IdeFocusSegment } from '../../tracks/ideTrackTypes';
import type { Lean4Track } from '../../tracks/lean4TrackTypes';

import {
    recomputeCompareBeatDurations,
    resolveSpeechPace,
    type TeleprompterSpeechPace,
} from './videoOpsSpeechPace';

import type { CompareFontScales } from '../../tracks/compareFontScale';
import {
    legacyStickersToPlacements,
    type VideoOpsBeatBaseFootage,
    type VideoOpsBeatPlacement,
    type VideoOpsBeatSticker,
} from '../../placements/beatPlacements';

import type {
    VideoOpsAnimation,
    VideoOpsAnimationScene,
    VideoOpsCompareLayer,
    VideoOpsDirectorScene,
    VideoOpsLean4GoalExport,
    VideoOpsRenderLayer,
} from './videoOpsAnimation';

export const VIDEO_OPS_ANIMATION_VERSION_V3 = 3 as const;
export const VIDEO_OPS_ANIMATION_VERSION_V4 = 4 as const;

export const COMPARE_PANE_CODE_AS_BEFORE = 'as before';

/** Which proof-assistant logo is highlighted for a beat. `both` glows both; default is no change. */
export type CompareFocusSide = 'lean' | 'turn' | 'both';

export const COMPARE_VISUAL_NOTES_AS_BEFORE = COMPARE_PANE_CODE_AS_BEFORE;

/** Timeline of logo-focus changes for the compare frame (scene-relative seconds). */
export type CompareFocusBeat = {
    atSeconds: number;
    side: CompareFocusSide;
};

export type ComparePortraitBottomTarget = 'lean-code' | 'turn-render';

/** Outdoor presenter framing — `full-clip` shows the entire filmed take at full width (letterboxed). */
export type OutdoorPresenterMode = 'split-crop' | 'full-clip';

/** v4 — inline code per beat (animated PPT). Glow needles in `highlights`. */
export type VideoOpsComparePaneBeat = {
    /** Code text shown in this pane for this beat, or `"as before"` to reuse the previous beat's code on this side. */
    code?: string;
    /** Reuse code from `compare.blocks[ref]`. */
    ref?: string;
    /** Plain substrings — every occurrence in `code` is highlighted. */
    highlights?: string[];
    /** Substrings to pulse in the Lean goal / Turn knowledge render pane. */
    goal?: string[];
    knowledge?: string[];
    /** Lean infoview state for this beat (Render pane below the editor). */
    goalStep?: {
        label?: string;
        hypotheses?: Array<{ name?: string; type: string }>;
        target: string;
        sourceLabel?: string;
    };
    hints?: VideoOpsCompareBeatHint[];
};

export type VideoOpsCompareCodeBlock = {
    lean?: { code: string };
    turn?: { code: string };
};

export type VideoOpsCompareOverlayVideoDef = {
    type: 'video';
    /** Relative to script folder, e.g. assets/demo.mp4 */
    src: string;
    objectFit?: 'contain' | 'cover';
    label?: string;
};

export type VideoOpsCompareOverlayDef =
    | {
          type: 'textbook';
          aataExcerpt?: string;
          placement?: 'top' | 'center';
          latex?: string;
          definitionLabel?: string;
          source?: string;
          section?: string;
          bookTitle?: string;
          bookAuthor?: string;
      }
    | VideoOpsCompareOverlayVideoDef;

export type VideoOpsCompareBeatVideo = {
    /** Relative to script folder. */
    src: string;
    objectFit?: 'contain' | 'cover';
    label?: string;
};

export type VideoOpsCompareBeatFontScales = Partial<CompareFontScales>;

/** Outdoor filmed-clip mask box (normalized 0–1 against composition). */
export type OutdoorBeatPipMask = {
    shape: 'circle' | 'rectangle';
    x: number;
    y: number;
    w: number;
    h: number;
    objectPositionX?: number;
    objectPositionY?: number;
    scale?: number;
};

export type { VideoOpsBeatSticker, VideoOpsBeatPlacement, VideoOpsBeatBaseFootage };

/** v4 beat — say + optional lean/turn panes + optional overlay ref. */
export type VideoOpsCompareSceneBeatV4 = {
    say: string;
    /** Optional Chinese caption line (burned when scene.voiceEdit.burnCaptionsZh). */
    sayZh?: string;
    durationSeconds: number;
    /** Filming / editor note for this beat, or `"as before"` to reuse the previous beat's note. */
    visualNotes?: string;
    lean?: VideoOpsComparePaneBeat;
    turn?: VideoOpsComparePaneBeat;
    /** Key into `compare.overlays`. */
    overlay?: string;
    /** Which proof-assistant logo glows while this beat is on screen. */
    focus?: CompareFocusSide;
    /**
     * Outdoor portrait compare — bottom pane content for this beat.
     * `lean-code` shows Lean 4 Editor; `turn-render` shows Turn-Lang Render.
     * Overrides `focus` and hint inference when set.
     */
    portraitBottom?: ComparePortraitBottomTarget;
    /** Per-beat zoom for Turn editor, Lean editor, and render panels. `"as before"` reuses the previous beat. */
    fontScales?: VideoOpsCompareBeatFontScales | typeof COMPARE_PANE_CODE_AS_BEFORE;
    /**
     * Outdoor portrait presenter framing for this beat.
     * `full-clip` letterboxes the filmed take at full width; default is cropped split view.
     */
    presenter?: OutdoorPresenterMode;
    /**
     * When true, Lean/Turn compare fills the frame and the filmed take stays in the pip mask.
     */
    scriptFullscreen?: boolean;
    /** Per-beat filmed-clip mask (shape, size, position, inner zoom). */
    pipMask?: OutdoorBeatPipMask;
    /** Inline video clip for this beat (replaces compare bottom pane or overlays compare in studio). */
    video?: VideoOpsCompareBeatVideo;
    /** Back-layer filmed or screen footage for composited beats. */
    baseFootage?: VideoOpsBeatBaseFootage;
    /** Front-layer timed placements (video editor model). */
    placements?: VideoOpsBeatPlacement[];
    /** @deprecated Use `placements` — legacy sticker rows from beat-studio. */
    stickers?: VideoOpsBeatSticker[];
    /**
     * Opt-in studio screen-recording / screenshot placeholder for this beat.
     * Label describes what to capture (e.g. "Agent review UI"). Off when omitted.
     */
    screenRecording?: string;
    /** Editor-only comment for AI improvement on this beat. */
    comment?: string;
    /** manim-web scene body for `beat-template: manim-motion` (from ### Manim). */
    manimWebCode?: string;
    /** @deprecated Use `comment`; retained while older animation files migrate. */
    aiComment?: string;
    /** When false, AI editors must not change `say` for this beat. Defaults to true when omitted. */
    allowScriptChange?: boolean;
    atSeconds?: number;
};

export function isCompareBeatFontScalesAsBefore(
    fontScales: VideoOpsCompareBeatFontScales | typeof COMPARE_PANE_CODE_AS_BEFORE | undefined,
): fontScales is typeof COMPARE_PANE_CODE_AS_BEFORE {
    return typeof fontScales === 'string' && fontScales.trim().toLowerCase() === COMPARE_PANE_CODE_AS_BEFORE;
}

export function comparePortraitBottomTargetsFromBeats(
    beats: Array<
        Pick<VideoOpsCompareSceneBeatV4, 'focus' | 'lean' | 'turn' | 'portraitBottom'>
    >,
): ComparePortraitBottomTarget[] {
    return beats.map((beat) => {
        if (beat.portraitBottom) {
            return beat.portraitBottom;
        }
        if (beat.focus === 'turn') {
            return 'turn-render';
        }
        if (beat.focus === 'lean' || beat.focus === 'both') {
            return 'lean-code';
        }

        const leanHasHint = beat.lean?.hints?.some((hint) =>
            hint.target.startsWith('lean-'),
        ) ?? false;
        const turnHasHint = beat.turn?.hints?.some((hint) =>
            hint.target.startsWith('turn-'),
        ) ?? false;
        // Highlights / Lean code count as Lean content — a lone Turn callout must not
        // swap the portrait bottom pane to Turn-Lang render while the beat is Lean talk.
        const leanHasContent = Boolean(
            beat.lean?.code?.trim() ||
                (beat.lean?.highlights?.length ?? 0) > 0 ||
                leanHasHint,
        );
        return turnHasHint && !leanHasContent ? 'turn-render' : 'lean-code';
    });
}

export function compareDisplayFontScales(
    display: VideoOpsCompareSceneConfig['display'] | undefined,
): CompareFontScales {
    return {
        editorFontScale: display?.editorFontScale ?? 1,
        leanEditorFontScale: display?.leanEditorFontScale ?? display?.editorFontScale ?? 1,
        renderFontScale: display?.renderFontScale ?? 1,
    };
}

/** Resolve per-beat font scales — scene display defaults, optional beat overrides, `"as before"` forward-fill. */
export function resolveCompareBeatFontScales(
    beats: Array<Pick<VideoOpsCompareSceneBeatV4, 'fontScales'>>,
    display: VideoOpsCompareSceneConfig['display'] | undefined,
): CompareFontScales[] {
    const sceneDefault = compareDisplayFontScales(display);
    let previous = sceneDefault;
    return beats.map((beat) => {
        if (isCompareBeatFontScalesAsBefore(beat.fontScales)) {
            return { ...previous };
        }
        if (!beat.fontScales) {
            return { ...sceneDefault };
        }
        const resolved: CompareFontScales = {
            editorFontScale: beat.fontScales.editorFontScale ?? previous.editorFontScale,
            leanEditorFontScale:
                beat.fontScales.leanEditorFontScale ??
                beat.fontScales.editorFontScale ??
                previous.leanEditorFontScale,
            renderFontScale: beat.fontScales.renderFontScale ?? previous.renderFontScale,
        };
        previous = resolved;
        return resolved;
    });
}

/** Build the logo-focus timeline from beats that declare `focus` (collapses repeats). */
export function compareFocusBeatsFromBeats(
    beats: Array<{ atSeconds: number; focus?: CompareFocusSide }>,
): CompareFocusBeat[] {
    const focusBeats: CompareFocusBeat[] = [];
    let previous: CompareFocusSide | undefined;
    for (const beat of beats) {
        if (!beat.focus || beat.focus === previous) {
            continue;
        }
        focusBeats.push({ atSeconds: beat.atSeconds, side: beat.focus });
        previous = beat.focus;
    }
    return focusBeats;
}

export type VideoOpsCompareSceneConfigV4 = {
    display?: VideoOpsCompareSceneConfig['display'] & { charsPerSecond?: number };
    blocks?: Record<string, VideoOpsCompareCodeBlock>;
    overlays?: Record<string, VideoOpsCompareOverlayDef>;
    leanTrack?: string;
    turnTrack?: string;
    hintLayoutsPath?: string;
    beats: VideoOpsCompareSceneBeatV4[];
};

export type VideoOpsAnimationSceneV4 = {
    index: number;
    title?: string;
    durationSeconds: number;
    layout?: VideoOpsAnimationScene['layout'];
    burnCaptions?: boolean;
    /** Voice-aligned edited export — bilingual burned captions + per-beat narration audio. */
    voiceEdit?: {
        burnCaptionsZh?: boolean;
        beatVoiceSrc?: string[];
        /** Calibrated beat durations (audio + natural pause) — sync must not re-pace these. */
        beatDurationsSeconds?: number[];
        /** Sentence-level caption timings (scene-absolute), written by the edited-export pipeline. */
        captionSegments?: {
            text: string;
            zh?: string;
            atSeconds: number;
            durationSeconds: number;
        }[];
    };
    /** Outdoor filmed take — presenter video + calibrated beat durations. */
    outdoorEdit?: {
        videoSrc: string;
        burnCaptionsZh?: boolean;
        beatDurationsSeconds?: number[];
        captionSegments?: {
            text: string;
            zh?: string;
            atSeconds: number;
            durationSeconds: number;
        }[];
        /** Scene default presenter framing (per-beat `presenter` overrides). */
        presenterMode?: OutdoorPresenterMode;
        beatLayouts?: Array<Record<string, unknown> | null>;
    };
    visualNotes?: string;
    teleprompter?: VideoOpsDirectorScene['teleprompter'];
    /** Optional full-scene presentation instead of compare panes. */
    presentation?: {
        type: 'video-clip';
        src: string;
        objectFit?: 'contain' | 'cover';
        label?: string;
        trimIn?: number;
        trimOut?: number;
    };
    /** Main visual retained while a v2 animation is used as the Markdown compiler base. */
    mainLayer?: VideoOpsAnimationScene['layers'][number];
    /** Additional non-compare layers retained with the main visual. */
    supplementalLayers?: VideoOpsAnimationScene['layers'];
    /** Existing compare visual used when Markdown does not author replacement panes. */
    legacyCompareLayer?: VideoOpsCompareLayer;
    /** Per-beat main layer override from beat-studio template metadata (index = compare beat). */
    beatMainLayers?: Array<VideoOpsAnimationScene['layers'][number] | null>;
    compare: VideoOpsCompareSceneConfigV4;
};

export type VideoOpsAnimationV4 = {
    version: typeof VIDEO_OPS_ANIMATION_VERSION_V4;
    scriptId: string;
    title?: string;
    composition: VideoOpsAnimation['composition'];
    scenes: VideoOpsAnimationSceneV4[];
};

export function isComparePaneCodeAsBefore(code: string | undefined): boolean {
    return code?.trim().toLowerCase() === COMPARE_PANE_CODE_AS_BEFORE;
}

export function resolveComparePaneCode(
    pane: VideoOpsComparePaneBeat | undefined,
    blocks: Record<string, VideoOpsCompareCodeBlock> | undefined,
    side: 'lean' | 'turn',
    previousCode = '',
): string {
    if (!pane) {
        return previousCode;
    }
    if (typeof pane.code === 'string') {
        if (isComparePaneCodeAsBefore(pane.code)) {
            return previousCode;
        }
        return pane.code;
    }
    if (pane.ref && blocks?.[pane.ref]) {
        return blocks[pane.ref][side]?.code ?? previousCode;
    }
    return previousCode;
}

export function resolveCompareBeatVisualNotes(
    visualNotes: string | undefined,
    previousNotes = '',
): string {
    const raw = visualNotes?.trim();
    if (!raw) {
        return '';
    }
    if (isComparePaneCodeAsBefore(raw)) {
        return previousNotes;
    }
    return raw;
}

/** Resolve per-beat filming notes; `"as before"` chains like pane `code`. */
export function beatVisualNotesFromBeats(
    beats: Array<{ visualNotes?: string }>,
): string[] {
    let previous = '';
    return beats.map((beat) => {
        const resolved = resolveCompareBeatVisualNotes(beat.visualNotes, previous);
        if (resolved.length > 0) {
            previous = resolved;
        }
        return resolved;
    });
}

export function comparePresenterModesFromBeats(
    beats: Array<{ presenter?: OutdoorPresenterMode }>,
    sceneDefault: OutdoorPresenterMode = 'split-crop',
): OutdoorPresenterMode[] {
    return beats.map((beat) => beat.presenter ?? sceneDefault);
}

export function beatCommentsFromBeats(
    beats: Array<{ comment?: string; aiComment?: string }>,
): string[] {
    return beats.map((beat) => (beat.comment ?? beat.aiComment)?.trim() ?? '');
}

export function beatAllowScriptChangeFromBeats(
    beats: Array<{ allowScriptChange?: boolean }>,
): boolean[] {
    return beats.map((beat) => beat.allowScriptChange !== false);
}

export function resolveCompareBeatVideo(
    beat: Pick<VideoOpsCompareSceneBeatV4, 'video' | 'overlay'>,
    overlays: Record<string, VideoOpsCompareOverlayDef> | undefined,
): VideoOpsCompareBeatVideo | undefined {
    if (beat.video?.src) {
        return beat.video;
    }
    if (beat.overlay && overlays?.[beat.overlay]) {
        const def = overlays[beat.overlay];
        if (def.type === 'video') {
            return {
                src: def.src,
                objectFit: def.objectFit,
                label: def.label,
            };
        }
    }
    return undefined;
}

export function compareBeatVideosFromBeats(
    beats: Array<Pick<VideoOpsCompareSceneBeatV4, 'video' | 'overlay'>>,
    overlays: Record<string, VideoOpsCompareOverlayDef> | undefined,
): Array<VideoOpsCompareBeatVideo | undefined> {
    return beats.map((beat) => resolveCompareBeatVideo(beat, overlays));
}

export function compareBeatPlacementsFromBeats(
    beats: Array<Pick<VideoOpsCompareSceneBeatV4, 'stickers' | 'placements'>>,
): Array<VideoOpsBeatPlacement[] | undefined> {
    return beats.map((beat) => {
        const merged = [
            ...(beat.placements ?? []),
            ...legacyStickersToPlacements(beat.stickers),
        ];
        return merged.length > 0 ? merged : undefined;
    });
}

/** @deprecated Use compareBeatPlacementsFromBeats */
export function compareBeatStickersFromBeats(
    beats: Array<Pick<VideoOpsCompareSceneBeatV4, 'stickers'>>,
): Array<VideoOpsBeatSticker[] | undefined> {
    return beats.map((beat) => (beat.stickers?.length ? beat.stickers : undefined));
}

export function compareBeatBaseFootageFromBeats(
    beats: Array<Pick<VideoOpsCompareSceneBeatV4, 'baseFootage' | 'video'>>,
): Array<VideoOpsBeatBaseFootage | undefined> {
    return beats.map((beat) => {
        if (beat.baseFootage?.src?.trim()) {
            return beat.baseFootage;
        }
        if (beat.video?.src?.trim()) {
            return {
                src: beat.video.src,
                objectFit: beat.video.objectFit,
                label: beat.video.label,
            };
        }
        return undefined;
    });
}

/** Which lines are visible in one editor pane for this beat. */
export type VideoOpsCompareViewport = {
    startLine: number;
    endLine: number;
    focusLine: number;
};

/** Hover callout on a compare pane — optional inline layout for manual tuning. */
export type VideoOpsCompareBeatHint = {
    target: CompareHintTarget;
    text: string;
    needle?: string;
    layout?: CompareHintLayout;
};

/** Lean column state for one beat — single source for code + goal + hints. */
export type VideoOpsCompareLeanBeat = {
    viewport: VideoOpsCompareViewport;
    editor?: string[];
    goal?: string[];
    hints?: VideoOpsCompareBeatHint[];
    goalStep?: {
        label?: string;
        hypotheses?: Array<{ name?: string; type: string }>;
        target: string;
    };
};

/** Turn column state for one beat — single source for code + knowledge + hints. */
export type VideoOpsCompareTurnBeat = {
    viewport: VideoOpsCompareViewport;
    editor?: string[];
    knowledge?: string[];
    hints?: VideoOpsCompareBeatHint[];
};

/** One teleprompter line + everything on screen for that moment. */
export type VideoOpsCompareSceneBeat = {
    say: string;
    /** How long this beat stays on screen before the next line. */
    durationSeconds: number;
    lean?: VideoOpsCompareLeanBeat;
    turn?: VideoOpsCompareTurnBeat;
    textbookOverlay?: {
        visible?: boolean;
        aataExcerpt?: string;
        placement?: 'top' | 'center';
    };
    /** Which proof-assistant logo glows while this beat is on screen (v4 authoring). */
    focus?: CompareFocusSide;
    /** @deprecated Author with durationSeconds. Migrated on load from cumulative starts. */
    atSeconds?: number;
};

export type ResolvedCompareSceneBeat = VideoOpsCompareSceneBeat & {
    atSeconds: number;
};

export type VideoOpsCompareSourceConfig = {
    sourceFile: string;
    sourceRange?: { startLine: number; endLine: number };
    typing?: {
        charsPerSecond?: number;
        snippet?: string;
    };
    knowledgePanel?: IdeTrack['knowledgePanel'];
};

export type VideoOpsCompareSceneConfig = {
    lean: VideoOpsCompareSourceConfig & {
        goalPanel?: {
            title?: string;
            panelKind?: 'infoview' | 'goals';
            sourceLabel?: string;
        };
    };
    turn: VideoOpsCompareSourceConfig;
    display?: {
        leftLabel?: string;
        rightLabel?: string;
        editorFontScale?: number;
        leanEditorFontScale?: number;
        renderFontScale?: number;
        textbookOverlay?: VideoOpsCompareLayer['textbookOverlay'];
    };
    /** Derived track paths — written by sync from beats. */
    leanTrack?: string;
    turnTrack?: string;
    hintLayoutsPath?: string;
    goalExportPath?: string;
    beats: VideoOpsCompareSceneBeat[];
};

export type VideoOpsAnimationSceneV3 = {
    index: number;
    title?: string;
    durationSeconds: number;
    layout?: VideoOpsAnimationScene['layout'];
    burnCaptions?: boolean;
    visualNotes?: string;
    teleprompter?: VideoOpsDirectorScene['teleprompter'];
    compare: VideoOpsCompareSceneConfig;
};

export type VideoOpsAnimationV3 = {
    version: typeof VIDEO_OPS_ANIMATION_VERSION_V3;
    scriptId: string;
    title?: string;
    composition: VideoOpsAnimation['composition'];
    scenes: VideoOpsAnimationSceneV3[];
};

export type CompiledCompareTracks = {
    leanTrack: Lean4Track;
    turnTrack: IdeTrack;
    goalExport: VideoOpsLean4GoalExport;
    hintLayouts: { version: number; layouts: Record<string, CompareHintLayout> };
    leanTrackPath: string;
    turnTrackPath: string;
    goalExportPath: string;
    hintLayoutsPath: string;
};

const DEFAULT_LEAN_TRACK = 'tracks/scene-compare-lean4.json';
const DEFAULT_TURN_TRACK = 'tracks/scene-compare-turn.json';
const DEFAULT_GOAL_EXPORT = 'tracks/scene-compare-lean4-goal.json';
const DEFAULT_HINT_LAYOUTS = 'tracks/scene-compare-hint-layouts.json';

/** Cumulative line starts from per-beat durations (beat 0 always starts at 0). */
export function sayTimingsFromBeatDurations(
    beats: Array<Pick<VideoOpsCompareSceneBeat, 'durationSeconds'>>,
): number[] {
    const timings: number[] = [];
    let elapsed = 0;
    for (const beat of beats) {
        timings.push(elapsed);
        elapsed += beat.durationSeconds;
    }
    return timings;
}

/** Scene length = sum of beat durations. */
export function sceneDurationFromBeatDurations(
    beats: Array<Pick<VideoOpsCompareSceneBeat, 'durationSeconds'>>,
): number {
    return beats.reduce((sum, beat) => sum + beat.durationSeconds, 0);
}

/** Convert legacy atSeconds authoring to durationSeconds (last beat runs to scene end). */
export function migrateCompareBeatsToDurations(
    beats: VideoOpsCompareSceneBeat[],
    sceneDurationSeconds?: number,
): VideoOpsCompareSceneBeat[] {
    if (beats.length === 0) {
        return beats;
    }
    const hasDuration = beats.every(
        (beat) => typeof beat.durationSeconds === 'number' && beat.durationSeconds > 0,
    );
    if (hasDuration) {
        return beats.map(({ atSeconds: _legacy, say, durationSeconds, ...rest }) => ({
            say,
            durationSeconds,
            ...rest,
        }));
    }

    const starts = beats.map((beat) => beat.atSeconds ?? 0);
    const sceneEnd =
        sceneDurationSeconds ??
        (starts.length > 1 ? starts[starts.length - 1] + 7 : starts[0] + 7);

    return beats.map((beat, index) => {
        const start = starts[index];
        const end = index + 1 < starts.length ? starts[index + 1] : sceneEnd;
        const { atSeconds: _legacy, say, durationSeconds, ...rest } = beat;
        const resolvedDuration =
            typeof durationSeconds === 'number' && durationSeconds > 0
                ? durationSeconds
                : Math.max(1, end - start);
        return { say, durationSeconds: resolvedDuration, ...rest };
    });
}

/** Attach cumulative atSeconds for track compile / render. */
export function resolveCompareBeatTimings(
    beats: VideoOpsCompareSceneBeat[],
    sceneDurationSeconds?: number,
): ResolvedCompareSceneBeat[] {
    const normalized = migrateCompareBeatsToDurations(beats, sceneDurationSeconds);
    let atSeconds = 0;
    return normalized.map((beat) => {
        const resolved: ResolvedCompareSceneBeat = { ...beat, atSeconds };
        atSeconds += beat.durationSeconds;
        return resolved;
    });
}

export type ResolvedCompareSceneBeatV4 = VideoOpsCompareSceneBeatV4 & { atSeconds: number };

/** Convert legacy atSeconds authoring to durationSeconds (v4 beats). */
export function migrateCompareBeatsToDurationsV4(
    beats: VideoOpsCompareSceneBeatV4[],
    sceneDurationSeconds?: number,
): VideoOpsCompareSceneBeatV4[] {
    if (beats.length === 0) {
        return beats;
    }
    const hasDuration = beats.every(
        (beat) => typeof beat.durationSeconds === 'number' && beat.durationSeconds > 0,
    );
    if (hasDuration) {
        return beats.map(({ atSeconds: _legacy, say, durationSeconds, ...rest }) => ({
            say,
            durationSeconds,
            ...rest,
        }));
    }

    const starts = beats.map((beat) => beat.atSeconds ?? 0);
    const sceneEnd =
        sceneDurationSeconds ??
        (starts.length > 1 ? starts[starts.length - 1] + 7 : starts[0] + 7);

    return beats.map((beat, index) => {
        const start = starts[index];
        const end = index + 1 < starts.length ? starts[index + 1] : sceneEnd;
        const { atSeconds: _legacy, say, durationSeconds, ...rest } = beat;
        const resolvedDuration =
            typeof durationSeconds === 'number' && durationSeconds > 0
                ? durationSeconds
                : Math.max(1, end - start);
        return { say, durationSeconds: resolvedDuration, ...rest };
    });
}

/** Attach cumulative atSeconds for v4 track compile / render. */
export function resolveCompareBeatTimingsV4(
    beats: VideoOpsCompareSceneBeatV4[],
    sceneDurationSeconds?: number,
): ResolvedCompareSceneBeatV4[] {
    const normalized = migrateCompareBeatsToDurationsV4(beats, sceneDurationSeconds);
    let atSeconds = 0;
    return normalized.map((beat) => {
        const resolved: ResolvedCompareSceneBeatV4 = { ...beat, atSeconds };
        atSeconds += beat.durationSeconds;
        return resolved;
    });
}

function hintsToCaptionHints(hints: VideoOpsCompareBeatHint[] | undefined): CompareHint[] | undefined {
    if (!hints?.length) {
        return undefined;
    }
    return hints.map(({ target, text, needle, layout }) => ({
        target,
        text,
        needle,
        layout,
    }));
}

function captionBeatFromLean(beat: ResolvedCompareSceneBeat, compareBeatIndex: number): CaptionBeat | null {
    const lean = beat.lean;
    if (!lean) {
        return null;
    }
    const hasContent =
        (lean.editor?.length ?? 0) > 0 ||
        (lean.goal?.length ?? 0) > 0 ||
        (lean.hints?.length ?? 0) > 0;
    if (!hasContent) {
        return null;
    }
    return {
        atSeconds: beat.atSeconds,
        compareBeatIndex,
        editor: lean.editor,
        goal: lean.goal,
        hints: hintsToCaptionHints(lean.hints),
    };
}

function captionBeatFromTurn(beat: ResolvedCompareSceneBeat, compareBeatIndex: number): CaptionBeat | null {
    const turn = beat.turn;
    if (!turn) {
        return null;
    }
    const hasContent =
        (turn.editor?.length ?? 0) > 0 ||
        (turn.knowledge?.length ?? 0) > 0 ||
        (turn.hints?.length ?? 0) > 0;
    if (!hasContent) {
        return null;
    }
    return {
        atSeconds: beat.atSeconds,
        compareBeatIndex,
        editor: turn.editor,
        knowledge: turn.knowledge,
        hints: hintsToCaptionHints(turn.hints),
    };
}

/** Max line gap before editor glow uses compact line pick instead of a contiguous range. */
const EDITOR_LINE_COMPACT_GAP = 2;

/** 1-based file line numbers — one match per editor needle (prefers lines inside viewport). */
export function lineNumbersForEditorTerms(
    editorTerms: string[] | undefined,
    snippet: string | undefined,
    sourceRange?: { startLine: number; endLine: number },
    viewport?: VideoOpsCompareViewport,
): number[] {
    if (!editorTerms?.length || !snippet) {
        return [];
    }
    const rangeStart = sourceRange?.startLine ?? 1;
    const rangeEnd = sourceRange?.endLine ?? rangeStart + snippet.split('\n').length - 1;
    const lines = snippet.split('\n');
    const found = new Set<number>();
    for (const term of editorTerms) {
        if (!term) {
            continue;
        }
        const inViewport: number[] = [];
        const anyMatch: number[] = [];
        for (let index = 0; index < lines.length; index += 1) {
            const lineNum = rangeStart + index;
            if (lineNum < rangeStart || lineNum > rangeEnd) {
                continue;
            }
            if (!lines[index].includes(term)) {
                continue;
            }
            anyMatch.push(lineNum);
            if (
                viewport &&
                lineNum >= viewport.startLine &&
                lineNum <= viewport.endLine
            ) {
                inViewport.push(lineNum);
            }
        }
        const chosen = inViewport[0] ?? anyMatch[0];
        if (chosen != null) {
            found.add(chosen);
        }
    }
    return [...found].sort((left, right) => left - right);
}

/** Viewport for the beat; compact `linePick` when editor glow spans distant lines. */
export function resolveBeatFocusSegment(
    viewport: VideoOpsCompareViewport,
    editorTerms: string[] | undefined,
    snippet: string | undefined,
    sourceRange?: { startLine: number; endLine: number },
): Pick<IdeFocusSegment, 'startLine' | 'endLine' | 'focusLine' | 'linePick'> {
    const termLines = lineNumbersForEditorTerms(editorTerms, snippet, sourceRange, viewport);
    if (termLines.length === 0) {
        return { ...viewport };
    }

    const minTerm = termLines[0];
    const maxTerm = termLines[termLines.length - 1];
    const allInViewport = termLines.every(
        (lineNum) => lineNum >= viewport.startLine && lineNum <= viewport.endLine,
    );

    if (allInViewport) {
        return { ...viewport };
    }

    const inViewport = termLines.filter(
        (lineNum) => lineNum >= viewport.startLine && lineNum <= viewport.endLine,
    );
    const outsideViewport = termLines.filter(
        (lineNum) => lineNum < viewport.startLine || lineNum > viewport.endLine,
    );
    const pickLines = [...new Set([...inViewport, ...outsideViewport])].sort((a, b) => a - b);
    const maxGap = pickLines.slice(1).reduce((gap, lineNum, index) => {
        return Math.max(gap, lineNum - pickLines[index]);
    }, 0);

    if (maxGap > EDITOR_LINE_COMPACT_GAP) {
        return {
            startLine: pickLines[0],
            endLine: pickLines[pickLines.length - 1],
            focusLine: Math.min(Math.max(viewport.focusLine, pickLines[0]), pickLines[pickLines.length - 1]),
            linePick: pickLines,
        };
    }

    return {
        startLine: Math.min(viewport.startLine, ...termLines),
        endLine: Math.max(viewport.endLine, ...termLines),
        focusLine: Math.min(Math.max(viewport.focusLine, minTerm), maxTerm),
    };
}

function focusSegmentFromBeat(
    beat: ResolvedCompareSceneBeat,
    side: 'lean' | 'turn',
    source: VideoOpsCompareSourceConfig,
): IdeFocusSegment | null {
    const pane = side === 'lean' ? beat.lean : beat.turn;
    if (!pane?.viewport) {
        return null;
    }
    const segment = resolveBeatFocusSegment(
        pane.viewport,
        pane.editor,
        source.typing?.snippet,
        source.sourceRange,
    );
    return {
        atSeconds: beat.atSeconds,
        ...segment,
    };
}

function collectHintLayouts(beats: ResolvedCompareSceneBeat[]): Record<string, CompareHintLayout> {
    const layouts: Record<string, CompareHintLayout> = {};
    beats.forEach((beat, beatIndex) => {
        const allHints = [...(beat.lean?.hints ?? []), ...(beat.turn?.hints ?? [])];
        for (const hint of allHints) {
            if (!hint.layout) {
                continue;
            }
            layouts[compareHintKey(beatIndex, hint)] = hint.layout;
        }
    });
    return layouts;
}

function fillBeatViewports(beats: VideoOpsCompareSceneBeat[]): VideoOpsCompareSceneBeat[] {
    let lastLeanViewport: VideoOpsCompareViewport | undefined;
    let lastTurnViewport: VideoOpsCompareViewport | undefined;

    return beats.map((beat) => {
        const next: VideoOpsCompareSceneBeat = { ...beat };
        if (next.lean) {
            next.lean = { ...next.lean };
            if (next.lean.viewport) {
                lastLeanViewport = next.lean.viewport;
            } else if (lastLeanViewport) {
                next.lean.viewport = { ...lastLeanViewport };
            }
        } else if (lastLeanViewport) {
            next.lean = { viewport: { ...lastLeanViewport } };
        }

        if (next.turn) {
            next.turn = { ...next.turn };
            if (next.turn.viewport) {
                lastTurnViewport = next.turn.viewport;
            } else if (lastTurnViewport) {
                next.turn.viewport = { ...lastTurnViewport };
            }
        } else if (lastTurnViewport) {
            next.turn = { viewport: { ...lastTurnViewport } };
        }

        return next;
    });
}

/** Forward-fill lean/turn viewports so every beat has a complete pane state for manual editing. */
export function fillCompareBeatViewports(
    beats: VideoOpsCompareSceneBeat[],
): VideoOpsCompareSceneBeat[] {
    return fillBeatViewports(beats);
}

/** Compile v3 compare beats into lean/turn track JSON + goal export + hint layouts. */
export function compileCompareTracksFromBeats(
    compare: VideoOpsCompareSceneConfig,
    sceneDurationSeconds?: number,
    paths?: Partial<Pick<CompiledCompareTracks, 'leanTrackPath' | 'turnTrackPath' | 'goalExportPath' | 'hintLayoutsPath'>>,
): CompiledCompareTracks {
    const leanTrackPath = paths?.leanTrackPath ?? compare.leanTrack ?? DEFAULT_LEAN_TRACK;
    const turnTrackPath = paths?.turnTrackPath ?? compare.turnTrack ?? DEFAULT_TURN_TRACK;
    const goalExportPath = paths?.goalExportPath ?? compare.goalExportPath ?? DEFAULT_GOAL_EXPORT;
    const hintLayoutsPath = paths?.hintLayoutsPath ?? compare.hintLayoutsPath ?? DEFAULT_HINT_LAYOUTS;

    const beats = resolveCompareBeatTimings(
        fillBeatViewports(compare.beats),
        sceneDurationSeconds,
    );
    const leanFocusSegments = beats
        .map((beat) => focusSegmentFromBeat(beat, 'lean', compare.lean))
        .filter((segment): segment is NonNullable<typeof segment> => segment !== null);
    const turnFocusSegments = beats
        .map((beat) => focusSegmentFromBeat(beat, 'turn', compare.turn))
        .filter((segment): segment is NonNullable<typeof segment> => segment !== null);

    const leanCaptionBeats = beats
        .map((beat, beatIndex) => captionBeatFromLean(beat, beatIndex))
        .filter((beat) => beat !== null) as CaptionBeat[];
    const turnCaptionBeats = beats
        .map((beat, beatIndex) => captionBeatFromTurn(beat, beatIndex))
        .filter((beat) => beat !== null) as CaptionBeat[];

    const leanTrack: Lean4Track = {
        version: 1,
        sourceFile: compare.lean.sourceFile,
        sourceRange: compare.lean.sourceRange,
        typing: compare.lean.typing,
        focusSegments: leanFocusSegments,
        goalPanel: { exportPath: goalExportPath },
        captionBeats: leanCaptionBeats,
    };

    const turnTrack: IdeTrack = {
        version: 1,
        sourceFile: compare.turn.sourceFile,
        sourceRange: compare.turn.sourceRange,
        typing: compare.turn.typing,
        focusSegments: turnFocusSegments,
        knowledgePanel: compare.turn.knowledgePanel,
        captionBeats: turnCaptionBeats,
    };

    const firstGoalStep = beats.find((beat) => beat.lean?.goalStep)?.lean?.goalStep;
    const goalExport: VideoOpsLean4GoalExport = {
        version: 2,
        title: compare.lean.goalPanel?.title ?? 'Infoview',
        panelKind: compare.lean.goalPanel?.panelKind ?? 'infoview',
        sourceLabel: compare.lean.goalPanel?.sourceLabel,
        hypotheses: firstGoalStep?.hypotheses ?? [{ name: 'α', type: 'Type u' }],
        target: firstGoalStep?.target ?? '',
        steps: beats
            .filter((beat) => beat.lean?.goalStep)
            .map((beat) => ({
                atSeconds: beat.atSeconds,
                label: beat.lean!.goalStep!.label,
                hypotheses: beat.lean!.goalStep!.hypotheses ?? [],
                target: beat.lean!.goalStep!.target,
            })),
    };

    return {
        leanTrack,
        turnTrack,
        goalExport,
        hintLayouts: {
            version: 1,
            layouts: collectHintLayouts(beats),
        },
        leanTrackPath,
        turnTrackPath,
        goalExportPath,
        hintLayoutsPath,
    };
}

function textbookOverlayFromBeats(
    compare: VideoOpsCompareSceneConfig,
    sceneDurationSeconds?: number,
): VideoOpsCompareLayer['textbookOverlay'] | undefined {
    const base = compare.display?.textbookOverlay;
    const resolved = resolveCompareBeatTimings(compare.beats, sceneDurationSeconds);
    const firstVisible = resolved.find(
        (beat) => beat.textbookOverlay?.visible !== false && beat.textbookOverlay?.aataExcerpt,
    );
    const firstHidden = resolved.find((beat) => beat.textbookOverlay?.visible === false);

    if (!base && !firstVisible && !firstHidden) {
        return undefined;
    }

    return {
        ...base,
        aataExcerpt: firstVisible?.textbookOverlay?.aataExcerpt ?? base?.aataExcerpt,
        revealAtSeconds: firstVisible?.atSeconds ?? base?.revealAtSeconds,
        hideAtSeconds: firstHidden?.atSeconds ?? base?.hideAtSeconds,
        placement: firstVisible?.textbookOverlay?.placement ?? base?.placement,
    };
}

/** Expand one v3 compare scene into v2 director + compare layer (for render/editor). */
export function expandCompareSceneV3ToV2(scene: VideoOpsAnimationSceneV3): VideoOpsAnimationScene {
    const { compare } = scene;
    const filledBeats = fillCompareBeatViewports(compare.beats);
    const resolvedBeats = resolveCompareBeatTimings(filledBeats, scene.durationSeconds);
    const compiled = compileCompareTracksFromBeats(
        { ...compare, beats: filledBeats },
        scene.durationSeconds,
    );
    const display = compare.display ?? {};
    const durationSeconds = sceneDurationFromBeatDurations(resolvedBeats);
    const beatFontScales = resolvedBeats.map(() => compareDisplayFontScales(display));

    const compareLayer: VideoOpsCompareLayer = {
        type: 'compare',
        leanTrack: compiled.leanTrackPath,
        turnTrack: compiled.turnTrackPath,
        hintLayoutsPath: compiled.hintLayoutsPath,
        leftLabel: display.leftLabel,
        rightLabel: display.rightLabel,
        editorFontScale: display.editorFontScale,
        leanEditorFontScale: display.leanEditorFontScale,
        renderFontScale: display.renderFontScale,
        beatFontScales,
        textbookOverlay: textbookOverlayFromBeats(compare, scene.durationSeconds),
        compiledTracks: {
            leanTrack: compiled.leanTrack,
            turnTrack: compiled.turnTrack,
            goalExport: compiled.goalExport,
            hintLayouts: compiled.hintLayouts,
        },
    };

    const layers: VideoOpsRenderLayer[] = [compareLayer];

    return {
        index: scene.index,
        title: scene.title,
        durationSeconds,
        layout: scene.layout ?? 'dual-panel',
        burnCaptions: scene.burnCaptions,
        director: {
            say: resolvedBeats.map((beat) => beat.say),
            sayTimings: sayTimingsFromBeatDurations(resolvedBeats),
            teleprompter: scene.teleprompter ?? { position: 'below-canvas' },
        },
        visualNotes: scene.visualNotes,
        layers,
    };
}

/** Expand full v3 animation document to v2 for existing consumers. */
export function expandAnimationV3ToV2(animation: VideoOpsAnimationV3): VideoOpsAnimation {
    return {
        version: 2,
        scriptId: animation.scriptId,
        title: animation.title,
        composition: animation.composition,
        scenes: animation.scenes.map(expandCompareSceneV3ToV2),
    };
}

export function isAnimationV3(parsed: unknown): parsed is VideoOpsAnimationV3 {
    return (
        typeof parsed === 'object' &&
        parsed !== null &&
        'version' in parsed &&
        (parsed as { version: number }).version === VIDEO_OPS_ANIMATION_VERSION_V3
    );
}

/** Normalize beats on disk to durationSeconds-only authoring. */
export function normalizeCompareBeatsOnScene(
    scene: VideoOpsAnimationSceneV3,
): VideoOpsAnimationSceneV3 {
    const migrated = migrateCompareBeatsToDurations(
        fillBeatViewports(scene.compare.beats),
        scene.durationSeconds,
    );
    return {
        ...scene,
        durationSeconds: sceneDurationFromBeatDurations(migrated),
        compare: {
            ...scene.compare,
            beats: migrated,
        },
    };
}
export function mergeScriptCleanIntoCompareBeatsV4(
    animation: VideoOpsAnimationV4,
    sayLines: string[],
): VideoOpsAnimationV4 {
    if (sayLines.length === 0 || animation.scenes.length === 0) {
        return animation;
    }
    return {
        ...animation,
        scenes: animation.scenes.map((scene, sceneIndex) => {
            if (sceneIndex !== 0) {
                return scene;
            }
            const beats = scene.compare.beats;
            if (sayLines.length !== beats.length) {
                return scene;
            }
            return {
                ...scene,
                compare: {
                    ...scene.compare,
                    beats: beats.map((beat, index) => ({
                        ...beat,
                        say: sayLines[index] ?? beat.say,
                    })),
                },
            };
        }),
    };
}

/** Compile v4 beats → tracks with per-beat inline code (no source viewport). */
export function compileCompareTracksFromBeatsV4(
    compare: VideoOpsCompareSceneConfigV4,
    sceneDurationSeconds?: number,
    paths?: Partial<Pick<CompiledCompareTracks, 'leanTrackPath' | 'turnTrackPath' | 'goalExportPath' | 'hintLayoutsPath'>>,
): CompiledCompareTracks {
    const leanTrackPath = paths?.leanTrackPath ?? compare.leanTrack ?? DEFAULT_LEAN_TRACK;
    const turnTrackPath = paths?.turnTrackPath ?? compare.turnTrack ?? DEFAULT_TURN_TRACK;
    const goalExportPath = paths?.goalExportPath ?? DEFAULT_GOAL_EXPORT;
    const hintLayoutsPath = paths?.hintLayoutsPath ?? compare.hintLayoutsPath ?? DEFAULT_HINT_LAYOUTS;
    const blocks = compare.blocks ?? {};
    const charsPerSecond = compare.display?.charsPerSecond ?? 22;

    const beats = resolveCompareBeatTimingsV4(compare.beats, sceneDurationSeconds);

    let previousLeanCode = '';
    const leanBeatCodeSegments = beats
        .map((beat) => {
            const code = resolveComparePaneCode(beat.lean, blocks, 'lean', previousLeanCode);
            if (code.length > 0) {
                previousLeanCode = code;
            }
            return {
                atSeconds: beat.atSeconds,
                code,
                highlights: beat.lean?.highlights,
            };
        })
        .filter((segment) => segment.code.length > 0);

    let previousTurnCode = '';
    const turnBeatCodeSegments = beats
        .map((beat) => {
            const code = resolveComparePaneCode(beat.turn, blocks, 'turn', previousTurnCode);
            if (code.length > 0) {
                previousTurnCode = code;
            }
            return {
                atSeconds: beat.atSeconds,
                code,
                highlights: beat.turn?.highlights,
            };
        })
        .filter((segment) => segment.code.length > 0);

    const leanCaptionBeats = beats
        .map((beat, beatIndex) => {
            const lean = beat.lean;
            if (!lean) {
                return null;
            }
            const hasContent =
                (lean.highlights?.length ?? 0) > 0 ||
                (lean.goal?.length ?? 0) > 0 ||
                (lean.hints?.length ?? 0) > 0;
            if (!hasContent) {
                return null;
            }
            return {
                atSeconds: beat.atSeconds,
                compareBeatIndex: beatIndex,
                editor: lean.highlights,
                goal: [
                    ...(lean.goal ?? []),
                    ...(lean.hints ?? [])
                        .filter((hint) => hint.target === 'lean-goal' && hint.needle)
                        .map((hint) => hint.needle as string),
                ],
                hints: hintsToCaptionHints(lean.hints),
            };
        })
        .filter((beat) => beat !== null) as CaptionBeat[];

    const turnCaptionBeats = beats
        .map((beat, beatIndex) => {
            const turn = beat.turn;
            if (!turn) {
                return null;
            }
            const hasContent =
                (turn.highlights?.length ?? 0) > 0 ||
                (turn.knowledge?.length ?? 0) > 0 ||
                (turn.hints?.length ?? 0) > 0;
            if (!hasContent) {
                return null;
            }
            return {
                atSeconds: beat.atSeconds,
                compareBeatIndex: beatIndex,
                editor: turn.highlights,
                knowledge: turn.knowledge ?? turn.highlights,
                hints: hintsToCaptionHints(turn.hints),
            };
        })
        .filter((beat) => beat !== null) as CaptionBeat[];

    const leanTrack: Lean4Track = {
        version: 1,
        beatCodeSegments: leanBeatCodeSegments,
        typing: { charsPerSecond },
        captionBeats: leanCaptionBeats,
    };

    const turnTrack: IdeTrack = {
        version: 1,
        beatCodeSegments: turnBeatCodeSegments,
        typing: { charsPerSecond },
        captionBeats: turnCaptionBeats,
        knowledgePanel: {
            heading: 'Knowledge',
            generateFromSource: true,
            scopedToSource: true,
            focusLine: 1,
        },
    };

    const goalSteps = beats
        .map((beat) => {
            const goalStep = beat.lean?.goalStep;
            if (!goalStep) {
                return null;
            }
            return {
                atSeconds: beat.atSeconds,
                label: goalStep.label,
                hypotheses: goalStep.hypotheses ?? [],
                target: goalStep.target,
            };
        })
        .filter((step): step is NonNullable<typeof step> => step !== null);

    const firstGoalStep = beats.map((beat) => beat.lean?.goalStep).find(Boolean) ?? undefined;
    const goalExport: VideoOpsLean4GoalExport = {
        version: 2,
        title: 'Infoview',
        panelKind: 'infoview',
        sourceLabel: firstGoalStep?.sourceLabel,
        hypotheses: firstGoalStep?.hypotheses ?? [],
        target: firstGoalStep?.target ?? '',
        steps: goalSteps,
    };

    const layouts: Record<string, CompareHintLayout> = {};
    beats.forEach((beat, beatIndex) => {
        for (const hint of [...(beat.lean?.hints ?? []), ...(beat.turn?.hints ?? [])]) {
            if (hint.layout) {
                layouts[compareHintKey(beatIndex, hint)] = hint.layout;
            }
        }
    });

    return {
        leanTrack,
        turnTrack,
        goalExport,
        hintLayouts: { version: 1, layouts },
        leanTrackPath,
        turnTrackPath,
        goalExportPath,
        hintLayoutsPath,
    };
}

function mergeOutdoorBeatLayouts(
    beatLayouts: Array<Record<string, unknown> | null> | undefined,
    beats: Array<{
        presenter?: OutdoorPresenterMode;
        pipMask?: OutdoorBeatPipMask;
        scriptFullscreen?: boolean;
    }>,
    sceneDefaultPresenter: OutdoorPresenterMode,
): Array<Record<string, unknown> | null> | undefined {
    if (!beats.length) {
        return beatLayouts;
    }
    const layouts = Array.isArray(beatLayouts) ? [...beatLayouts] : [];
    while (layouts.length < beats.length) {
        layouts.push(null);
    }
    return beats.map((beat, index) => {
        const existing =
            layouts[index] && typeof layouts[index] === 'object'
                ? { ...(layouts[index] as Record<string, unknown>) }
                : {};
        const presenterMode = beat.presenter ?? sceneDefaultPresenter;
        const patch: Record<string, unknown> = { ...existing };
        if (presenterMode !== 'split-crop') {
            patch.presenterMode = presenterMode;
        }
        if (beat.pipMask) {
            patch.pipMask = beat.pipMask;
        }
        if (beat.scriptFullscreen) {
            patch.scriptFullscreen = true;
        }
        return Object.keys(patch).length ? patch : null;
    });
}

function textbookOverlayFromBeatsV4(
    compare: VideoOpsCompareSceneConfigV4,
    sceneDurationSeconds?: number,
): VideoOpsCompareLayer['textbookOverlay'] | undefined {
    const overlays = compare.overlays ?? {};
    const resolved = resolveCompareBeatTimingsV4(compare.beats, sceneDurationSeconds);
    const firstWithOverlay = resolved.find((beat) => beat.overlay && overlays[beat.overlay]);
    if (!firstWithOverlay?.overlay) {
        return undefined;
    }
    const def = overlays[firstWithOverlay.overlay];
    if (def.type !== 'textbook') {
        return undefined;
    }
    const firstHidden = resolved.find(
        (beat, index) =>
            index > 0 &&
            !beat.overlay &&
            resolved[index - 1]?.overlay === firstWithOverlay.overlay,
    );
    return {
        aataExcerpt: def.aataExcerpt,
        placement: def.placement,
        latex: def.latex,
        definitionLabel: def.definitionLabel,
        source: def.source,
        section: def.section,
        bookTitle: def.bookTitle,
        bookAuthor: def.bookAuthor,
        revealAtSeconds: firstWithOverlay.atSeconds,
        hideAtSeconds: firstHidden?.atSeconds,
    };
}

function hasAlignedBeatDurations(
    durations: number[] | undefined,
    beatCount: number,
): durations is number[] {
    return (
        durations?.length === beatCount &&
        durations.every((duration) => Number.isFinite(duration) && duration > 0)
    );
}

function voiceEditFromV2Scene(
    scene: VideoOpsAnimationScene,
): VideoOpsAnimationSceneV4['voiceEdit'] {
    const existing = scene.director.voiceEdit as VideoOpsAnimationSceneV4['voiceEdit'];
    const beatVoiceSrc = existing?.beatVoiceSrc ?? scene.director.beatVoiceSrc;
    const captionSegments =
        existing?.captionSegments ??
        (scene.outdoorEdit ? undefined : scene.director.captionSegments);
    if (!existing && beatVoiceSrc === undefined && captionSegments === undefined) {
        return undefined;
    }
    return {
        ...existing,
        ...(beatVoiceSrc === undefined ? {} : { beatVoiceSrc }),
        ...(captionSegments === undefined ? {} : { captionSegments }),
    };
}

function outdoorEditFromV2Scene(
    scene: VideoOpsAnimationScene,
): VideoOpsAnimationSceneV4['outdoorEdit'] {
    const outdoorEdit = scene.outdoorEdit;
    if (!outdoorEdit) {
        return undefined;
    }
    return {
        videoSrc: outdoorEdit.videoSrc,
        burnCaptionsZh: outdoorEdit.burnCaptionsZh,
        beatDurationsSeconds: outdoorEdit.beatDurationsSeconds,
        captionSegments: outdoorEdit.captionSegments,
        presenterMode: outdoorEdit.presenterMode,
        beatLayouts: outdoorEdit.beatLayouts?.map((layout) =>
            layout === null ? null : { ...layout },
        ),
    };
}

function placeholderCompareBeatsFromV2Scene(
    scene: VideoOpsAnimationScene,
    voiceEdit: VideoOpsAnimationSceneV4['voiceEdit'],
): VideoOpsCompareSceneBeatV4[] {
    const beatCount = scene.director.say.length;
    const alignedDurations = hasAlignedBeatDurations(
        scene.outdoorEdit?.beatDurationsSeconds,
        beatCount,
    )
        ? scene.outdoorEdit.beatDurationsSeconds
        : hasAlignedBeatDurations(voiceEdit?.beatDurationsSeconds, beatCount)
          ? voiceEdit.beatDurationsSeconds
          : undefined;
    const sayTimings = scene.director.sayTimings;
    const durationsFromTimings =
        sayTimings?.length === beatCount && sayTimings[0] === 0
            ? sayTimings.map(
                  (atSeconds, index) =>
                      (sayTimings[index + 1] ?? scene.durationSeconds) - atSeconds,
              )
            : undefined;
    const fallbackDuration =
        beatCount > 0 && Number.isFinite(scene.durationSeconds) && scene.durationSeconds > 0
            ? scene.durationSeconds / beatCount
            : 1;
    const durations =
        alignedDurations ??
        (hasAlignedBeatDurations(durationsFromTimings, beatCount)
            ? durationsFromTimings
            : Array.from({ length: beatCount }, () => fallbackDuration));

    return scene.director.say.map((say, index) => ({
        say,
        durationSeconds: durations[index],
        ...(scene.director.sayZh?.[index] === undefined
            ? {}
            : { sayZh: scene.director.sayZh[index] }),
        ...(scene.director.beatVisualNotes?.[index] === undefined
            ? {}
            : { visualNotes: scene.director.beatVisualNotes[index] }),
        ...(scene.director.beatComments?.[index] === undefined
            ? {}
            : { comment: scene.director.beatComments[index] }),
        ...(scene.director.beatAllowScriptChange?.[index] === undefined
            ? {}
            : { allowScriptChange: scene.director.beatAllowScriptChange[index] }),
    }));
}

function isPreservableV2MainLayer(layer: VideoOpsRenderLayer): boolean {
    return (
        layer.type !== 'compare' &&
        layer.type !== 'pip' &&
        layer.type !== 'talking-head' &&
        layer.type !== 'caption'
    );
}

/** Beat templates that render through CompareBeatContent still need a compare layer for tracks. */
const COMPARE_SHELL_BEAT_TEMPLATE_KINDS = new Set([
    'compare-dual',
    'stickers',
    'screen-recording',
]);

function beatTemplateKindUsesCompareShell(kind: string | undefined): boolean {
    if (!kind) {
        return true;
    }
    return COMPARE_SHELL_BEAT_TEMPLATE_KINDS.has(kind);
}

function mainLayerDefersToCompareTracks(
    mainLayer: VideoOpsAnimationSceneV4['mainLayer'],
): boolean {
    return (
        mainLayer?.type === 'beat-template' &&
        beatTemplateKindUsesCompareShell(mainLayer.kind)
    );
}

function hasAuthoredCompareVisuals(compare: VideoOpsCompareSceneConfigV4): boolean {
    return (
        compare.beats.some((beat) => Boolean(beat.lean || beat.turn || beat.overlay)) ||
        Object.keys(compare.blocks ?? {}).length > 0 ||
        Object.keys(compare.overlays ?? {}).length > 0 ||
        Object.keys(compare.display ?? {}).length > 0
    );
}

export function usesGeneratedCompareLayerV4(scene: VideoOpsAnimationSceneV4): boolean {
    if (scene.presentation) {
        return false;
    }
    if (scene.mainLayer && !mainLayerDefersToCompareTracks(scene.mainLayer)) {
        return false;
    }
    if (scene.legacyCompareLayer && !hasAuthoredCompareVisuals(scene.compare)) {
        return false;
    }
    return true;
}

/** Convert a normalized v2 animation into a safe base for animation.md compilation. */
export function convertAnimationV2ToV4Base(animation: VideoOpsAnimation): VideoOpsAnimationV4 {
    return {
        version: VIDEO_OPS_ANIMATION_VERSION_V4,
        scriptId: animation.scriptId,
        title: animation.title,
        composition: { ...animation.composition },
        scenes: animation.scenes.map((scene) => {
            const voiceEdit = voiceEditFromV2Scene(scene);
            const outdoorEdit = outdoorEditFromV2Scene(scene);
            const existingMainLayerIndex = scene.layers.findIndex(isPreservableV2MainLayer);
            const existingMainLayer =
                existingMainLayerIndex < 0 ? undefined : scene.layers[existingMainLayerIndex];
            const supplementalLayers = scene.layers.filter(
                (layer, index) => index !== existingMainLayerIndex && layer.type !== 'compare',
            );
            const legacyCompareLayer = scene.layers.find(
                (layer): layer is VideoOpsCompareLayer => layer.type === 'compare',
            );
            const presentation =
                existingMainLayer?.type === 'video-clip'
                    ? { ...existingMainLayer }
                    : undefined;
            const mainLayer =
                existingMainLayer && existingMainLayer.type !== 'video-clip'
                    ? existingMainLayer
                    : undefined;

            return {
                index: scene.index,
                title: scene.title,
                durationSeconds: scene.durationSeconds,
                layout: scene.layout,
                burnCaptions: scene.burnCaptions,
                voiceEdit,
                outdoorEdit,
                visualNotes: scene.visualNotes,
                teleprompter: scene.director.teleprompter,
                ...(presentation ? { presentation } : {}),
                ...(mainLayer ? { mainLayer } : {}),
                ...(supplementalLayers.length > 0 ? { supplementalLayers } : {}),
                ...(legacyCompareLayer ? { legacyCompareLayer } : {}),
                compare: {
                    beats: placeholderCompareBeatsFromV2Scene(scene, voiceEdit),
                },
            };
        }),
    };
}

/** Expand v4 compare scene to v2 director + compare layer. */
export function expandCompareSceneV4ToV2(
    scene: VideoOpsAnimationSceneV4,
): VideoOpsAnimationScene {
    const { compare } = scene;
    const resolvedBeats = resolveCompareBeatTimingsV4(compare.beats, scene.durationSeconds);
    const beatVisualNotes = beatVisualNotesFromBeats(resolvedBeats);
    const beatComments = beatCommentsFromBeats(compare.beats);
    const beatAllowScriptChange = beatAllowScriptChangeFromBeats(compare.beats);
    const presenterModes = comparePresenterModesFromBeats(
        compare.beats,
        scene.outdoorEdit?.presenterMode ?? 'split-crop',
    );
    const beatVideos = compareBeatVideosFromBeats(compare.beats, compare.overlays);
    const beatPlacements = compareBeatPlacementsFromBeats(compare.beats);
    const beatBaseFootage = compareBeatBaseFootageFromBeats(compare.beats);
    const beatStickers = compareBeatStickersFromBeats(compare.beats);
    const compiled = compileCompareTracksFromBeatsV4(compare, scene.durationSeconds);
    const display = compare.display ?? {};
    const durationSeconds = sceneDurationFromBeatDurations(resolvedBeats);

    const beatFontScales = resolveCompareBeatFontScales(compare.beats, display);

    const compareLayer: VideoOpsCompareLayer = {
        type: 'compare',
        leanTrack: compiled.leanTrackPath,
        turnTrack: compiled.turnTrackPath,
        hintLayoutsPath: compiled.hintLayoutsPath,
        leftLabel: display.leftLabel,
        rightLabel: display.rightLabel,
        editorFontScale: display.editorFontScale,
        leanEditorFontScale: display.leanEditorFontScale,
        renderFontScale: display.renderFontScale,
        beatFontScales,
        textbookOverlay: textbookOverlayFromBeatsV4(compare, scene.durationSeconds),
        focusBeats: compareFocusBeatsFromBeats(resolvedBeats),
        portraitBottomTargets: comparePortraitBottomTargetsFromBeats(resolvedBeats),
        presenterModes,
        beatVideos,
        beatPlacements,
        beatBaseFootage,
        beatStickers,
        compiledTracks: {
            leanTrack: compiled.leanTrack,
            turnTrack: compiled.turnTrack,
            goalExport: compiled.goalExport,
            hintLayouts: compiled.hintLayouts,
        },
    };

    const primaryLayers: VideoOpsAnimationScene['layers'] =
        scene.presentation?.type === 'video-clip'
            ? [
                  {
                      type: 'video-clip',
                      src: scene.presentation.src,
                      objectFit: scene.presentation.objectFit,
                      label: scene.presentation.label,
                      trimIn: scene.presentation.trimIn,
                      trimOut: scene.presentation.trimOut,
                  },
              ]
            : scene.mainLayer && !mainLayerDefersToCompareTracks(scene.mainLayer)
              ? [scene.mainLayer]
              : scene.legacyCompareLayer && !hasAuthoredCompareVisuals(scene.compare)
                ? [scene.legacyCompareLayer]
                : [compareLayer];
    const layers: VideoOpsAnimationScene['layers'] = [
        ...primaryLayers,
        ...(scene.supplementalLayers ?? []),
    ];

    const outdoorEdit = scene.outdoorEdit
        ? {
              ...scene.outdoorEdit,
              beatLayouts: mergeOutdoorBeatLayouts(
                  scene.outdoorEdit.beatLayouts,
                  compare.beats,
                  scene.outdoorEdit.presenterMode ?? 'split-crop',
              ),
          }
        : undefined;

    return {
        index: scene.index,
        title: scene.title,
        durationSeconds,
        layout: scene.layout ?? 'dual-panel',
        burnCaptions: scene.burnCaptions,
        outdoorEdit,
        director: {
            say: resolvedBeats.map((beat) => beat.say),
            sayZh: resolvedBeats.map((beat) => beat.sayZh ?? ''),
            sayTimings: sayTimingsFromBeatDurations(resolvedBeats),
            teleprompter: scene.teleprompter ?? { position: 'below-canvas' },
            beatVisualNotes,
            beatComments,
            beatAllowScriptChange,
            voiceEdit: scene.voiceEdit,
            beatVoiceSrc: scene.voiceEdit?.beatVoiceSrc,
            captionSegments:
                scene.outdoorEdit?.captionSegments ?? scene.voiceEdit?.captionSegments,
        },
        visualNotes: scene.visualNotes,
        layers,
        ...(scene.beatMainLayers ? { beatMainLayers: scene.beatMainLayers } : {}),
        ...(compare.beats.some((beat) => beat.screenRecording?.trim())
            ? {
                  beatScreenRecordings: compare.beats.map((beat) => {
                      const label = beat.screenRecording?.trim();
                      return label || undefined;
                  }),
              }
            : {}),
    };
}

export function expandAnimationV4ToV2(animation: VideoOpsAnimationV4): VideoOpsAnimation {
    return {
        version: 2,
        scriptId: animation.scriptId,
        title: animation.title,
        composition: animation.composition,
        scenes: animation.scenes.map((scene) => expandCompareSceneV4ToV2(scene)),
    };
}

export function isAnimationV4(parsed: unknown): parsed is VideoOpsAnimationV4 {
    return (
        typeof parsed === 'object' &&
        parsed !== null &&
        'version' in parsed &&
        (parsed as { version: number }).version === VIDEO_OPS_ANIMATION_VERSION_V4
    );
}

export function normalizeCompareBeatsOnSceneV4(
    scene: VideoOpsAnimationSceneV4,
): VideoOpsAnimationSceneV4 {
    const migrated = migrateCompareBeatsToDurationsV4(scene.compare.beats, scene.durationSeconds);
    return {
        ...scene,
        durationSeconds: sceneDurationFromBeatDurations(migrated),
        compare: {
            ...scene.compare,
            beats: migrated,
        },
    };
}

/** Recompute each beat `durationSeconds` from `say` text and per-script pace. */
export function applySpeechPaceToSceneV4(
    scene: VideoOpsAnimationSceneV4,
    scriptId: string,
    scriptMarkdown?: string,
): VideoOpsAnimationSceneV4 {
    if (!scene.compare?.beats?.length) {
        return scene;
    }
    const pace = resolveSpeechPace(scriptId, scene.teleprompter, scriptMarkdown);
    const beats = recomputeCompareBeatDurations(scene.compare.beats, pace);
    return {
        ...scene,
        durationSeconds: sceneDurationFromBeatDurations(beats),
        compare: {
            ...scene.compare,
            beats,
        },
    };
}

/** Recompute v3 compare beat durations from speech pace. */
export function applySpeechPaceToSceneV3(
    scene: VideoOpsAnimationSceneV3,
    scriptId: string,
    scriptMarkdown?: string,
): VideoOpsAnimationSceneV3 {
    if (!scene.compare?.beats?.length) {
        return scene;
    }
    const pace = resolveSpeechPace(scriptId, scene.teleprompter, scriptMarkdown);
    const beats = recomputeCompareBeatDurations(scene.compare.beats, pace);
    return {
        ...scene,
        durationSeconds: sceneDurationFromBeatDurations(beats),
        compare: {
            ...scene.compare,
            beats,
        },
    };
}

export type { TeleprompterSpeechPace };

export function mergeScriptCleanIntoCompareBeats(
    animation: VideoOpsAnimationV3,
    sayLines: string[],
): VideoOpsAnimationV3 {
    if (sayLines.length === 0 || animation.scenes.length === 0) {
        return animation;
    }

    return {
        ...animation,
        scenes: animation.scenes.map((scene, sceneIndex) => {
            if (sceneIndex !== 0) {
                return scene;
            }
            const beats = scene.compare.beats;
            if (sayLines.length !== beats.length) {
                return scene;
            }
            return {
                ...scene,
                compare: {
                    ...scene.compare,
                    beats: beats.map((beat, index) => ({
                        ...beat,
                        say: sayLines[index] ?? beat.say,
                    })),
                },
            };
        }),
    };
}
