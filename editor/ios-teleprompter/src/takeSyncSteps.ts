import type { TakeManifest, TakeSyncStatus } from './scriptSchema';

export type TakeDeliveryStep = 'iphone' | 'icloud' | 'mac';

export type TakeDeliveryStepState = 'done' | 'pending' | 'waiting';

export type TakeDeliveryProgress = Record<TakeDeliveryStep, TakeDeliveryStepState>;

export function takeDeliveryProgress(syncStatus?: TakeSyncStatus): TakeDeliveryProgress {
  switch (syncStatus) {
    case 'exported':
      return { iphone: 'done', icloud: 'done', mac: 'waiting' };
    case 'synced':
      return { iphone: 'done', icloud: 'done', mac: 'done' };
    case 'queued':
      return { iphone: 'done', icloud: 'pending', mac: 'waiting' };
    case 'local':
    default:
      return { iphone: 'done', icloud: 'pending', mac: 'waiting' };
  }
}

export const TAKE_STEP_LABELS: Record<TakeDeliveryStep, string> = {
  iphone: 'On iPhone',
  icloud: 'iCloud inbox',
  mac: 'Mac agent',
};

export function takeSyncStatusLabel(syncStatus?: TakeSyncStatus): string {
  switch (syncStatus) {
    case 'exported':
      return 'In iCloud — waiting for Mac';
    case 'synced':
      return 'On Mac';
    case 'queued':
      return 'Queued for Mac when online';
    case 'local':
      return 'On iPhone only';
    default:
      return 'On iPhone only';
  }
}

export function summarizeTakeMetadata(take: TakeManifest): string {
  const parts = [
    `${take.slideEvents.length} slide marker${take.slideEvents.length === 1 ? '' : 's'}`,
    `${take.markers.length} marker${take.markers.length === 1 ? '' : 's'}`,
  ];
  const ngCount = take.markers.filter((marker) => marker.kind === 'ng').length;
  if (ngCount > 0) {
    parts.push(`${ngCount} NG`);
  }
  return parts.join(' · ');
}
