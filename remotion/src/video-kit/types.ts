// /Users/johndoe/Documents/company/basic_ui/video_ops/remotion/src/video-kit/types.ts
import type { MathBoardDiagramId } from '@turn-video-shared/panels/mathBoardDiagramTypes';
import type { RenderLayer, RenderScene } from '../lib/renderProps';
import type { CompareCompiledTracks } from '../lib/compareTrackLoad';

/** Which proof-assistant logo glows; `both` glows both columns. */
export type CompareFocusSide = 'lean' | 'turn' | 'both';

/** Logo-focus timeline entry (scene-relative seconds). */
export type CompareFocusBeat = {
    atSeconds: number;
    side: CompareFocusSide;
};

export type ComparePortraitBottomTarget = 'lean-code' | 'turn-render';

/** Scene layout presets — math (3b1b), coding tutorial, or hybrid. */
export type LayoutPreset =
    | 'dual-panel'
    | 'code-focus'
    | 'math-focus'
    | 'title-full'
    | 'beat-focus'
    | 'presenter-dual';

export type MainLayerType =
    | 'turn-ide'
    | 'turn-code'
    | 'lean4'
    | 'compare'
    | 'video-clip'
    | 'title-card'
    | 'math-board'
    | 'chapter-beat'
    | 'terminal'
    | 'split-receipt'
    | 'screen-text';

export type Lean4Layer = {
    type: 'lean4';
    /** Relative to script folder, e.g. tracks/scene-1-lean4.json */
    track: string;
};

export type CompareLayer = {
    type: 'compare';
    /** Turn IDE track — code + knowledge render (shown on the right by default). */
    turnTrack: string;
    /** Lean 4 track — editor + goal render (shown on the left by default). */
    leanTrack: string;
    leftLabel?: string;
    rightLabel?: string;
    /** Per-scene multiplier for both code editors. */
    editorFontScale?: number;
    /** Lean-only editor scale when the excerpt is longer (defaults to editorFontScale). */
    leanEditorFontScale?: number;
    /** Per-scene multiplier for both render panels. */
    renderFontScale?: number;
    /** Resolved per-beat zoom (Turn editor, Lean editor, render panels). */
    beatFontScales?: import('@turn-video-shared/ide/compareFontScale').CompareFontScales[];
    /** Per-scene draggable hint layout file. */
    hintLayoutsPath?: string;
    /** v3 beats compiled at load — preview hot-reload uses this instead of track files. */
    compiledTracks?: CompareCompiledTracks;
    /** Logo-focus timeline (scene-relative seconds) — glows the active proof assistant's logo. */
    focusBeats?: CompareFocusBeat[];
    /** Portrait outdoor bottom pane by compare beat. */
    portraitBottomTargets?: ComparePortraitBottomTarget[];
    /** Outdoor presenter framing per compare beat. */
    presenterModes?: import('../lib/renderProps').OutdoorPresenterMode[];
    /** Inline or overlay-ref video clips per compare beat. */
    beatVideos?: Array<import('../lib/renderProps').CompareBeatVideo | undefined>;
    /** AATA paper quote over the compare frame (scene 3). */
    textbookOverlay?: {
        /** Key in `aataTextbookExcerpts.ts` — exact sets.xml prose + MathJax. */
        aataExcerpt?: string;
        section?: string;
        definitionLabel?: string;
        body?: string;
        source?: string;
        revealAtSeconds?: number;
        hideAtSeconds?: number;
        /** `center` = one editor column over compare; `top` = slide-up wrap card. */
        placement?: 'top' | 'center';
        /** Typography multiplier (default 1.3 in renderer). */
        fontScale?: number;
    };
};

export type OverlayLayerType = 'pip' | 'talking-head' | 'caption';

export type TitleCardLayer = {
    type: 'title-card';
    title: string;
    subtitle?: string;
    variant?: 'hook' | 'chapter' | 'close';
};

export type MathBoardLayer = {
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
    /** Shown after all beats — e.g. "Classes" data stack (3b1b-style payoff). */
    callout?: {
        atSeconds?: number;
        title: string;
        detail?: string;
    };
};

export type SplitReceiptLayer = {
    type: 'split-receipt';
    leftHeading?: string;
    rightHeading?: string;
    knowledgeExportPath?: string;
    proofExportPath?: string;
    /** Synced Turn source + proof scrubbing (defaults to matching *-ide.json beside proof export). */
    ideTrackPath?: string;
    leftSectionIds?: string[];
};

export type ChapterBeatLayer = {
    type: 'chapter-beat';
    heading: string;
    body: string;
    emphasis?: string;
};

export type TerminalLayer = {
    type: 'terminal';
    lines: string[];
    prompt?: string;
    charsPerSecond?: number;
};

export type CaptionLayer = {
    type: 'caption';
    lines?: string[];
    timings?: number[];
};

export type VideoClipLayer = {
    type: 'video-clip';
    src: string;
    objectFit?: 'contain' | 'cover';
    label?: string;
    trimIn?: number;
    trimOut?: number;
};

const MAIN_LAYER_TYPES = new Set<string>([
    'turn-ide',
    'turn-code',
    'lean4',
    'compare',
    'video-clip',
    'title-card',
    'math-board',
    'chapter-beat',
    'terminal',
    'split-receipt',
    'screen-text',
]);

const OVERLAY_LAYER_TYPES = new Set<string>(['pip', 'talking-head', 'caption']);

export function isMainLayer(layer: RenderLayer): boolean {
    return MAIN_LAYER_TYPES.has(layer.type);
}

export function isOverlayLayer(layer: RenderLayer): boolean {
    return OVERLAY_LAYER_TYPES.has(layer.type);
}

export function findMainLayer(layers: RenderLayer[]): RenderLayer | null {
    return layers.find((layer) => isMainLayer(layer)) ?? null;
}

export function findOverlayLayers(layers: RenderLayer[]): RenderLayer[] {
    return layers.filter((layer) => isOverlayLayer(layer));
}

export function inferLayoutPreset(scene: RenderScene): LayoutPreset {
    if (scene.layout) {
        return scene.layout;
    }

    const main = findMainLayer(scene.layers);
    const hasPresenter = scene.layers.some(
        (layer) => layer.type === 'pip' || layer.type === 'talking-head',
    );

    if (!main) {
        return 'dual-panel';
    }

    switch (main.type) {
        case 'title-card':
            return 'title-full';
        case 'math-board':
            return 'math-focus';
        case 'chapter-beat':
        case 'screen-text':
            return 'beat-focus';
        case 'terminal':
            return 'code-focus';
        case 'split-receipt':
            return 'beat-focus';
        case 'video-clip':
            return 'beat-focus';
        case 'turn-ide':
        case 'turn-code':
        case 'lean4':
        case 'compare':
            return hasPresenter ? 'presenter-dual' : 'dual-panel';
        default:
            return 'dual-panel';
    }
}
