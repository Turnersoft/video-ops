import path from 'node:path';

import type { TakeManifest } from '../../ios-teleprompter/src/scriptSchema.ts';
import { attachSpokenZhToCaptionSegments } from '../../outdoor_post/src/caption_translate.ts';
import { resolveAnimationV4 } from './animation-load.ts';
import { copyFile, fileExists, writeJson } from './fs_util.ts';
import { saveJob, savePublishState, writeProgress, loadJob } from './job-store.ts';
import { finalizeOutdoorTakeAnimation } from './finalize-outdoor-take-animation.ts';
import { formatPipelineErrorFromRunDir } from './pipeline-error.ts';
import { runStage } from './queue.ts';
import { syncOutdoorEditToAnimation } from './sync-outdoor-animation.ts';
import {
  createJob,
  newJobId,
  newRunId,
  nowIso,
  upsertRun,
  type OutdoorJob,
  type PipelineErrorCode,
} from './schema.ts';
import { teleprompterTitleFromScriptId } from '../../../src/scriptCollections.ts';
import { runCommand } from './subprocess.ts';
import { appendTakeAgentLog } from './stage-run-log.ts';
import {
  checkVoxcpmHealth,
  ensureVoxcpmServer,
  fetchVoxcpmLogs,
  type VoxcpmHealthSnapshot,
  type VoxcpmLogsSnapshot,
} from './voxcpm-client.ts';
import { resolveVoxcpmReferenceClip, type VoxcpmReferenceOptions } from './voxcpm-reference.ts';
import {
  synthesizeVoxcpmBeatFromSentences,
  type VoxcpmRelativeCaptionSegment,
} from './voxcpm-script-editor.ts';
import {
  ensureDir,
  pipelineDir,
  scriptDirFor,
  takeDir,
  takeManifestPath,
  takeStageRunDir,
} from './paths.ts';

export {
  checkVoxcpmHealth,
  fetchVoxcpmLogs,
  type VoxcpmHealthSnapshot,
  type VoxcpmLogsSnapshot,
} from './voxcpm-client.ts';

export type VoxcpmTrialOptions = {
  referenceTakeId?: string;
  referenceAudioPath?: string;
  renderComposite?: boolean;
  /** When true, force every sentence through VoxCPM again. Default retry is composite-only. */
  resynthesizeVoice?: boolean;
};

type AnimationBeat = {
  say?: string;
  sayZh?: string;
  visualNotes?: string;
  durationSeconds?: number;
};

function roundSeconds(value: number): number {
  return Math.round(value * 100) / 100;
}

function buildSyntheticTakeManifest(params: {
  scriptId: string;
  scriptTitle: string;
  takeId: string;
  beatDurationsSeconds: number[];
}): TakeManifest {
  let cursorMs = 0;
  const slideEvents = params.beatDurationsSeconds.map((durationSeconds, index) => {
    const event = {
      slideId: `beat-${String(index + 1).padStart(2, '0')}`,
      index,
      atMs: cursorMs,
    };
    cursorMs += Math.round(durationSeconds * 1000);
    return event;
  });
  return {
    schemaVersion: 1,
    scriptId: params.scriptId,
    scriptTitle: params.scriptTitle,
    takeId: params.takeId,
    recordedAt: nowIso(),
    videoUri: '',
    durationMs: cursorMs,
    slideEvents,
    markers: [],
    syncStatus: 'synced',
  };
}

