import { Platform } from 'react-native';

import type { OutdoorApi } from '../api/client';
import type { ScriptCoverSlotInfo } from '../types';

export function scriptCoverPreviewUrl(
  api: OutdoorApi,
  slot: ScriptCoverSlotInfo,
): string {
  const cache = slot.updatedAt ? encodeURIComponent(slot.updatedAt) : String(Date.now());
  const path = `${slot.url}?t=${cache}`;
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return `${window.location.origin}${path}`;
  }
  return api.absoluteUrl(path);
}
