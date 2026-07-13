import path from 'node:path';

import { copyFile, fileExists } from '../fs_util.ts';
import { ensureDir, takeStageRunDir, VIDEO_OPS_ROOT } from '../paths.ts';
import { runNode } from '../subprocess.ts';
import type { OutdoorJob } from '../schema.ts';
import { artifactUrl, runStageWorker } from './util.ts';

export async function runCompositeStage(
  job: OutdoorJob,
  runId: string,
): Promise<Record<string, string>> {
  const outDir = takeStageRunDir(job.scriptId, job.takeId, 'composite', runId);
  ensureDir(outDir);

  const alignRunId = job.selectedRuns.align;
  if (!alignRunId) {
    throw new Error('Composite requires a selected align run');
  }
  const alignDir = takeStageRunDir(job.scriptId, job.takeId, 'align', alignRunId);

  return runStageWorker(job, 'composite', runId, async (report) => {
    report({ percent: 10, message: 'Copying alignment artifacts' });
    for (const fileName of [
      'edited-good-intervals.mp4',
      'speech-alignment.json',
      'animation-outdoor.json',
      'remotion-visual-plan.json',
      'transcript.verbose.json',
    ]) {
      const source = path.join(alignDir, fileName);
      if (fileExists(source)) {
        copyFile(source, path.join(outDir, fileName));
      }
    }

    const cutRunId = job.selectedRuns.cut;
    if (cutRunId) {
      const cutVideo = path.join(
        takeStageRunDir(job.scriptId, job.takeId, 'cut', cutRunId),
        'edited-good-intervals.mp4',
      );
      if (fileExists(cutVideo) && !fileExists(path.join(outDir, 'edited-good-intervals.mp4'))) {
        copyFile(cutVideo, path.join(outDir, 'edited-good-intervals.mp4'));
      }
    }

    report({ percent: 25, message: 'Rendering portrait + landscape' });
    const args = [
      path.join(VIDEO_OPS_ROOT, 'remotion/scripts/render-outdoor.mjs'),
      job.scriptId,
      '--edit-dir',
      outDir,
      '--format',
      'both',
    ];
    await runNode(args, { abortKey: job.jobId });

    const portrait = path.join(outDir, `${job.scriptId}-outdoor-portrait.mp4`);
    const landscape = path.join(outDir, `${job.scriptId}-outdoor-landscape.mp4`);
    report({ percent: 95, message: 'Composite renders complete' });

    return {
      portrait,
      landscape,
      manifest: path.join(outDir, 'outdoor-manifest.json'),
      portraitUrl: artifactUrl(
        job.scriptId,
        job.takeId,
        'composite',
        runId,
        `${job.scriptId}-outdoor-portrait.mp4`,
      ),
      landscapeUrl: artifactUrl(
        job.scriptId,
        job.takeId,
        'composite',
        runId,
        `${job.scriptId}-outdoor-landscape.mp4`,
      ),
    };
  });
}
