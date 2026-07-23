export type CoverAspect = 'landscape' | 'portrait';

/** Percent bounding box (top-left origin) — matches Canva-style editing. */
export type CoverLayerBox = {
    leftPct: number;
    topPct: number;
    widthPct: number;
    heightPct: number;
};

export type CoverLayerId = 'seriesTitle' | 'logoCluster' | 'concept' | 'episodeTitle';

export type CoverLayoutSpec = {
    aspect: CoverAspect;
    seriesTitle: CoverLayerBox;
    logoCluster: CoverLayerBox;
    concept: CoverLayerBox;
    episodeTitle: CoverLayerBox;
};

/** @deprecated Use CoverLayerBox — kept for type migration only. */
export type CoverRegion = {
    topPct?: number;
    bottomPct?: number;
    leftPct?: number;
    widthPct: number;
};

export function coverAspectFromSize(width: number, height: number): CoverAspect {
    return height > width ? 'portrait' : 'landscape';
}

/**
 * Default layout tuned to `video_ops/script_v2/shared/total.png` — centered stack,
 * larger title band, logo cluster mid-frame, episode title occupying lower third.
 */
export function coverLayoutForAspect(aspect: CoverAspect): CoverLayoutSpec {
    if (aspect === 'portrait') {
        return {
            aspect,
            seriesTitle: { leftPct: 8, topPct: 3, widthPct: 84, heightPct: 14 },
            logoCluster: { leftPct: 12, topPct: 20, widthPct: 76, heightPct: 32 },
            concept: { leftPct: 58, topPct: 18, widthPct: 38, heightPct: 18 },
            episodeTitle: { leftPct: 6, topPct: 56, widthPct: 88, heightPct: 40 },
        };
    }

    return {
        aspect,
        seriesTitle: { leftPct: 22.5, topPct: 2, widthPct: 55, heightPct: 16 },
        logoCluster: { leftPct: 32, topPct: 22, widthPct: 36, heightPct: 34 },
        concept: { leftPct: 72, topPct: 6, widthPct: 22, heightPct: 20 },
        episodeTitle: { leftPct: 15, topPct: 58, widthPct: 70, heightPct: 38 },
    };
}

export function resolveCoverLayout(
    aspect: CoverAspect,
    layerOverrides?: Partial<Record<CoverLayerId, Partial<CoverLayerBox>>>,
): CoverLayoutSpec {
    const defaults = coverLayoutForAspect(aspect);
    if (!layerOverrides) {
        return defaults;
    }

    const mergeBox = (base: CoverLayerBox, patch?: Partial<CoverLayerBox>): CoverLayerBox => ({
        leftPct: patch?.leftPct ?? base.leftPct,
        topPct: patch?.topPct ?? base.topPct,
        widthPct: patch?.widthPct ?? base.widthPct,
        heightPct: patch?.heightPct ?? base.heightPct,
    });

    return {
        aspect,
        seriesTitle: mergeBox(defaults.seriesTitle, layerOverrides.seriesTitle),
        logoCluster: mergeBox(defaults.logoCluster, layerOverrides.logoCluster),
        concept: mergeBox(defaults.concept, layerOverrides.concept),
        episodeTitle: mergeBox(defaults.episodeTitle, layerOverrides.episodeTitle),
    };
}

export function layerBoxStyle(box: CoverLayerBox): {
    position: 'absolute';
    left: string;
    top: string;
    width: string;
    height: string;
    display: 'flex';
    alignItems: 'center';
    justifyContent: 'center';
    boxSizing: 'border-box';
} {
    return {
        position: 'absolute',
        left: `${box.leftPct}%`,
        top: `${box.topPct}%`,
        width: `${box.widthPct}%`,
        height: `${box.heightPct}%`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxSizing: 'border-box',
    };
}

/** @deprecated Use layerBoxStyle. */
export function regionStyle(region: CoverRegion): ReturnType<typeof layerBoxStyle> {
    return layerBoxStyle({
        leftPct: region.leftPct ?? (100 - region.widthPct) / 2,
        topPct: region.topPct ?? 0,
        widthPct: region.widthPct,
        heightPct: region.topPct !== undefined ? 20 : 15,
    });
}

export function clampCoverLayerBox(box: CoverLayerBox): CoverLayerBox {
    const widthPct = Math.max(4, Math.min(96, box.widthPct));
    const heightPct = Math.max(4, Math.min(96, box.heightPct));
    const leftPct = Math.max(0, Math.min(100 - widthPct, box.leftPct));
    const topPct = Math.max(0, Math.min(100 - heightPct, box.topPct));
    return { leftPct, topPct, widthPct, heightPct };
}
