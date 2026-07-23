import {
    placementsFromUnknown,
    type VideoOpsBeatBaseFootage,
    type VideoOpsBeatPlacement,
} from '../../lib/placements/beatPlacements';
import { cfgString } from '../configHelpers';

export type CompositedBeatMeta = {
    template: 'composited';
    templateConfig: {
        kind: 'composited';
        config: CompositedBeatConfig;
    };
};

export type CompositedBeatConfig = {
    baseFootage?: VideoOpsBeatBaseFootage;
    placements: VideoOpsBeatPlacement[];
};

export function parseCompositedConfig(raw: Record<string, unknown>): CompositedBeatConfig {
    const baseSrc =
        cfgString(raw, 'baseFootageSrc') ??
        cfgString(raw, 'assetPath') ??
        cfgString(raw, 'baseSrc');
    const baseFootage: VideoOpsBeatBaseFootage | undefined = baseSrc?.trim()
        ? {
              src: baseSrc.trim(),
              objectFit:
                  raw.baseObjectFit === 'cover' || raw.objectFit === 'cover' ? 'cover' : 'contain',
              label: cfgString(raw, 'baseLabel') ?? cfgString(raw, 'label'),
          }
        : raw.baseFootage && typeof raw.baseFootage === 'object'
          ? (raw.baseFootage as VideoOpsBeatBaseFootage)
          : undefined;

    const placements = placementsFromUnknown(raw.placements ?? raw.stickers);
    return { baseFootage, placements };
}

export function compositedConfigFromLegacyPresenter(config: Record<string, unknown>): CompositedBeatConfig {
    return parseCompositedConfig({
        assetPath: config.assetPath,
        objectFit: 'cover',
        label: config.animationId ?? 'Presenter',
        placements: [],
    });
}

export function compositedConfigFromLegacyStickers(config: Record<string, unknown>): CompositedBeatConfig {
    return parseCompositedConfig({
        placements: config.stickers,
    });
}
