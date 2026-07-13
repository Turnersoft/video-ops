import path from 'node:path';

import { fileExists, readJson, writeJson } from './fs_util.ts';
import { loadJob } from './job-store.ts';
import {
  coversIndexPath,
  ensureDir,
  takeCoversDir,
  takeStageRunDir,
} from './paths.ts';
import { newRunId, nowIso } from './schema.ts';
import { runCommand } from './subprocess.ts';

export type CoverSource = 'browser' | 'iphone' | 'import' | 'duplicate' | 'composite';

export type CoverMeta = {
  id: string;
  label: string;
  createdAt: string;
  source: CoverSource;
  fileName: string;
  contentType?: string;
  width?: number;
  height?: number;
};

export type CoverIndexEntry = {
  id: string;
  label: string;
  path: string;
};

export type CoversIndex = {
  schemaVersion: 1;
  covers: CoverIndexEntry[];
  platformCovers: Record<string, string>;
};

export type CoverListItem = CoverIndexEntry & {
  meta: CoverMeta;
  url: string;
  usedBy: string[];
};

export type CoversListResponse = {
  covers: CoverListItem[];
  platformCovers: Record<string, string>;
};

export type PlatformMapPatch = {
  platformCovers?: Record<string, string | null>;
  batch?: {
    group: 'english' | 'china';
    coverId: string | null;
    platforms: string[];
  };
};

function emptyIndex(): CoversIndex {
  return {
    schemaVersion: 1,
    covers: [],
    platformCovers: {},
  };
}

function resolveJobTake(jobId: string): { scriptId: string; takeId: string } {
  const job = loadJob(jobId);
  if (!job) {
    throw new Error(`Job not found: ${jobId}`);
  }
  return { scriptId: job.scriptId, takeId: job.takeId };
}

export function loadCoversIndex(scriptId: string, takeId: string): CoversIndex {
  const indexPath = coversIndexPath(scriptId, takeId);
  if (!fileExists(indexPath)) {
    return emptyIndex();
  }
  const raw = readJson<Partial<CoversIndex>>(indexPath);
  return {
    schemaVersion: 1,
    covers: Array.isArray(raw.covers) ? raw.covers : [],
    platformCovers: raw.platformCovers && typeof raw.platformCovers === 'object'
      ? raw.platformCovers
      : {},
  };
}

function saveCoversIndex(scriptId: string, takeId: string, index: CoversIndex): void {
  writeJson(coversIndexPath(scriptId, takeId), index);
}

function coverDir(scriptId: string, takeId: string, coverId: string): string {
  return path.join(takeCoversDir(scriptId, takeId), coverId);
}

function coverMetaPath(scriptId: string, takeId: string, coverId: string): string {
  return path.join(coverDir(scriptId, takeId, coverId), 'meta.json');
}

function readCoverMeta(scriptId: string, takeId: string, coverId: string): CoverMeta | null {
  const metaPath = coverMetaPath(scriptId, takeId, coverId);
  if (!fileExists(metaPath)) {
    return null;
  }
  return readJson<CoverMeta>(metaPath);
}

function extensionForUpload(fileName?: string, contentType?: string): string {
  const lower = (fileName || '').toLowerCase();
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return '.jpg';
  if (lower.endsWith('.webp')) return '.webp';
  if (lower.endsWith('.png')) return '.png';
  if (contentType?.includes('jpeg')) return '.jpg';
  if (contentType?.includes('webp')) return '.webp';
  return '.png';
}

function coverFileUrl(jobId: string, coverId: string): string {
  return `/api/jobs/${encodeURIComponent(jobId)}/covers/${encodeURIComponent(coverId)}/file`;
}

function usedByPlatforms(index: CoversIndex, coverId: string): string[] {
  return Object.entries(index.platformCovers)
    .filter(([, id]) => id === coverId)
    .map(([platform]) => platform)
    .sort();
}

