import type { RenderScene } from '../lib/types/renderProps';
import { findCompareLayer, type CompareLayer } from '../lib/layers/types';

export function compareLayerFromScene(scene: RenderScene): CompareLayer | null {
    return findCompareLayer(scene.layers);
}
