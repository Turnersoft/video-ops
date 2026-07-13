export type OutdoorScriptMode = 'manual' | 'timed';

export type OutdoorScriptImage = {
  /** A data URI keeps AirDrop/import to one JSON file. */
  dataUri?: string;
  /** Optional external URI for development or small local tests. */
  uri?: string;
  alt?: string;
};

export type OutdoorScriptSlide = {
  id: string;
  title?: string;
  body: string;
  durationSeconds?: number;
  /** Countdown shown before this slide during a take. */
  countdownSeconds?: number;
  image?: OutdoorScriptImage;
  /** Legacy combined Lean/Turn notes block. */
  notes?: string;
  /** Optional structured code panes for portrait split layout. */
  leanCode?: string;
  turnCode?: string;
  /** Which code pane is the focus for this slide (Lean vs Turn-Lang). */
  codeFocus?: 'lean' | 'turn';
};

export type OutdoorScript = {
  schemaVersion: 1;
  id: string;
  title: string;
  language?: string;
  mode?: OutdoorScriptMode;
  countdownSeconds?: number;
  defaultFontScale?: number;
  slides: OutdoorScriptSlide[];
};

export type TakeMarkerKind = 'ng' | 'keep' | 'note';

export type TakeMarker = {
  id: string;
  kind: TakeMarkerKind;
  label: string;
  atMs: number;
};

export type SlideEvent = {
  slideId: string;
  index: number;
  atMs: number;
};

export type TakeSyncStatus = 'local' | 'queued' | 'synced' | 'exported';

export type TakeManifest = {
  schemaVersion: 1;
  scriptId: string;
  scriptTitle: string;
  takeId: string;
  recordedAt: string;
  videoUri: string;
  thumbnailUri?: string;
  durationMs: number;
  slideEvents: SlideEvent[];
  markers: TakeMarker[];
  /** Photos library asset id — used to find the clip if the local copy is gone. */
  photoLibraryAssetId?: string;
  /** Human tip for manual Photos lookup (filename / creation time). */
  photoLibraryHint?: string;
  /** Local delivery state for Mac upload / iCloud export. */
  syncStatus?: TakeSyncStatus;
};

export type ScriptSummary = {
  script: OutdoorScript;
  seriesId?: string;
  takeCount: number;
  lastRecordedAt?: string;
};

export function isOutdoorScript(value: unknown): value is OutdoorScript {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const candidate = value as Partial<OutdoorScript>;
  return (
    candidate.schemaVersion === 1 &&
    typeof candidate.id === 'string' &&
    typeof candidate.title === 'string' &&
    Array.isArray(candidate.slides) &&
    candidate.slides.every(
      (slide) =>
        slide &&
        typeof slide === 'object' &&
        typeof slide.id === 'string' &&
        typeof slide.body === 'string',
    )
  );
}

export function isTakeManifest(value: unknown): value is TakeManifest {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const candidate = value as Partial<TakeManifest>;
  return (
    candidate.schemaVersion === 1 &&
    typeof candidate.scriptId === 'string' &&
    typeof candidate.scriptTitle === 'string' &&
    typeof candidate.takeId === 'string' &&
    typeof candidate.recordedAt === 'string' &&
    typeof candidate.videoUri === 'string' &&
    typeof candidate.durationMs === 'number' &&
    Array.isArray(candidate.slideEvents) &&
    Array.isArray(candidate.markers)
  );
}
