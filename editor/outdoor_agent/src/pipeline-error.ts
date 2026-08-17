import { readStageRunLogTail } from './stage-run-log.ts';
import {
  STAGE_LABELS,
  PIPELINE_STAGES,
  type PipelineErrorCode,
  type PipelineStage,
  type StageRunSummary,
} from './schema.ts';

export type PipelineErrorInfo = {
  code: PipelineErrorCode;
  title: string;
  message: string;
  hint?: string;
  detail: string;
};

export type StageErrorFields = {
  error: string;
  errorCode: PipelineErrorCode;
  errorTitle: string;
  errorHint?: string;
};

export type { PipelineErrorCode };

export class PipelineError extends Error {
  readonly info: PipelineErrorInfo;

  constructor(info: PipelineErrorInfo) {
    super(info.message);
    this.name = 'PipelineError';
    this.info = info;
  }
}

function lastMeaningfulLogLine(logTail?: string | null): string | null {
  if (!logTail) {
    return null;
  }
  const lines = logTail.split('\n').reverse();
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('$')) {
      continue;
    }
    if (trimmed.startsWith('[stdout]') || trimmed.startsWith('[stderr]')) {
      const content = trimmed.replace(/^\[(stdout|stderr)\]\s*/, '').trim();
      if (content && !content.startsWith('Traceback')) {
        return content;
      }
    }
    if (trimmed.includes('Error:') || trimmed.includes('Exception:')) {
      return trimmed;
    }
    if (trimmed.length > 12) {
      return trimmed;
    }
  }
  return null;
}

function stripSubprocessNoise(raw: string): string {
  const denoMatch = raw.match(
    /deno run[^\n]+failed \(exit \d+\)/i,
  );
  if (denoMatch) {
    return denoMatch[0];
  }
  const nodeMatch = raw.match(/node [^\n]+failed \(exit \d+\)/i);
  if (nodeMatch) {
    return nodeMatch[0];
  }
  return raw.replace(/\s+/g, ' ').trim();
}

export function formatPipelineError(
  stage: PipelineStage,
  error: unknown,
  options: { logTail?: string | null } = {},
): PipelineErrorInfo {
  if (error instanceof PipelineError) {
    return error.info;
  }

  const raw = error instanceof Error ? error.message : String(error);
  const logTail = options.logTail ?? null;
  const combined = `${raw}\n${logTail ?? ''}`.toLowerCase();
  const detail = logTail ? `${raw}\n\n--- log tail ---\n${logTail}` : raw;
  const stageLabel = STAGE_LABELS[stage];
  const logLine = lastMeaningfulLogLine(logTail);

  if (combined.includes('cancelled from iphone') || raw === 'Pipeline cancelled') {
    return {
      code: 'cancelled',
      title: 'Pipeline aborted',
      message: 'Stopped from iPhone before this stage finished.',
      detail,
    };
  }

  if (combined.includes('outdoor script not found')) {
    const scriptMatch = raw.match(/for ([^\s]+)/);
    const scriptId = scriptMatch?.[1] ?? 'this script';
    return {
      code: 'missing_script',
      title: 'Script missing on Mac',
      message: `No outdoor script export for ${scriptId}.`,
      hint: 'Confirm animation.md exists, restart npm run outdoor:all, then retry Cut.',
      detail,
    };
  }

  if (
    combined.includes('openai_api_key') ||
    combined.includes('whisper') ||
    combined.includes('faster-whisper') ||
    combined.includes('transcrib') ||
    combined.includes('huggingface.co')
  ) {
    return {
      code: 'transcription',
      title: 'Speech transcription failed',
      message: logLine ?? 'Cut could not transcribe the take audio.',
      hint:
        'On Mac: export OPENAI_API_KEY for cloud Whisper, or fix network and install local Whisper (pip install faster-whisper).',
      detail,
    };
  }

  if (
    raw.includes('Align requires a selected cut run') ||
    raw.includes('Cut edited video missing') ||
    raw.includes('Composite requires a selected align run') ||
    raw.includes('No analysis.json for cut run')
  ) {
    return {
      code: 'missing_prerequisite',
      title: 'Earlier stage required',
      message: raw,
      hint: 'Retry the previous pipeline stage on Mac, or re-run the full pipeline.',
      detail,
    };
  }

  if (raw.includes('social-posts.json not found')) {
    return {
      code: 'missing_file',
      title: 'Social pack missing',
      message: raw,
      hint: 'Add projects/.../social-posts.json on the Mac before running Social.',
      detail,
    };
  }

  if (
    raw.includes('No compare beats in animation.json') ||
    raw.includes('animation has no compare beats') ||
    raw.includes('Missing compiled animation')
  ) {
    return {
      code: 'missing_file',
      title: 'Animation beats missing',
      message: raw,
      hint: 'Edit animation.md, then run: cd remotion && npm run sync -- --script <id>',
      detail,
    };
  }

  if (raw.includes('Source video not found') || raw.includes('take not found')) {
    return {
      code: 'missing_file',
      title: 'Take files missing',
      message: raw,
      hint: 'Re-export the take from iPhone or confirm source.mp4 is in the take folder.',
      detail,
    };
  }

  if (
    combined.includes('caption translate') ||
    combined.includes('caption-translate') ||
    combined.includes('translate-captions-local') ||
    combined.includes('CAPTION_TRANSLATE')
  ) {
    return {
      code: 'caption_translate',
      title: 'Chinese caption translation failed',
      message: logLine ?? 'Align could not translate spoken captions to Chinese.',
      hint:
        'Start npm run outdoor:all (local server on :8790), or set CAPTION_TRANSLATE_PYTHON to IndexTTS venv python. Optional cloud fallback: CAPTION_TRANSLATE_PROVIDER=openai + OPENAI_API_KEY.',
      detail,
    };
  }

  if (
    combined.includes('ssl') ||
    combined.includes('econnrefused') ||
    combined.includes('network') ||
    combined.includes('fetch failed')
  ) {
    return {
      code: 'network',
      title: 'Network error on Mac',
      message: logLine ?? stripSubprocessNoise(raw),
      hint: 'Check Mac internet, VPN, and that npm run outdoor:all is still running.',
      detail,
    };
  }

  if (
    stage === 'composite' &&
    (raw.includes('node ') || raw.includes('render-outdoor') || combined.includes('remotion'))
  ) {
    return {
      code: 'render',
      title: 'Remotion render failed',
      message: logLine ?? 'Composite render exited with an error.',
      hint: 'Open Remotion Studio on Mac, fix composition errors, then retry Composite.',
      detail,
    };
  }

  if (
    raw.includes('failed (exit') ||
    raw.includes('deno run') ||
    raw.startsWith('node ') ||
    raw.startsWith('ffmpeg ')
  ) {
    return {
      code: 'subprocess',
      title: `${stageLabel} failed`,
      message: logLine ?? stripSubprocessNoise(raw),
      hint: 'See the stage log below for the full command output.',
      detail,
    };
  }

  return {
    code: 'unknown',
    title: `${stageLabel} failed`,
    message: logLine ?? raw,
    hint: 'Check the stage log on Mac for details.',
    detail,
  };
}

