import type { LocalTakeView, VideoOpsCatalogTake } from '../types';

export type TakeEntry = {
  takeId: string;
  label: string;
  local?: LocalTakeView;
  mac?: VideoOpsCatalogTake;
};

/** Merge iPhone + Mac takes; label Take 1 = oldest, list newest first. */
export function buildTakeEntries(
  localTakes: LocalTakeView[],
  macTakes: VideoOpsCatalogTake[],
): TakeEntry[] {
  const byId = new Map<string, TakeEntry>();
  for (const local of localTakes) {
    byId.set(local.takeId, {
      takeId: local.takeId,
      label: local.takeId,
      local,
    });
  }
  for (const mac of macTakes) {
    const existing = byId.get(mac.takeId);
    if (existing) {
      existing.mac = mac;
    } else {
      byId.set(mac.takeId, {
        takeId: mac.takeId,
        label: mac.takeId,
        mac,
      });
    }
  }
  const chronological = [...byId.values()].sort((left, right) => {
    const leftAt = left.local?.recordedAt ?? left.mac?.recordedAt ?? '';
    const rightAt = right.local?.recordedAt ?? right.mac?.recordedAt ?? '';
    return leftAt.localeCompare(rightAt);
  });
  const numbered = chronological.map((entry, index) => ({
    ...entry,
    label: `Take ${index + 1}`,
  }));
  return numbered.sort((left, right) => {
    const leftAt = left.local?.recordedAt ?? left.mac?.recordedAt ?? '';
    const rightAt = right.local?.recordedAt ?? right.mac?.recordedAt ?? '';
    return rightAt.localeCompare(leftAt);
  });
}
