/**
 * Persist beat template + candidate variants per script (.cache/beat-studio.json).
 */

import path from 'node:path';

import { fileExists, readJson, writeJson } from './fs_util.ts';
import { scriptDirFor } from './paths.ts';

export type BeatStudioDocument = {
  schemaVersion: 1;
  scriptId: string;
  updatedAt: string;
  beats: Record<
    string,
    {
      selectedCandidateId: string;
      candidates: Array<Record<string, unknown>>;
    }
  >;
};

function beatStudioPath(scriptId: string): string {
  return path.join(scriptDirFor(scriptId), '.cache', 'beat-studio.json');
}

export function readBeatStudio(scriptId: string): BeatStudioDocument | null {
  const filePath = beatStudioPath(scriptId);
  if (!fileExists(filePath)) {
    return null;
  }
  try {
    const doc = readJson<BeatStudioDocument>(filePath);
    if (doc.schemaVersion !== 1 || doc.scriptId !== scriptId) {
      return null;
    }
    return doc;
  } catch {
    return null;
  }
}

export function writeBeatStudio(doc: BeatStudioDocument): BeatStudioDocument {
  const filePath = beatStudioPath(doc.scriptId);
  writeJson(filePath, doc);
  return doc;
}

export function emptyBeatStudio(scriptId: string): BeatStudioDocument {
  return {
    schemaVersion: 1,
    scriptId,
    updatedAt: new Date().toISOString(),
    beats: {},
  };
}
