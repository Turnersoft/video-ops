import type { BeatPosterPublishRecord } from '../types';
import type { PublishErrorDetails } from './outdoorApiErrorDetails';

export type BeatPosterPublishPhase =
  | 'idle'
  | 'preparing'
  | 'uploading'
  | 'submitting'
  | 'pending'
  | 'live'
  | 'failed'
  | 'manual';

export type PlatformPublishUi = {
  phase: BeatPosterPublishPhase;
  message?: string;
  error?: string;
  errorDetails?: PublishErrorDetails;
  postUrl?: string;
  postId?: string;
  updatedAt?: string;
};

export const AUTO_LIFECYCLE_STEPS: Array<{ phase: BeatPosterPublishPhase; label: string }> = [
  { phase: 'idle', label: 'Ready' },
  { phase: 'preparing', label: 'Prepare album' },
  { phase: 'uploading', label: 'Upload images' },
  { phase: 'submitting', label: 'Submit post' },
  { phase: 'pending', label: 'Platform queue' },
  { phase: 'live', label: 'Live' },
];

export const MANUAL_LIFECYCLE_STEPS: Array<{ phase: BeatPosterPublishPhase; label: string }> = [
  { phase: 'idle', label: 'Draft' },
  { phase: 'manual', label: 'Copy & upload manually' },
];

export function platformPublishKey(platform: string, lang: string): string {
  return `${platform}:${lang}`;
}

export function resolvePlatformPublishUi(params: {
  publishMode: 'auto' | 'manual';
  ui: PlatformPublishUi | null | undefined;
  record: BeatPosterPublishRecord | null | undefined;
  lastError?: string | null;
}): PlatformPublishUi {
  const { publishMode, ui, record, lastError } = params;

  if (ui && ui.phase !== 'idle' && !record) {
    if (ui.phase === 'failed' || ['preparing', 'uploading', 'submitting'].includes(ui.phase)) {
      return ui;
    }
  }

  if (record) {
    const phase: BeatPosterPublishPhase = record.status === 'live'
      ? 'live'
      : record.status === 'pending'
        ? 'pending'
        : record.status === 'failed'
          ? 'failed'
          : 'pending';
    return {
      phase,
      message: record.status === 'live'
        ? 'Published to platform'
        : record.status === 'pending'
          ? 'In Postiz queue — platform may take minutes. Revert to cancel and retry.'
          : 'Publish recorded',
      postUrl: record.url,
      postId: record.postId,
      updatedAt: record.publishedAt,
      error: record.error,
      errorDetails: record.error
        ? { summary: record.error, details: record.error, platform: record.platform }
        : undefined,
    };
  }

  if (lastError) {
    return {
      phase: 'failed',
      error: lastError,
      message: 'Publish failed',
      errorDetails: { summary: lastError, details: lastError },
    };
  }

  if (publishMode === 'manual') {
    return { phase: 'manual', message: 'Copy caption and upload PNG album manually' };
  }

  return { phase: 'idle', message: 'Ready to publish' };
}

export function lifecycleStepIndex(
  steps: Array<{ phase: BeatPosterPublishPhase; label: string }>,
  phase: BeatPosterPublishPhase,
): number {
  if (phase === 'failed') {
    return Math.max(0, steps.findIndex((step) => step.phase === 'submitting'));
  }
  if (phase === 'live') {
    return steps.length - 1;
  }
  if (phase === 'pending') {
    return Math.max(0, steps.findIndex((step) => step.phase === 'pending'));
  }
  if (phase === 'submitting') {
    return Math.max(0, steps.findIndex((step) => step.phase === 'submitting'));
  }
  if (phase === 'uploading') {
    return Math.max(0, steps.findIndex((step) => step.phase === 'uploading'));
  }
  if (phase === 'preparing') {
    return Math.max(0, steps.findIndex((step) => step.phase === 'preparing'));
  }
  if (phase === 'manual') {
    return steps.length - 1;
  }
  return 0;
}

export function isPublishPhaseActive(phase: BeatPosterPublishPhase): boolean {
  return phase === 'preparing' || phase === 'uploading' || phase === 'submitting';
}
