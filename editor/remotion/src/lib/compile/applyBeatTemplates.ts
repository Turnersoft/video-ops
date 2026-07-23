import {
  parseCompositedConfig,
  compositedConfigFromLegacyPresenter,
  compositedConfigFromLegacyStickers,
} from '../../beats/Composited/api.ts';
import {
  compareDualEditorFontScale,
  compareDualLeanEnabled,
  compareDualLeanFontScale,
  compareDualTurnEnabled,
  compareDualTypingCps,
  parseBeatStudioFromVisualNotes,
  buildBeatMainLayerFromTemplate,
  type BeatMainLayerPayload,
} from '../../beats/beatStudioCompile.ts';
import {
  enrichConfigFromVisualNotes as enrichCompareDualConfigFromVisualNotes,
  parseConfig as parseCompareDualConfig,
  type CompareDualBeatMeta,
} from '../../beats/Compare/api.ts';
import {
  enrichConfigFromVisualNotes as enrichTurnFocusConfigFromVisualNotes,
  fontScale as turnFocusFontScaleFromApi,
  parseConfig as parseTurnFocusConfig,
  type TurnFocusBeatMeta,
} from '../../beats/TurnLang/api.ts';
import {
  resolveComparePaneCode,
  type VideoOpsAnimationSceneV4,
  type VideoOpsCompareSceneBeatV4,
  type VideoOpsCompareSceneConfigV4,
} from './video-ops/videoOpsAnimationBeats.ts';

function patchBeatFromTemplate(
  beat: VideoOpsCompareSceneBeatV4,
  blocks: VideoOpsCompareSceneConfigV4['blocks'],
  previousLean: string,
  previousTurn: string,
): { beat: VideoOpsCompareSceneBeatV4; meta: ReturnType<typeof parseBeatStudioFromVisualNotes> } {
  let meta = parseBeatStudioFromVisualNotes(beat.visualNotes);
  if (!meta) {
    return { beat, meta: null };
  }

  let next = { ...beat };

  if (meta.template === 'compare-dual') {
    const dualMeta = meta as CompareDualBeatMeta;
    if (!compareDualLeanEnabled(dualMeta)) {
      next = { ...next, lean: undefined };
    }
    if (!compareDualTurnEnabled(dualMeta)) {
      next = { ...next, turn: undefined };
    }
    const enrichedConfig = enrichCompareDualConfigFromVisualNotes(
      parseCompareDualConfig(dualMeta.templateConfig.config),
      beat.visualNotes,
    );
    meta = {
      ...dualMeta,
      templateConfig: {
        kind: 'compare-dual',
        config: enrichedConfig,
      },
    };
    const editorScale = compareDualEditorFontScale(meta as CompareDualBeatMeta);
    const leanScale = compareDualLeanFontScale(meta as CompareDualBeatMeta);
    if (editorScale !== undefined || leanScale !== undefined) {
      next = {
        ...next,
        fontScales: {
          ...(typeof next.fontScales === 'object' ? next.fontScales : {}),
          ...(editorScale !== undefined ? { editorFontScale: editorScale } : {}),
          ...(leanScale !== undefined ? { leanEditorFontScale: leanScale } : {}),
        },
      };
    }
  }

  if (meta.template === 'turn-focus') {
    const turnMeta = meta as TurnFocusBeatMeta;
    const enrichedConfig = enrichTurnFocusConfigFromVisualNotes(
      parseTurnFocusConfig(turnMeta.templateConfig.config),
      beat.visualNotes,
    );
    meta = {
      ...turnMeta,
      templateConfig: {
        kind: 'turn-focus',
        config: enrichedConfig,
      },
    };
    const scale = turnFocusFontScaleFromApi(meta as TurnFocusBeatMeta);
    if (scale !== undefined) {
      next = {
        ...next,
        fontScales: {
          ...(typeof next.fontScales === 'object' ? next.fontScales : {}),
          editorFontScale: scale,
        },
      };
    }
  }

  if (meta.template === 'presenter-overlay' || meta.template === 'stickers' || meta.template === 'composited') {
    const config =
      meta.template === 'presenter-overlay'
        ? compositedConfigFromLegacyPresenter(meta.templateConfig.config)
        : meta.template === 'stickers'
          ? compositedConfigFromLegacyStickers(meta.templateConfig.config)
          : parseCompositedConfig(meta.templateConfig.config);
    next = {
      ...next,
      ...(config.baseFootage ? { baseFootage: config.baseFootage } : {}),
      ...(config.placements.length > 0 ? { placements: config.placements } : {}),
    };
  }

  if (meta.template === 'screen-recording') {
    const screen = meta.templateConfig.config.screenTrackPath;
    if (typeof screen === 'string' && screen.trim()) {
      next = {
        ...next,
        video: {
          src: screen.trim(),
          objectFit: 'contain',
          label: 'Screen',
        },
      };
    }
  }

  void blocks;
  void previousLean;
  void previousTurn;
  return { beat: next, meta };
}

export function applyBeatTemplatesToSceneV4(scene: VideoOpsAnimationSceneV4): VideoOpsAnimationSceneV4 {
  const blocks = scene.compare.blocks ?? {};
  let previousLean = '';
  let previousTurn = '';
  const beatMainLayers: Array<BeatMainLayerPayload | null> = [];
  let charsPerSecond = scene.compare.display?.charsPerSecond;

  const beats = scene.compare.beats.map((beat) => {
    const { beat: patched, meta } = patchBeatFromTemplate(beat, blocks, previousLean, previousTurn);
    const leanCode = resolveComparePaneCode(patched.lean, blocks, 'lean', previousLean);
    const turnCode = resolveComparePaneCode(patched.turn, blocks, 'turn', previousTurn);
    if (leanCode) {
      previousLean = leanCode;
    }
    if (turnCode) {
      previousTurn = turnCode;
    }

    const layer = meta ? buildBeatMainLayerFromTemplate(meta, turnCode) : null;
    beatMainLayers.push(layer);

    if (meta?.template === 'compare-dual') {
      const typingCps = compareDualTypingCps(meta as CompareDualBeatMeta);
      if (typingCps !== undefined) {
        charsPerSecond = typingCps;
      }
    }

    return patched;
  });

  const hasPerBeatLayers = beatMainLayers.some((layer) => layer !== null);
  const firstLayer = beatMainLayers[0];
  const uniformLayer =
    hasPerBeatLayers &&
    beatMainLayers.every(
      (layer) =>
        layer?.type === firstLayer?.type &&
        (layer?.type !== 'beat-template' ||
          (layer as { kind?: string }).kind === (firstLayer as { kind?: string }).kind),
    )
      ? firstLayer
      : null;

  return {
    ...scene,
    ...(uniformLayer && !scene.presentation ? { mainLayer: uniformLayer as never } : {}),
    beatMainLayers: hasPerBeatLayers ? (beatMainLayers as never) : undefined,
    compare: {
      ...scene.compare,
      beats,
      display: {
        ...scene.compare.display,
        ...(charsPerSecond !== undefined ? { charsPerSecond } : {}),
      },
    },
  };
}

export function applyBeatTemplatesToAnimationV4<T extends { scenes: VideoOpsAnimationSceneV4[] }>(
  animation: T,
): T {
  return {
    ...animation,
    scenes: animation.scenes.map(applyBeatTemplatesToSceneV4),
  };
}
