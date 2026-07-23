import type { IdeTrack } from '../tracks/ideTrackTypes';
import type { Lean4GoalExport, Lean4Track } from '../tracks/lean4TrackTypes';

import type { BeatStudioTemplateKind } from '../../beats/beatStudioCompile';
import type { BeatTemplateLayer } from '../../beats/types';
import type { CompareCompiledTracks } from '../tracks/compareTrackLoad';
import type { RenderLayer, RenderScene } from '../types/renderProps';

export const BEAT_PREVIEW_SCRIPT_ID = 'beat-preview';
export const BEAT_PREVIEW_FPS = 30;
export const BEAT_PREVIEW_DURATION_SECONDS = 12;
export const BEAT_PREVIEW_DURATION_FRAMES = BEAT_PREVIEW_FPS * BEAT_PREVIEW_DURATION_SECONDS;

export const BEAT_PREVIEW_KINDS: BeatStudioTemplateKind[] = [
    'compare-dual',
    'turn-focus',
    'composited',
    'stickers',
    'screen-recording',
    'manim-motion',
    'presenter-overlay',
];

const PREVIEW_TURN_SOURCE = `@notation({A} ~ " = " ~ {B})
relation SetEq(T: Any, A B: Set<T>): Prop {
    |- {
        Subset(A, B);
        Subset(B, A);
    }
}`;

const PREVIEW_LEAN_TRACK: Lean4Track = {
    version: 1,
    beatCodeSegments: [
        {
            atSeconds: 0,
            code: '-- Lean preview\n-- Textbook set equality\nexample (n : Nat) : n + 0 = n := rfl',
            highlights: ['rfl', 'set equality'],
        },
        {
            atSeconds: 6,
            code: '-- Mutual subset\nexample {A B : Set α}\n    (h₁ : A ⊆ B) (h₂ : B ⊆ A) : A = B :=\n  Subset.antisymm h₁ h₂',
            highlights: ['Subset.antisymm', 'A = B'],
        },
    ],
    typing: { charsPerSecond: 24 },
    captionBeats: [],
};

const PREVIEW_TURN_TRACK: IdeTrack = {
    version: 1,
    beatCodeSegments: [
        {
            atSeconds: 0,
            code: 'relation SetEq(T: Any, A B: Set<T>): Prop {\n    |- {\n        Subset(A, B);\n        Subset(B, A);\n    }\n}',
            highlights: ['SetEq', 'Subset'],
        },
        {
            atSeconds: 6,
            code: '@notation({A} ~ " = " ~ {B})\nrelation SetEq(T: Any, A B: Set<T>): Prop {\n    |- {\n        Subset(A, B);\n        Subset(B, A);\n    }\n}',
            highlights: ['notation', 'SetEq'],
        },
    ],
    typing: { charsPerSecond: 24 },
    captionBeats: [],
    knowledgePanel: {
        heading: 'Knowledge',
        generateFromSource: true,
        scopedToSource: true,
        focusLine: 1,
    },
};

const PREVIEW_GOAL_EXPORT: Lean4GoalExport = {
    version: 2,
    title: 'Infoview',
    panelKind: 'infoview',
    hypotheses: [],
    target: '',
    steps: [],
};

export const BEAT_PREVIEW_COMPILED_TRACKS: CompareCompiledTracks = {
    leanTrack: PREVIEW_LEAN_TRACK,
    turnTrack: PREVIEW_TURN_TRACK,
    goalExport: PREVIEW_GOAL_EXPORT,
    hintLayouts: { version: 1, layouts: {} },
};

function previewDirector() {
    return {
        say: [
            'Preview beat one — Lean and Turn side by side with inline example tracks.',
            'Preview beat two — column focus shifts and typing continues.',
        ],
        sayTimings: [0, 6],
    };
}

function beatTemplateLayer(
    kind: BeatStudioTemplateKind,
    config: Record<string, unknown>,
    turnSource?: string,
): BeatTemplateLayer {
    return {
        type: 'beat-template',
        kind,
        config,
        turnSource,
    };
}

