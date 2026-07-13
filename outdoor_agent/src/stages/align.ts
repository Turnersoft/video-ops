import path from 'node:path';

import type { TakeManifest } from '../../../ios-teleprompter/src/scriptSchema.ts';
import { copyFile, fileExists, readJson, writeJson } from '../fs_util.ts';
import { ensureOutdoorScriptPath } from '../outdoor-script.ts';
import { ensureDir, takeStageRunDir } from '../paths.ts';
import { runOutdoorPost } from '../subprocess.ts';
import type { OutdoorJob } from '../schema.ts';
import { alignFromSlideEvents, slideEventsAreSufficient } from './align-from-slides.ts';
import type { TranscriptVerbose } from '../../../outdoor_post/src/sentence-captions.ts';
import { syncOutdoorEditToAnimation } from '../sync-outdoor-animation.ts';
import { artifactUrl, runStageWorker } from './util.ts';

type VisualPlan = {
  timeline?: Array<{
    slideId: string;
    editedStart?: number;
    editedEnd?: number;
  }>;
};

type AlignStageOptions = {
  mode?: 'slides' | 'asr';
};

export async function runAlignStage(
  job: OutdoorJob,
  runId: string,
  options: AlignStageOptions = {},
): Promise<Record<string, string>> {
  const outDir = takeStageRunDir(job.scriptId, job.takeId, 'align', runId);
  ensureDir(outDir);

  const cutRunId = job.selectedRuns.cut;
  if (!cutRunId) {
    throw new Error('Align requires a selected cut run');
  }
  const cutDir = takeStageRunDir(job.scriptId, job.takeId, 'cut', cutRunId);
  const editedVideo = path.join(cutDir, 'edited-good-intervals.mp4');
  if (!fileExists(editedVideo)) {
    throw new Error('Cut edited video missing — re-run cut stage');
  }
  const cutVisualPlanPath = path.join(cutDir, 'remotion-visual-plan.json');

  return runStageWorker(job, 'align', runId, async (report) => {
    const take = readJson<TakeManifest>(job.takeManifestPath);
    copyFile(editedVideo, path.join(outDir, 'edited-good-intervals.mp4'));
    if (fileExists(cutVisualPlanPath)) {
      copyFile(cutVisualPlanPath, path.join(outDir, 'remotion-visual-plan.json'));
    }
    const useSlides =
      options.mode === 'asr'
        ? false
        : options.mode === 'slides'
          ? true
          : slideEventsAreSufficient(take, job.scriptId);

    if (useSlides) {
      report({ percent: 20, message: 'Aligning from on-device slide markers' });
      await ensureOutdoorScriptPath(job.scriptId);
      const visualPlan = fileExists(path.join(outDir, 'remotion-visual-plan.json'))
        ? readJson<VisualPlan>(path.join(outDir, 'remotion-visual-plan.json'))
        : { timeline: [] };
      const transcriptPath = path.join(cutDir, 'transcript.verbose.json');
      const analysisPath = path.join(cutDir, 'analysis.json');
      if (fileExists(transcriptPath)) {
        copyFile(transcriptPath, path.join(outDir, 'transcript.verbose.json'));
      }
      const transcript: TranscriptVerbose | undefined = fileExists(transcriptPath)
        ? readJson(transcriptPath) as TranscriptVerbose
        : undefined;
      let goodIntervals: Array<{ start: number; end: number }> = [];
      if (fileExists(analysisPath)) {
        const analysis = readJson<{
          appliedGoodIntervals?: Array<{ start: number; end: number }>;
          goodIntervals?: Array<{ start: number; end: number }>;
          baselineGoodIntervals?: Array<{ start: number; end: number }>;
        }>(analysisPath);
        goodIntervals =
          analysis.appliedGoodIntervals ??
          analysis.goodIntervals ??
          analysis.baselineGoodIntervals ??
          [];
        writeJson(path.join(outDir, 'cut-good-intervals.json'), goodIntervals);
      }
      alignFromSlideEvents({
        job,
        outDir,
        editedVideo,
        take,
        visualPlan,
        transcript,
        goodIntervals,
      });
    } else {
      report({ percent: 20, message: 'Aligning speech to beats (ASR)' });
      copyFile(editedVideo, path.join(outDir, 'edited-good-intervals.mp4'));
      const analysisPath = path.join(cutDir, 'analysis.json');
      if (fileExists(analysisPath)) {
        const analysis = readJson<{
          appliedGoodIntervals?: Array<{ start: number; end: number }>;
          goodIntervals?: Array<{ start: number; end: number }>;
          baselineGoodIntervals?: Array<{ start: number; end: number }>;
        }>(analysisPath);
        const goodIntervals =
          analysis.appliedGoodIntervals ??
          analysis.goodIntervals ??
          analysis.baselineGoodIntervals ??
          [];
        writeJson(path.join(outDir, 'cut-good-intervals.json'), goodIntervals);
      }

      const args = [job.scriptId, '--edit-dir', outDir];
      await runOutdoorPost('align-speech-to-beats', args, { abortKey: job.jobId });
    }

    report({ percent: 95, message: 'Alignment artifacts written' });
    const outdoorAnimationPath = path.join(outDir, 'animation-outdoor.json');
    syncOutdoorEditToAnimation(job.scriptId, outdoorAnimationPath);
    writeJson(path.join(outDir, 'align-mode.json'), {
      mode: useSlides ? 'slides' : 'asr',
      generatedAt: new Date().toISOString(),
    });

    return {
      alignment: path.join(outDir, 'speech-alignment.json'),
      outdoorAnimation: path.join(outDir, 'animation-outdoor.json'),
      visualPlan: path.join(outDir, 'remotion-visual-plan.json'),
      previewUrl: artifactUrl(job.scriptId, job.takeId, 'align', runId, 'animation-outdoor.json'),
    };
  });
}
