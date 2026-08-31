import path from 'node:path';

import {
  buildNewAccountPublishPlan,
  isPublishPlanPlatform,
  type NewAccountPublishPlan,
  type PublishPlanEpisodeInput,
  type PublishPlanLang,
} from '../../../src/publishPlan.ts';
import { scanVideoOpsCatalog } from './catalog.ts';
import { fileExists, readJson, writeJson } from './fs_util.ts';
import { ensureDir, scriptBeatPosterPngPath, scriptBeatPostersDir, VIDEO_OPS_ROOT } from './paths.ts';

const PLANS_DIR = path.join(VIDEO_OPS_ROOT, 'editor', 'outdoor_agent', 'data', 'publish-plans');

type SocialPostsFile = {
  titleEnglish?: string;
  titleChina?: string;
  title?: string;
};

export type BuildPublishPlanQuery = {
  seriesId?: string;
  platform?: string;
  lang?: string;
  replicaCount?: number;
};

export function parseLang(value: string | undefined): PublishPlanLang {
  return value === 'en' ? 'en' : 'zh';
}

function parseReplicaCount(value: number | undefined): number {
  if (!value || !Number.isFinite(value)) {
    return 1;
  }
  return Math.max(1, Math.min(Math.floor(value), 40));
}

export function episodeTitle(
  scriptId: string,
  catalogTitle: string,
  lang: PublishPlanLang,
  socialPath: string | null,
): string {
  if (socialPath && fileExists(socialPath)) {
    try {
      const social = readJson<SocialPostsFile>(socialPath);
      if (lang === 'zh' && social.titleChina?.trim()) {
        return social.titleChina.trim();
      }
      if (lang === 'en' && social.titleEnglish?.trim()) {
        return social.titleEnglish.trim();
      }
      if (social.title?.trim() && social.title !== scriptId) {
        return social.title.trim();
      }
    } catch {
      // fall through
    }
  }
  return catalogTitle || scriptId;
}

export function infographicReadiness(scriptId: string, lang: PublishPlanLang): {
  ready: boolean;
  blockers: string[];
} {
  const dir = scriptBeatPostersDir(scriptId);
  const blockers: string[] = [];
  if (!fileExists(dir)) {
    blockers.push('No beat-posters folder');
    return { ready: false, blockers };
  }
  const nestedCover = scriptBeatPosterPngPath(scriptId, 'cover', lang);
  const flatCover = path.join(dir, `cover-${lang}.png`);
  if (!fileExists(nestedCover) && !fileExists(flatCover)) {
    blockers.push(`Missing cover PNG for ${lang}`);
  }
  const manifest = path.join(dir, 'manifest.json');
  if (!fileExists(manifest)) {
    blockers.push('Missing beat-posters/manifest.json');
  }
  return { ready: blockers.length === 0, blockers };
}

export function videoReadiness(takes: Array<{ hasPortrait?: boolean; hasLandscape?: boolean }>): {
  ready: boolean;
  blockers: string[];
} {
  const hasVideo = takes.some((take) => take.hasPortrait || take.hasLandscape);
  if (hasVideo) {
    return { ready: true, blockers: [] };
  }
  return { ready: false, blockers: ['No composite video on any take'] };
}

export function buildCatalogNewAccountPlan(
  query: BuildPublishPlanQuery,
): NewAccountPublishPlan {
  const lang = parseLang(query.lang);
  const platform = query.platform && isPublishPlanPlatform(query.platform)
    ? query.platform
    : 'any';
  const seriesId = query.seriesId?.trim() || 'all';
  const catalog = scanVideoOpsCatalog();
  const episodes: PublishPlanEpisodeInput[] = [];

  for (const series of catalog.series) {
    for (const episode of series.episodes) {
      const socialPath = episode.paths?.socialPosts ?? null;
      const infographic = infographicReadiness(episode.scriptId, lang);
      const video = videoReadiness(episode.takes);
      const captionBlockers: string[] = [];
      if (!episode.hasSocialPosts) {
        captionBlockers.push('No social-posts.json captions');
      }
      episodes.push({
        seriesId: series.id,
        seriesTitle: series.title,
        scriptId: episode.scriptId,
        episodeTitle: episodeTitle(episode.scriptId, episode.title, lang, socialPath),
        infographicReady: infographic.ready && captionBlockers.length === 0,
        infographicBlockers: [...infographic.blockers, ...captionBlockers],
        videoReady: video.ready && captionBlockers.length === 0,
        videoBlockers: [...video.blockers, ...captionBlockers],
      });
    }
  }

  return buildNewAccountPublishPlan({
    seriesId,
    platform,
    lang,
    replicaCount: parseReplicaCount(query.replicaCount),
    episodes,
  });
}

export function listSavedPublishPlans(): Array<{ id: string; path: string }> {
  if (!fileExists(PLANS_DIR)) {
    return [];
  }
  const out: Array<{ id: string; path: string }> = [];
  for (const entry of Deno.readDirSync(PLANS_DIR)) {
    if (!entry.isFile || !entry.name.endsWith('.json')) {
      continue;
    }
    out.push({
      id: entry.name.replace(/\.json$/i, ''),
      path: path.join(PLANS_DIR, entry.name),
    });
  }
  return out.sort((left, right) => left.id.localeCompare(right.id));
}

export function saveNewAccountPublishPlan(plan: NewAccountPublishPlan): {
  id: string;
  path: string;
} {
  ensureDir(PLANS_DIR);
  const stamp = plan.createdAt.replace(/[:.]/g, '-');
  const id = `${plan.seriesId}-${plan.lang}-${plan.platform}-${stamp}`;
  const filePath = path.join(PLANS_DIR, `${id}.json`);
  writeJson(filePath, plan);
  return { id, path: filePath };
}
