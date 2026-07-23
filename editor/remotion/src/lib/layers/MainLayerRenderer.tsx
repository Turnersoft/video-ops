import type { ReactNode } from 'react';

import { BeatTemplateRenderer, CompareDualBeat, isBeatTemplateLayer } from '../../beats';
import type { RenderLayer, RenderScene } from '../types/renderProps';
import type { LayoutPreset } from './types';

type MainLayerRendererProps = {
    scriptId: string;
    scene: RenderScene;
    layer: RenderLayer;
    layout: LayoutPreset;
    contentRevision?: number;
};

/** Beat-only main layer routing: beat templates + legacy compare fallback. */
export function MainLayerRenderer({
    scriptId,
    scene,
    layer,
    layout,
    contentRevision,
}: MainLayerRendererProps): ReactNode {
    switch (layer.type) {
        case 'beat-template':
            if (!isBeatTemplateLayer(layer)) {
                return <div style={{ padding: 24 }}>Invalid beat-template layer</div>;
            }
            return (
                <BeatTemplateRenderer
                    scriptId={scriptId}
                    scene={scene}
                    layer={layer}
                    layout={layout}
                    contentRevision={contentRevision}
                />
            );

        case 'compare':
            return (
                <CompareDualBeat
                    scriptId={scriptId}
                    scene={scene}
                    layout={layout}
                    contentRevision={contentRevision}
                />
            );

        default:
            return (
                <div style={{ padding: 24, opacity: 0.6 }}>
                    Unsupported main layer: {layer.type}
                </div>
            );
    }
}
