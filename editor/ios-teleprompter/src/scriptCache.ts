import type { OutdoorApi } from '@turn/outdoor-ui';
import type { VideoOpsCatalog } from '@turn/outdoor-ui';
import type { OutdoorScript } from './scriptSchema';
import {
  hasCachedScripts,
  loadCatalogCache,
  loadScript,
  saveCatalogCache,
  saveScript,
} from './storage';

function isVideoOpsCatalog(value: unknown): value is VideoOpsCatalog {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const candidate = value as Partial<VideoOpsCatalog>;
  return Array.isArray(candidate.series) && Array.isArray(candidate.scripts);
}

export async function cacheOutdoorScript(script: OutdoorScript): Promise<void> {
  await saveScript(script);
}

export async function getCachedOutdoorScript(scriptId: string): Promise<OutdoorScript | null> {
  return loadScript(scriptId);
}

export async function getCachedCatalog(): Promise<VideoOpsCatalog | null> {
  const cached = await loadCatalogCache();
  if (!cached || !isVideoOpsCatalog(cached.catalog)) {
    return null;
  }
  return cached.catalog;
}

export async function cacheCatalog(catalog: VideoOpsCatalog): Promise<void> {
  await saveCatalogCache(catalog);
}

export async function hasOfflineFilmingContent(): Promise<boolean> {
  const [catalog, scripts] = await Promise.all([getCachedCatalog(), hasCachedScripts()]);
  return catalog !== null || scripts;
}

function catalogScriptIds(catalog: VideoOpsCatalog): string[] {
  return (catalog.scripts ?? [])
    .filter((entry) => entry.hasOutdoorScript && entry.slideCount > 0)
    .map((entry) => entry.scriptId);
}

let prefetchGeneration = 0;

/** Background-download full outdoor scripts after a successful catalog fetch. */
export function prefetchOutdoorScripts(api: OutdoorApi, catalog: VideoOpsCatalog): void {
  const generation = ++prefetchGeneration;
  const scriptIds = catalogScriptIds(catalog);
  if (scriptIds.length === 0) {
    return;
  }

  void (async () => {
    for (const scriptId of scriptIds) {
      if (generation !== prefetchGeneration) {
        return;
      }
      try {
        const script = await api.getOutdoorScript(scriptId);
        await cacheOutdoorScript(script as OutdoorScript);
      } catch {
        // Keep going — one failed episode should not block the rest.
      }
    }
  })();
}

export function outdoorScriptToLiveFallback(script: OutdoorScript) {
  return {
    schemaVersion: 1 as const,
    id: script.id,
    title: script.title,
    language: script.language ?? 'en',
    mode: 'timed' as const,
    countdownSeconds: script.countdownSeconds ?? 3,
    source: 'animation.md' as const,
    updatedAt: null,
    slides: script.slides,
    beats: script.slides.map((slide, index) => ({
      id: slide.id ?? `beat-${index + 1}`,
      index,
      title: slide.title ?? `Beat ${index + 1}`,
      say: slide.body ?? '',
      leanCode: slide.leanCode ?? '',
      turnCode: slide.turnCode ?? '',
      chinese: '',
      hint: '',
      visualNotes: slide.notes ?? '',
      durationSeconds: slide.durationSeconds,
    })),
  };
}
