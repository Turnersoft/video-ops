import type { ScriptCoverSlot } from '../types';

const LANDSCAPE_PLATFORMS = new Set(['bilibili', 'wechat_channels', 'facebook', 'linkedin']);

export function scriptCoverSlotForPlatform(
  platform: string,
  group: 'english' | 'china' | 'headline',
): ScriptCoverSlot | null {
  if (group === 'headline') {
    return null;
  }
  const lang = group === 'china' ? 'zh' : 'en';
  const orientation = LANDSCAPE_PLATFORMS.has(platform) ? 'landscape' : 'portrait';
  return `${orientation}-${lang}` as ScriptCoverSlot;
}

export function scriptCoverSlotLabel(
  slot: ScriptCoverSlot | null,
  covers: { slots: Array<{ slot: ScriptCoverSlot; exists: boolean; label: string }> } | null,
): string {
  if (!slot) {
    return 'n/a';
  }
  const entry = covers?.slots.find((item) => item.slot === slot);
  if (!entry) {
    return slot;
  }
  return entry.exists ? entry.label : `${entry.label} (missing)`;
}
