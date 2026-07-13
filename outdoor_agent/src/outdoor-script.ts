/**
 * Materialize outdoor-script JSON for pipeline stages (cut / align).
 * animation.md-first: export JSON is generated on demand from live script.
 */

import path from 'node:path';

import { buildLiveScript } from './live-script.ts';
import { fileExists, writeJson } from './fs_util.ts';
import { PipelineError, type PipelineErrorInfo } from './pipeline-error.ts';
import {
  animationMdPath,
  ensureDir,
  outdoorScriptPath,
  scriptDirFor,
  VIDEO_OPS_ROOT,
} from './paths.ts';

type OutdoorScriptExport = {
  id: string;
  title: string;
  language?: string;
  countdownSeconds?: number;
  slides: Array<{
    id: string;
    title: string;
    body?: string;
    durationSeconds?: number;
    leanCode?: string;
    turnCode?: string;
    notes?: string;
  }>;
};

export async function ensureOutdoorScriptPath(scriptId: string): Promise<string> {
  const configured = outdoorScriptPath(scriptId);
  if (fileExists(configured)) {
    return configured;
  }

  const dir = scriptDirFor(scriptId);
  const hasAnimation =
    fileExists(animationMdPath(scriptId)) || fileExists(path.join(dir, 'animation.json'));

  if (hasAnimation) {
    const live = await buildLiveScript(scriptId);
    if (!live) {
      throw new PipelineError({
        code: 'missing_script',
        title: 'Script missing on Mac',
        message: `No animation source for ${scriptId}.`,
        hint: 'Add animation.md under the script folder and restart npm run outdoor:all.',
        detail: scriptId,
      } satisfies PipelineErrorInfo);
    }
    const exportPath = path.join(dir, 'export', `${scriptId}-outdoor-script.json`);
    const outdoor: OutdoorScriptExport = {
      id: live.id,
      title: live.title,
      language: live.language,
      countdownSeconds: live.countdownSeconds,
      slides: live.slides,
    };
    ensureDir(path.join(dir, 'export'));
    writeJson(exportPath, outdoor);
    return exportPath;
  }

  const teleprompterPath = path.join(
    VIDEO_OPS_ROOT,
    'ios-teleprompter/assets/scripts',
    `${scriptId}.json`,
  );
  if (fileExists(teleprompterPath)) {
    return teleprompterPath;
  }

  throw new PipelineError({
    code: 'missing_script',
    title: 'Script missing on Mac',
    message: `No outdoor script for ${scriptId}.`,
    hint: 'Bundle a teleprompter JSON or add animation.md on the Mac.',
    detail: scriptId,
  } satisfies PipelineErrorInfo);
}
