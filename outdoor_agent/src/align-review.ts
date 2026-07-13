/**
 * Align review: per-beat Remotion layout (PIP clip + hint panel) + filmed clip windows.
 */

import path from 'node:path';

import {
  effectiveGoodIntervals,
  loadCutSelection,
  loadScriptGuideText,
  loadTranscriptSentences,
  type AnalysisFile,
} from './cut-review.ts';
import { fileExists, readJson, writeJson } from './fs_util.ts';
import { preferredRemotionStudioUrl } from './outdoor-endpoints.ts';
import { takeStageRunDir } from './paths.ts';
import type { OutdoorJob } from './schema.ts';

type GoodInterval = { start: number; end: number };

/** Map a source-timeline sentence onto the edited cut timeline (null if fully cut). */
function mapSourceIntervalToEdited(
  line: { start: number; end: number },
  goodIntervals: GoodInterval[],
): { start: number; end: number } | null {
  if (!goodIntervals.length) {
    return { start: line.start, end: line.end };
  }
  let editedCursor = 0;
  for (const good of goodIntervals) {
    const overlapStart = Math.max(line.start, good.start);
    const overlapEnd = Math.min(line.end, good.end);
    if (overlapEnd > overlapStart + 0.04) {
      const start = editedCursor + (overlapStart - good.start);
      const end = editedCursor + (overlapEnd - good.start);
      return { start, end };
    }
    editedCursor += Math.max(0, good.end - good.start);
  }
  return null;
}

function loadSaidLinesForAlign(
  job: OutdoorJob,
  alignRunId: string,
): Array<{ id: string; start: number; end: number; text: string }> {
  const alignDir = takeStageRunDir(job.scriptId, job.takeId, 'align', alignRunId);
  const cutRunId = job.selectedRuns.cut;

  // Prefer cut Whisper transcript (source timeline) and map into the edited cut.
  if (cutRunId) {
    const cutTranscript = path.join(
      takeStageRunDir(job.scriptId, job.takeId, 'cut', cutRunId),
      'transcript.verbose.json',
    );
    const sourceLines = loadTranscriptSentences(
      cutTranscript,
      loadScriptGuideText(job.scriptId),
    );
    if (sourceLines.length) {
      const goodIntervals: GoodInterval[] = [];
      const analysisPath = path.join(
        takeStageRunDir(job.scriptId, job.takeId, 'cut', cutRunId),
        'analysis.json',
      );
      if (fileExists(analysisPath)) {
        const analysis = readJson<AnalysisFile>(analysisPath);
        const selection = loadCutSelection(job, cutRunId);
        const cutWords = fileExists(cutTranscript)
          ? (readJson<{ words?: Array<{ word?: string; start?: number; end?: number }> }>(
            cutTranscript,
          ).words ?? [])
          : [];
        for (const interval of effectiveGoodIntervals(analysis, selection, cutWords)) {
          if (interval.end > interval.start) {
            goodIntervals.push(interval);
          }
        }
      }
      const mapped: Array<{ id: string; start: number; end: number; text: string }> = [];
      for (const line of sourceLines) {
        const edited = mapSourceIntervalToEdited(line, goodIntervals);
        if (!edited) {
          continue;
        }
        mapped.push({
          id: line.id,
          start: edited.start,
          end: edited.end,
          text: line.text,
        });
      }
      return mapped;
    }
  }

  // Fallback: align-dir transcript from ASR align (already on edited timeline).
  return loadTranscriptSentences(
    path.join(alignDir, 'transcript.verbose.json'),
    loadScriptGuideText(job.scriptId),
  );
}

export type MaskShape = 'circle' | 'rectangle';

export type AlignBoxLayout = {
  shape: MaskShape;
  /** Mask net — visible crop window (0–1). */
  x: number;
  y: number;
  w: number;
  h: number;
  /** Video net — underlying filmed clip rectangle (0–1). */
  videoX?: number;
  videoY?: number;
  videoW?: number;
  videoH?: number;
  objectPositionX: number;
  objectPositionY: number;
  scale: number;
};

export type AlignHintLayout = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type AlignBeatLayout = {
  pip: AlignBoxLayout;
  hintPanel: AlignHintLayout;
  presenterMode?: 'split-crop' | 'full-clip';
  scriptFullscreen?: boolean;
};

