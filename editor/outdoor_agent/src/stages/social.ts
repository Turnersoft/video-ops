import path from 'node:path';

import { fileExists, readJson, writeJson } from '../fs_util.ts';
import { ensureDir, scriptDirFor, takeStageRunDir } from '../paths.ts';
import type { OutdoorJob } from '../schema.ts';
import { runStageWorker } from './util.ts';

type SocialPosts = Record<string, unknown> & {
  titleEnglish?: string;
  titleChina?: string;
  title?: string;
  english?: Record<string, { title?: string; body?: string }>;
  china?: Record<string, { title?: string; body?: string }>;
  updatedAt?: string;
};

export type SocialPatch = {
  titleEnglish?: string;
  titleChina?: string;
  title?: string;
  english?: Record<string, { title?: string; body?: string }>;
  china?: Record<string, { title?: string; body?: string }>;
};

export async function runSocialStage(
  job: OutdoorJob,
  runId: string,
): Promise<Record<string, string>> {
  const outDir = takeStageRunDir(job.scriptId, job.takeId, 'social', runId);
  ensureDir(outDir);

  return runStageWorker(job, 'social', runId, async (report) => {
    report({ percent: 20, message: 'Loading social copy pack' });
    const sourcePath = path.join(scriptDirFor(job.scriptId), 'social-posts.json');
    if (!fileExists(sourcePath)) {
      throw new Error(`social-posts.json not found for ${job.scriptId}`);
    }

    const social = readJson<SocialPosts>(sourcePath);
    const snapshot = {
      ...social,
      jobId: job.jobId,
      takeId: job.takeId,
      scriptTitle: job.scriptTitle,
      packagedAt: new Date().toISOString(),
    };
    const outPath = path.join(outDir, 'social-posts.json');
    writeJson(outPath, snapshot);

    report({ percent: 90, message: 'Social pack ready for review' });
    return {
      socialPosts: outPath,
    };
  });
}

export function patchSocialPosts(socialPostsPath: string, patch: SocialPatch): SocialPosts {
  const social = readJson<SocialPosts>(socialPostsPath);

  if (typeof patch.titleEnglish === 'string') {
    social.titleEnglish = patch.titleEnglish;
  }
  if (typeof patch.titleChina === 'string') {
    social.titleChina = patch.titleChina;
  }
  if (typeof patch.title === 'string') {
    social.title = patch.title;
  }

  for (const group of ['english', 'china'] as const) {
    const platforms = patch[group];
    if (!platforms || typeof platforms !== 'object') {
      continue;
    }
    if (!social[group] || typeof social[group] !== 'object') {
      social[group] = {};
    }
    const groupRecord = social[group] as Record<string, Record<string, unknown>>;
    for (const [platform, fields] of Object.entries(platforms)) {
      if (!fields || typeof fields !== 'object') {
        continue;
      }
      if (!groupRecord[platform]) {
        groupRecord[platform] = {};
      }
      groupRecord[platform] = {
        ...groupRecord[platform],
        ...fields,
      };
    }
  }

  social.updatedAt = new Date().toISOString();
  writeJson(socialPostsPath, social);
  return social;
}
