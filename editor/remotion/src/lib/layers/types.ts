import type { MathBoardDiagramId } from '../panels/mathBoardDiagramTypes';
import type { RenderLayer, RenderScene } from '../types/renderProps';
import type { CompareCompiledTracks } from '../tracks/compareTrackLoad';
import type { TextbookOverlayConfig } from '../../components/TextbookPanel/textbookOverlayTypes';

export type CompareFocusSide = 'lean' | 'turn' | 'both';

export type CompareFocusBeat = {
    atSeconds: number;
    side: CompareFocusSide;
};

export type ComparePortraitBottomTarget = 'lean-code' | 'turn-render';

export type LayoutPreset = 'dual-panel' | 'beat-focus';

export type CompareLayer = {
    type: 'compare';
    turnTrack: string;
    leanTrack: string;
    leftLabel?: string;
    rightLabel?: string;
    editorFontScale?: number;
    leanEditorFontScale?: number;
    renderFontScale?: number;
    beatFontScales?: import('../tracks/compareFontScale').CompareFontScales[];
    hintLayoutsPath?: string;
    compiledTracks?: CompareCompiledTracks;
    focusBeats?: CompareFocusBeat[];
    portraitBottomTargets?: ComparePortraitBottomTarget[];
    presenterModes?: import('../types/renderProps').OutdoorPresenterMode[];
    beatVideos?: Array<import('../types/renderProps').CompareBeatVideo | undefined>;
    beatPlacements?: Array<
        import('../../lib/compile/video-ops/videoOpsAnimationBeats.ts').VideoOpsBeatPlacement[] | undefined
    >;
    beatBaseFootage?: Array<
        import('../../lib/compile/video-ops/videoOpsAnimationBeats.ts').VideoOpsBeatBaseFootage | undefined
    >;
    /** @deprecated Use beatPlacements */
    beatStickers?: Array<
        import('../../lib/compile/video-ops/videoOpsAnimationBeats.ts').VideoOpsBeatSticker[] | undefined
    >;
    textbookOverlay?: TextbookOverlayConfig;
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
    callout?: {
        atSeconds?: number;
        title: string;
        detail?: string;
    };
};

const MAIN_LAYER_TYPES = new Set<string>(['beat-template', 'compare']);

export function isMainLayer(layer: RenderLayer): boolean {
    return MAIN_LAYER_TYPES.has(layer.type);
}

export function findMainLayer(layers: RenderLayer[]): RenderLayer | null {
    return layers.find((layer) => isMainLayer(layer)) ?? null;
}

export function findCompareLayer(layers: RenderLayer[]): CompareLayer | null {
    const layer = layers.find((entry) => entry.type === 'compare');
    return layer?.type === 'compare' ? (layer as CompareLayer) : null;
}

export function inferLayoutPreset(scene: RenderScene): LayoutPreset {
    if (scene.layout === 'beat-focus') {
        return 'beat-focus';
    }
    return 'dual-panel';
}
