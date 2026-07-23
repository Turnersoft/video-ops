// /Users/johndoe/Documents/company/basic_ui/src/pages/VideoOpsPage/videoOpsAnimation.ts
import type { VideoOpsCoverOverride } from '../../cover/videoOpsCover';
import type { CompareHintLayout } from '../../tracks/compareHintLayout';
import type { IdeTrack } from '../../tracks/ideTrackTypes';
import type { Lean4Track } from '../../tracks/lean4TrackTypes';
import type { MathBoardDiagramId } from '../../panels/mathBoardDiagramTypes';
import type { CompareFontScales } from '../../tracks/compareFontScale';
import { readCompareBeatFontScalesFromStorage } from '../../tracks/compareFontScale';
import { VIDEO_OPS_COVER_SECONDS } from '../../cover/videoOpsCover';
import { VIDEO_OPS_SERIES_OUTRO_SECONDS } from '../../cover/videoOpsOutro';

import type { TeleprompterSpeechPace } from './videoOpsSpeechPace';
import { sayLinesFromScriptBlock, sayLinesFromScriptCleanMarkdown } from './parseVideoOpsMarkdown';
import type { ParsedScript, ParsedSlide } from './parseVideoOpsMarkdown';
import {
    compileCompareTracksFromBeatsV4,
    expandAnimationV3ToV2,
    expandAnimationV4ToV2,
    isAnimationV3,
    isAnimationV4,
    mergeScriptCleanIntoCompareBeats,
    mergeScriptCleanIntoCompareBeatsV4,
    normalizeCompareBeatsOnSceneV4,
    applySpeechPaceToSceneV3,
    applySpeechPaceToSceneV4,
    type CompareFocusBeat,
    type ComparePortraitBottomTarget,
    type VideoOpsAnimationV3,
    type VideoOpsAnimationV4,
} from './videoOpsAnimationBeats';
import { recomputeDirectorSayTimings, resolveSpeechPace } from './videoOpsSpeechPace';

export const VIDEO_OPS_ANIMATION_VERSION = 2 as const;

export type PipPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';

/** One burned caption sentence with scene-absolute timing (AI-voice export). */
export type VideoOpsCaptionSegment = {
    text: string;
    zh?: string;
    atSeconds: number;
    durationSeconds: number;
};

/** Editor-only teleprompter. Never included in export render. */
export type VideoOpsDirectorScene = {
    say: string[];
    /** Seconds into the scene when each say line becomes active. Auto-even if omitted. */
    sayTimings?: number[];
    /** Chinese caption lines aligned with `say` (voice-edit export). */
    sayZh?: string[];
    /** Relative paths under script folder, e.g. export/voice/beat-00.wav */
    beatVoiceSrc?: string[];
    /** Sentence-level burned captions timed to synthesized audio (voice-edit export). */
    captionSegments?: VideoOpsCaptionSegment[];
    /** Voice-edit flags carried through from v4 scene (burnCaptionsZh etc.). */
    voiceEdit?: {
        burnCaptionsZh?: boolean;
        beatVoiceSrc?: string[];
        captionSegments?: VideoOpsCaptionSegment[];
    };
    teleprompter?: {
        /** `below-canvas` = Video Editor script panel under preview (filming). */
        position?: 'bottom' | 'lower-third' | 'below-canvas';
        /** Per-script filming pace — syllables/sec overrides word/sec when set. */
        pace?: TeleprompterSpeechPace;
    };
    /** v4 compare: production notes aligned with each `say` line (after resolving `"as before"`). */
    beatVisualNotes?: string[];
    /** v4 compare: per-beat AI improvement comments (editor only). */
    beatComments?: string[];
    /** v4 compare: whether AI may rewrite each beat's `say` (default true). */
    beatAllowScriptChange?: boolean[];
};

export type VideoOpsPipLayer = {
    type: 'pip';
    src: string;
    position?: PipPosition;
    widthFraction?: number;
    startFrom?: number;
    endAt?: number;
    borderRadius?: number;
    opacity?: number;
};

export type VideoOpsTalkingHeadLayer = {
    type: 'talking-head';
    src: string;
    trimIn?: number;
    trimOut?: number;
    position?: 'background' | 'pip';
    widthFraction?: number;
};

