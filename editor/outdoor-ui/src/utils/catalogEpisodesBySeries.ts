import type { VideoOpsCatalog, VideoOpsCatalogScript, VideoOpsCatalogSeries } from '../types';

export type CatalogSeriesEntry = {
  index: number;
  series: VideoOpsCatalogSeries;
  episodes: VideoOpsCatalogScript[];
};

export function catalogEpisodesBySeries(catalog: VideoOpsCatalog | null): CatalogSeriesEntry[] {
  if (!catalog) {
    return [];
  }
  return (catalog.series ?? [])
    .map((series) => {
      const episodes = (series.episodes ?? [])
        .filter((episode) => episode.hasOutdoorScript || episode.hasAnimationMd)
        .slice()
        .sort((left, right) => {
          const leftDays = left.freshnessDaysAgo ?? 9_999;
          const rightDays = right.freshnessDaysAgo ?? 9_999;
          if (leftDays !== rightDays) {
            return leftDays - rightDays;
          }
          return left.title.localeCompare(right.title);
        });
      return { series, episodes };
    })
    .filter((entry) => entry.episodes.length > 0)
    .map((entry, visibleIndex) => ({ ...entry, index: visibleIndex + 1 }));
}
