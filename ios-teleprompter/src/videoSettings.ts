import type { VideoQuality } from 'expo-camera';
import * as FileSystem from 'expo-file-system/legacy';

export type VideoResolution = VideoQuality;

export const VIDEO_RESOLUTION_OPTIONS: VideoResolution[] = ['720p', '1080p', '2160p', '480p'];

export const DEFAULT_VIDEO_RESOLUTION: VideoResolution = '720p';

const PREFS_PATH = `${FileSystem.documentDirectory ?? ''}turn-outdoor-teleprompter/prefs.json`;

type Prefs = {
  videoResolution?: VideoResolution;
};

function isVideoResolution(value: unknown): value is VideoResolution {
  return typeof value === 'string' && VIDEO_RESOLUTION_OPTIONS.includes(value as VideoResolution);
}

export async function loadVideoResolution(): Promise<VideoResolution> {
  try {
    const info = await FileSystem.getInfoAsync(PREFS_PATH);
    if (!info.exists) {
      return DEFAULT_VIDEO_RESOLUTION;
    }
    const raw = await FileSystem.readAsStringAsync(PREFS_PATH);
    const parsed = JSON.parse(raw) as Prefs;
    if (isVideoResolution(parsed.videoResolution)) {
      return parsed.videoResolution;
    }
  } catch {
    // Keep default when prefs are missing or corrupt.
  }
  return DEFAULT_VIDEO_RESOLUTION;
}

export async function saveVideoResolution(resolution: VideoResolution): Promise<void> {
  const parent = `${FileSystem.documentDirectory ?? ''}turn-outdoor-teleprompter/`;
  const parentInfo = await FileSystem.getInfoAsync(parent);
  if (!parentInfo.exists) {
    await FileSystem.makeDirectoryAsync(parent, { intermediates: true });
  }
  await FileSystem.writeAsStringAsync(
    PREFS_PATH,
    JSON.stringify({ videoResolution: resolution } satisfies Prefs, null, 2),
  );
}

export function nextVideoResolution(current: VideoResolution): VideoResolution {
  const index = VIDEO_RESOLUTION_OPTIONS.indexOf(current);
  if (index < 0) {
    return DEFAULT_VIDEO_RESOLUTION;
  }
  return VIDEO_RESOLUTION_OPTIONS[(index + 1) % VIDEO_RESOLUTION_OPTIONS.length];
}

export function videoResolutionLabel(resolution: VideoResolution): string {
  return resolution;
}
