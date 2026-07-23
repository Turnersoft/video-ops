/**
 * Compile animation.md into Remotion render props and v4 doc.
 */
import fs from 'node:fs';
import path from 'node:path';

import {
  animationToRenderProps,
  applySpeechPaceToSceneV4,
  expandAnimationV4ToV2,
  normalizeCompareBeatsOnSceneV4,
  type VideoOpsAnimation,
  type VideoOpsAnimationV4,
  type VideoOpsIdeTrack,
} from './video-ops/videoOpsAnimation.ts';
import { beatPipMaskToRenderMask } from '../outdoor/pipMaskTransform.ts';
import {
  compileVideoOpsAnimationMarkdown,
  VIDEO_OPS_ANIMATION_MARKDOWN_FILENAME,
} from './video-ops/videoOpsAnimationMarkdown.ts';
import {
  KIT_ALLOWED_MAIN_LAYERS,
  styleKitForSeriesId,
  validateLayersForKit,
  type StyleKit,
} from '../../seriesRegistry.ts';
import { applyBeatTemplatesToAnimationV4 } from './applyBeatTemplates.ts';

export type CompileEpisodeResult = {
  renderProps: ReturnType<typeof animationToRenderProps>;
  animationV4: VideoOpsAnimationV4 | null;
  hintLayouts: Record<string, Record<string, unknown>>;
};

export type CompileEpisodeOptions = {
  forceRebuild?: boolean;
  probeAudioDurationSeconds?: (filePath: string) => number | null;
  /** When true, kit allow-list violations throw. Default: warn only (migration). */
  strictKit?: boolean;
};

function resolveStyleKit(scriptDir: string, kitMeta: Record<string, string>): StyleKit {
  const fromMd = kitMeta.styleKit ?? kitMeta.stylekit;
  if (fromMd && typeof fromMd === 'string' && fromMd in KIT_ALLOWED_MAIN_LAYERS) {
    return fromMd as StyleKit;
  }
  const seriesMetaPath = path.join(path.dirname(scriptDir), 'series.json');
  if (fs.existsSync(seriesMetaPath)) {
    try {
      const meta = JSON.parse(fs.readFileSync(seriesMetaPath, 'utf8')) as { styleKit?: string };
      if (meta.styleKit && meta.styleKit in KIT_ALLOWED_MAIN_LAYERS) {
        return meta.styleKit as StyleKit;
      }
    } catch {
      // fall through
    }
  }
  const seriesId = path.basename(path.dirname(scriptDir));
  return styleKitForSeriesId(seriesId);
}

export const RENDER_PROPS_CACHE = '.cache/render-props.json';
export const ANIMATION_V4_CACHE = '.cache/animation-v4.json';

const KIT_AUTHORING_KEYS = new Set(['styleKit', 'stylekit', 'bgmProfile', 'bgmprofile']);

/** Strip kit-only frontmatter keys before basic_ui compile (not in videoOps schema yet). */
function stripKitAuthoringFrontmatter(markdown: string): {
  markdown: string;
  kitMeta: Record<string, string>;
} {
  const match = markdown.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) {
    return { markdown, kitMeta: {} };
  }
  const kitMeta: Record<string, string> = {};
  const kept: string[] = [];
  for (const line of match[1].split('\n')) {
    const keyMatch = line.match(/^([A-Za-z][\w-]*):\s*(.*)$/);
    if (keyMatch && KIT_AUTHORING_KEYS.has(keyMatch[1])) {
      kitMeta[keyMatch[1]] = keyMatch[2].trim();
      continue;
    }
    kept.push(line);
  }
  return {
    markdown: `---\n${kept.join('\n')}\n---\n${match[2]}`,
    kitMeta,
  };
}