async function writeAlignFromVoxcpm(params: {
  job: OutdoorJob;
  outDir: string;
  narrationWav: string;
  editedVideoPath: string;
  beatDurationsSeconds: number[];
  beats: AnimationBeat[];
  captionSegments: VoxcpmRelativeCaptionSegment[];
}): Promise<void> {
  const scriptDir = scriptDirFor(params.job.scriptId);
  const animation = await resolveAnimationV4(params.job.scriptId);
  if (!animation?.scenes?.[0]?.compare?.beats?.length) {
    throw new Error(`No compare beats in animation for ${params.job.scriptId}`);
  }
  const beats = params.beats;
  const beatDurationsSeconds = params.beatDurationsSeconds.map((value) =>
    roundSeconds(Math.max(0.5, value)),
  );
  const editedDurationSeconds = roundSeconds(
    beatDurationsSeconds.reduce((sum, value) => sum + value, 0),
  );

  let editedCursor = 0;
  const boundaries = beatDurationsSeconds.map((durationSeconds, beatIndex) => {
    const boundary = {
      beatIndex,
      editedStart: roundSeconds(editedCursor),
      editedEnd: roundSeconds(editedCursor + durationSeconds),
      durationSeconds,
      lastSpokenWord: '',
      source: 'voxcpm',
    };
    editedCursor += durationSeconds;
    return boundary;
  });

  const narrationRel = path
    .relative(scriptDir, params.narrationWav)
    .split(path.sep)
    .join('/');

  let captionSegments = params.captionSegments.map((segment) => ({
    text: segment.text,
    atSeconds: segment.atSeconds,
    durationSeconds: segment.durationSeconds,
  }));
  captionSegments = await attachSpokenZhToCaptionSegments(params.outDir, captionSegments);

  const outdoorAnimation = JSON.parse(JSON.stringify(animation)) as {
    title?: string;
    scenes: Array<{
      durationSeconds?: number;
      burnCaptions?: boolean;
      outdoorEdit?: Record<string, unknown>;
      compare?: { beats?: AnimationBeat[] };
    }>;
  };
  const outdoorScene = outdoorAnimation.scenes[0];
  outdoorScene.durationSeconds = editedDurationSeconds;
  outdoorScene.burnCaptions = true;
  outdoorScene.outdoorEdit = {
    videoSrc: '',
    audioSrc: narrationRel,
    burnCaptionsZh: true,
    beatDurationsSeconds,
    captionSegments,
  };
  outdoorScene.compare?.beats?.forEach((beat, index) => {
    beat.durationSeconds = beatDurationsSeconds[index];
  });

  writeJson(path.join(params.outDir, 'speech-alignment.json'), {
    schemaVersion: 1,
    scriptId: params.job.scriptId,
    generatedAt: nowIso(),
    source: 'voxcpm',
    editedDurationSeconds,
    beatDurationsSeconds,
    boundaries,
    narrationWav: params.narrationWav,
  });
  writeJson(path.join(params.outDir, 'remotion-visual-plan.json'), {
    schemaVersion: 2,
    source: 'voxcpm',
    sourceScriptId: params.job.scriptId,
    title: animation.title,
    editedDurationSeconds,
    timeline: boundaries.map((boundary, index) => ({
      slideId: `beat-${String(index + 1).padStart(2, '0')}`,
      slideTitle: beats[index]?.visualNotes ?? `Beat ${index + 1}`,
      sourceStart: boundary.editedStart,
      sourceEnd: boundary.editedEnd,
      editedStart: boundary.editedStart,
      editedEnd: boundary.editedEnd,
    })),
  });
  writeJson(path.join(params.outDir, 'animation-outdoor.json'), outdoorAnimation);
  writeJson(path.join(params.outDir, 'align-mode.json'), {
    mode: 'voxcpm',
    generatedAt: nowIso(),
  });
  copyFile(params.editedVideoPath, path.join(params.outDir, 'edited-good-intervals.mp4'));
  copyFile(params.narrationWav, path.join(params.outDir, 'narration.wav'));

  const outdoorAnimationPath = path.join(params.outDir, 'animation-outdoor.json');
  await finalizeOutdoorTakeAnimation(params.job.scriptId, outdoorAnimationPath);
  syncOutdoorEditToAnimation(params.job.scriptId, outdoorAnimationPath);
}

