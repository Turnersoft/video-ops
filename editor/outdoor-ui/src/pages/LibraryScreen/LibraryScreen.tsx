import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from "react-native";

import { formatOutdoorApiError } from "../../api/client";
import { Header } from "../../components/Header/Header";
import { InboxBanner } from "../../components/InboxBanner/InboxBanner";
import { Badge } from "../../components/Badge/Badge";
import { useOutdoorUi } from "../../context/OutdoorUiContext";
import { useOutdoorRoute } from "../../hooks/useOutdoorRoute";
import { colors, sharedStyles, spacing, typography, radii } from "../../theme";
import type {
  VideoOpsCatalog,
  VideoOpsCatalogScript,
  VideoOpsCatalogSeries,
} from "../../types";
import { takeStatusLabel, freshnessTone, seriesProgressCounts, seriesProgressLabel } from "../../utils/format";
import { catalogEpisodesBySeries } from "../../utils/catalogEpisodesBySeries";
import classes from './LibraryScreen.module.scss';

const SERIES_FILTER_KEY = "outdoor-library-series-filter";
const DOCK_BOTTOM_GAP = 10;
const DOCK_SCROLL_EXTRA = 8;
const DEFAULT_DOCK_INSET = 168;

type SeriesEntry = {
  index: number;
  series: VideoOpsCatalogSeries;
  episodes: VideoOpsCatalogScript[];
};

function readSeriesFilter(): string {
  if (typeof window === "undefined") {
    return "all";
  }
  try {
    return window.sessionStorage.getItem(SERIES_FILTER_KEY) ?? "all";
  } catch {
    return "all";
  }
}

function writeSeriesFilter(value: string): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.sessionStorage.setItem(SERIES_FILTER_KEY, value);
  } catch {
    // ignore
  }
}