function upgradeSceneLayers(
  scriptDir: string,
  animation: VideoOpsAnimation,
  sourceFile?: string,
): VideoOpsAnimation {
  return {
    ...animation,
    scenes: animation.scenes.map((scene) => {
      const turnCode = scene.layers.find((layer) => layer.type === 'turn-code');
      if (!turnCode || turnCode.type !== 'turn-code') {
        return scene;
      }
      const hasIde = scene.layers.some((layer) => layer.type === 'turn-ide');
      if (hasIde) {
        return scene;
      }
      const tracksDir = path.join(scriptDir, 'tracks');
      fs.mkdirSync(tracksDir, { recursive: true });
      const trackName = `scene-${scene.index}-ide.json`;
      const trackPath = path.join(tracksDir, trackName);
      if (!fs.existsSync(trackPath)) {
        const track: VideoOpsIdeTrack = {
          version: 1,
          sourceFile,
          typing: { charsPerSecond: 28, snippet: turnCode.source.trim() },
          proofPanel: {
            steps: [
              { label: 'open goal', goal: '⊢ target proposition' },
              { label: 'apply tactic', goal: 'subgoal after apply' },
              { label: 'close branch', goal: 'no open goals' },
            ],
          },
          interactions: [
            { atSeconds: 1.5, kind: 'click-proof-step', stepIndex: 0 },
            { atSeconds: 3.2, kind: 'click-proof-step', stepIndex: 1 },
            { atSeconds: 5.0, kind: 'click-branch', branchId: 'main' },
          ],
        };
        fs.writeFileSync(trackPath, `${JSON.stringify(track, null, 2)}\n`, 'utf8');
      }
      return {
        ...scene,
        layers: [
          ...scene.layers.filter((layer) => layer.type !== 'turn-code'),
          { type: 'turn-ide', track: `tracks/${trackName}` },
        ],
      };
    }),
  };
}

function overrideBeatDurationsFromVoice(
  scene: VideoOpsAnimationV4['scenes'][number],
  scriptDir: string,
  probe: (filePath: string) => number | null,
): VideoOpsAnimationV4['scenes'][number] {
  const beats = scene.compare?.beats;
  if (!beats?.length) {
    return scene;
  }
  const explicit =
    scene.outdoorEdit?.beatDurationsSeconds ?? scene.voiceEdit?.beatDurationsSeconds;
  const srcs = scene.voiceEdit?.beatVoiceSrc;
  if (!explicit?.length && !srcs?.length) {
    return scene;
  }
  let changed = false;
  const nextBeats = beats.map((beat, index) => {
    const injected = explicit?.[index];
    if (typeof injected === 'number' && injected > 0) {
      changed = true;
      return { ...beat, durationSeconds: injected };
    }
    const rel = srcs?.[index];
    if (!rel) {
      return beat;
    }
    const measured = probe(path.join(scriptDir, rel));
    if (measured == null) {
      return beat;
    }
    changed = true;
    return { ...beat, durationSeconds: Math.max(0.5, Math.round(measured * 10) / 10) };
  });
  if (!changed) {
    return scene;
  }
  const durationSeconds = Math.round(
    nextBeats.reduce((sum, beat) => sum + beat.durationSeconds, 0),
  );
  return {
    ...scene,
    durationSeconds,
    compare: { ...scene.compare!, beats: nextBeats },
  };
}

