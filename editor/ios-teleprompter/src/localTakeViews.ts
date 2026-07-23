import type { LocalTakeView } from '@turn/outdoor-ui';

import type { TakeManifest } from './scriptSchema';
import { summarizeTakeMetadata, takeDeliveryProgress, takeSyncStatusLabel } from './takeSyncSteps';

export function toLocalTakeView(take: TakeManifest): LocalTakeView {
  const ngMarkerCount = take.markers.filter((marker) => marker.kind === 'ng').length;
  return {
    takeId: take.takeId,
    scriptId: take.scriptId,
    scriptTitle: take.scriptTitle,
    recordedAt: take.recordedAt,
    durationMs: take.durationMs,
    slideEventCount: take.slideEvents.length,
    markerCount: take.markers.length,
    ngMarkerCount,
    slideEvents: take.slideEvents,
    markers: take.markers,
    thumbnailUri: take.thumbnailUri,
    syncStatus: take.syncStatus ?? 'local',
    steps: takeDeliveryProgress(take.syncStatus),
    statusLabel: takeSyncStatusLabel(take.syncStatus),
    metadataSummary: summarizeTakeMetadata(take),
    photoLibraryHint: take.photoLibraryHint,
    fromDevice: true,
  };
}
