import '../panels/turnVideoPanelStyles';

import { AbsoluteFill } from 'remotion';

import type { BeatStudioTemplateKind } from '../../beats/beatStudioCompile';
import { SceneSlide } from '../../components/SceneSlide/SceneSlide';
import {
    BEAT_PREVIEW_SCRIPT_ID,
    buildBeatPreviewScene,
    beatPreviewDimensions,
} from './beatPreviewFixtures';
import type { OutdoorRenderFormat } from '../types/renderProps';

export type BeatPreviewInputProps = {
    kind: BeatStudioTemplateKind;
    format: OutdoorRenderFormat;
};

/** Standalone beat preview — inline fixtures, no animation.md sync required. */
export function BeatPreview({ kind, format }: BeatPreviewInputProps) {
    const scene = buildBeatPreviewScene(kind);
    const { width, height } = beatPreviewDimensions(format);

    return (
        <AbsoluteFill>
            <SceneSlide
                scriptId={BEAT_PREVIEW_SCRIPT_ID}
                slide={scene}
                width={width}
                height={height}
                outdoorFormat={format}
            />
        </AbsoluteFill>
    );
}