export function stageErrorFields(
  stage: PipelineStage,
  error: unknown,
  options: { logTail?: string | null } = {},
): StageErrorFields {
  const info = formatPipelineError(stage, error, options);
  return {
    error: info.message,
    errorCode: info.code,
    errorTitle: info.title,
    errorHint: info.hint,
  };
}

export function stageErrorFieldsFromRun(
  stage: PipelineStage,
  run: StageRunSummary | undefined,
  logTail?: string | null,
): StageErrorFields | null {
  if (!run || (run.status !== 'failed' && run.status !== 'cancelled')) {
    return null;
  }
  if (run.errorTitle && run.errorCode && run.error) {
    return {
      error: run.error,
      errorCode: run.errorCode,
      errorTitle: run.errorTitle,
      errorHint: run.errorHint,
    };
  }
  return stageErrorFields(stage, new Error(run.error ?? 'Stage failed'), { logTail });
}

export function firstFailedStageError(
  job: { runs: Record<PipelineStage, StageRunSummary[]>; scriptId: string; takeId: string },
): (StageErrorFields & { stage: PipelineStage }) | null {
  const stages: PipelineStage[] = PIPELINE_STAGES;
  for (const stage of stages) {
    const run = job.runs[stage]?.[0];
    if (run?.status === 'failed' || run?.status === 'cancelled') {
      const fields = stageErrorFieldsFromRun(stage, run);
      if (fields) {
        return { stage, ...fields };
      }
    }
  }
  return null;
}

export function formatPipelineErrorFromRunDir(
  stage: PipelineStage,
  error: unknown,
  runDir: string,
): StageErrorFields {
  return stageErrorFields(stage, error, {
    logTail: readStageRunLogTail(runDir, 32),
  });
}

export function toPipelineError(stage: PipelineStage, error: unknown, logDir?: string): PipelineError {
  const logTail = logDir ? readStageRunLogTail(logDir, 32) : null;
  return new PipelineError(formatPipelineError(stage, error, { logTail }));
}
