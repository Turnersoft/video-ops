import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';

import type { TakeManifest } from './scriptSchema';
import { getTake, saveTakeManifest } from './storage';

/**
 * Always keep take JSON on device and save a Photos copy when allowed,
 * so a failed iCloud folder write is not a dead end.
 */
export async function persistTakeLocally(take: TakeManifest): Promise<TakeManifest> {
  let next: TakeManifest = {
    ...take,
    syncStatus: take.syncStatus ?? 'local',
  };

  const mediaPermission = await MediaLibrary.requestPermissionsAsync();
  if (mediaPermission.granted && !next.photoLibraryAssetId) {
    try {
      const asset = await MediaLibrary.createAssetAsync(next.videoUri);
      const recorded = new Date(next.recordedAt);
      const hintParts = [
        `Photos · ${next.takeId}.mp4`,
        `script ${next.scriptTitle}`,
        `~${Math.max(1, Math.round(next.durationMs / 1000))}s`,
        recorded.toLocaleString(),
      ];
      if (asset.filename) {
        hintParts.unshift(asset.filename);
      }
      next = {
        ...next,
        photoLibraryAssetId: asset.id,
        photoLibraryHint: hintParts.join(' · '),
      };
    } catch {
      // Photos save is best-effort; local JSON + app video copy still remain.
    }
  }

  await saveTakeManifest(next);
  return next;
}

export async function markTakeQueued(takeId: string): Promise<TakeManifest | null> {
  const take = await getTake(takeId);
  if (!take) {
    return null;
  }
  const next: TakeManifest = { ...take, syncStatus: 'queued' };
  await saveTakeManifest(next);
  return next;
}

/** If the app video copy is missing, try restoring a file URI from Photos. */
export async function resolveTakeVideoUri(take: TakeManifest): Promise<string | null> {
  try {
    const info = await FileSystem.getInfoAsync(take.videoUri);
    if (info.exists) {
      return take.videoUri;
    }
  } catch {
    // fall through to Photos
  }

  if (!take.photoLibraryAssetId) {
    return null;
  }

  try {
    const asset = await MediaLibrary.getAssetInfoAsync(take.photoLibraryAssetId);
    if (asset.localUri) {
      return asset.localUri;
    }
  } catch {
    return null;
  }
  return null;
}

export async function markTakeSynced(takeId: string, status: 'synced' | 'exported'): Promise<void> {
  const take = await getTake(takeId);
  if (!take) {
    return;
  }
  await saveTakeManifest({ ...take, syncStatus: status });
}