export type VideoOpsTurnCodeLayer = {
    type: 'turn-code';
    source: string;
    animation?: {
        kind: 'type';
        charsPerSecond?: number;
    };
};

/** Full IDE demo: typing + proof panel clicks. Track from LSP/knowledge or demo JSON. */
export type VideoOpsTurnIdeLayer = {
    type: 'turn-ide';
    /** Relative to script folder, e.g. tracks/scene-3-ide.json */
    track: string;
};

/** Lean 4 editor + static goal panel. Track references .lean source + goal export JSON. */
export type VideoOpsLean4Layer = {
    type: 'lean4';
    /** Relative to script folder, e.g. tracks/scene-1-lean4.json */
    track: string;
};

/** Lean compiled from v3 beats at load time — avoids stale track JSON while editing animation.json. */
export type VideoOpsCompareCompiledTracks = {
    leanTrack: Lean4Track;
    turnTrack: IdeTrack;
    goalExport: VideoOpsLean4GoalExport;
    hintLayouts: { version: number; layouts: Record<string, CompareHintLayout> };
};

/** Turn-Lang vs Lean 4 side-by-side — one concept, two formalizations. */
export type VideoOpsCompareLayer = {
    type: 'compare';
    turnTrack: string;
    leanTrack: string;
    leftLabel?: string;
    rightLabel?: string;
    editorFontScale?: number;
    leanEditorFontScale?: number;
    renderFontScale?: number;
    /** Resolved per-beat zoom (Turn editor, Lean editor, render panels). */
    beatFontScales?: CompareFontScales[];
    hintLayoutsPath?: string;
    /** Populated when animation.json v3 beats are expanded — preview uses this instead of track files. */
    compiledTracks?: VideoOpsCompareCompiledTracks;
    /** Logo-focus timeline (scene-relative seconds) — glows the active proof assistant's logo. */
    focusBeats?: CompareFocusBeat[];
    /** Portrait outdoor bottom pane by compare beat. */
    portraitBottomTargets?: ComparePortraitBottomTarget[];
    /** Outdoor presenter framing per compare beat. */
    presenterModes?: import('./videoOpsAnimationBeats').OutdoorPresenterMode[];
    /** Inline or overlay-ref video clips per compare beat. */
    beatVideos?: Array<import('./videoOpsAnimationBeats').VideoOpsCompareBeatVideo | undefined>;
    /** Unified front-layer placements per compare beat. */
    beatPlacements?: Array<
        import('./videoOpsAnimationBeats').VideoOpsBeatPlacement[] | undefined
    >;
    /** Back-layer footage per compare beat (composited template). */
    beatBaseFootage?: Array<
        import('./videoOpsAnimationBeats').VideoOpsBeatBaseFootage | undefined
    >;
    /** @deprecated Use beatPlacements */
    beatStickers?: Array<import('./videoOpsAnimationBeats').VideoOpsBeatSticker[] | undefined>;
    textbookOverlay?: {
        aataExcerpt?: string;
        section?: string;
        definitionLabel?: string;
        body?: string;
        source?: string;
        revealAtSeconds?: number;
        hideAtSeconds?: number;
        placement?: 'top' | 'center';
        fontScale?: number;
    };
};

export type VideoOpsScreenTextLayer = {
    type: 'screen-text';
    source: string;
};

export type VideoOpsTitleCardLayer = {
    type: 'title-card';
    title: string;
    subtitle?: string;
    variant?: 'hook' | 'chapter' | 'close';
};

export type VideoOpsMathBoardLayer = {
    type: 'math-board';
    heading?: string;
    exportPath?: string;
    reveal?: 'sequential' | 'all';
    beats?: Array<{
        atSeconds?: number;
        label: string;
        detail?: string;
        emphasis?: string[];
        diagram?: MathBoardDiagramId;
    }>;
    callout?: { atSeconds?: number; title: string; detail?: string };
};

export type VideoOpsSplitReceiptLayer = {
    type: 'split-receipt';
    leftHeading?: string;
    rightHeading?: string;
    knowledgeExportPath?: string;
    proofExportPath?: string;
    leftSectionIds?: string[];
};

export type VideoOpsChapterBeatLayer = {
    type: 'chapter-beat';
    heading: string;
    body: string;
    emphasis?: string;
};

