import { useCallback, useEffect, useMemo, useState } from 'react';
import { layoutStylesFor } from '../../layout';
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { formatOutdoorApiError } from '../../api/client';
import { Header } from '../../components/Header/Header';
import { Button } from '../../components/Button/Button';
import { Badge } from '../../components/Badge/Badge';
import { SectionLabel } from '../../components/SectionLabel/SectionLabel';
import { TakeStepstones } from '../../components/TakeStepstones/TakeStepstones';
import { useOutdoorUi } from '../../context/OutdoorUiContext';
import { useOutdoorRoute } from '../../hooks/useOutdoorRoute';
import { colors, sharedStyles, spacing, typography } from '../../theme';
import type { LiveBeat, LiveScript, LocalTakeView, VideoOpsCatalogScript } from '../../types';
import { buildTakeEntries, type TakeEntry } from '../../utils/takeEntries';
import { isVoxcpmTake } from '../../utils/isVoxcpmTake';
import { fmtDate, fmtDuration, takeStatusLabel } from '../../utils/format';
import classes from './ScriptDetailScreen.module.scss';

export type ScriptDetailScreenProps = {
  scriptId: string;
  /** Takes hub opened from beat editor nav (#/script/:id/post). */
  mode?: 'overview' | 'post';
};

function TakeListCard({
  entry,
  onPress,
}: {
  entry: TakeEntry;
  onPress: () => void;
}) {
  const recordedAt = entry.local?.recordedAt ?? entry.mac?.recordedAt ?? null;
  const durationMs = entry.local?.durationMs ?? entry.mac?.durationMs ?? null;
  const where =
    entry.local && entry.mac
      ? 'iPhone + Mac'
      : entry.mac
        ? isVoxcpmTake(entry.takeId)
          ? 'AI clone (VoxCPM)'
          : 'Mac pipeline'
        : 'On iPhone';

  return (
    <Pressable style={[sharedStyles.card, styles.listCard]} onPress={onPress}>
      <View style={sharedStyles.cardTop}>
        {entry.local?.thumbnailUri ? (
          <Image source={{ uri: entry.local.thumbnailUri }} style={styles.thumb} />
        ) : (
          <View style={styles.thumbPlaceholder}>
            <Text style={styles.thumbPlaceholderText}>REC</Text>
          </View>
        )}
        <View style={styles.listHeader}>
          <Text style={sharedStyles.cardTitle}>{entry.label}</Text>
          <Text style={sharedStyles.cardMeta}>
            {recordedAt ? fmtDate(recordedAt) : entry.takeId}
            {durationMs ? ` · ${fmtDuration(durationMs)}` : ''}
          </Text>
          <Text style={styles.listWhere}>{where}</Text>
          {entry.local ? <Text style={styles.listStatus}>{entry.local.statusLabel}</Text> : null}
          {entry.mac?.pipelineStatus ? (
            <Text style={styles.listStatus}>
              {entry.mac.pipelineErrorTitle ?? entry.mac.pipelineStatus}
            </Text>
          ) : null}
          {entry.mac?.pipelineError && entry.mac.pipelineErrorTitle ? (
            <Text style={styles.listError} numberOfLines={2}>
              {entry.mac.pipelineError}
            </Text>
          ) : null}
        </View>
        <Badge label={isVoxcpmTake(entry.takeId) ? 'AI clone' : 'Open'} filmed={Boolean(entry.mac)} />
      </View>
      {entry.local ? <TakeStepstones steps={entry.local.steps} compact /> : null}
      <Text style={styles.tapHint}>Tap to open pipeline</Text>
    </Pressable>
  );
}