export type AlignLayout = {
  schemaVersion: 1;
  updatedAt: string;
  /** Default / fallback when a beat has no override. */
  pip: AlignBoxLayout;
  hintPanel: AlignHintLayout;
  /** Per-beat overrides keyed by beatIndex string ("0", "1", …). */
  beats?: Record<string, AlignBeatLayout>;
};

export type AlignSaidLine = {
  id: string;
  text: string;
  start: number;
  end: number;
};

export type AlignSlidePreview = {
  beatIndex: number;
  slideId: string;
  slideTitle: string;
  editedStart: number;
  editedEnd: number;
  durationSeconds: number;
  say?: string;
  /** Spoken sentences overlapping this beat on the edited timeline. */
  saidLines: AlignSaidLine[];
  videoUrl: string;
  remotionStudioHint: string;
  remotionStudioUrl: string | null;
  remotionPortraitUrl: string | null;
  layout: AlignBeatLayout;
};

export type AlignReviewPayload = {
  runId: string;
  editedVideoUrl: string;
  layoutPath: string;
  layout: AlignLayout;
  remotionStudioUrl: string | null;
  remotionCompositionUrl: string | null;
  remotionPortraitUrl: string | null;
  slides: AlignSlidePreview[];
};

type AlignFile = {
  boundaries?: Array<{
    beatIndex: number;
    editedStart: number;
    editedEnd: number;
    durationSeconds: number;
  }>;
  beatDurationsSeconds?: number[];
};

type AnimationOutdoor = {
  title?: string;
  scenes?: Array<{
    compare?: {
      beats?: Array<{
        id?: string;
        title?: string;
        say?: string;
      }>;
    };
  }>;
};

function defaultPip(): AlignBoxLayout {
  return {
    shape: 'rectangle',
    x: 0.02,
    y: 0.55,
    w: 0.28,
    h: 0.38,
    videoX: 0.02,
    videoY: 0.55,
    videoW: 0.28,
    videoH: 0.38,
    objectPositionX: 0.5,
    objectPositionY: 0.5,
    scale: 1,
  };
}

function defaultHint(): AlignHintLayout {
  return {
    x: 0.55,
    y: 0.12,
    w: 0.4,
    h: 0.28,
  };
}

function defaultLayout(): AlignLayout {
  return {
    schemaVersion: 1,
    updatedAt: new Date().toISOString(),
    pip: defaultPip(),
    hintPanel: defaultHint(),
    beats: {},
  };
}

function clamp01(value: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(1, Math.max(0, value));
}

function normalizePip(raw: Partial<AlignBoxLayout> | undefined, fallback: AlignBoxLayout): AlignBoxLayout {
  const x = clamp01(Number(raw?.x), fallback.x);
  const y = clamp01(Number(raw?.y), fallback.y);
  const w = Math.min(1, Math.max(0.05, Number(raw?.w) || fallback.w));
  const h = Math.min(1, Math.max(0.05, Number(raw?.h) || fallback.h));
  const hasVideoNet =
    Number.isFinite(Number(raw?.videoW)) && Number.isFinite(Number(raw?.videoH));
  return {
    shape: raw?.shape === 'circle' ? 'circle' : 'rectangle',
    x,
    y,
    w,
    h,
    videoX: clamp01(Number(raw?.videoX), hasVideoNet ? Number(raw?.videoX) : (fallback.videoX ?? x)),
    videoY: clamp01(Number(raw?.videoY), hasVideoNet ? Number(raw?.videoY) : (fallback.videoY ?? y)),
    videoW: Math.min(
      1,
      Math.max(0.05, Number(raw?.videoW) || fallback.videoW || w),
    ),
    videoH: Math.min(
      1,
      Math.max(0.05, Number(raw?.videoH) || fallback.videoH || h),
    ),
    objectPositionX: clamp01(Number(raw?.objectPositionX), fallback.objectPositionX),
    objectPositionY: clamp01(Number(raw?.objectPositionY), fallback.objectPositionY),
    scale: Math.min(3, Math.max(0.5, Number(raw?.scale) || fallback.scale)),
  };
}

function normalizeHint(
  raw: Partial<AlignHintLayout> | undefined,
  fallback: AlignHintLayout,
): AlignHintLayout {
  return {
    x: clamp01(Number(raw?.x), fallback.x),
    y: clamp01(Number(raw?.y), fallback.y),
    w: Math.min(1, Math.max(0.05, Number(raw?.w) || fallback.w)),
    h: Math.min(1, Math.max(0.05, Number(raw?.h) || fallback.h)),
  };
}