export type VideoOpsTerminalLayer = {
    type: 'terminal';
    lines: string[];
    prompt?: string;
    charsPerSecond?: number;
};

/** Present a bundled video clip as the main scene content. */
export type VideoOpsVideoClipLayer = {
    type: 'video-clip';
    /** Relative to script folder, e.g. assets/demo.mp4 */
    src: string;
    objectFit?: 'contain' | 'cover';
    label?: string;
    trimIn?: number;
    trimOut?: number;
};

export type VideoOpsCaptionLayer = {
    type: 'caption';
    lines?: string[];
    timings?: number[];
};

export type VideoOpsLayoutPreset =
    | 'dual-panel'
    | 'code-focus'
    | 'math-focus'
    | 'title-full'
    | 'beat-focus'
    | 'presenter-dual';

export type VideoOpsRenderLayer =
    | VideoOpsTurnCodeLayer
    | VideoOpsTurnIdeLayer
    | VideoOpsLean4Layer
    | VideoOpsCompareLayer
    | VideoOpsScreenTextLayer
    | VideoOpsTitleCardLayer
    | VideoOpsMathBoardLayer
    | VideoOpsChapterBeatLayer
    | VideoOpsTerminalLayer
    | VideoOpsSplitReceiptLayer
    | VideoOpsVideoClipLayer
    | VideoOpsPipLayer
    | VideoOpsTalkingHeadLayer
    | VideoOpsCaptionLayer;

export type VideoOpsAnimationScene = {
    index: number;
    title?: string;
    durationSeconds: number;
    layout?: VideoOpsLayoutPreset;
    burnCaptions?: boolean;
    outdoorEdit?: {
        videoSrc: string;
        burnCaptionsZh?: boolean;
        beatDurationsSeconds?: number[];
        captionSegments?: VideoOpsCaptionSegment[];
        presenterMode?: import('./videoOpsAnimationBeats').OutdoorPresenterMode;
        pipMask?: {
            shape: 'circle' | 'rectangle';
            x: number;
            y: number;
            w: number;
            h: number;
            objectPositionX?: number;
            objectPositionY?: number;
            scale?: number;
        };
        hintPanel?: { x: number; y: number; w: number; h: number };
        beatLayouts?: Array<{
            presenterMode?: import('./videoOpsAnimationBeats').OutdoorPresenterMode;
            pipMask?: {
                shape: 'circle' | 'rectangle';
                x: number;
                y: number;
                w: number;
                h: number;
                objectPositionX?: number;
                objectPositionY?: number;
                scale?: number;
            };
            hintPanel?: { x: number; y: number; w: number; h: number };
            scriptFullscreen?: boolean;
        } | null>;
    };
    director: VideoOpsDirectorScene;
    visualNotes?: string;
    layers: VideoOpsRenderLayer[];
    /** Per-beat main layer from beat-studio templates (index = teleprompter beat). */
    beatMainLayers?: Array<VideoOpsRenderLayer | null>;
    /** Per-beat opt-in screen-recording placeholder labels (index = teleprompter beat). */
    beatScreenRecordings?: Array<string | undefined>;
};

export type VideoOpsAnimationComposition = {
    format?: 'short' | 'landscape' | 'long';
    fps: number;
    width: number;
    height: number;
    /** Optional per-script cover title/color/concept overrides. */
    cover?: VideoOpsCoverOverride;
};

export type VideoOpsAnimation = {
    version: typeof VIDEO_OPS_ANIMATION_VERSION;
    scriptId: string;
    title?: string;
    composition: VideoOpsAnimationComposition;
    scenes: VideoOpsAnimationScene[];
};

/** LSP/knowledge-generated demo track for turn-ide layer. */
export type VideoOpsIdeTrack = {
    version: 1;
    /** `shared/reference/foo.turn` under `video_ops/script/shared/reference/`. */
    sourceFile?: string;
    /** 1-based inclusive line range inside sourceFile. */
    sourceRange?: { startLine: number; endLine: number };
    typing?: {
        charsPerSecond?: number;
        /** Ellipsized typing driver (`{ ... }` allowed). */
        snippet?: string;
        /** @deprecated use snippet */
        fullText?: string;
    };
    proofPanel?: {
        steps: Array<{ label: string; goal?: string }>;
    };
    knowledgePanel?: {
        heading?: string;
        exportPath?: string;
        items: Array<{ label: string; detail?: string; section?: unknown; mathNode?: unknown }>;
    };
    interactions?: Array<{
        atSeconds: number;
        kind: 'click-proof-step' | 'click-branch' | 'morph';
        stepIndex?: number;
        branchId?: string;
        morphId?: string;
    }>;
    /** Caption-synced editor + side-panel highlights (see `../../tracks/captionBeats`). */
    captionBeats?: Array<{
        atSeconds: number;
        editor?: string[];
        knowledge?: string[];
        proofStepIndex?: number;
    }>;
};

