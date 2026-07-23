import type { BeatStudioTemplateKind } from './beatStudioCompile';
import type { RenderScene } from '../lib/types/renderProps';
import type { LayoutPreset } from '../lib/layers/types';

/** Per-beat main layer emitted by beat-studio compile — one renderer per kind. */
export type BeatTemplateLayer = {
    type: 'beat-template';
    kind: BeatStudioTemplateKind;
    config: Record<string, unknown>;
    /** Resolved Turn pane source for typing templates. */
    turnSource?: string;
};

export type BeatTemplateSceneProps = {
    scriptId: string;
    scene: RenderScene;
    layout: LayoutPreset;
    contentRevision?: number;
};

export type BeatTemplateComponentProps = BeatTemplateSceneProps & {
    kind: BeatStudioTemplateKind;
    config: Record<string, unknown>;
    turnSource?: string;
};

export function isBeatTemplateLayer(layer: { type: string }): layer is BeatTemplateLayer {
    return layer.type === 'beat-template';
}

/** Beat kinds that share the Lean/Turn compare shell (portrait layout in CompareDualBeat). */
export function beatTemplateUsesCompareShell(kind: BeatStudioTemplateKind | null | undefined): boolean {
    if (!kind) {
        return true;
    }
    switch (kind) {
        case 'compare-dual':
        case 'stickers':
        case 'screen-recording':
            return true;
        case 'composited':
        case 'presenter-overlay':
        case 'turn-focus':
        case 'manim-motion':
            return false;
        default: {
            const _exhaustive: never = kind;
            return _exhaustive;
        }
    }
}