export function compileEpisodeFromDir(
  scriptDir: string,
  scriptId: string,
  options: CompileEpisodeOptions = {},
): CompileEpisodeResult {
  const animationMarkdownPath = path.join(scriptDir, VIDEO_OPS_ANIMATION_MARKDOWN_FILENAME);
  if (!fs.existsSync(animationMarkdownPath)) {
    throw new Error(`Missing ${animationMarkdownPath}`);
  }
  const animationMarkdownRaw = fs.readFileSync(animationMarkdownPath, 'utf8');
  const { markdown: animationMarkdown, kitMeta } =
    stripKitAuthoringFrontmatter(animationMarkdownRaw);
  const styleKit = resolveStyleKit(scriptDir, kitMeta);

  const probe = options.probeAudioDurationSeconds ?? (() => null);

  let baseAnimationV4: VideoOpsAnimationV4 | undefined;
  const v4CachePath = path.join(scriptDir, ANIMATION_V4_CACHE);
  if (fs.existsSync(v4CachePath)) {
    try {
      baseAnimationV4 = JSON.parse(fs.readFileSync(v4CachePath, 'utf8')) as VideoOpsAnimationV4;
    } catch {
      baseAnimationV4 = undefined;
    }
  }

  let animationV4: VideoOpsAnimationV4 = compileVideoOpsAnimationMarkdown(animationMarkdown, {
    expectedScriptId: scriptId,
    baseAnimation: baseAnimationV4,
  });
  animationV4 = applyBeatTemplatesToAnimationV4(animationV4);
  let animation = expandAnimationV4ToV2(animationV4);
  animation = upgradeSceneLayers(scriptDir, animation);

  const hintLayouts: Record<string, Record<string, unknown>> = {};
  animationV4 = {
    ...animationV4,
    scenes: animationV4.scenes.map((scene) =>
      overrideBeatDurationsFromVoice(
        normalizeCompareBeatsOnSceneV4(applySpeechPaceToSceneV4(scene, scriptId)),
        scriptDir,
        probe,
      ),
    ),
  };
  animation = expandAnimationV4ToV2(animationV4);

  for (const scene of animation.scenes) {
    for (const layer of scene.layers) {
      if (layer.type !== 'compare' || !layer.compiledTracks?.hintLayouts) {
        continue;
      }
      const hintPath = layer.hintLayoutsPath ?? 'tracks/scene-compare-hint-layouts.json';
      hintLayouts[hintPath] = layer.compiledTracks.hintLayouts as Record<string, unknown>;
    }
  }

  for (const scene of animation.scenes) {
    for (const layer of scene.layers) {
      if (layer.type !== 'compare' || !layer.hintLayoutsPath) {
        continue;
      }
      const absoluteHintPath = path.join(scriptDir, layer.hintLayoutsPath);
      if (!fs.existsSync(absoluteHintPath)) {
        continue;
      }
      hintLayouts[layer.hintLayoutsPath] = JSON.parse(
        fs.readFileSync(absoluteHintPath, 'utf8'),
      ) as Record<string, unknown>;
    }
  }

  const renderProps = mergePresenterMasksFromAnimationV4(
    animationToRenderProps(animation),
    animationV4,
  );
  // Md compile still emits `compare` for most beat docs — warn until kit-native emit lands.
  // Pass strictKit: true (or sync --strict-kit) to reject.
  for (const scene of renderProps.scenes) {
    const layerTypes = scene.layers.map((layer) => layer.type);
    const check = validateLayersForKit(styleKit, layerTypes);
    if (!check.ok) {
      const message =
        `[kit:${styleKit}] layer type(s) not in allow-list: ${check.invalid.join(', ')}`;
      if (options.strictKit) {
        throw new Error(message);
      }
      console.warn(message);
    }
  }

  return {
    renderProps,
    animationV4,
    hintLayouts,
  };
}

function mergePresenterMasksFromAnimationV4(
  renderProps: CompileEpisodeResult['renderProps'],
  animationV4: VideoOpsAnimationV4 | null,
): CompileEpisodeResult['renderProps'] {
  if (!animationV4?.scenes.length) {
    return renderProps;
  }
  return {
    ...renderProps,
    scenes: renderProps.scenes.map((scene, sceneIndex) => {
      const beats = animationV4.scenes[sceneIndex]?.compare?.beats ?? [];
      const beatStudioPresenterMasks = beats.map((beat) =>
        beat.pipMask ? beatPipMaskToRenderMask(beat.pipMask) : null,
      );
      const hasBeatMask = beatStudioPresenterMasks.some(Boolean);
      if (!hasBeatMask) {
        return scene;
      }
      const studioPresenterMask =
        beatStudioPresenterMasks.find(Boolean) ??
        (scene as { studioPresenterMask?: (typeof beatStudioPresenterMasks)[number] })
          .studioPresenterMask;
      return {
        ...scene,
        ...(studioPresenterMask ? { studioPresenterMask } : {}),
        beatStudioPresenterMasks,
      };
    }),
  };
}

export function writeEpisodeCache(scriptDir: string, result: CompileEpisodeResult): void {
  const cacheDir = path.join(scriptDir, '.cache');
  fs.mkdirSync(cacheDir, { recursive: true });
  const renderProps = mergePresenterMasksFromAnimationV4(
    result.renderProps,
    result.animationV4,
  );
  fs.writeFileSync(
    path.join(cacheDir, 'render-props.json'),
    `${JSON.stringify(renderProps, null, 2)}\n`,
    'utf8',
  );
  if (result.animationV4) {
    fs.writeFileSync(
      path.join(cacheDir, 'animation-v4.json'),
      `${JSON.stringify(result.animationV4, null, 2)}\n`,
      'utf8',
    );
  }
}