/** Lean 4 animation track — static source + goal export (no LSP). */
export type VideoOpsLean4Track = {
    version: 1;
    /** `shared/reference/foo.lean` under `video_ops/script/shared/reference/`. */
    sourceFile?: string;
    sourceRange?: { startLine: number; endLine: number };
    typing?: {
        charsPerSecond?: number;
        snippet?: string;
    };
    goalPanel?: {
        exportPath?: string;
    };
    highlights?: Array<{ text: string; atSeconds?: number }>;
};

export type VideoOpsLean4GoalExport = {
    version: number;
    title?: string;
    panelKind?: 'infoview' | 'goals';
    sourceLabel?: string;
    hypotheses: Array<{ name?: string; type: string }>;
    target: string;
    steps?: Array<{
        atSeconds: number;
        label?: string;
        hypotheses: Array<{ name?: string; type: string }>;
        target: string;
    }>;
    generatedBy?: string;
    generatedAt?: string;
};

export type LegacyRemotionConfig = {
    format?: 'short' | 'long';
    fps?: number;
    width?: number;
    height?: number;
    defaultPip?: (Omit<VideoOpsPipLayer, 'type'> & { type?: 'pip' }) | null;
    scenes?: Array<{
        index: number;
        pip?: (Omit<VideoOpsPipLayer, 'type'> & { type?: 'pip' }) | null;
    }>;
};

export type VideoFromScriptRenderProps = {
    scriptId: string;
    fps: number;
    width: number;
    height: number;
    totalFrames: number;
    showDirector?: boolean;
    contentRevision?: number;
    cover?: VideoOpsCoverOverride;
    scenes: Array<{
        index: number;
        title?: string;
        durationSeconds: number;
        director: VideoOpsDirectorScene;
        visualNotes?: string;
        layers: VideoOpsRenderLayer[];
    }>;
};

type LegacyAnimationV1 = {
    version: 1;
    scriptId: string;
    title?: string;
    composition: VideoOpsAnimationComposition;
    scenes: Array<{
        index: number;
        title?: string;
        durationSeconds: number;
        say: string[];
        visualNotes?: string;
        layers: Array<{ type: string; [key: string]: unknown }>;
    }>;
};

function slideDurationSeconds(slide: ParsedSlide): number {
    if (slide.durationSeconds && slide.durationSeconds > 0) {
        return slide.durationSeconds;
    }
    const wordCount = sayLinesFromScriptBlock(slide.say)
        .join(' ')
        .split(/\s+/)
        .filter(Boolean).length;
    return Math.max(3, Math.ceil(wordCount / 2.5));
}

function extractTurnCode(screen: string): string | null {
    const match = screen.match(/```turn\s*\n([\s\S]*?)```/i);
    return match?.[1]?.trim() ?? null;
}

function pipLayerFromConfig(
    sceneIndex: number,
    legacy: LegacyRemotionConfig | null | undefined,
): VideoOpsPipLayer | null {
    const sceneConfig = legacy?.scenes?.find((scene) => scene.index === sceneIndex);
    if (sceneConfig?.pip === null) {
        return null;
    }
    const raw = sceneConfig?.pip ?? legacy?.defaultPip ?? null;
    if (!raw) {
        return null;
    }
    if (raw.type === 'pip') {
        return raw as VideoOpsPipLayer;
    }
    return { type: 'pip', ...raw };
}

