import path from 'node:path';

import { fileExists, readJson, writeJson } from './fs_util.ts';
import { animationV4CachePath } from './animation-load.ts';
import { ensureDir, scriptDirFor } from './paths.ts';

const RENDER_PROPS_CACHE_REL = '.cache/render-props.json';

type OutdoorScene = {
  durationSeconds?: number;
  burnCaptions?: boolean;
  outdoorEdit?: unknown;
  compare?: { beats?: Array<{ durationSeconds?: number }> };
};

type AnimationDoc = {
  scenes: OutdoorScene[];
};

function patchOutdoorSceneTiming(
  animation: AnimationDoc,
  outdoorScene: OutdoorScene,
): boolean {
  const scene = animation.scenes?.[0];
  if (!outdoorScene?.outdoorEdit || !scene) {
    return false;
  }

  scene.outdoorEdit = outdoorScene.outdoorEdit;
  if (typeof outdoorScene.durationSeconds === 'number') {
    scene.durationSeconds = outdoorScene.durationSeconds;
  }
  if (typeof outdoorScene.burnCaptions === 'boolean') {
    scene.burnCaptions = outdoorScene.burnCaptions;
  }
  const outdoorBeats = outdoorScene.compare?.beats ?? [];
  const beats = scene.compare?.beats ?? [];
  beats.forEach((beat, index) => {
    const durationSeconds = outdoorBeats[index]?.durationSeconds;
    if (typeof durationSeconds === 'number') {
      beat.durationSeconds = durationSeconds;
    }
  });
  return true;
}

/** Copy outdoorEdit timing from animation-outdoor.json into compiled animation cache. */
export function syncOutdoorEditToAnimation(scriptId: string, outdoorAnimationPath: string): boolean {
  if (!fileExists(outdoorAnimationPath)) {
    return false;
  }
  const cachePath = animationV4CachePath(scriptId);
  if (!fileExists(cachePath)) {
    return false;
  }

  const outdoor = readJson<AnimationDoc>(outdoorAnimationPath);
  const animation = readJson<AnimationDoc>(cachePath);
  const outdoorScene = outdoor.scenes?.[0];
  if (!patchOutdoorSceneTiming(animation, outdoorScene ?? {})) {
    return false;
  }

  ensureDir(path.dirname(cachePath));
  writeJson(cachePath, animation);

  const renderPropsPath = path.join(scriptDirFor(scriptId), RENDER_PROPS_CACHE_REL);
  if (fileExists(renderPropsPath)) {
    try {
      const renderProps = readJson<{ scenes?: Array<{ outdoorEdit?: unknown }> }>(renderPropsPath);
      const renderScene = renderProps.scenes?.[0];
      if (renderScene && outdoorScene?.outdoorEdit) {
        renderScene.outdoorEdit = outdoorScene.outdoorEdit;
        if (typeof outdoorScene.durationSeconds === 'number') {
          (renderScene as { durationSeconds?: number }).durationSeconds =
            outdoorScene.durationSeconds;
        }
        writeJson(renderPropsPath, renderProps);
      }
    } catch {
      // animation-v4 cache is enough for live compile; render-props patch is best-effort.
    }
  }

  return true;
}

type OutdoorEditFields = {
  pipMask?: unknown;
  hintPanel?: unknown;
  beatLayouts?: unknown;
};

/**
 * Pull Studio render-props outdoor layout (pip / hint / beatLayouts) into the take's
 * animation-outdoor.json so composite burns Studio edits.
 */
export function syncStudioLayoutToOutdoor(
  scriptId: string,
  outdoorAnimationPath: string,
): OutdoorEditFields | null {
  const cachePath = animationV4CachePath(scriptId);
  if (!fileExists(cachePath) || !fileExists(outdoorAnimationPath)) {
    return null;
  }

  const animation = readJson<AnimationDoc>(cachePath);
  const outdoor = readJson<AnimationDoc>(outdoorAnimationPath);
  const studioEdit = (animation.scenes?.[0]?.outdoorEdit ?? null) as OutdoorEditFields | null;
  const outdoorScene = outdoor.scenes?.[0];
  if (!studioEdit || !outdoorScene?.outdoorEdit) {
    return null;
  }

  const nextOutdoorEdit = {
    ...(outdoorScene.outdoorEdit as Record<string, unknown>),
  };
  if ('pipMask' in studioEdit) {
    nextOutdoorEdit.pipMask = studioEdit.pipMask;
  }
  if ('hintPanel' in studioEdit) {
    nextOutdoorEdit.hintPanel = studioEdit.hintPanel;
  }
  if ('beatLayouts' in studioEdit) {
    nextOutdoorEdit.beatLayouts = studioEdit.beatLayouts;
  }
  outdoorScene.outdoorEdit = nextOutdoorEdit;
  writeJson(outdoorAnimationPath, outdoor);
  return {
    pipMask: nextOutdoorEdit.pipMask,
    hintPanel: nextOutdoorEdit.hintPanel,
    beatLayouts: nextOutdoorEdit.beatLayouts,
  };
}