function compareLayer(extra: Record<string, unknown> = {}): RenderLayer {
    return {
        type: 'compare',
        leanTrack: 'tracks/preview-lean.json',
        turnTrack: 'tracks/preview-turn.json',
        leftLabel: 'Lean 4',
        rightLabel: 'Turn-Lang',
        compiledTracks: BEAT_PREVIEW_COMPILED_TRACKS,
        focusBeats: [
            { atSeconds: 0, side: 'both' },
            { atSeconds: 6, side: 'turn' },
        ],
        portraitBottomTargets: ['lean-code', 'turn-render'],
        beatVideos: [null, null],
        beatPlacements: [
            [
                {
                    id: 'preview-sticker',
                    kind: 'sticker',
                    text: 'Preview sticker',
                    emoji: '💡',
                    atSeconds: 1,
                    durationSeconds: 4,
                    x: 0.72,
                    y: 0.08,
                    width: 0.28,
                    enter: 'scale',
                },
            ],
            null,
        ],
        beatStickers: [
            [
                {
                    id: 'preview-sticker',
                    text: 'Preview sticker',
                    emoji: '💡',
                    atSeconds: 1,
                    durationSeconds: 4,
                    position: 'top-right',
                },
            ],
            null,
        ],
        ...extra,
    };
}

function templateConfig(kind: BeatStudioTemplateKind): Record<string, unknown> {
    switch (kind) {
        case 'compare-dual':
            return {
                leanEnabled: true,
                turnEnabled: true,
                typing: { enabled: true, cps: 24 },
            };
        case 'composited':
            return {
                baseFootageSrc: 'shared/preview-presenter.mp4',
                baseObjectFit: 'cover',
                baseLabel: 'Preview footage',
                placements: [
                    {
                        id: 'composited-sticker',
                        kind: 'sticker',
                        text: 'Front layer',
                        atSeconds: 0.5,
                        durationSeconds: 4,
                        x: 0.72,
                        y: 0.08,
                        width: 0.24,
                        enter: 'scale',
                    },
                ],
            };
        case 'stickers':
            return {
                leanEnabled: true,
                turnEnabled: true,
                typing: { enabled: true, cps: 24 },
                stickers: [
                    {
                        id: 'config-sticker',
                        text: 'From config',
                        atSeconds: 0.5,
                        durationSeconds: 3,
                        position: 'bottom-left',
                    },
                ],
            };
        case 'screen-recording':
            return {
                leanEnabled: true,
                turnEnabled: true,
                typing: { enabled: true, cps: 24 },
                screenTrackPath: 'shared/preview-screen.mp4',
            };
        case 'turn-focus':
            return {
                renderEnabled: false,
                editorFontScale: 1,
                typing: { enabled: true, cps: 28 },
            };
        case 'manim-motion':
            return {
                caption: 'Set equality motion preview',
                subTemplate: 'simple-set',
            };
        case 'presenter-overlay':
            return {
                animationId: 'presenter-overlay-preview',
            };
        default: {
            const _exhaustive: never = kind;
            return _exhaustive;
        }
    }
}

function previewLayers(kind: BeatStudioTemplateKind): RenderLayer[] {
    switch (kind) {
        case 'composited':
        case 'presenter-overlay':
            return [beatTemplateLayer(kind, templateConfig(kind))];
        case 'compare-dual':
        case 'stickers':
        case 'screen-recording':
            return [compareLayer()];
        case 'turn-focus':
            return [
                beatTemplateLayer(
                    'turn-focus',
                    templateConfig('turn-focus'),
                    PREVIEW_TURN_SOURCE,
                ),
            ];
        case 'manim-motion':
            return [beatTemplateLayer('manim-motion', templateConfig('manim-motion'))];
        default: {
            const _exhaustive: never = kind;
            return _exhaustive;
        }
    }
}

function previewBeatMainLayers(kind: BeatStudioTemplateKind): Array<BeatTemplateLayer | null> {
    const config = templateConfig(kind);
    const layer = beatTemplateLayer(
        kind,
        config,
        kind === 'turn-focus' ? PREVIEW_TURN_SOURCE : undefined,
    );
    return [layer, layer];
}

/** Single-scene fixture for one beat template kind — no sync or script project required. */
export function buildBeatPreviewScene(kind: BeatStudioTemplateKind): RenderScene {
    return {
        index: 1,
        title: `Beat preview — ${kind}`,
        durationSeconds: BEAT_PREVIEW_DURATION_SECONDS,
        layout: 'dual-panel',
        director: previewDirector(),
        layers: previewLayers(kind),
        beatMainLayers: previewBeatMainLayers(kind),
    };
}

export function beatPreviewDimensions(format: 'landscape' | 'portrait'): {
    width: number;
    height: number;
} {
    return format === 'portrait'
        ? { width: 1080, height: 1920 }
        : { width: 1920, height: 1080 };
}
