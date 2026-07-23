// /Users/johndoe/Documents/company/basic_ui/video_ops/remotion/src/lib/renderProps.ts
import type { CompareFontScales } from '../tracks/compareFontScale';

import type { VideoOpsCoverOverride } from '../cover/videoOpsCover';

import type { LayoutPreset } from '../layers/types';

export type PipLayer = {
    type: 'pip';
    src: string;
    position?: string;
    widthFraction?: number;
    startFrom?: number;
    endAt?: number;
    borderRadius?: number;
    opacity?: number;
};

export type CaptionSegment = {
    text: string;
    zh?: string;
    atSeconds: number;
    durationSeconds: number;
};

export type DirectorScene = {
    say: string[];
    sayZh?: string[];
    sayTimings?: number[];
    /** Editor-only AI improvement comments aligned with `say`. */
    beatComments?: string[];
    /** Whether AI may rewrite each beat's script; omitted entries default to true. */
    beatAllowScriptChange?: boolean[];
    beatVoiceSrc?: string[];
    /** Sentence-level captions timed to synthesized narration (AI-voice export). */
    captionSegments?: CaptionSegment[];
    teleprompter?: {
        position?: 'bottom' | 'lower-third' | 'below-canvas';
        pace?: {
            syllablesPerSecond?: number;
            wordsPerSecond?: number;
            pauseAfterBeat?: number;
            minBeatSeconds?: number;
            paceFactor?: number;
        };
    };
};

export type RenderLayer = {
    type: string;
    [key: string]: unknown;
};

export type OutdoorPipMask = {
    shape: 'circle' | 'rectangle';
    /** Mask net — visible crop window on the composition (0–1). */
    x: number;
    y: number;
    w: number;
    h: number;
    /**
     * Video net — underlying filmed-clip rectangle on the composition (0–1).
     * When omitted, derived from mask + legacy scale/objectPosition.
     */
    videoX?: number;
    videoY?: number;
    videoW?: number;
    videoH?: number;
    objectPositionX?: number;
    objectPositionY?: number;
    scale?: number;
};

export type OutdoorPresenterMode = 'split-crop' | 'full-clip';

export type CompareBeatVideo = {
    src: string;
    objectFit?: 'contain' | 'cover';
    label?: string;
    sourceDurationSeconds?: number;
    beatFit?: import('../outdoor/beatFitVideo').BeatVideoFit;
};

export type OutdoorHintPanelLayout = {
    x: number;
    y: number;
    w: number;
    h: number;
};

export type RenderScene = {
    index: number;
    title?: string;
    durationSeconds: number;
    layout?: LayoutPreset;
    /** Burn director.say into the exported video (YouTube-style captions). */
    burnCaptions?: boolean;
    outdoorEdit?: {
        videoSrc: string;
        /** Cut-timeline AAC sidecar — Remotion plays this for voice (volume 1). */
        audioSrc?: string;
        /** Uncut framing take (stabilized when available, else raw source) — unused for playback. */
        sourceVideoSrc?: string;
        burnCaptionsZh?: boolean;
        beatDurationsSeconds?: number[];
        captionSegments?: CaptionSegment[];
        presenterMode?: OutdoorPresenterMode;
        /** Presenter PIP mask — normalized 0–1 box + crop. */
        pipMask?: OutdoorPipMask;
        hintPanel?: OutdoorHintPanelLayout;
        /** Per-beat overrides (index = compare beat). Falls back to pipMask / hintPanel. */
        beatLayouts?: Array<{
            presenterMode?: OutdoorPresenterMode;
            pipMask?: OutdoorPipMask;
            hintPanel?: OutdoorHintPanelLayout;
            /** When true, Lean/Turn compare fills the frame; filmed clip stays in the pip mask. */
            scriptFullscreen?: boolean;
        } | null>;
    };
    director: DirectorScene;
    visualNotes?: string;
    layers: RenderLayer[];
    /** Per-beat main layer from beat-studio templates (index = teleprompter beat). */
    beatMainLayers?: Array<RenderLayer | null>;
    /** Per-beat opt-in screen-recording placeholder labels (index = teleprompter beat). */
    beatScreenRecordings?: Array<string | undefined>;
    /** Studio presenter-framing mask when outdoorEdit is absent (editable green avatar). */
    studioPresenterMask?: OutdoorPipMask;
    /** Per-beat studio presenter masks (index = teleprompter beat). */
    beatStudioPresenterMasks?: Array<OutdoorPipMask | null | undefined>;
};

export type OutdoorRenderFormat = 'portrait' | 'landscape';

export type VideoOutdoorInputProps = {
    scriptId: string;
    format: OutdoorRenderFormat;
    project?: VideoFromScriptRenderProps | null;
};

export type VideoFromScriptRenderProps = {
    scriptId: string;
    fps: number;
    width: number;
    height: number;
    totalFrames: number;
    showDirector?: boolean;
    /** Bumps when .cache/render-props.json is reloaded in dev — remounts scene/track loaders. */
    contentRevision?: number;
    cover?: VideoOpsCoverOverride;
    scenes: RenderScene[];
};

export type VideoFromScriptInputProps = {
    scriptId: string;
    project?: VideoFromScriptRenderProps | null;
    showDirector?: boolean;
    /** VideoOps editor only — enables +/- on compare panel headers. */
    compareFontScales?: CompareFontScales | null;
    onCompareFontScalesChange?: (scales: CompareFontScales) => void;
};