function normalizeLayout(raw: Partial<AlignLayout> | undefined): AlignLayout {
  const base = defaultLayout();
  const pip = normalizePip(raw?.pip, base.pip);
  const hintPanel = normalizeHint(raw?.hintPanel, base.hintPanel);
  const beats: Record<string, AlignBeatLayout> = {};
  if (raw?.beats && typeof raw.beats === 'object') {
    for (const [key, beat] of Object.entries(raw.beats)) {
      if (!beat || typeof beat !== 'object') continue;
      beats[key] = {
        pip: normalizePip(beat.pip, pip),
        hintPanel: normalizeHint(beat.hintPanel, hintPanel),
        ...(beat.presenterMode === 'full-clip' || beat.presenterMode === 'split-crop'
          ? { presenterMode: beat.presenterMode }
          : {}),
        ...(beat.scriptFullscreen ? { scriptFullscreen: true } : {}),
      };
    }
  }
  return {
    schemaVersion: 1,
    updatedAt: typeof raw?.updatedAt === 'string' ? raw.updatedAt : base.updatedAt,
    pip,
    hintPanel,
    beats,
  };
}

export function layoutForBeat(layout: AlignLayout, beatIndex: number): AlignBeatLayout {
  const key = String(beatIndex);
  const override = layout.beats?.[key];
  if (override) {
    return {
      pip: normalizePip(override.pip, layout.pip),
      hintPanel: normalizeHint(override.hintPanel, layout.hintPanel),
      ...(override.presenterMode ? { presenterMode: override.presenterMode } : {}),
      ...(override.scriptFullscreen ? { scriptFullscreen: true } : {}),
    };
  }
  return {
    pip: { ...layout.pip },
    hintPanel: { ...layout.hintPanel },
  };
}

function readRemotionStudioUrl(): string | null {
  try {
    return preferredRemotionStudioUrl();
  } catch {
    return 'http://127.0.0.1:3000';
  }
}

export function alignLayoutPath(job: OutdoorJob, runId: string): string {
  return path.join(takeStageRunDir(job.scriptId, job.takeId, 'align', runId), 'align-layout.json');
}

export function loadAlignLayout(job: OutdoorJob, runId: string): AlignLayout {
  const filePath = alignLayoutPath(job, runId);
  if (!fileExists(filePath)) {
    return defaultLayout();
  }
  try {
    return normalizeLayout(readJson<AlignLayout>(filePath));
  } catch {
    return defaultLayout();
  }
}

export function saveAlignLayout(job: OutdoorJob, runId: string, layout: AlignLayout): AlignLayout {
  const next = normalizeLayout({
    ...layout,
    schemaVersion: 1,
    updatedAt: new Date().toISOString(),
  });
  writeJson(alignLayoutPath(job, runId), next);

  // Mirror into animation-outdoor.json so Remotion composite can read pipMask / beatLayouts.
  const animationPath = path.join(
    takeStageRunDir(job.scriptId, job.takeId, 'align', runId),
    'animation-outdoor.json',
  );
  if (fileExists(animationPath)) {
    try {
      const animation = readJson<Record<string, unknown>>(animationPath);
      const scenes = Array.isArray(animation.scenes) ? [...animation.scenes] : [];
      if (scenes[0] && typeof scenes[0] === 'object') {
        const scene = { ...(scenes[0] as Record<string, unknown>) };
        const beatKeys = Object.keys(next.beats ?? {})
          .map((key) => Number(key))
          .filter((n) => Number.isFinite(n) && n >= 0);
        const maxBeat = beatKeys.length ? Math.max(...beatKeys) : -1;
        const beatLayouts: Array<{
          pipMask: AlignBoxLayout;
          hintPanel: AlignHintLayout;
          presenterMode?: 'split-crop' | 'full-clip';
          scriptFullscreen?: boolean;
        } | null> = [];
        for (let i = 0; i <= maxBeat; i++) {
          const beat = layoutForBeat(next, i);
          beatLayouts[i] = {
            pipMask: beat.pip,
            hintPanel: beat.hintPanel,
            ...(beat.presenterMode && beat.presenterMode !== 'split-crop'
              ? { presenterMode: beat.presenterMode }
              : {}),
            ...(beat.scriptFullscreen ? { scriptFullscreen: true } : {}),
          };
        }
        const outdoorEdit = {
          ...((scene.outdoorEdit as Record<string, unknown> | undefined) ?? {}),
          pipMask: next.pip,
          hintPanel: next.hintPanel,
          beatLayouts,
        };
        scene.outdoorEdit = outdoorEdit;
        scenes[0] = scene;
        writeJson(animationPath, { ...animation, scenes });
      }
    } catch {
      // keep layout file even if animation patch fails
    }
  }

  return next;
}

