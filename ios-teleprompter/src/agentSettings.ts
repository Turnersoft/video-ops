import * as FileSystem from 'expo-file-system/legacy';

import { resolveAgentBaseUrl } from './outdoorEndpoints';

const SETTINGS_PATH = `${FileSystem.documentDirectory ?? ''}turn-outdoor-teleprompter/agent-settings.json`;

export async function loadAgentBaseUrl(): Promise<string> {
  const saved = await readSavedAgentBaseUrl();
  return resolveAgentBaseUrl(saved);
}

export async function readSavedAgentBaseUrl(): Promise<string | null> {
  try {
    const raw = await FileSystem.readAsStringAsync(SETTINGS_PATH);
    const parsed = JSON.parse(raw) as { baseUrl?: string };
    if (parsed.baseUrl?.trim()) {
      return parsed.baseUrl.trim().replace(/\/+$/, '');
    }
  } catch {
    // fall through
  }
  return null;
}

export async function saveAgentBaseUrl(baseUrl: string): Promise<void> {
  await ensureSettingsDir();
  await FileSystem.writeAsStringAsync(
    SETTINGS_PATH,
    JSON.stringify({ baseUrl: normalizeBaseUrl(baseUrl) }, null, 2),
  );
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.trim().replace(/\/+$/, '');
}

async function ensureSettingsDir(): Promise<void> {
  const dir = `${FileSystem.documentDirectory ?? ''}turn-outdoor-teleprompter/`;
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }
}
