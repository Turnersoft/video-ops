import path from 'node:path';

import { fileExists, readJson } from './fs_util.ts';
import { isStageStale, staleReason } from './pipeline-lineage.ts';
import {
  OUTDOOR_LANDSCAPE_MP4,
  OUTDOOR_PORTRAIT_MP4,
  outdoorCompositeMp4Path,
  takeStageRunDir,
} from './paths.ts';
import type { OutdoorJob, PipelineStage, RunStatus } from './schema.ts';
import { PIPELINE_STAGES } from './schema.ts';
import { artifactUrl } from './stages/util.ts';

export type SocialPostsPreview = {
  titleEnglish?: string;
  titleChina?: string;
  title?: string;
  english?: Record<string, { title?: string; body?: string }>;
  china?: Record<string, { title?: string; body?: string }>;
  updatedAt?: string;
};

export type StageResultPreview = {
  stage: PipelineStage;
  runId: string | null;
  status: RunStatus | 'pending';
  videos: Array<{ label: string; url: string }>;
  summary: string[];
  socialTitles: Array<{ group: string; platform: string; title: string; body?: string }>;
  social?: SocialPostsPreview | null;
  stale: boolean;
  staleReason: string | null;
};

export type JobResultsPreview = {
  jobId: string;
  scriptId: string;
  takeId: string;
  stages: StageResultPreview[];
};

type SocialPostsFile = SocialPostsPreview;

type AlignFile = {
  editedDurationSeconds?: number;
  matchCount?: number;
  scriptWordCount?: number;
  spokenWordCount?: number;
  beatDurationsSeconds?: number[];
};

function selectedRun(job: OutdoorJob, stage: PipelineStage) {
  const runId = job.selectedRuns[stage] ?? job.runs[stage]?.[0]?.runId ?? null;
  const run = runId
    ? job.runs[stage]?.find((entry) => entry.runId === runId) ?? job.runs[stage]?.[0]
    : undefined;
  return { runId, run };
}

function videoIfExists(
  job: OutdoorJob,
  stage: PipelineStage,
  runId: string,
  fileName: string,
  label: string,
): { label: string; url: string } | null {
  const filePath = path.join(takeStageRunDir(job.scriptId, job.takeId, stage, runId), fileName);
  if (!fileExists(filePath)) {
    return null;
  }
  return {
    label,
    url: artifactUrl(job.scriptId, job.takeId, stage, runId, fileName),
  };
}

function buildSocialTitles(social: SocialPostsFile): StageResultPreview['socialTitles'] {
  const titles: StageResultPreview['socialTitles'] = [];
  if (social.titleEnglish) {
    titles.push({ group: 'headline', platform: 'EN', title: social.titleEnglish });
  }
  if (social.titleChina) {
    titles.push({ group: 'headline', platform: 'ZH', title: social.titleChina });
  }
  if (social.title && !social.titleEnglish) {
    titles.push({ group: 'headline', platform: 'title', title: social.title });
  }
  for (const [group, platforms] of [
    ['english', social.english],
    ['china', social.china],
  ] as const) {
    if (!platforms) {
      continue;
    }
    for (const [platform, fields] of Object.entries(platforms)) {
      if (fields?.title) {
        titles.push({
          group,
          platform,
          title: fields.title,
          body: fields.body,
        });
      }
    }
  }
  return titles;
}

function buildStageResult(job: OutdoorJob, stage: PipelineStage): StageResultPreview {
  const { runId, run } = selectedRun(job, stage);
  const status: RunStatus | 'pending' = run?.status ?? 'pending';
  const videos: StageResultPreview['videos'] = [];
  const summary: string[] = [];
  let socialTitles: StageResultPreview['socialTitles'] = [];
  let social: SocialPostsPreview | null = null;

  if (!runId) {
    return {
      stage,
      runId: null,
      status: 'pending',
      videos,
      summary,
      socialTitles,
      social,
      stale: false,
      staleReason: null,
    };
  }

  if (stage === 'stabilize') {
    const video = videoIfExists(job, 'stabilize', runId, 'stabilized.mp4', 'Stabilized');
    if (video) {
      videos.push(video);
    }
    summary.push(`run ${runId}`);
  }

  if (stage === 'cut') {
    const video = videoIfExists(job, 'cut', runId, 'edited-good-intervals.mp4', 'Edited cut');
    if (video) {
      videos.push(video);
    }
    summary.push(`run ${runId}`);
  }

  if (stage === 'align') {
    const video = videoIfExists(job, 'align', runId, 'edited-good-intervals.mp4', 'Aligned source');
    if (video) {
      videos.push(video);
    }
    const alignPath = path.join(
      takeStageRunDir(job.scriptId, job.takeId, 'align', runId),
      'speech-alignment.json',
    );
    if (fileExists(alignPath)) {
      const align = readJson<AlignFile>(alignPath);
      if (typeof align.editedDurationSeconds === 'number') {
        summary.push(`duration ${align.editedDurationSeconds.toFixed(1)}s`);
      }
      if (typeof align.matchCount === 'number') {
        summary.push(`${align.matchCount} word matches`);
      }
      if (typeof align.scriptWordCount === 'number' && typeof align.spokenWordCount === 'number') {
        summary.push(`script ${align.scriptWordCount} / spoken ${align.spokenWordCount}`);
      }
      if (Array.isArray(align.beatDurationsSeconds) && align.beatDurationsSeconds.length) {
        summary.push(
          `beats ${align.beatDurationsSeconds.map((value) => value.toFixed(1)).join(' · ')}s`,
        );
      }
    }
  }

  if (stage === 'composite') {
    const compositeDir = takeStageRunDir(job.scriptId, job.takeId, 'composite', runId);
    const portrait = videoIfExists(
      job,
      'composite',
      runId,
      path.basename(outdoorCompositeMp4Path(compositeDir, job.scriptId, 'portrait')) ||
        OUTDOOR_PORTRAIT_MP4,
      'Portrait',
    );
    const landscape = videoIfExists(
      job,
      'composite',
      runId,
      path.basename(outdoorCompositeMp4Path(compositeDir, job.scriptId, 'landscape')) ||
        OUTDOOR_LANDSCAPE_MP4,
      'Landscape',
    );
    if (portrait) {
      videos.push(portrait);
    }
    if (landscape) {
      videos.push(landscape);
    }
    summary.push(`run ${runId}`);
  }

  if (stage === 'social') {
    const socialPath = path.join(
      takeStageRunDir(job.scriptId, job.takeId, 'social', runId),
      'social-posts.json',
    );
    if (fileExists(socialPath)) {
      social = readJson<SocialPostsFile>(socialPath);
      socialTitles = buildSocialTitles(social);
      summary.push(`${socialTitles.length} titles`);
    }
  }

  return {
    stage,
    runId,
    status,
    videos,
    summary,
    socialTitles,
    social,
    stale: isStageStale(job, stage),
    staleReason: staleReason(job, stage),
  };
}

export function buildJobResults(job: OutdoorJob): JobResultsPreview {
  return {
    jobId: job.jobId,
    scriptId: job.scriptId,
    takeId: job.takeId,
    stages: PIPELINE_STAGES.map((stage) => buildStageResult(job, stage)),
  };
}