export function listCovers(jobId: string): CoversListResponse {
  const { scriptId, takeId } = resolveJobTake(jobId);
  const index = loadCoversIndex(scriptId, takeId);
  const covers: CoverListItem[] = [];
  for (const entry of index.covers) {
    const meta = readCoverMeta(scriptId, takeId, entry.id) ?? {
      id: entry.id,
      label: entry.label,
      createdAt: '',
      source: 'import' as CoverSource,
      fileName: path.basename(entry.path),
    };
    covers.push({
      ...entry,
      label: meta.label || entry.label,
      meta,
      url: coverFileUrl(jobId, entry.id),
      usedBy: usedByPlatforms(index, entry.id),
    });
  }
  covers.sort((a, b) => String(b.meta.createdAt || '').localeCompare(String(a.meta.createdAt || '')));
  return {
    covers,
    platformCovers: { ...index.platformCovers },
  };
}

export function resolveCoverFilePath(
  scriptId: string,
  takeId: string,
  coverId: string,
): string | null {
  const index = loadCoversIndex(scriptId, takeId);
  const entry = index.covers.find((item) => item.id === coverId);
  if (!entry) {
    return null;
  }
  const filePath = path.join(takeCoversDir(scriptId, takeId), entry.path);
  return fileExists(filePath) ? filePath : null;
}

export function resolveCoverFileForPlatform(jobId: string, platform: string): {
  coverId: string;
  filePath: string;
} | null {
  const { scriptId, takeId } = resolveJobTake(jobId);
  const index = loadCoversIndex(scriptId, takeId);
  const coverId = index.platformCovers[platform];
  if (!coverId) {
    return null;
  }
  const filePath = resolveCoverFilePath(scriptId, takeId, coverId);
  if (!filePath) {
    return null;
  }
  return { coverId, filePath };
}

export function uploadCover(
  jobId: string,
  params: {
    data: Uint8Array;
    fileName?: string;
    contentType?: string;
    label?: string;
    source?: CoverSource;
  },
): CoversListResponse {
  const { scriptId, takeId } = resolveJobTake(jobId);
  if (!params.data.length) {
    throw new Error('Cover file is empty');
  }
  const coverId = newRunId('cover');
  const ext = extensionForUpload(params.fileName, params.contentType);
  const fileName = `cover${ext}`;
  const relativePath = `${coverId}/${fileName}`;
  const dir = coverDir(scriptId, takeId, coverId);
  ensureDir(dir);
  const absolutePath = path.join(dir, fileName);
  Deno.writeFileSync(absolutePath, params.data);

  const label = (params.label || params.fileName || coverId).replace(/\.[^.]+$/, '') || coverId;
  const meta: CoverMeta = {
    id: coverId,
    label,
    createdAt: nowIso(),
    source: params.source ?? 'browser',
    fileName,
    contentType: params.contentType,
  };
  writeJson(coverMetaPath(scriptId, takeId, coverId), meta);

  const index = loadCoversIndex(scriptId, takeId);
  index.covers.push({ id: coverId, label, path: relativePath });
  saveCoversIndex(scriptId, takeId, index);
  return listCovers(jobId);
}

export function duplicateCover(jobId: string, coverId: string): CoversListResponse {
  const { scriptId, takeId } = resolveJobTake(jobId);
  const sourcePath = resolveCoverFilePath(scriptId, takeId, coverId);
  const sourceMeta = readCoverMeta(scriptId, takeId, coverId);
  if (!sourcePath || !sourceMeta) {
    throw new Error(`Cover not found: ${coverId}`);
  }
  const data = Deno.readFileSync(sourcePath);
  return uploadCover(jobId, {
    data,
    fileName: sourceMeta.fileName,
    contentType: sourceMeta.contentType,
    label: `${sourceMeta.label} copy`,
    source: 'duplicate',
  });
}

