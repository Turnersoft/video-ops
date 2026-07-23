import path from 'node:path';

import { zhForSegment } from './caption_zh.ts';
import { fileExists, readJson, writeJson } from './fs_util.ts';
import { scriptDirFor } from './paths.ts';

type TimelineEntry = {
  slideId: string;
  slideTitle?: string;
  editedStart: number;
  editedEnd: number;
};

type TranscriptSegment = {
  start: number;
  end: number;
  text?: string;
};

function usage(): void {
  console.log(`Usage:
deno run --allow-all main.ts build-outdoor-manifest <script-id> --edit-dir <dir>

Prefers speech-alignment.json / animation-outdoor.json when present.
`);
}

export async function runBuildOutdoorManifest(argv: string[]): Promise<void> {
  const scriptId = argv[0];
  if (!scriptId) {
    usage();
    Deno.exit(1);
  }

  let editDir = '';
  for (let index = 1; index < argv.length; index += 1) {
    if (argv[index] === '--edit-dir' && argv[index + 1]) {
      editDir = path.resolve(argv[index + 1]);
      index += 1;
    }
  }

  const scriptDir = scriptDirFor(scriptId);
  if (!editDir) {
    editDir = path.join(scriptDir, 'export', 'outdoor-edit-take-mrbtjdup');
  }

  const alignmentPath = path.join(editDir, 'speech-alignment.json');
  const outdoorAnimationPath = path.join(editDir, 'animation-outdoor.json');
  const visualPlanPath = path.join(editDir, 'remotion-visual-plan.json');
  const transcriptPath = path.join(editDir, 'transcript.verbose.json');
  const animationPath = path.join(scriptDir, '.cache', 'animation-v4.json');

  if (fileExists(alignmentPath) && fileExists(outdoorAnimationPath)) {
    const alignment = readJson<{
      editedDurationSeconds: number;
      beatDurationsSeconds: number[];
      boundaries: Array<{
        beatIndex: number;
        editedStart: number;
        editedEnd: number;
        durationSeconds: number;
        lastSpokenWord: string | null;
      }>;
    }>(alignmentPath);
    const outdoorAnimation = readJson<{
      scenes: Array<{
        outdoorEdit: {
          videoSrc: string;
          captionSegments: unknown[];
        };
      }>;
    }>(outdoorAnimationPath);
    const outdoorScene = outdoorAnimation.scenes[0];
    const manifest = {
      version: 1,
      scriptId,
      source: 'speech-alignment',
      generatedAt: new Date().toISOString(),
      videoSrc: outdoorScene.outdoorEdit.videoSrc,
      editedDurationSeconds: alignment.editedDurationSeconds,
      burnCaptions: true,
      burnCaptionsZh: true,
      beatDurationsSeconds: alignment.beatDurationsSeconds,
      captionSegments: outdoorScene.outdoorEdit.captionSegments,
      mergedBeats: alignment.boundaries.map((boundary) => ({
        slideId: `beat-${String(boundary.beatIndex + 1).padStart(2, '0')}`,
        beatIndex: boundary.beatIndex,
        editedStart: boundary.editedStart,
        editedEnd: boundary.editedEnd,
        durationSeconds: boundary.durationSeconds,
        lastSpokenWord: boundary.lastSpokenWord,
      })),
    };
    const outPath = path.join(editDir, 'outdoor-manifest.json');
    writeJson(outPath, manifest);
    console.log(outPath);
    return;
  }

  for (const required of [visualPlanPath, transcriptPath, animationPath]) {
    if (!fileExists(required)) {
      throw new Error(`Missing required file: ${required}`);
    }
  }

  const visualPlan = readJson<{ timeline?: TimelineEntry[] }>(visualPlanPath);
  const transcript = readJson<{ segments?: TranscriptSegment[] }>(transcriptPath);
  const animation = readJson<{
    scenes?: Array<{ compare?: { beats?: Array<{ sayZh?: string }> } }>;
  }>(animationPath);
  const scene = animation.scenes?.[0];
  const scriptBeats = scene?.compare?.beats ?? [];

  function mergeTimelineBySlide(timeline: TimelineEntry[]): TimelineEntry[] {
    const merged: TimelineEntry[] = [];
    for (const entry of timeline) {
      const last = merged[merged.length - 1];
      if (last && last.slideId === entry.slideId) {
        last.editedEnd = entry.editedEnd;
        continue;
      }
      merged.push({ ...entry });
    }
    return merged;
  }

  function beatIndexAt(seconds: number, beats: TimelineEntry[]): number {
    for (let index = 0; index < beats.length; index += 1) {
      const beat = beats[index];
      if (seconds >= beat.editedStart && seconds < beat.editedEnd) {
        return index;
      }
    }
    return Math.max(0, beats.length - 1);
  }

  const mergedBeats = mergeTimelineBySlide(visualPlan.timeline ?? []);
  if (mergedBeats.length !== scriptBeats.length) {
    console.warn(
      `[build-outdoor-manifest] timeline beats ${mergedBeats.length} vs animation beats ${scriptBeats.length}`,
    );
  }

  const beatDurationsSeconds = mergedBeats.map(
    (beat) => Math.round((beat.editedEnd - beat.editedStart) * 100) / 100,
  );
  const editedDurationSeconds =
    Math.round(beatDurationsSeconds.reduce((sum, value) => sum + value, 0) * 100) / 100;

  const segmentsByBeat: TranscriptSegment[][] = mergedBeats.map(() => []);
  for (const segment of transcript.segments ?? []) {
    const beatIndex = beatIndexAt(segment.start, mergedBeats);
    segmentsByBeat[beatIndex].push(segment);
  }

  const captionSegments: Array<{
    text: string;
    zh?: string;
    atSeconds: number;
    durationSeconds: number;
  }> = [];
  for (let beatIndex = 0; beatIndex < mergedBeats.length; beatIndex += 1) {
    const beatSegments = segmentsByBeat[beatIndex];
    const sayZh = scriptBeats[beatIndex]?.sayZh ?? '';
    beatSegments.forEach((segment, segmentIndex) => {
      captionSegments.push({
        text: (segment.text ?? '').trim(),
        zh: zhForSegment(sayZh, segmentIndex, beatSegments.length) || undefined,
        atSeconds: Math.round(segment.start * 100) / 100,
        durationSeconds: Math.round((segment.end - segment.start) * 100) / 100,
      });
    });
  }

  const videoCandidates = [
    path.join(editDir, 'edited-good-intervals.mp4'),
    path.join(scriptDir, 'takes', 'take-mrbtjdup.MP4'),
    path.join(scriptDir, 'takes', 'take-mrbtjdup.mp4'),
  ];
  const videoPath = videoCandidates.find((candidate) => fileExists(candidate));
  if (!videoPath) {
    throw new Error(`No outdoor video found in ${editDir} or takes/`);
  }

  const videoSrc = path.relative(scriptDir, videoPath).split(path.sep).join('/');

  const manifest = {
    version: 1,
    scriptId,
    source: 'outdoor-take',
    generatedAt: new Date().toISOString(),
    videoSrc,
    editedDurationSeconds,
    burnCaptions: true,
    burnCaptionsZh: true,
    beatDurationsSeconds,
    captionSegments,
    mergedBeats: mergedBeats.map((beat, index) => ({
      slideId: beat.slideId,
      slideTitle: beat.slideTitle,
      beatIndex: index,
      editedStart: beat.editedStart,
      editedEnd: beat.editedEnd,
      durationSeconds: beatDurationsSeconds[index],
    })),
  };

  const outPath = path.join(editDir, 'outdoor-manifest.json');
  writeJson(outPath, manifest);
  console.log(outPath);
}