function renderLayersForSlide(
    slide: ParsedSlide,
    legacy: LegacyRemotionConfig | null | undefined,
): VideoOpsRenderLayer[] {
    const layers: VideoOpsRenderLayer[] = [];
    const screen = slide.screen?.trim() ?? '';

    if (screen) {
        const turnCode = extractTurnCode(screen);
        if (turnCode) {
            layers.push({
                type: 'turn-code',
                source: turnCode,
                animation: { kind: 'type', charsPerSecond: 28 },
            });
        } else {
            layers.push({ type: 'screen-text', source: screen });
        }
    }

    const pip = pipLayerFromConfig(slide.index, legacy);
    if (pip) {
        layers.push(pip);
    }

    return layers;
}

export function buildAnimationFromScript(
    script: ParsedScript,
    legacyRemotion: LegacyRemotionConfig | null | undefined = null,
): VideoOpsAnimation {
    const legacyW = legacyRemotion?.width;
    const legacyH = legacyRemotion?.height;
    const width = legacyW && legacyH && legacyW >= legacyH ? legacyW : 1920;
    const height = legacyW && legacyH && legacyW >= legacyH ? legacyH : 1080;
    const fps = legacyRemotion?.fps ?? 30;

    return {
        version: VIDEO_OPS_ANIMATION_VERSION,
        scriptId: script.filename,
        title: script.title,
        composition: {
            format: 'landscape',
            fps,
            width,
            height,
        },
        scenes: script.slides.map((slide) => ({
            index: slide.index,
            title: slide.title,
            durationSeconds: slideDurationSeconds(slide),
            director: {
                say: sayLinesFromScriptBlock(slide.say),
                teleprompter: { position: 'lower-third' },
            },
            visualNotes: slide.visualNotes,
            layers: renderLayersForSlide(slide, legacyRemotion),
        })),
    };
}

function migrateV1ToV2(parsed: LegacyAnimationV1): VideoOpsAnimation {
    return {
        version: VIDEO_OPS_ANIMATION_VERSION,
        scriptId: parsed.scriptId,
        title: parsed.title,
        composition: parsed.composition,
        scenes: parsed.scenes.map((scene) => {
            const say =
                scene.say ?? (scene.layers.find((layer) => layer.type === 'caption') ? [] : []);
            const renderLayers = scene.layers.filter(
                (layer) => layer.type !== 'caption',
            ) as VideoOpsRenderLayer[];

            return {
                index: scene.index,
                title: scene.title,
                durationSeconds: scene.durationSeconds,
                director: {
                    say: Array.isArray(say) ? say : sayLinesFromScriptBlock(String(say)),
                    teleprompter: { position: 'lower-third' },
                },
                visualNotes: scene.visualNotes,
                layers: renderLayers,
            };
        }),
    };
}

export function normalizeAnimationJson(parsed: unknown, scriptId?: string): VideoOpsAnimation {
    const raw = parsed as { version?: number; scriptId?: string };
    let animation: VideoOpsAnimation;

    if (raw.version === 1) {
        animation = migrateV1ToV2(parsed as LegacyAnimationV1);
    } else if (isAnimationV4(parsed)) {
        animation = expandAnimationV4ToV2(parsed);
    } else if (isAnimationV3(parsed)) {
        animation = expandAnimationV3ToV2(parsed);
    } else if (raw.version === VIDEO_OPS_ANIMATION_VERSION) {
        animation = parsed as VideoOpsAnimation;
    } else {
        throw new Error(`Unsupported animation.json version: ${String(raw.version)}`);
    }

    if (scriptId && animation.scriptId !== scriptId) {
        throw new Error(
            `animation.json scriptId mismatch: expected ${scriptId}, got ${animation.scriptId}`,
        );
    }

    return ensureLandscapeComposition(animation);
}

/** @deprecated Use isAnimationV3 from videoOpsAnimationBeats */
export function isStoredAnimationV3(parsed: unknown): parsed is VideoOpsAnimationV3 {
    return isAnimationV3(parsed);
}

