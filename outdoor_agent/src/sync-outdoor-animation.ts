import path from 'node:path';

import { fileExists, readJson, writeJson } from './fs_util.ts';
import { scriptDirFor } from './paths.ts';

type OutdoorScene = {
  durationSeconds?: number;
  burnCaptions?: boolean;
  outdoorEdit?: unknown;
  compare?: { beats?: Array<{ durationSeconds?: number }> };
};

type AnimationDoc = {
  scenes: OutdoorScene[];
};

/** Copy outdoorEdit timing from animation-outdoor.json into studio animation.json. */
export function syncOutdoorEditToAnimation(scriptId: string, outdoorAnimationPath: string): void {
  if (!fileExists(outdoorAnimationPath)) {
    return;
  }
  const animationPath = path.join(scriptDirFor(scriptId), 'animation.json');
  if (!fileExists(animationPath)) {
    return;
  }

  const outdoor = readJson<AnimationDoc>(outdoorAnimationPath);
  const animation = readJson<AnimationDoc>(animationPath);
  const outdoorScene = outdoor.scenes?.[0];
  const scene = animation.scenes?.[0];
  if (!outdoorScene?.outdoorEdit || !scene) {
    return;
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

  writeJson(animationPath, animation);
}

type OutdoorEditFields = {
  pipMask?: unknown;
  hintPanel?: unknown;
  beatLayouts?: unknown;
};

/**
 * Pull Studio animation.json outdoor layout (pip / hint / beatLayouts) into the take's
 * animation-outdoor.json + align-layout.json so composite burns Studio edits.
 */
export function syncStudioLayoutToOutdoor(
  scriptId: string,
  outdoorAnimationPath: string,
): OutdoorEditFields | null {
  const animationPath = path.join(scriptDirFor(scriptId), 'animation.json');
  if (!fileExists(animationPath) || !fileExists(outdoorAnimationPath)) {
    return null;
  }

  const animation = readJson<AnimationDoc>(animationPath);
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
