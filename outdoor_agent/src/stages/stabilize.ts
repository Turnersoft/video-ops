import path from 'node:path';

import { fileExists } from '../fs_util.ts';
import { ensureDir, takeStageRunDir } from '../paths.ts';
import { runCommand } from '../subprocess.ts';
import type { OutdoorJob } from '../schema.ts';
import { artifactUrl, runStageWorker } from './util.ts';

/** Stabilized video from a completed stabilize run, if present. */
export function stabilizedVideoForJob(job: OutdoorJob): string | null {
  const runId = job.selectedRuns.stabilize;
  if (!runId) {
    return null;
  }
  const candidate = path.join(
    takeStageRunDir(job.scriptId, job.takeId, 'stabilize', runId),
    'stabilized.mp4',
  );
  return fileExists(candidate) ? candidate : null;
}

export async function runStabilizeStage(
  job: OutdoorJob,
  runId: string,
): Promise<Record<string, string>> {
  const outDir = takeStageRunDir(job.scriptId, job.takeId, 'stabilize', runId);
  ensureDir(outDir);

  return runStageWorker(job, 'stabilize', runId, async (report) => {
    const input = job.sourceVideoPath;
    if (!fileExists(input)) {
      throw new Error(`Source video missing: ${input}`);
    }

    const transformsPath = path.join(outDir, 'transforms.trf');
    const outputPath = path.join(outDir, 'stabilized.mp4');

    report({ percent: 10, message: 'Analyzing shake (vidstab pass 1)' });
    await runCommand(
      'ffmpeg',
      [
        '-y',
        '-hide_banner',
        '-loglevel',
        'warning',
        '-i',
        input,
        '-vf',
        `vidstabdetect=shakiness=5:accuracy=15:result=${transformsPath}`,
        '-f',
        'null',
        '-',
      ],
      { abortKey: job.jobId },
    );

    report({ percent: 55, message: 'Applying stabilization (vidstab pass 2)' });
    await runCommand(
      'ffmpeg',
      [
        '-y',
        '-hide_banner',
        '-loglevel',
        'warning',
        '-i',
        input,
        '-vf',
        `vidstabtransform=input=${transformsPath}:smoothing=30:zoom=5:interpol=bilinear,unsharp=5:5:0.8:3:3:0.4`,
        '-c:v',
        'libx264',
        '-preset',
        'fast',
        '-crf',
        '18',
        '-c:a',
        'copy',
        outputPath,
      ],
      { abortKey: job.jobId },
    );

    if (!fileExists(outputPath)) {
      throw new Error('Stabilized video was not created');
    }

    report({ percent: 90, message: 'Stabilization complete' });
    return {
      stabilizedVideo: outputPath,
      transforms: transformsPath,
      previewUrl: artifactUrl(job.scriptId, job.takeId, 'stabilize', runId, 'stabilized.mp4'),
    };
  });
}