/** Recompute v2 director sayTimings + scene duration from speech pace. */
export function applySpeechPaceToAnimation(
    animation: VideoOpsAnimation,
    scriptId: string,
    scriptMarkdown?: string,
): VideoOpsAnimation {
    return {
        ...animation,
        scenes: animation.scenes.map((scene) => {
            const pace = resolveSpeechPace(scriptId, scene.director.teleprompter, scriptMarkdown);
            const { sayTimings, durationSeconds } = recomputeDirectorSayTimings(
                scene.director.say,
                pace,
            );
            return {
                ...scene,
                durationSeconds,
                director: {
                    ...scene.director,
                    sayTimings,
                },
            };
        }),
    };
}
/** Copy teleprompter lines from script-clean.md into scene 1 when lengths match or scene had say lines. */
export function mergeScriptCleanTeleprompter(
    animation: VideoOpsAnimation,
    scriptCleanMarkdown: string,
): VideoOpsAnimation {
    const say = sayLinesFromScriptCleanMarkdown(scriptCleanMarkdown);
    if (say.length === 0 || animation.scenes.length === 0) {
        return animation;
    }

    return {
        ...animation,
        scenes: animation.scenes.map((scene, sceneIndex) => {
            if (sceneIndex !== 0) {
                return scene;
            }
            const prevTimings = scene.director.sayTimings;
            const sayTimings =
                prevTimings && prevTimings.length === say.length
                    ? prevTimings
                    : scene.director.sayTimings;
            return {
                ...scene,
                director: {
                    ...scene.director,
                    say,
                    sayTimings,
                },
            };
        }),
    };
}

/** Portrait shorts were the old default; product renders are 16:9 landscape. */
export function ensureLandscapeComposition(animation: VideoOpsAnimation): VideoOpsAnimation {
    const { width, height } = animation.composition;
    if (height > width) {
        return {
            ...animation,
            composition: {
                ...animation.composition,
                format: 'landscape',
                width: 1920,
                height: 1080,
            },
        };
    }
    return animation;
}

export function parseAnimationJson(raw: string, scriptId?: string): VideoOpsAnimation {
    return normalizeAnimationJson(JSON.parse(raw), scriptId);
}

export function sayLineFrameOffsets(scene: VideoOpsAnimationScene, fps: number): number[] {
    const lines = scene.director.say;
    if (lines.length === 0) {
        return [];
    }
    if (scene.director.sayTimings && scene.director.sayTimings.length === lines.length) {
        return scene.director.sayTimings.map((seconds) => Math.round(seconds * fps));
    }
    const framesPerLine = Math.max(1, Math.round((scene.durationSeconds * fps) / lines.length));
    return lines.map((_line, index) => index * framesPerLine);
}

export type EstimateSayTimingsOptions = {
    /** Technical narration pace; default ~120 wpm. */
    wordsPerSecond?: number;
    /** Breathing room before each line after the first. */
    pauseBetweenLines?: number;
    /** Trailing seconds after the last line finishes. */
    tailSeconds?: number;
};

/** Estimate teleprompter line starts from word count (for filming / caption sync). */
export function estimateSayTimingsFromSpeech(
    lines: string[],
    options?: EstimateSayTimingsOptions,
): { sayTimings: number[]; durationSeconds: number } {
    const wps = options?.wordsPerSecond ?? 2;
    const pause = options?.pauseBetweenLines ?? 0.8;
    const tail = options?.tailSeconds ?? 2;
    if (lines.length === 0) {
        return { sayTimings: [], durationSeconds: 0 };
    }
    const sayTimings = [0];
    let elapsed = 0;
    for (let index = 0; index < lines.length - 1; index += 1) {
        const words = lines[index].split(/\s+/).filter(Boolean).length;
        elapsed += words / wps + pause;
        sayTimings.push(Math.round(elapsed));
    }
    const lastWords = lines[lines.length - 1].split(/\s+/).filter(Boolean).length;
    const durationSeconds = Math.round(sayTimings[sayTimings.length - 1] + lastWords / wps + tail);
    return { sayTimings, durationSeconds };
}

/** Remap a beat timestamp when sayTimings are regenerated (keeps line index stable). */
export function remapSecondsToSayLine(
    oldSeconds: number,
    oldSayTimings: number[],
    newSayTimings: number[],
): number {
    let lineIndex = 0;
    for (let index = 0; index < oldSayTimings.length; index += 1) {
        if (oldSeconds >= oldSayTimings[index]) {
            lineIndex = index;
        }
    }
    return newSayTimings[lineIndex] ?? oldSeconds;
}

export function activeSayLineIndex(
    scene: VideoOpsAnimationScene,
    frameInScene: number,
    fps: number,
): number {
    const offsets = sayLineFrameOffsets(scene, fps);
    if (offsets.length === 0) {
        return 0;
    }
    let active = 0;
    offsets.forEach((offset, index) => {
        if (frameInScene >= offset) {
            active = index;
        }
    });
    return active;
}