export function LibraryScreen() {
  const {
    api,
    layout,
    invalidateAll,
    refreshKey,
    onOpenSettings,
    offlineFilming,
  } = useOutdoorUi();
  const { navigateToPlatforms, navigateToScript } = useOutdoorRoute();
  const [catalog, setCatalog] = useState<VideoOpsCatalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [refreshNote, setRefreshNote] = useState<string | null>(null);
  const [seriesFilter, setSeriesFilter] = useState(readSeriesFilter);
  const [dockInset, setDockInset] = useState(DEFAULT_DOCK_INSET);
  const isBrowser = layout === "browser";

  const handleDockLayout = useCallback((event: LayoutChangeEvent) => {
    const nextInset =
      event.nativeEvent.layout.height + DOCK_BOTTOM_GAP + DOCK_SCROLL_EXTRA;
    setDockInset((current) => (current === nextInset ? current : nextInset));
  }, []);

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
          (errCount ? ` · ${errCount} error(s)` : ""),
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

  const episodesBySeries = useMemo((): SeriesEntry[] => catalogEpisodesBySeries(catalog), [catalog]);

  useEffect(() => {
    if (seriesFilter === "all") {
      return;
    }
    if (!episodesBySeries.some((entry) => entry.series.id === seriesFilter)) {
      setSeriesFilter("all");
      writeSeriesFilter("all");
    }
  }, [episodesBySeries, seriesFilter]);

  const selectSeries = useCallback((value: string) => {
    setSeriesFilter(value);
    writeSeriesFilter(value);
  }, []);

  const visibleSeries = useMemo(() => {
    if (seriesFilter === "all") {
      return episodesBySeries;
    }
    return episodesBySeries.filter((entry) => entry.series.id === seriesFilter);
  }, [episodesBySeries, seriesFilter]);

  const headerActions = [
    { label: "Mac", onPress: onOpenSettings },
    { label: "Platforms", onPress: navigateToPlatforms },
    {
      label: refreshing ? "Refreshing…" : "Refresh",
      onPress: () => {
        void handleRefresh();
      },
      disabled: refreshing || scanning,
    },
    {
      label: scanning ? "Scanning…" : "Scan iCloud inbox",
      onPress: () => {
        void handleScanInbox();
      },
      disabled: scanning || refreshing,
    },
  ];

  const statusParts = offlineFilming
    ? [
        { kind: "warn" as const, text: "Mac offline" },
        { kind: "muted" as const, text: "cached scripts on iPhone" },
        { kind: "ok" as const, text: "filming still works" },
      ]
    : refreshNote
      ? refreshNote
          .split("·")
          .map((part) => part.trim())
          .filter(Boolean)
          .map((text, index) => ({
            kind: (index === 0
              ? "ok"
              : text.includes("error")
                ? "warn"
                : "muted") as "ok" | "warn" | "muted" | "path",
            text,
          }))
      : [
          { kind: "ok" as const, text: "Reading projects from Mac" },
          { kind: "path" as const, text: "video_ops/projects/" },
          { kind: "muted" as const, text: "Refresh rescans animation.md" },
        ];

  const totalScripts = episodesBySeries.reduce(
    (sum, entry) => sum + entry.episodes.length,
    0,
  );

  const allProgress = useMemo(
    () =>
      seriesProgressCounts(
        episodesBySeries.flatMap((entry) => entry.episodes),
      ),
    [episodesBySeries],
  );

  return (
    <View style={[sharedStyles.screen, styles.screen]}>
      <View style={styles.headerWrap}>
        <Header title="Scripts" actions={headerActions} />
      </View>

      <View
        style={[
          styles.body,
          isBrowser ? styles.bodyBrowser : styles.bodyMobile,
        ]}
      >
        <View
          style={[
            styles.sidebar,
            isBrowser ? styles.sidebarBrowser : styles.sidebarMobile,
          ]}
        >
          <Text style={styles.sidebarTitle}>Series</Text>
          <ScrollView
            style={[styles.sidebarScroll, styles.scrollPane]}
            horizontal={!isBrowser}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={
              isBrowser
                ? [styles.sidebarBody, { paddingBottom: dockInset }]
                : styles.sidebarBodyMobile
            }
          >
            <Pressable
              accessibilityRole="button"
              onPress={() => selectSeries("all")}
              style={[
                styles.seriesChip,
                seriesFilter === "all" ? styles.seriesChipActive : null,
              ]}
            >
              <Text
                style={[
                  styles.seriesChipIndex,
                  seriesFilter === "all" ? styles.seriesChipTextActive : null,
                ]}
              >
                All
              </Text>
              <View style={styles.seriesChipBody}>
                <Text
                  style={[
                    styles.seriesChipMeta,
                    seriesFilter === "all" ? styles.seriesChipTextActive : null,
                  ]}
                >
                  {totalScripts} script{totalScripts === 1 ? "" : "s"}
                </Text>
                <Text
                  style={[
                    styles.seriesChipProgress,
                    seriesFilter === "all" ? styles.seriesChipProgressActive : null,
                  ]}
                  numberOfLines={1}
                >
                  {seriesProgressLabel(allProgress)}
                </Text>
              </View>
            </Pressable>
            {episodesBySeries.map(({ index, series, episodes }) => {
              const active = seriesFilter === series.id;
              const progress = seriesProgressCounts(episodes);
              return (
                <Pressable
                  key={series.id}
                  accessibilityRole="button"
                  onPress={() => selectSeries(series.id)}
                  style={[
                    styles.seriesChip,
                    active ? styles.seriesChipActive : null,
                  ]}
                >
                  <Text
                    style={[
                      styles.seriesChipIndex,
                      active ? styles.seriesChipTextActive : null,
                    ]}
                  >
                    {index}
                  </Text>
                  <View style={styles.seriesChipBody}>
                    <Text
                      style={[
                        styles.seriesChipTitle,
                        active ? styles.seriesChipTextActive : null,
                      ]}
                      numberOfLines={isBrowser ? 2 : 1}
                    >
                      {series.title}
                    </Text>
                    <Text
                      style={[
                        styles.seriesChipMeta,
                        active ? styles.seriesChipTextActive : null,
                      ]}
                    >
                      {episodes.length} script{episodes.length === 1 ? "" : "s"}
                    </Text>
                    <Text
                      style={[
                        styles.seriesChipProgress,
                        active ? styles.seriesChipProgressActive : null,
                      ]}
                      numberOfLines={1}
                    >
                      {seriesProgressLabel(progress)}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <ScrollView
          style={[styles.listScroll, styles.scrollPane]}
          contentContainerStyle={[
            styles.listBody,
            { paddingBottom: dockInset },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          {loading ? (
            <View style={styles.centered}>
              <ActivityIndicator color={colors.orange} />
              <Text style={sharedStyles.mutedText}>Loading…</Text>
            </View>
          ) : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {!loading && !error && episodesBySeries.length === 0 ? (
            <Text style={sharedStyles.mutedText}>
              No outdoor scripts found under video_ops/projects/
            </Text>
          ) : null}
          {visibleSeries.map(({ index, series, episodes }) => (
            <View key={series.id} style={styles.seriesBlock}>
              <View style={styles.seriesHeader}>
                <Text style={styles.seriesNumber}>{index}</Text>
                <View style={styles.seriesHeaderText}>
                  <Text style={styles.seriesTitle} numberOfLines={1}>
                    {series.title}
                  </Text>
                  <Text style={styles.seriesSub} numberOfLines={1}>
                    {episodes.length} script{episodes.length === 1 ? "" : "s"}
                    {series.description ? ` · ${series.description}` : ""}
                  </Text>
                </View>
              </View>
              {episodes.map((episode) => (
                <EpisodeCard
                  key={episode.scriptId}
                  episode={episode}
                  onPress={() => navigateToScript(episode.scriptId)}
                />
              ))}
            </View>
          ))}
        </ScrollView>
      </View>

      <View
        style={styles.floatDock}
        pointerEvents="box-none"
        onLayout={handleDockLayout}
      >
        <InboxBanner variant="embedded" />
        <View style={styles.statusRow}>
          {statusParts.map((part) => (
            <View
              key={`${part.kind}-${part.text}`}
              style={[
                styles.statusChip,
                part.kind === "ok"
                  ? styles.statusChipOk
                  : part.kind === "warn"
                    ? styles.statusChipWarn
                    : part.kind === "path"
                      ? styles.statusChipPath
                      : styles.statusChipMuted,
              ]}
            >
              <Text
                style={[
                  styles.statusChipText,
                  part.kind === "ok"
                    ? styles.statusTextOk
                    : part.kind === "warn"
                      ? styles.statusTextWarn
                      : part.kind === "path"
                        ? styles.statusTextPath
                        : styles.statusTextMuted,
                ]}
                numberOfLines={1}
              >
                {part.text}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

type EpisodeCardProps = {
  episode: VideoOpsCatalogScript;
  onPress: () => void;
};

function EpisodeCard({ episode, onPress }: EpisodeCardProps) {
  const freshness = episode.freshnessLabel ?? "unknown";
  const tone = freshnessTone(episode.freshnessDaysAgo);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.episodeCard,
        pressed ? styles.cardPressed : null,
      ]}
    >
      <View style={styles.episodeTop}>
        <Text style={styles.episodeTitle} numberOfLines={1}>
          {episode.title}
        </Text>
        <View style={styles.cardBadges}>
          <FreshnessTag label={freshness} tone={tone} />
          <Badge
            label={takeStatusLabel(episode.takeCount)}
            filmed={episode.takeCount > 0}
          />
        </View>
      </View>
      <Text style={styles.episodeMeta} numberOfLines={1}>
        {episode.slideCount || 0} slides
        {episode.takeCount
          ? ` · ${episode.takeCount} take${episode.takeCount === 1 ? "" : "s"}`
          : ""}
      </Text>
    </Pressable>
  );
}

function FreshnessTag({
  label,
  tone,
}: {
  label: string;
  tone: ReturnType<typeof freshnessTone>;
}) {
  return (
    <View
      style={[
        styles.freshnessTag,
        tone === "fresh"
          ? styles.freshnessFresh
          : tone === "recent"
            ? styles.freshnessRecent
            : tone === "stale"
              ? styles.freshnessStale
              : styles.freshnessUnknown,
      ]}
    >
      <Text style={styles.freshnessText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    height: "100%",
    minHeight: 0,
    position: "relative",
    overflow: "hidden",
  },
  headerWrap: {
    flexShrink: 0,
  },
  body: {
    flex: 1,
    minHeight: 0,
    overflow: "hidden",
  },
  bodyBrowser: {
    flexDirection: "row",
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    gap: spacing.sm,
    flex: 1,
    minHeight: 0,
  },
  bodyMobile: {
    flexDirection: "column",
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.xs,
    gap: spacing.xs,
  },
  sidebar: {
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radii.sm,
    backgroundColor: "rgba(2, 6, 23, 0.55)",
    overflow: "hidden",
    flexDirection: "column",
  },
  sidebarBrowser: {
    width: 220,
    minWidth: 200,
    maxWidth: 240,
    flexShrink: 0,
    minHeight: 0,
    alignSelf: "stretch",
  },
  sidebarMobile: {
    flexShrink: 0,
  },
  sidebarTitle: {
    color: colors.section,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
    paddingBottom: 4,
  },
  sidebarScroll: {
    flex: 1,
    minHeight: 0,
  },
  scrollPane: {
    flex: 1,
    minHeight: 0,
  },
  sidebarBody: {
    padding: spacing.xs,
    gap: 4,
    paddingBottom: spacing.sm,
  },
  sidebarBodyMobile: {
    paddingHorizontal: spacing.xs,
    paddingBottom: spacing.xs,
    gap: 4,
    flexDirection: "row",
    alignItems: "stretch",
  },
  seriesChip: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.xs,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: "transparent",
    paddingHorizontal: spacing.xs,
    paddingVertical: 6,
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    minWidth: 120,
  },
  seriesChipActive: {
    borderColor: "rgba(249, 115, 22, 0.65)",
    backgroundColor: "rgba(249, 115, 22, 0.18)",
  },
  seriesChipIndex: {
    color: colors.orange,
    fontWeight: "800",
    fontSize: typography.small,
    minWidth: 22,
  },
  seriesChipBody: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  seriesChipTitle: {
    color: colors.text,
    fontWeight: "700",
    fontSize: typography.tiny,
  },
  seriesChipMeta: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: "600",
  },
  seriesChipProgress: {
    color: colors.muted2,
    fontSize: 9,
    fontWeight: "600",
    marginTop: 1,
  },
  seriesChipProgressActive: {
    color: "#fdba74",
  },
  seriesChipTextActive: {
    color: "#fdba74",
  },
  listScroll: {
    flex: 1,
    minHeight: 0,
    minWidth: 0,
  },
  listBody: {
    gap: spacing.sm,
  },
  seriesBlock: {
    gap: 4,
  },
  seriesHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.xs,
    marginBottom: 2,
  },
  seriesNumber: {
    color: colors.orange,
    fontSize: typography.small,
    fontWeight: "800",
    minWidth: 18,
  },
  seriesHeaderText: {
    flex: 1,
    minWidth: 0,
  },
  seriesTitle: {
    fontSize: typography.small,
    fontWeight: "800",
    color: colors.text,
  },
  seriesSub: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 1,
  },
  episodeCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    gap: 2,
  },
  episodeTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  episodeTitle: {
    flex: 1,
    minWidth: 0,
    fontSize: typography.small,
    fontWeight: "700",
    color: colors.text,
  },
  episodeMeta: {
    color: colors.muted,
    fontSize: 11,
  },
  floatDock: {
    position: Platform.OS === "web" ? "fixed" : "absolute",
    left: 12,
    right: 12,
    bottom: DOCK_BOTTOM_GAP,
    zIndex: 40,
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.28)",
    backgroundColor: "rgba(2, 6, 23, 0.94)",
    ...(Platform.OS === "web"
      ? { boxShadow: "0 6px 16px rgba(0, 0, 0, 0.4)" }
      : {
          shadowColor: "#000",
          shadowOpacity: 0.4,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 6 },
          elevation: 12,
        }),
  },
  floatDockBrowser: {
    maxWidth: 920,
    alignSelf: "center",
    width: "100%",
  },
  statusRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    paddingTop: 2,
  },
  statusChip: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusChipOk: {
    backgroundColor: "rgba(22, 101, 52, 0.28)",
  },
  statusChipWarn: {
    backgroundColor: "rgba(249, 115, 22, 0.18)",
  },
  statusChipPath: {
    backgroundColor: "rgba(30, 41, 59, 0.7)",
  },
  statusChipMuted: {
    backgroundColor: "rgba(51, 65, 85, 0.55)",
  },
  statusChipText: {
    fontSize: 11,
    fontWeight: "600",
  },
  statusTextOk: {
    color: colors.online,
  },
  statusTextWarn: {
    color: "#fdba74",
  },
  statusTextPath: {
    color: "#94a3b8",
    fontFamily: "Menlo",
    fontSize: 10,
  },
  statusTextMuted: {
    color: colors.muted,
  },
  centered: {
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.xl,
  },
  error: {
    color: colors.offline,
    marginBottom: spacing.sm,
    fontSize: typography.small,
  },
  cardPressed: {
    borderColor: "rgba(249, 115, 22, 0.45)",
  },
  cardBadges: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flexShrink: 0,
  },
  freshnessTag: {
    borderRadius: radii.pill,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  freshnessFresh: {
    backgroundColor: "rgba(22, 101, 52, 0.35)",
    borderWidth: 1,
    borderColor: "rgba(134, 239, 172, 0.35)",
  },
  freshnessRecent: {
    backgroundColor: "rgba(249, 115, 22, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(251, 191, 36, 0.35)",
  },
  freshnessStale: {
    backgroundColor: "rgba(51, 65, 85, 0.75)",
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  freshnessUnknown: {
    backgroundColor: "rgba(51, 65, 85, 0.55)",
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  freshnessText: {
    color: "#e2e8f0",
    fontSize: 10,
    fontWeight: "800",
  },
});