export async function captureCoverFromComposite(
  jobId: string,
  options: {
    format?: 'portrait' | 'landscape';
    atSeconds?: number;
    label?: string;
  } = {},
): Promise<CoversListResponse> {
  const job = loadJob(jobId);
  if (!job) {
    throw new Error(`Job not found: ${jobId}`);
  }
  const runId = job.selectedRuns.composite;
  if (!runId) {
    throw new Error('No composite run selected — regenerate composite first');
  }
  const format = options.format === 'landscape' ? 'landscape' : 'portrait';
  const fileName = `${job.scriptId}-outdoor-${format}.mp4`;
  const videoPath = path.join(
    takeStageRunDir(job.scriptId, job.takeId, 'composite', runId),
    fileName,
  );
  if (!fileExists(videoPath)) {
    throw new Error(`Composite ${format} video missing: ${fileName}`);
  }

  const atSeconds = typeof options.atSeconds === 'number' && options.atSeconds >= 0
    ? options.atSeconds
    : 1;
  const tempDir = await Deno.makeTempDir({ prefix: 'outdoor-cover-' });
  const stillPath = path.join(tempDir, `cover-${format}.jpg`);
  try {
    await runCommand('ffmpeg', [
      '-y',
      '-ss',
      String(atSeconds),
      '-i',
      videoPath,
      '-frames:v',
      '1',
      '-q:v',
      '2',
      stillPath,
    ]);
    if (!fileExists(stillPath)) {
      throw new Error('ffmpeg did not produce a still frame');
    }
    const data = Deno.readFileSync(stillPath);
    const label = options.label?.trim() || `${format} still @${atSeconds}s`;
    return uploadCover(jobId, {
      data,
      fileName: `cover-${format}.jpg`,
      contentType: 'image/jpeg',
      label,
      source: 'composite',
    });
  } finally {
    try {
      Deno.removeSync(tempDir, { recursive: true });
    } catch {
      // ignore cleanup errors
    }
  }
}

export function renameCover(jobId: string, coverId: string, label: string): CoversListResponse {
  const trimmed = label.trim();
  if (!trimmed) {
    throw new Error('Cover label is required');
  }
  const { scriptId, takeId } = resolveJobTake(jobId);
  const index = loadCoversIndex(scriptId, takeId);
  const entry = index.covers.find((item) => item.id === coverId);
  const meta = readCoverMeta(scriptId, takeId, coverId);
  if (!entry || !meta) {
    throw new Error(`Cover not found: ${coverId}`);
  }
  entry.label = trimmed;
  meta.label = trimmed;
  writeJson(coverMetaPath(scriptId, takeId, coverId), meta);
  saveCoversIndex(scriptId, takeId, index);
  return listCovers(jobId);
}

export function deleteCover(jobId: string, coverId: string): CoversListResponse {
  const { scriptId, takeId } = resolveJobTake(jobId);
  const index = loadCoversIndex(scriptId, takeId);
  const used = usedByPlatforms(index, coverId);
  if (used.length) {
    throw new Error(`Cover is assigned to: ${used.join(', ')}. Clear those first.`);
  }
  if (!index.covers.some((entry) => entry.id === coverId)) {
    throw new Error(`Cover not found: ${coverId}`);
  }
  index.covers = index.covers.filter((entry) => entry.id !== coverId);
  saveCoversIndex(scriptId, takeId, index);
  try {
    Deno.removeSync(coverDir(scriptId, takeId, coverId), { recursive: true });
  } catch {
    // index already updated; missing folder is fine
  }
  return listCovers(jobId);
}

export function patchPlatformCoverMap(jobId: string, patch: PlatformMapPatch): CoversListResponse {
  const { scriptId, takeId } = resolveJobTake(jobId);
  const index = loadCoversIndex(scriptId, takeId);
  const known = new Set(index.covers.map((entry) => entry.id));

  const assign = (platform: string, coverId: string | null) => {
    if (!coverId) {
      delete index.platformCovers[platform];
      return;
    }
    if (!known.has(coverId)) {
      throw new Error(`Cover not found: ${coverId}`);
    }
    index.platformCovers[platform] = coverId;
  };

  if (patch.platformCovers) {
    for (const [platform, coverId] of Object.entries(patch.platformCovers)) {
      assign(platform, coverId);
    }
  }

  if (patch.batch) {
    const { coverId, platforms } = patch.batch;
    for (const platform of platforms) {
      assign(platform, coverId);
    }
  }

  saveCoversIndex(scriptId, takeId, index);
  return listCovers(jobId);
}
