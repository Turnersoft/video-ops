import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import type { VideoFromScriptRenderProps } from '../types/renderProps.ts';
import { canonicalVideoOpsScriptId, videoOpsScriptDiskFolder } from '../videoOpsPaths.ts';

function probeMediaDurationSeconds(filePath: string): number | null {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  try {
    const raw = execSync(
      `ffprobe -v error -show_entries format=duration -of csv=p=0 "${filePath}"`,
      { encoding: 'utf8' },
    ).trim();
    const value = Number.parseFloat(raw);
    return Number.isFinite(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}

type PipelineStatus = {
  selectedRuns?: { align?: string };
  runs?: { align?: Array<{ runId: string; status?: string }> };
};

type OutdoorAnimationDoc = {
  scenes?: Array<{
    durationSeconds?: number;
    burnCaptions?: boolean;
    outdoorEdit?: VideoFromScriptRenderProps['scenes'][number]['outdoorEdit'];
    compare?: { beats?: Array<{ durationSeconds?: number }> };
  }>;
};

function stripTakeBeatPipMask<T extends { pipMask?: unknown } | null | undefined>(
  beat: T,
): T {
  if (!beat || typeof beat !== 'object') {
    return beat;
  }
  const { pipMask: _ignored, ...rest } = beat;
  return rest as T;
}

function resolveAlignRunId(status: PipelineStatus): string | null {
  const selected = status.selectedRuns?.align?.trim();
  if (selected) {
    return selected;
  }
  const runs = status.runs?.align ?? [];
  for (let index = runs.length - 1; index >= 0; index -= 1) {
    const run = runs[index];
    if (run.status === 'succeeded') {
      return run.runId;
    }
  }
  return runs.at(-1)?.runId ?? null;
}

export function resolveTakeOutdoorAnimationPath(
  videoOpsDir: string,
  scriptId: string,
  takeId: string,
): string | null {
  const cleanTakeId = takeId.trim();
  if (!cleanTakeId) {
    return null;
  }
  const scriptDir = path.join(videoOpsDir, videoOpsScriptDiskFolder(canonicalVideoOpsScriptId(scriptId)));
  const statusPath = path.join(scriptDir, 'takes', cleanTakeId, 'pipeline-status.json');
  if (!fs.existsSync(statusPath)) {
    return null;
  }
  let status: PipelineStatus;
  try {
    status = JSON.parse(fs.readFileSync(statusPath, 'utf8')) as PipelineStatus;
  } catch {
    return null;
  }
  const alignRunId = resolveAlignRunId(status);
  if (!alignRunId) {
    return null;
  }
  const outdoorPath = path.join(
    scriptDir,
    'takes',
    cleanTakeId,
    'pipeline',
    'align',
    alignRunId,
    'animation-outdoor.json',
  );
  return fs.existsSync(outdoorPath) ? outdoorPath : null;
}

function patchSceneFromOutdoorTake(
  scene: VideoFromScriptRenderProps['scenes'][number],
  outdoorScene: NonNullable<OutdoorAnimationDoc['scenes']>[number],
): VideoFromScriptRenderProps['scenes'][number] {
  if (!outdoorScene.outdoorEdit) {
    return scene;
  }
  const studioEdit = scene.outdoorEdit;
  const takeEdit = outdoorScene.outdoorEdit;
  const beatCount = Math.max(
    takeEdit.beatDurationsSeconds?.length ?? 0,
    takeEdit.beatLayouts?.length ?? 0,
    studioEdit?.beatLayouts?.length ?? 0,
    scene.beatStudioPresenterMasks?.length ?? 0,
  );
  let beatLayouts = takeEdit.beatLayouts ?? studioEdit?.beatLayouts;
  if (beatCount > 0) {
    const merged: NonNullable<typeof takeEdit.beatLayouts> = [];
    for (let index = 0; index < beatCount; index += 1) {
      const takeBeat = takeEdit.beatLayouts?.[index];
      const studioBeat = studioEdit?.beatLayouts?.[index];
      const studioMask = scene.beatStudioPresenterMasks?.[index];
      // Pip masks come only from animation.md compile — never from take align JSON.
      const pipMask = studioMask ?? studioBeat?.pipMask ?? undefined;
      const patch = {
        ...(studioBeat && typeof studioBeat === 'object' ? studioBeat : {}),
        ...(stripTakeBeatPipMask(takeBeat) ?? {}),
        ...(pipMask ? { pipMask } : {}),
      };
      merged.push(Object.keys(patch).length ? patch : null);
    }
    beatLayouts = merged;
  }
  const outdoorEdit = {
    ...takeEdit,
    pipMask: scene.studioPresenterMask ?? studioEdit?.pipMask,
    hintPanel: takeEdit.hintPanel ?? studioEdit?.hintPanel,
    beatLayouts,
  };
  const nextScene: VideoFromScriptRenderProps['scenes'][number] = {
    ...scene,
    outdoorEdit,
  };
  if (typeof outdoorScene.durationSeconds === 'number') {
    nextScene.durationSeconds = outdoorScene.durationSeconds;
  }
  if (typeof outdoorScene.burnCaptions === 'boolean') {
    nextScene.burnCaptions = outdoorScene.burnCaptions;
  }
  return nextScene;
}

function lastCaptionEndSeconds(
  segments: Array<{ atSeconds: number; durationSeconds: number }> | undefined,
): number | null {
  if (!segments?.length) {
    return null;
  }
  let end = 0;
  for (const segment of segments) {
    end = Math.max(end, segment.atSeconds + segment.durationSeconds);
  }
  return end;
}

/** Overlay an `animation-outdoor.json` document onto compiled render props. */
export function applyOutdoorAnimationPathToRenderProps(
  renderProps: VideoFromScriptRenderProps,
  videoOpsDir: string,
  scriptId: string,
  outdoorPath: string,
): VideoFromScriptRenderProps {
  if (!fs.existsSync(outdoorPath)) {
    return renderProps;
  }
  let outdoor: OutdoorAnimationDoc;
  try {
    outdoor = JSON.parse(fs.readFileSync(outdoorPath, 'utf8')) as OutdoorAnimationDoc;
  } catch {
    return renderProps;
  }
  const outdoorScene = outdoor.scenes?.[0];
  if (!outdoorScene?.outdoorEdit || !renderProps.scenes.length) {
    return renderProps;
  }
  const scenes = [...renderProps.scenes];
  scenes[0] = patchSceneFromOutdoorTake(scenes[0], outdoorScene);

  // Align beat sum can be slightly shorter than the cut MP4 or last caption — pad so Remotion shows the ending.
  const videoSrc = outdoorScene.outdoorEdit.videoSrc?.trim();
  const captionEnd = lastCaptionEndSeconds(scenes[0].outdoorEdit?.captionSegments);
  let mediaSeconds: number | null = null;
  if (videoSrc) {
    const videoPath = path.join(
      videoOpsDir,
      videoOpsScriptDiskFolder(canonicalVideoOpsScriptId(scriptId)),
      videoSrc.replace(/^\/+/, ''),
    );
    mediaSeconds = probeMediaDurationSeconds(videoPath);
  }
  const targetSeconds = Math.max(
    scenes[0].durationSeconds,
    mediaSeconds ?? 0,
    captionEnd ?? 0,
  );
  if (targetSeconds > scenes[0].durationSeconds + 0.05) {
    const paddedSeconds = Math.round(targetSeconds * 100) / 100;
    scenes[0] = {
      ...scenes[0],
      durationSeconds: paddedSeconds,
    };
    if (scenes[0].outdoorEdit?.beatDurationsSeconds?.length) {
      const beats = [...scenes[0].outdoorEdit.beatDurationsSeconds];
      const alignedSum = beats.reduce((sum, value) => sum + value, 0);
      const pad = Math.round((paddedSeconds - alignedSum) * 100) / 100;
      if (pad > 0.05) {
        beats[beats.length - 1] = Math.round((beats[beats.length - 1] + pad) * 100) / 100;
        scenes[0] = {
          ...scenes[0],
          outdoorEdit: {
            ...scenes[0].outdoorEdit,
            beatDurationsSeconds: beats,
          },
        };
      }
    }
  }

  const sceneSeconds = scenes.reduce((sum, scene) => sum + scene.durationSeconds, 0);
  return {
    ...renderProps,
    scenes,
    totalFrames: Math.max(1, Math.ceil(sceneSeconds * renderProps.fps)),
  };
}

/** Overlay a take's align `animation-outdoor.json` onto compiled render props. */
export function applyTakeOutdoorEditToRenderProps(
  renderProps: VideoFromScriptRenderProps,
  videoOpsDir: string,
  scriptId: string,
  takeId: string,
): VideoFromScriptRenderProps {
  const outdoorPath = resolveTakeOutdoorAnimationPath(videoOpsDir, scriptId, takeId);
  if (!outdoorPath) {
    return renderProps;
  }
  return applyOutdoorAnimationPathToRenderProps(
    renderProps,
    videoOpsDir,
    scriptId,
    outdoorPath,
  );
}
