/**
 * Real-time inbox awareness: which iCloud/local files the Mac agent sees and picks up.
 */

import path from 'node:path';

import { fileExists, readJson, writeJson } from './fs_util.ts';
import { AGENT_ROOT, ensureDir, listInboxDirs } from './paths.ts';

export type InboxFileSighting = {
  takeId: string;
  inboxDir: string;
  videoPath: string | null;
  videoFileName: string | null;
  manifestPath: string | null;
  manifestFileName: string | null;
  scriptId: string | null;
  scriptTitle: string | null;
  status: 'pending' | 'ready' | 'ingested' | 'missing-pair';
  updatedAt: string;
  ingestedAt?: string;
  jobId?: string;
  takeDir?: string;
};

export type InboxStatusSnapshot = {
  schemaVersion: 1;
  updatedAt: string;
  watchedFolders: string[];
  files: InboxFileSighting[];
  recentIngests: InboxFileSighting[];
};

const STATE_PATH = path.join(AGENT_ROOT, '.inbox-status.json');
const MAX_RECENT = 40;

type PersistedState = {
  recentIngests: InboxFileSighting[];
};

function loadPersisted(): PersistedState {
  if (!fileExists(STATE_PATH)) {
    return { recentIngests: [] };
  }
  try {
    return readJson<PersistedState>(STATE_PATH);
  } catch {
    return { recentIngests: [] };
  }
}

function savePersisted(state: PersistedState): void {
  ensureDir(path.dirname(STATE_PATH));
  writeJson(STATE_PATH, state);
}

function listVideoAndJson(inboxDir: string): {
  videos: Map<string, string>;
  manifests: Map<string, string>;
} {
  const videos = new Map<string, string>();
  const manifests = new Map<string, string>();
  if (!fileExists(inboxDir)) {
    return { videos, manifests };
  }
  for (const entry of Deno.readDirSync(inboxDir)) {
    if (!entry.isFile) continue;
    const name = entry.name;
    const lower = name.toLowerCase();
    if (lower.endsWith('.mp4') || lower.endsWith('.webm') || lower.endsWith('.mov')) {
      const takeId = name.replace(/\.(mp4|webm|mov)$/i, '');
      videos.set(takeId, name);
    } else if (lower.endsWith('.json')) {
      const takeId = name.replace(/\.json$/i, '');
      manifests.set(takeId, name);
    }
  }
  return { videos, manifests };
}

function readManifestMeta(manifestPath: string): { scriptId: string | null; scriptTitle: string | null } {
  try {
    const take = readJson<{ scriptId?: string; scriptTitle?: string }>(manifestPath);
    return {
      scriptId: take.scriptId ?? null,
      scriptTitle: take.scriptTitle ?? null,
    };
  } catch {
    return { scriptId: null, scriptTitle: null };
  }
}

export function recordInboxIngest(params: {
  takeId: string;
  inboxDir: string;
  videoPath: string;
  manifestPath: string;
  scriptId: string;
  scriptTitle: string;
  jobId: string;
  takeDir: string;
}): InboxFileSighting {
  const sighting: InboxFileSighting = {
    takeId: params.takeId,
    inboxDir: params.inboxDir,
    videoPath: params.videoPath,
    videoFileName: path.basename(params.videoPath),
    manifestPath: params.manifestPath,
    manifestFileName: path.basename(params.manifestPath),
    scriptId: params.scriptId,
    scriptTitle: params.scriptTitle,
    status: 'ingested',
    updatedAt: new Date().toISOString(),
    ingestedAt: new Date().toISOString(),
    jobId: params.jobId,
    takeDir: params.takeDir,
  };
  const persisted = loadPersisted();
  persisted.recentIngests = [
    sighting,
    ...persisted.recentIngests.filter((entry) => entry.takeId !== params.takeId),
  ].slice(0, MAX_RECENT);
  savePersisted(persisted);
  return sighting;
}

export function getInboxStatus(): InboxStatusSnapshot {
  const watchedFolders = listInboxDirs();
  const files: InboxFileSighting[] = [];
  const now = new Date().toISOString();

  for (const inboxDir of watchedFolders) {
    ensureDir(inboxDir);
    const { videos, manifests } = listVideoAndJson(inboxDir);
    const takeIds = new Set([...videos.keys(), ...manifests.keys()]);
    for (const takeId of takeIds) {
      const videoFileName = videos.get(takeId) ?? null;
      const manifestFileName = manifests.get(takeId) ?? null;
      const videoPath = videoFileName ? path.join(inboxDir, videoFileName) : null;
      const manifestPath = manifestFileName ? path.join(inboxDir, manifestFileName) : null;
      const meta = manifestPath ? readManifestMeta(manifestPath) : { scriptId: null, scriptTitle: null };
      let status: InboxFileSighting['status'] = 'missing-pair';
      if (videoPath && manifestPath) {
        status = 'ready';
      } else if (videoPath || manifestPath) {
        status = 'pending';
      }
      files.push({
        takeId,
        inboxDir,
        videoPath,
        videoFileName,
        manifestPath,
        manifestFileName,
        scriptId: meta.scriptId,
        scriptTitle: meta.scriptTitle,
        status,
        updatedAt: now,
      });
    }
  }

  const persisted = loadPersisted();
  return {
    schemaVersion: 1,
    updatedAt: now,
    watchedFolders,
    files: files.sort((a, b) => a.takeId.localeCompare(b.takeId)),
    recentIngests: persisted.recentIngests,
  };
}
