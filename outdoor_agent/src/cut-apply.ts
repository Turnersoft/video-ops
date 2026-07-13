/**
 * Apply cut-selection.json to the selected cut run and rebuild edited video.
 */

import path from 'node:path';

import { fileExists } from './fs_util.ts';
import { ensureOutdoorScriptPath } from './outdoor-script.ts';
import { takeStageRunDir } from './paths.ts';
import type { OutdoorJob } from './schema.ts';
import { runOutdoorPost } from './subprocess.ts';
import { buildCutReview } from './cut-review.ts';
import { cutApplyVideoPath, recordCutApplyInput } from './pipeline-lineage.ts';
import { logStageRunEvent, setActiveStageLogDir } from './stage-run-log.ts';

export async function applyCutSelectionRun(job: OutdoorJob, runId: string): Promise<{
  review: ReturnType<typeof buildCutReview>;
  editedVideo: string;
}> {
  const outDir = takeStageRunDir(job.scriptId, job.takeId, 'cut', runId);
  const analysisPath = path.join(outDir, 'analysis.json');
  if (!fileExists(analysisPath)) {
    throw new Error(`No analysis.json for cut run ${runId}`);
  }
  const scriptPath = await ensureOutdoorScriptPath(job.scriptId);
  const inputVideo = cutApplyVideoPath(job);

  setActiveStageLogDir(outDir);
  logStageRunEvent(outDir, `Re-applying cut selection on ${inputVideo.endsWith('stabilized.mp4') ? 'stabilized' : 'source'} video`);
  try {
    await runOutdoorPost(
      'ai-edit',
      [
        '--apply-selection',
        '--video',
        inputVideo,
        '--script',
        scriptPath,
        '--take',
        job.takeManifestPath,
        '--out-dir',
        outDir,
      ],
      { abortKey: job.jobId, logDir: outDir },
    );
  } finally {
    setActiveStageLogDir(null);
  }

  const editedVideo = path.join(outDir, 'edited-good-intervals.mp4');
  recordCutApplyInput(job, runId, inputVideo);
  return {
    review: buildCutReview(job, runId),
    editedVideo,
  };
}
