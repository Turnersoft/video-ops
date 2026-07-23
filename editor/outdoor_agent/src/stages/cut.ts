import path from 'node:path';

import { ensureOutdoorScriptPath } from '../outdoor-script.ts';
import { fileExists } from '../fs_util.ts';
import { cutInputVideoPath } from '../pipeline-lineage.ts';
import { ensureDir, takeStageRunDir } from '../paths.ts';
import { runOutdoorPost } from '../subprocess.ts';
import type { OutdoorJob } from '../schema.ts';
import { artifactUrl, runStageWorker } from './util.ts';

function cutInputVideo(job: OutdoorJob): string {
  return cutInputVideoPath(job);
}

export async function runCutStage(job: OutdoorJob, runId: string): Promise<Record<string, string>> {
  const outDir = takeStageRunDir(job.scriptId, job.takeId, 'cut', runId);
  ensureDir(outDir);

  return runStageWorker(job, 'cut', runId, async (report) => {
    report({ percent: 5, message: 'Preparing cut inputs' });
    const scriptPath = await ensureOutdoorScriptPath(job.scriptId);

    const videoPath = cutInputVideo(job);
    if (!fileExists(videoPath)) {
      throw new Error(`Cut input video missing: ${videoPath}`);
    }

    const args = [
      '--video',
      videoPath,
      '--script',
      scriptPath,
      '--take',
      job.takeManifestPath,
      '--out-dir',
      outDir,
    ];

    report({ percent: 15, message: 'Transcribing speech and detecting bad takes' });
    await runOutdoorPost('ai-edit', args, { abortKey: job.jobId });

    report({ percent: 90, message: 'Cut complete' });
    const editedVideo = path.join(outDir, 'edited-good-intervals.mp4');
    const stabilizeRunId = job.selectedRuns.stabilize ?? '';
    return {
      editedVideo,
      analysis: path.join(outDir, 'analysis.json'),
      visualPlan: path.join(outDir, 'remotion-visual-plan.json'),
      transcript: path.join(outDir, 'transcript.verbose.json'),
      inputVideo: videoPath,
      stabilizeRunId,
      previewUrl: artifactUrl(job.scriptId, job.takeId, 'cut', runId, 'edited-good-intervals.mp4'),
    };
  });
}
