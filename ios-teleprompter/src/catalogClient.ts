import type { OutdoorScript, TakeManifest } from './scriptSchema';
import { agentFetchJson } from './agentResponse';
import { loadContentBaseUrl } from './contentSettings';
import { cacheOutdoorScript, getCachedOutdoorScript } from './scriptCache';

export type VideoOpsCatalogTake = {
  takeId: string;
  scriptId: string;
  recordedAt: string | null;
  durationMs: number | null;
  slideEventCount: number;
  markerCount: number;
  hasManifest: boolean;
  hasSourceVideo: boolean;
  pipelineStatus: string;
  selectedRuns: Record<string, string>;
  hasPortrait: boolean;
  hasLandscape: boolean;
  publishPostCount: number;
};

export type VideoOpsCatalogScript = {
  scriptId: string;
  seriesId: string;
  title: string;
  /** @deprecated Use seriesId */
  collection: string;
  hasScriptMd: boolean;
  hasAnimation: boolean;
  beatCount: number;
  slideCount: number;
  hasOutdoorScript: boolean;
  hasStudioRender: boolean;
  hasSocialPosts: boolean;
  socialPlatforms: { english: string[]; china: string[] };
  takeCount: number;
  takes: VideoOpsCatalogTake[];
};

export type VideoOpsCatalogSeries = {
  id: string;
  title: string;
  description?: string;
  thumbnail?: string;
  playlist?: string;
  episodeCount: number;
  takeCount: number;
  episodes: VideoOpsCatalogScript[];
};

export type VideoOpsCatalog = {
  schemaVersion: number;
  generatedAt: string;
  scriptsRoot: string;
  seriesCount: number;
  scriptCount: number;
  takeCount: number;
  series: VideoOpsCatalogSeries[];
  scripts: VideoOpsCatalogScript[];
};

async function contentFetch<T>(path: string): Promise<T> {
  const baseUrl = await loadContentBaseUrl();
  return agentFetchJson<T>(baseUrl, path);
}

export async function fetchVideoOpsCatalog(): Promise<VideoOpsCatalog> {
  return contentFetch<VideoOpsCatalog>('/api/catalog');
}

export async function fetchVideoOpsSeries(): Promise<VideoOpsCatalogSeries[]> {
  const payload = await contentFetch<{ series: VideoOpsCatalogSeries[] }>('/api/series');
  return payload.series;
}

export async function fetchOutdoorScript(scriptId: string): Promise<OutdoorScript> {
  const baseUrl = await loadContentBaseUrl();
  try {
    const script = await agentFetchJson<OutdoorScript>(
      baseUrl,
      `/api/scripts/${encodeURIComponent(scriptId)}/outdoor-script`,
    );
    await cacheOutdoorScript(script);
    return script;
  } catch (error) {
    const cached = await getCachedOutdoorScript(scriptId);
    if (cached) {
      return cached;
    }
    throw error;
  }
}

export function seriesSharedAssetUrl(
  seriesId: string,
  relativePath: string,
  baseUrl?: string,
): string {
  const root = baseUrl ?? '';
  return `${root.replace(/\/+$/, '')}/api/series/${encodeURIComponent(seriesId)}/shared/${relativePath.replace(/^\/+/, '')}`;
}

export function catalogArtifactUrl(
  scriptId: string,
  takeId: string,
  stage: string,
  runId: string,
  fileName: string,
  baseUrl?: string,
): string {
  const root = baseUrl ?? '';
  return `${root.replace(/\/+$/, '')}/api/scripts/${encodeURIComponent(scriptId)}/takes/${encodeURIComponent(takeId)}/artifacts/${encodeURIComponent(stage)}/${encodeURIComponent(runId)}/${encodeURIComponent(fileName)}`;
}

export type CatalogScriptSummary = {
  script: OutdoorScript;
  seriesId: string;
  takeCount: number;
  lastRecordedAt?: string;
  pipelineStatus?: string;
  fromMac: boolean;
};

export function catalogEntryToSummary(entry: VideoOpsCatalogScript): CatalogScriptSummary | null {
  if (!entry.hasOutdoorScript || entry.slideCount === 0) {
    return null;
  }
  const lastTake = entry.takes[0];
  return {
    script: {
      schemaVersion: 1,
      id: entry.scriptId,
      title: entry.title,
      slides: Array.from({ length: entry.slideCount }, (_, index) => ({
        id: `slide-${index + 1}`,
        body: '',
      })),
    },
    seriesId: entry.seriesId ?? entry.collection,
    takeCount: entry.takeCount,
    lastRecordedAt: lastTake?.recordedAt ?? undefined,
    pipelineStatus: lastTake?.pipelineStatus,
    fromMac: true,
  };
}

export type MergedTake = TakeManifest & {
  fromMac?: boolean;
  pipelineStatus?: string;
  hasPortrait?: boolean;
  hasLandscape?: boolean;
};