export function buildAlignReview(job: OutdoorJob, runId: string): AlignReviewPayload | null {
  const alignDir = takeStageRunDir(job.scriptId, job.takeId, 'align', runId);
  const edited = path.join(alignDir, 'edited-good-intervals.mp4');
  if (!fileExists(edited)) {
    return null;
  }
  const alignmentPath = path.join(alignDir, 'speech-alignment.json');
  const animationPath = path.join(alignDir, 'animation-outdoor.json');
  const alignment = fileExists(alignmentPath) ? readJson<AlignFile>(alignmentPath) : {};
  const animation = fileExists(animationPath) ? readJson<AnimationOutdoor>(animationPath) : {};
  const beats = animation.scenes?.[0]?.compare?.beats ?? [];
  const layout = loadAlignLayout(job, runId);
  const remotionStudioUrl = readRemotionStudioUrl();
  const remotionCompositionUrl = remotionStudioUrl
    ? `${remotionStudioUrl}/video-outdoor-landscape`
    : null;
  const remotionPortraitUrl = remotionStudioUrl
    ? `${remotionStudioUrl}/video-outdoor-portrait`
    : null;
  const videoUrl =
    `/api/scripts/${encodeURIComponent(job.scriptId)}/takes/${encodeURIComponent(job.takeId)}` +
    `/artifacts/align/${encodeURIComponent(runId)}/edited-good-intervals.mp4`;

  const allSaid = loadSaidLinesForAlign(job, runId);

  const slides: AlignSlidePreview[] = [];
  const pushSlide = (
    beatIndex: number,
    editedStart: number,
    editedEnd: number,
    durationSeconds: number,
  ) => {
    const beat = beats[beatIndex];
    const studioHint = remotionCompositionUrl
      ? `Remotion Studio → video-outdoor-landscape · seek ~${editedStart.toFixed(1)}s`
      : `Open Remotion Studio → video-outdoor-landscape → seek ~${editedStart.toFixed(1)}s`;
    const saidLines = allSaid
      .filter((line) => {
        const mid = (line.start + line.end) / 2;
        return mid >= editedStart && mid < editedEnd;
      })
      .map((line) => ({
        id: `${beatIndex}-${line.id}`,
        text: line.text,
        start: line.start,
        end: line.end,
      }));
    slides.push({
      beatIndex,
      slideId: beat?.id ?? `beat-${String(beatIndex + 1).padStart(2, '0')}`,
      slideTitle: beat?.title ?? `Beat ${beatIndex + 1}`,
      editedStart,
      editedEnd,
      durationSeconds,
      say: beat?.say,
      saidLines,
      videoUrl: `${videoUrl}#t=${editedStart},${editedEnd}`,
      remotionStudioHint: studioHint,
      remotionStudioUrl: remotionCompositionUrl,
      remotionPortraitUrl,
      layout: layoutForBeat(layout, beatIndex),
    });
  };

  if (alignment.boundaries?.length) {
    for (const boundary of alignment.boundaries) {
      pushSlide(
        boundary.beatIndex,
        boundary.editedStart,
        boundary.editedEnd,
        boundary.durationSeconds,
      );
    }
  } else if (alignment.beatDurationsSeconds?.length) {
    let cursor = 0;
    alignment.beatDurationsSeconds.forEach((duration, beatIndex) => {
      const start = cursor;
      const end = cursor + duration;
      cursor = end;
      pushSlide(beatIndex, start, end, duration);
    });
  }

  return {
    runId,
    editedVideoUrl: videoUrl,
    layoutPath: alignLayoutPath(job, runId),
    layout,
    remotionStudioUrl,
    remotionCompositionUrl,
    remotionPortraitUrl,
    slides,
  };
}
