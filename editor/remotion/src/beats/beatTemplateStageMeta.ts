import type { BeatStudioTemplateKind } from './beatStudioCompile';
import type { BeatTemplateStageTone } from './BeatTemplateStage';

export type BeatTemplateStageMeta = {
    tone: BeatTemplateStageTone;
};

export type CompareShellTemplateKind = 'compare-dual' | 'stickers' | 'screen-recording';

export function isCompareShellTemplateKind(
    kind: BeatStudioTemplateKind | null | undefined,
): kind is CompareShellTemplateKind {
    return kind === 'compare-dual' || kind === 'stickers' || kind === 'screen-recording';
}

export function beatTemplateStageMeta(kind: BeatStudioTemplateKind): BeatTemplateStageMeta {
    switch (kind) {
        case 'compare-dual':
            return { tone: 'compare' };
        case 'stickers':
            return { tone: 'stickers' };
        case 'screen-recording':
            return { tone: 'coding' };
        case 'manim-motion':
            return { tone: 'motion' };
        case 'composited':
        case 'presenter-overlay':
            return { tone: 'presenter' };
        case 'turn-focus':
            throw new Error('turn-focus uses TurnLang/TurnFocusBeat instead of BeatTemplateStage');
        default: {
            const _exhaustive: never = kind;
            return _exhaustive;
        }
    }
}