export function ScriptDetailScreen({
  scriptId,
  mode = 'overview',
}: ScriptDetailScreenProps) {
  const { layout, 
    api,
    mobile,
    onOpenFilm,
    refreshKey,
    invalidateAll,
    loadLocalTakes,
    takesRevision } = useOutdoorUi();
  const layoutStyles = layoutStylesFor(layout);
  const {
    navigateToLibrary,
    navigateToPlatforms,
    navigateToAnimation,
    navigateToTake,
    navigateToFilm,
    navigateToBeatPosters,
  } = useOutdoorRoute();
  const [live, setLive] = useState<LiveScript | null>(null);
  const [meta, setMeta] = useState<VideoOpsCatalogScript | null>(null);
  const [localTakes, setLocalTakes] = useState<LocalTakeView[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const load = useCallback(
    async (silent = false) => {
      if (!silent) {
        setError(null);
      }
      try {
        const [catalog, liveScript] = await Promise.all([
          api.getCatalog(),
          api.getLiveScript(scriptId).catch(async () => {
            const outdoor = await api.getOutdoorScript(scriptId);
            if (outdoor.beats?.length) {
              return {
                schemaVersion: 1 as const,
                id: outdoor.id,
                title: outdoor.title,
                language: outdoor.language ?? 'en',
                mode: 'timed' as const,
                countdownSeconds: outdoor.countdownSeconds ?? 3,
                source: (outdoor.source as LiveScript['source']) ?? 'animation.md',
                updatedAt: outdoor.updatedAt ?? null,
                slides: outdoor.slides,
                beats: outdoor.beats,
              };
            }
            return {
              schemaVersion: 1 as const,
              id: outdoor.id,
              title: outdoor.title,
              language: outdoor.language ?? 'en',
              mode: 'timed' as const,
              countdownSeconds: outdoor.countdownSeconds ?? 3,
              source: 'animation.md' as const,
              updatedAt: outdoor.updatedAt ?? null,
              slides: outdoor.slides,
              beats: (outdoor.slides ?? []).map((slide, index): LiveBeat => ({
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
          }),
        ]);
        const catalogMeta =
          (catalog.scripts ?? []).find((entry) => entry.scriptId === scriptId) ?? null;
        setMeta(catalogMeta);
        setLive(liveScript);
        setStatus(
          `Live from ${liveScript.source}${liveScript.updatedAt ? ` · ${liveScript.updatedAt}` : ''}`,
        );
      } catch (loadError) {
        if (!silent) {
          setError(formatOutdoorApiError(loadError));
          setLive(null);
        }
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    },
    [api, scriptId],
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await load(true);
    setRefreshing(false);
    invalidateAll();
  }, [invalidateAll, load]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load, refreshKey, takesRevision]);

  useEffect(() => {
    if (!mobile || !loadLocalTakes) {
      setLocalTakes([]);
      return;
    }
    void loadLocalTakes(scriptId).then(setLocalTakes).catch(() => setLocalTakes([]));
  }, [loadLocalTakes, mobile, scriptId, takesRevision, refreshKey]);

  const handleOpenFilm = useCallback(() => {
    if (Platform.OS === 'web') {
      navigateToFilm(scriptId);
      return;
    }
    onOpenFilm(scriptId);
  }, [navigateToFilm, onOpenFilm, scriptId]);

  const takeEntries = useMemo(
    () => buildTakeEntries(localTakes, meta?.takes ?? []),
    [localTakes, meta?.takes],
  );

  const isPostHub = mode === 'post';

  return (
    <View style={sharedStyles.screen}>
      <Header
        title={isPostHub ? 'Post-process' : live?.title ?? 'Script'}
        actions={[
          {
            label: isPostHub ? 'Edit script' : 'Scripts',
            onPress: isPostHub ? () => navigateToAnimation(scriptId) : navigateToLibrary,
            variant: 'back',
          },
          {
            label: refreshing ? '…' : 'Refresh',
            onPress: () => {
              void handleRefresh();
            },
            disabled: refreshing,
          },
          ...(isPostHub
            ? []
            : [
                {
                  label: 'Edit script',
                  onPress: () => navigateToAnimation(scriptId),
                  variant: 'primary' as const,
                },
              ]),
          { label: 'Platforms', onPress: navigateToPlatforms },
          { label: 'Film', onPress: handleOpenFilm, variant: 'primary' },
        ]}
      />
      <ScrollView contentContainerStyle={layoutStyles.main}>
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={colors.orange} />
          </View>
        ) : null}
        {status ? <Text style={styles.status}>{status}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {live ? (
          <>
            <Text style={[sharedStyles.cardMeta, styles.metaLine]}>
              {live.beats.length} beats · {takeStatusLabel(takeEntries.length)}
              {meta?.freshnessLabel ? ` · ${meta.freshnessLabel}` : ''}
              {meta?.seriesId ? ` · ${meta.seriesId}` : ''}
              {` · live ${live.source}`}
            </Text>

            <View style={styles.editCard}>
              <SectionLabel>{isPostHub ? 'Script summary' : 'Script'}</SectionLabel>
              <Text style={sharedStyles.mutedText}>
                {live.beats.length} beats from animation.md — edit one beat at a time with AI assist.
              </Text>
              {live.beats[0] ? (
                <Text style={styles.previewSay} numberOfLines={4}>
                  Beat 1: {live.beats[0].say}
                </Text>
              ) : null}
              <Button
                label={isPostHub ? 'Back to beat editor' : 'Open beat editor'}
                variant={isPostHub ? 'default' : 'primary'}
                onPress={() => navigateToAnimation(scriptId)}
              />
            </View>

            {isPostHub ? (
              <View style={styles.editCard}>
                <SectionLabel>Infographic publish</SectionLabel>
                <Text style={sharedStyles.mutedText}>
                  Beat-by-beat infographic cards (Lean + Turn-Lang) — one album post per platform,
                  separate from video takes.
                </Text>
                <Button
                  label="Open infographic publish"
                  variant="primary"
                  onPress={() => navigateToBeatPosters(scriptId)}
                />
              </View>
            ) : null}

            <SectionLabel>{isPostHub ? 'Video takes (separate workflow)' : 'Takes'}</SectionLabel>
            {takeEntries.length === 0 ? (
              <Text style={sharedStyles.mutedText}>
                No takes yet — tap Film to record. Each take is a card; tap to open its pipeline page.
              </Text>
            ) : (
              takeEntries.map((entry) => (
                <TakeListCard
                  key={entry.takeId}
                  entry={entry}
                  onPress={() => navigateToTake(scriptId, entry.takeId)}
                />
              ))
            )}
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  error: {
    color: colors.offline,
    marginBottom: spacing.md,
  },
  status: {
    color: colors.online,
    fontSize: typography.small,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  metaLine: {
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  editCard: {
    ...sharedStyles.slideCard,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  previewSay: {
    color: colors.muted,
    fontSize: typography.small,
    lineHeight: 20,
  },
  listCard: {
    gap: spacing.xs,
  },
  listHeader: {
    flex: 1,
    gap: 2,
  },
  listWhere: {
    color: colors.muted,
    fontSize: typography.small,
    fontWeight: '600',
  },
  listStatus: {
    color: colors.orange,
    fontSize: typography.small,
    fontWeight: '800',
  },
  listError: {
    color: colors.offline,
    fontSize: typography.tiny,
    lineHeight: 15,
  },
  tapHint: {
    color: colors.muted,
    fontSize: typography.tiny,
    fontWeight: '700',
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: 8,
    marginRight: spacing.sm,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
  },
  thumbPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 8,
    marginRight: spacing.sm,
    backgroundColor: 'rgba(127, 29, 29, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbPlaceholderText: {
    color: '#fecaca',
    fontWeight: '900',
    fontSize: typography.tiny,
  },
});