async function synthesizeNarration(params: {
  job: OutdoorJob;
  alignRunId: string;
  beats: AnimationBeat[];
  referenceAudioPath: string;
  referenceTakeId?: string;
  force?: boolean;
}): Promise<{
  narrationWav: string;
  beatDurationsSeconds: number[];
  captionSegments: VoxcpmRelativeCaptionSegment[];
}> {
  const beatsDir = path.join(
    takeStageRunDir(params.job.scriptId, params.job.takeId, 'align', params.alignRunId),
    'voxcpm-beats',
  );
  ensureDir(beatsDir);
  const beatWavs: string[] = [];
  const beatDurationsSeconds: number[] = [];
  const captionSegments: VoxcpmRelativeCaptionSegment[] = [];
  let narrationCursor = 0;

  for (let index = 0; index < params.beats.length; index += 1) {
    const beat = params.beats[index];
    const text = (beat.say ?? '').trim();
    if (!text) {
      throw new Error(`Beat ${index + 1} has empty say text — fill script in beat editor first`);
    }
    const wavPath = path.join(beatsDir, `beat-${String(index + 1).padStart(2, '0')}.wav`);
    writeProgress(params.job.jobId, 'align', params.alignRunId, {
      percent: 10 + Math.round((index / Math.max(1, params.beats.length)) * 40),
      step: 'voxcpm',
      message: `VoxCPM beat ${index + 1}/${params.beats.length}`,
    });
    const result = await synthesizeVoxcpmBeatFromSentences({
      scriptId: params.job.scriptId,
      beatIndex: index,
      say: text,
      referenceAudioPath: params.referenceAudioPath,
      referenceTakeId: params.referenceTakeId,
      outputPath: wavPath,
      force: params.force,
      onSentence: (sentenceIndex, sentenceCount) => {
        writeProgress(params.job.jobId, 'align', params.alignRunId, {
          percent:
            10 +
            Math.round(
              ((index + sentenceIndex / Math.max(1, sentenceCount)) /
                Math.max(1, params.beats.length)) *
                40,
            ),
          step: 'voxcpm',
          message:
            `VoxCPM beat ${index + 1}/${params.beats.length} · ` +
            `sentence ${sentenceIndex + 1}/${sentenceCount}`,
        });
      },
    });
    beatWavs.push(wavPath);
    beatDurationsSeconds.push(result.durationSeconds);
    captionSegments.push(
      ...result.captions.map((segment) => ({
        ...segment,
        atSeconds: roundSeconds(narrationCursor + segment.atSeconds),
      })),
    );
    narrationCursor += result.durationSeconds;
  }

  const listPath = path.join(beatsDir, 'beats.txt');
  const listBody = beatWavs.map((wav) => `file '${wav.replace(/'/g, "'\\''")}'`).join('\n');
  await Deno.writeTextFile(listPath, listBody);

  const narrationWav = path.join(beatsDir, 'narration.wav');
  writeProgress(params.job.jobId, 'align', params.alignRunId, {
    percent: 55,
    step: 'voxcpm',
    message: 'Concatenating narration',
  });
  await runCommand('ffmpeg', [
    '-y',
    '-f',
    'concat',
    '-safe',
    '0',
    '-i',
    listPath,
    '-ar',
    '48000',
    '-ac',
    '1',
    narrationWav,
  ]);

  return { narrationWav, beatDurationsSeconds, captionSegments };
}

async function writeSyntheticCutVideo(params: {
  scriptId: string;
  takeId: string;
  cutRunId: string;
  narrationWav: string;
  durationSeconds: number;
}): Promise<string> {
  const cutDir = takeStageRunDir(params.scriptId, params.takeId, 'cut', params.cutRunId);
  ensureDir(cutDir);
  const editedVideo = path.join(cutDir, 'edited-good-intervals.mp4');
  await runCommand('ffmpeg', [
    '-y',
    '-f',
    'lavfi',
    '-i',
    `color=c=0x1a472a:s=1280x720:r=30:d=${params.durationSeconds.toFixed(3)}`,
    '-i',
    params.narrationWav,
    '-shortest',
    '-c:v',
    'libx264',
    '-pix_fmt',
    'yuv420p',
    '-c:a',
    'aac',
    editedVideo,
  ]);
  copyFile(params.narrationWav, path.join(cutDir, 'narration.wav'));
  return editedVideo;
}

export async function createVoxcpmTrialJob(
  scriptId: string,
  options: VoxcpmTrialOptions = {},
): Promise<{ job: OutdoorJob; takeId: string; referenceAudioPath: string }> {
  const takeId = `take-voxcpm-${Date.now().toString(36)}`;
  const scriptTitle = teleprompterTitleFromScriptId(scriptId);
  const referenceAudioPath = await resolveVoxcpmReferenceClip(scriptId, options);

  ensureDir(takeDir(scriptId, takeId));
  ensureDir(pipelineDir(scriptId, takeId));

  const job = createJob({
    jobId: newJobId(takeId),
    takeId,
    scriptId,
    scriptTitle,
    sourceVideoPath: '',
    takeManifestPath: takeManifestPath(scriptId, takeId),
    status: 'running',
    autoRun: false,
  });
  saveJob(job);
  savePublishState({
    schemaVersion: 1,
    jobId: job.jobId,
    scriptId,
    takeId,
    posts: [],
  });
  appendTakeAgentLog(scriptId, takeId, `VoxCPM trial started (ref: ${referenceAudioPath})`);
  return { job, takeId, referenceAudioPath };
}