export function animationToRenderProps(
    animation: VideoOpsAnimation,
    options?: { showDirector?: boolean; contentRevision?: number },
): VideoFromScriptRenderProps {
    const fps = animation.composition.fps;
    const sceneSeconds = animation.scenes.reduce((sum, scene) => sum + scene.durationSeconds, 0);
    const totalSeconds = sceneSeconds + VIDEO_OPS_COVER_SECONDS + VIDEO_OPS_SERIES_OUTRO_SECONDS;

    return {
        scriptId: animation.scriptId,
        fps,
        width: animation.composition.width,
        height: animation.composition.height,
        totalFrames: Math.max(1, Math.ceil(totalSeconds * fps)),
        showDirector: options?.showDirector ?? false,
        contentRevision: options?.contentRevision,
        cover: animation.composition.cover,
        scenes: animation.scenes.map((scene) => ({
            index: scene.index,
            title: scene.title,
            durationSeconds: scene.durationSeconds,
            layout: scene.layout,
            burnCaptions: scene.burnCaptions,
            outdoorEdit: scene.outdoorEdit,
            director: scene.director,
            visualNotes: scene.visualNotes,
            layers: scene.layers,
            ...(scene.beatMainLayers ? { beatMainLayers: scene.beatMainLayers } : {}),
            ...(scene.beatScreenRecordings
                ? { beatScreenRecordings: scene.beatScreenRecordings }
                : {}),
        })),
    };
}

export function sceneStartFrames(animation: VideoOpsAnimation, fps: number): number[] {
    let cursor = 0;
    return animation.scenes.map((scene) => {
        const start = cursor;
        cursor += Math.max(1, Math.round(scene.durationSeconds * fps));
        return start;
    });
}

export function globalFrameToScene(
    animation: VideoOpsAnimation,
    globalFrame: number,
    fps: number,
): { sceneIndex: number; frameInScene: number; sayLineIndex: number } {
    const coverFrames = Math.max(1, Math.round(VIDEO_OPS_COVER_SECONDS * fps));
    const contentFrame = Math.max(0, globalFrame - coverFrames);
    const starts = sceneStartFrames(animation, fps);
    let sceneIndex = 0;
    for (let index = starts.length - 1; index >= 0; index -= 1) {
        if (contentFrame >= starts[index]) {
            sceneIndex = index;
            break;
        }
    }
    const frameInScene = contentFrame - starts[sceneIndex];
    const scene = animation.scenes[sceneIndex];
    return {
        sceneIndex,
        frameInScene,
        sayLineIndex: activeSayLineIndex(scene, frameInScene, fps),
    };
}

/** First compare layer in the project, if any. */
export function findCompareLayer(animation: VideoOpsAnimation): VideoOpsCompareLayer | null {
    for (const scene of animation.scenes) {
        for (const layer of scene.layers) {
            if (layer.type === 'compare') {
                return layer;
            }
        }
    }
    return null;
}

/** First compare scene in the project, if any. */
export function findCompareScene(animation: VideoOpsAnimation): VideoOpsAnimationScene | null {
    for (const scene of animation.scenes) {
        for (const layer of scene.layers) {
            if (layer.type === 'compare') {
                return scene;
            }
        }
    }
    return null;
}

/** Scene-level default font scales from the first compare layer. */
export function compareFontScalesFromAnimation(
    animation: VideoOpsAnimation,
): CompareFontScales | null {
    const layer = findCompareLayer(animation);
    if (!layer) {
        return null;
    }
    return {
        editorFontScale: layer.editorFontScale ?? 1,
        leanEditorFontScale: layer.leanEditorFontScale ?? layer.editorFontScale ?? 1,
        renderFontScale: layer.renderFontScale ?? 1,
    };
}

/** Resolved font scales for every compare beat (in-memory animation). */
export function compareBeatFontScalesFromAnimation(
    animation: VideoOpsAnimation,
): CompareFontScales[] | null {
    const layer = findCompareLayer(animation);
    const scene = findCompareScene(animation);
    if (!layer || !scene) {
        return null;
    }
    const defaults = compareFontScalesFromAnimation(animation);
    if (!defaults) {
        return null;
    }
    const count = Math.max(scene.director.say.length, layer.beatFontScales?.length ?? 0);
    return Array.from({ length: count }, (_, index) => layer.beatFontScales?.[index] ?? defaults);
}

