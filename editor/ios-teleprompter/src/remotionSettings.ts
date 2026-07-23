import * as FileSystem from 'expo-file-system/legacy';

import { resolveRemotionStudioUrl } from './outdoorEndpoints';

const SETTINGS_PATH = `${FileSystem.documentDirectory ?? ''}turn-outdoor-teleprompter/remotion-settings.json`;

export async function loadRemotionStudioUrl(): Promise<string> {
  const saved = await readSavedRemotionStudioUrl();
  return resolveRemotionStudioUrl(saved);
}

export async function readSavedRemotionStudioUrl(): Promise<string | null> {
  try {
    const raw = await FileSystem.readAsStringAsync(SETTINGS_PATH);
    const parsed = JSON.parse(raw) as { studioUrl?: string };
    if (parsed.studioUrl?.trim()) {
      return normalizeStudioUrl(parsed.studioUrl);
    }
  } catch {
    // fall through
  }
  return null;
}

export async function saveRemotionStudioUrl(studioUrl: string): Promise<void> {
  await ensureSettingsDir();
  await FileSystem.writeAsStringAsync(
    SETTINGS_PATH,
    JSON.stringify({ studioUrl: normalizeStudioUrl(studioUrl) }, null, 2),
  );
}

export function remotionCompositionUrl(studioBaseUrl: string, scriptId: string): string {
  return `${normalizeStudioUrl(studioBaseUrl)}/${encodeURIComponent(scriptId)}`;
}

export function remotionOutdoorCompositionUrl(
  studioBaseUrl: string,
  format: 'landscape' | 'portrait',
): string {
  const composition = format === 'portrait' ? 'video-outdoor-portrait' : 'video-outdoor-landscape';
  return `${normalizeStudioUrl(studioBaseUrl)}/${composition}`;
}

function normalizeStudioUrl(studioUrl: string): string {
  return studioUrl.trim().replace(/\/+$/, '');
}

async function ensureSettingsDir(): Promise<void> {
  const dir = `${FileSystem.documentDirectory ?? ''}turn-outdoor-teleprompter/`;
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }
}