export async function runVoxcpmTrialJob(
  job: OutdoorJob,
  options: VoxcpmTrialOptions = {},
): Promise<void> {
  const referenceAudioPath = await resolveVoxcpmReferenceClip(job.scriptId, options);
  const alignRunId = newRunId('align');
  const cutRunId = newRunId('cut');
  const alignDir = takeStageRunDir(job.scriptId, job.takeId, 'align', alignRunId);
  ensureDir(alignDir);

  upsertRun(job, 'align', alignRunId, { status: 'running' });
  job.selectedRuns.align = alignRunId;
  job.status = 'running';
  saveJob(job);

  try {
    await ensureVoxcpmServer();

    const animation = await resolveAnimationV4(job.scriptId);
    const beats = animation?.scenes?.[0]?.compare?.beats ?? [];
    if (!beats.length) {
      throw new Error(`No beats in animation for ${job.scriptId} — open beat editor and sync first`);
    }

    writeProgress(job.jobId, 'align', alignRunId, {
      percent: 5,
      step: 'voxcpm',
      message: 'Starting VoxCPM voice synthesis',
    });

    const { narrationWav, beatDurationsSeconds, captionSegments } =
      await synthesizeNarration({
        job,
        alignRunId,
        beats,
        referenceAudioPath,
        referenceTakeId: options.referenceTakeId,
        force: options.resynthesizeVoice === true,
      });

    writeJson(
      takeManifestPath(job.scriptId, job.takeId),
      buildSyntheticTakeManifest({
        scriptId: job.scriptId,
        scriptTitle: job.scriptTitle,
        takeId: job.takeId,
        beatDurationsSeconds,
      }),
    );

    const editedDurationSeconds = roundSeconds(
      beatDurationsSeconds.reduce((sum, value) => sum + value, 0),
    );

    writeProgress(job.jobId, 'align', alignRunId, {
      percent: 60,
      step: 'voxcpm',
      message: 'Building synthetic cut video',
    });
    const editedVideoPath = await writeSyntheticCutVideo({
      scriptId: job.scriptId,
      takeId: job.takeId,
      cutRunId,
      narrationWav,
      durationSeconds: editedDurationSeconds,
    });

    upsertRun(job, 'cut', cutRunId, {
      status: 'succeeded',
      finishedAt: nowIso(),
      artifacts: { editedVideo: editedVideoPath },
    });
    job.selectedRuns.cut = cutRunId;

    writeProgress(job.jobId, 'align', alignRunId, {
      percent: 75,
      step: 'voxcpm',
      message: 'Writing alignment artifacts',
    });
    await writeAlignFromVoxcpm({
      job,
      outDir: alignDir,
      narrationWav,
      editedVideoPath,
      beatDurationsSeconds,
      beats,
      captionSegments,
    });

    upsertRun(job, 'align', alignRunId, {
      status: 'succeeded',
      finishedAt: nowIso(),
      artifacts: {
        narrationWav,
        animationOutdoor: path.join(alignDir, 'animation-outdoor.json'),
      },
    });
    job.selectedRuns.align = alignRunId;
    job.status = 'review';
    saveJob(job);
    appendTakeAgentLog(job.scriptId, job.takeId, `VoxCPM align run ${alignRunId} succeeded`);
  } catch (error) {
    const fields = formatVoxcpmTrialError(error, alignDir);
    upsertRun(job, 'align', alignRunId, {
      status: 'failed',
      finishedAt: nowIso(),
      ...fields,
    });
    job.status = 'failed';
    saveJob(job);
    appendTakeAgentLog(
      job.scriptId,
      job.takeId,
      `VoxCPM trial failed: ${fields.errorTitle} — ${fields.error}`,
    );
    throw error;
  }

  if (options.renderComposite !== false) {
    writeProgress(job.jobId, 'align', alignRunId, {
      percent: 85,
      step: 'voxcpm',
      message: 'Rendering composite preview',
    });
    try {
      await runStage(job.jobId, 'composite', { rerun: true });
    } catch (error) {
      appendTakeAgentLog(
        job.scriptId,
        job.takeId,
        `VoxCPM composite failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }
}

function alignNarrationReady(job: OutdoorJob): boolean {
  const alignRunId = job.selectedRuns.align;
  if (!alignRunId) {
    return false;
  }
  const alignRun = (job.runs.align ?? []).find((run) => run.runId === alignRunId);
  if (!alignRun) {
    return false;
  }
  if (alignRun.status === 'succeeded') {
    return true;
  }
  const artifactPath = alignRun.artifacts?.narrationWav;
  if (typeof artifactPath === 'string' && fileExists(artifactPath)) {
    return true;
  }
  return fileExists(path.join(alignDirForRun(job, alignRunId), 'narration.wav'));
}

function alignDirForRun(job: OutdoorJob, alignRunId: string): string {
  return takeStageRunDir(job.scriptId, job.takeId, 'align', alignRunId);
}

function repairAlignRunIfNarrationReady(job: OutdoorJob): void {
  const alignRunId = job.selectedRuns.align;
  if (!alignRunId || !alignNarrationReady(job)) {
    return;
  }
  const alignRun = (job.runs.align ?? []).find((run) => run.runId === alignRunId);
  if (!alignRun || alignRun.status === 'succeeded') {
    return;
  }
  upsertRun(job, 'align', alignRunId, {
    status: 'succeeded',
    finishedAt: alignRun.finishedAt ?? nowIso(),
    error: undefined,
    errorCode: undefined,
    errorTitle: undefined,
    errorHint: undefined,
  });
  job.status = 'failed';
  saveJob(job);
}

function formatVoxcpmTrialError(error: unknown, alignDir: string): {
  error: string;
  errorCode: PipelineErrorCode;
  errorTitle: string;
  errorHint?: string;
} {
  const fields = formatPipelineErrorFromRunDir('align', error, alignDir);
  const raw = error instanceof Error ? error.message : String(error);
  const unreachable =
    raw.includes('VoxCPM server not reachable') ||
    raw.includes(':8791') ||
    raw.toLowerCase().includes('connection refused');
  return {
    ...fields,
    errorTitle: 'VoxCPM narration failed',
    errorHint: unreachable
      ? 'On Mac run npm run outdoor:all — VoxCPM must be up on :8791 before generating. Wait ~30s after outdoor:all starts, then retry.'
      : fields.errorHint,
  };
}

export async function retryVoxcpmCompositeJob(jobId: string): Promise<OutdoorJob> {
  const job = loadJob(jobId);
  if (!job) {
    throw new Error(`Job not found: ${jobId}`);
  }
  if (!job.takeId.startsWith('take-voxcpm-')) {
    throw new Error('Composite retry is only for AI clone (take-voxcpm-*) jobs');
  }
  repairAlignRunIfNarrationReady(job);
  if (!alignNarrationReady(job)) {
    throw new Error(
      'Narration wav is missing — finish step 1 or use Re-synthesize voice (not composite rerun).',
    );
  }
  job.status = 'running';
  saveJob(job);
  appendTakeAgentLog(job.scriptId, job.takeId, 'Remotion composite retry (preview only, no VoxCPM)');
  try {
    await runStage(jobId, 'composite', { rerun: true });
  } catch (error) {
    appendTakeAgentLog(
      job.scriptId,
      job.takeId,
      `Remotion composite retry failed: ${error instanceof Error ? error.message : String(error)}`,
    );
    throw error;
  }
  const refreshed = loadJob(jobId);
  if (!refreshed) {
    throw new Error(`Job not found after composite retry: ${jobId}`);
  }
  return refreshed;
}

export async function retryVoxcpmTrialJob(
  jobId: string,
  options: VoxcpmTrialOptions = {},
): Promise<OutdoorJob> {
  const job = loadJob(jobId);
  if (!job) {
    throw new Error(`Job not found: ${jobId}`);
  }
  if (!job.takeId.startsWith('take-voxcpm-')) {
    throw new Error('Retry is only for AI clone (take-voxcpm-*) jobs');
  }

  const resynthesizeVoice =
    options.resynthesizeVoice === true || options.renderComposite === false;
  if (!resynthesizeVoice) {
    return retryVoxcpmCompositeJob(jobId);
  }

  job.status = 'running';
  saveJob(job);
  appendTakeAgentLog(job.scriptId, job.takeId, 'VoxCPM voice re-synthesis requested');
  await runVoxcpmTrialJob(job, options);
  const refreshed = loadJob(jobId);
  if (!refreshed) {
    throw new Error(`Job not found after retry: ${jobId}`);
  }
  return refreshed;
}