/** Merge in-memory beat scales with browser storage — same source as preview, for export save. */
export function compareBeatFontScalesScopeForPersist(
    scriptId: string,
    animation: VideoOpsAnimation,
): CompareFontScales[] | null {
    const fromAnimation = compareBeatFontScalesFromAnimation(animation);
    if (!fromAnimation) {
        return null;
    }
    return fromAnimation.map((layerScales, index) => {
        const stored = readCompareBeatFontScalesFromStorage(scriptId, index);
        return stored ?? layerScales;
    });
}

/** Font scales for one compare beat (falls back to scene defaults). */
export function compareFontScalesForBeat(
    animation: VideoOpsAnimation,
    beatIndex: number,
): CompareFontScales | null {
    const layer = findCompareLayer(animation);
    if (!layer) {
        return null;
    }
    const beatScales = layer.beatFontScales?.[beatIndex];
    if (beatScales) {
        return beatScales;
    }
    return compareFontScalesFromAnimation(animation);
}

/** Patch one beat's font scales on every compare layer (preview). */
export function applyCompareFontScalesToBeat(
    animation: VideoOpsAnimation,
    beatIndex: number,
    scales: CompareFontScales,
): VideoOpsAnimation {
    return {
        ...animation,
        scenes: animation.scenes.map((scene) => ({
            ...scene,
            layers: scene.layers.map((layer) => {
                if (layer.type !== 'compare') {
                    return layer;
                }
                const beatFontScales = [...(layer.beatFontScales ?? [])];
                while (beatFontScales.length <= beatIndex) {
                    beatFontScales.push(compareFontScalesFromAnimation(animation) ?? scales);
                }
                beatFontScales[beatIndex] = scales;
                return {
                    ...layer,
                    beatFontScales,
                };
            }),
        })),
    };
}

/** @deprecated Use applyCompareFontScalesToBeat — kept for callers that patch scene defaults. */
export function applyCompareFontScalesToAnimation(
    animation: VideoOpsAnimation,
    scales: CompareFontScales,
): VideoOpsAnimation {
    return {
        ...animation,
        scenes: animation.scenes.map((scene) => ({
            ...scene,
            layers: scene.layers.map((layer) => {
                if (layer.type !== 'compare') {
                    return layer;
                }
                const beatFontScales = (layer.beatFontScales ?? []).map(() => ({ ...scales }));
                return {
                    ...layer,
                    editorFontScale: scales.editorFontScale,
                    leanEditorFontScale: scales.leanEditorFontScale,
                    renderFontScale: scales.renderFontScale,
                    beatFontScales: beatFontScales.length > 0 ? beatFontScales : layer.beatFontScales,
                };
            }),
        })),
    };
}

export type { CompareFontScales };
export type {
    CompareFocusBeat,
    CompareFocusSide,
    VideoOpsAnimationV3,
    VideoOpsAnimationV4,
    VideoOpsCompareSceneBeat,
    VideoOpsCompareSceneConfig,
    VideoOpsCompareSceneBeatV4,
} from './videoOpsAnimationBeats';
export {
    applySpeechPaceToSceneV3,
    applySpeechPaceToSceneV4,
    COMPARE_PANE_CODE_AS_BEFORE,
    compileCompareTracksFromBeats,
    compileCompareTracksFromBeatsV4,
    expandAnimationV3ToV2,
    expandAnimationV4ToV2,
    fillCompareBeatViewports,
    isAnimationV3,
    isAnimationV4,
    isComparePaneCodeAsBefore,
    mergeScriptCleanIntoCompareBeats,
    mergeScriptCleanIntoCompareBeatsV4,
    migrateCompareBeatsToDurations,
    normalizeCompareBeatsOnScene,
    normalizeCompareBeatsOnSceneV4,
    resolveCompareBeatTimings,
    resolveComparePaneCode,
    sayTimingsFromBeatDurations,
    sceneDurationFromBeatDurations,
    VIDEO_OPS_ANIMATION_VERSION_V3,
    VIDEO_OPS_ANIMATION_VERSION_V4,
} from './videoOpsAnimationBeats';
