import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { formatOutdoorApiError } from '../api/client';
import { Header } from '../components/layout/Header';
import { InboxBanner } from '../components/layout/InboxBanner';
import { Badge } from '../components/ui/Badge';
import { useOutdoorUi } from '../context/OutdoorUiContext';
import { useOutdoorRoute } from '../hooks/useOutdoorRoute';
import { colors, sharedStyles, spacing, typography } from '../theme';
import type { VideoOpsCatalog, VideoOpsCatalogScript } from '../types';
import { takeStatusLabel } from '../utils/format';

export function LibraryScreen() {
  const { api, layout, layoutStyles, invalidateAll, refreshKey, onOpenSettings, offlineFilming } =
    useOutdoorUi();
  const { navigateToPlatforms, navigateToScript } = useOutdoorRoute();
  const [catalog, setCatalog] = useState<VideoOpsCatalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [refreshNote, setRefreshNote] = useState<string | null>(null);

  const loadCatalog = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await api.getCatalog();
      setCatalog(next);
    } catch (loadError) {
      setError(formatOutdoorApiError(loadError));
      setCatalog(null);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog, refreshKey]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    setRefreshNote(null);
    try {
      const result = await api.resyncScripts(true);
      setCatalog(result.catalog);
      const errCount = result.errors.length;
      setRefreshNote(
        `Scanned ${result.scanned} · updated ${result.compiled.length}` +
          (errCount ? ` · ${errCount} error(s)` : ''),
      );
      invalidateAll();
    } catch (refreshError) {
      setError(formatOutdoorApiError(refreshError));
      await loadCatalog();
      invalidateAll();
    } finally {
      setRefreshing(false);
    }
  }, [api, invalidateAll, loadCatalog]);

  const handleScanInbox = useCallback(async () => {
    setScanning(true);
    try {
      await api.scanInbox();
      invalidateAll();
      await loadCatalog();
    } catch (scanError) {
      setError(formatOutdoorApiError(scanError));
    } finally {
      setScanning(false);
    }
  }, [api, invalidateAll, loadCatalog]);

  const episodesBySeries = useMemo(() => {
    if (!catalog) {
      return [];
    }
    return (catalog.series ?? [])
      .map((series) => {
        const episodes = (series.episodes ?? [])
          .filter((episode) => episode.hasOutdoorScript || episode.hasAnimationMd)
          .slice()
          .sort((left, right) => left.title.localeCompare(right.title));
        return { series, episodes };
      })
      .filter((entry) => entry.episodes.length > 0);
  }, [catalog]);

  const headerActions = [
    { label: 'Mac', onPress: onOpenSettings },
    { label: 'Platforms', onPress: navigateToPlatforms },
    {
      label: refreshing ? 'Refreshing…' : 'Refresh',
      onPress: () => {
        void handleRefresh();
      },
      disabled: refreshing || scanning,
    },
    {
      label: scanning ? 'Scanning…' : 'Scan iCloud inbox',
      onPress: () => {
        void handleScanInbox();
      },
      disabled: scanning || refreshing,
    },
  ];

  return (
    <View style={sharedStyles.screen}>
      <Header title="Scripts" actions={headerActions} />
      <InboxBanner />
      <View
        style={[
          sharedStyles.banner,
          offlineFilming ? sharedStyles.bannerOffline : sharedStyles.bannerOnline,
        ]}
      >
        <Text
          style={
            offlineFilming ? sharedStyles.bannerOfflineText : sharedStyles.bannerOnlineText
          }
        >
          {offlineFilming
            ? 'Mac offline · cached scripts on iPhone · filming still works'
            : refreshNote
              ? refreshNote
              : 'Reading scripts from Mac · video_ops/scripts/ · Refresh rescans animation.md'}
        </Text>
      </View>
      <ScrollView contentContainerStyle={layoutStyles.main}>
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={colors.orange} />
            <Text style={sharedStyles.mutedText}>Loading…</Text>
          </View>
        ) : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {!loading && !error && episodesBySeries.length === 0 ? (
          <Text style={sharedStyles.mutedText}>
            No outdoor scripts found under video_ops/scripts/
          </Text>
        ) : null}
        {episodesBySeries.map(({ series, episodes }) => (
          <View key={series.id}>
            <View style={styles.seriesHeader}>
              <Text style={[styles.seriesTitle, layout === 'browser' ? styles.seriesTitleBrowser : null]}>
                {series.title}
              </Text>
              {series.description ? (
                <Text style={styles.seriesSub}>{series.description}</Text>
              ) : null}
            </View>
            {episodes.map((episode) => (
              <EpisodeCard
                key={episode.scriptId}
                episode={episode}
                seriesId={series.id}
                cardStyle={layoutStyles.card}
                onPress={() => navigateToScript(episode.scriptId)}
              />
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

type EpisodeCardProps = {
  episode: VideoOpsCatalogScript;
  seriesId: string;
  cardStyle: object;
  onPress: () => void;
};

function EpisodeCard({ episode, seriesId, cardStyle, onPress }: EpisodeCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [cardStyle, pressed ? styles.cardPressed : null]}
    >
      <View style={sharedStyles.cardTop}>
        <Text style={sharedStyles.cardTitle}>{episode.title}</Text>
        <Badge label={takeStatusLabel(episode.takeCount)} filmed={episode.takeCount > 0} />
      </View>
      <Text style={sharedStyles.cardMeta}>
        {episode.slideCount || 0} slides
        {episode.takeCount
          ? ` · ${episode.takeCount} take${episode.takeCount === 1 ? '' : 's'}`
          : ''}
        {` · ${episode.seriesId || seriesId}`}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  centered: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xl,
  },
  error: {
    color: colors.offline,
    marginBottom: spacing.md,
  },
  seriesHeader: {
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  seriesTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  seriesTitleBrowser: {
    fontSize: 22,
  },
  seriesSub: {
    color: colors.muted,
    fontSize: typography.small,
    marginTop: 2,
  },
  cardPressed: {
    borderColor: 'rgba(249, 115, 22, 0.45)',
  },
});
