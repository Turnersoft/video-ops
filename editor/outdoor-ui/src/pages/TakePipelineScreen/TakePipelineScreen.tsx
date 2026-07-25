import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { layoutStylesFor } from '../../layout';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { formatOutdoorApiError } from '../../api/client';
import { LocalTakeCard } from '../../components/LocalTakeCard/LocalTakeCard';
import { PipelineStagesPanel } from '../../components/PipelineStagesPanel/PipelineStagesPanel';
import { TakeResults } from '../../components/TakeResults/TakeResults';
import { Header } from '../../components/Header/Header';
import { SectionLabel } from '../../components/SectionLabel/SectionLabel';
import { useOutdoorUi } from '../../context/OutdoorUiContext';
import { useOutdoorRoute } from '../../hooks/useOutdoorRoute';
import { colors, sharedStyles, spacing, typography } from '../../theme';
import type { InboxFileSighting, LocalTakeView, VideoOpsCatalogScript } from '../../types';
import { buildTakeEntries } from '../../utils/takeEntries';
import classes from './TakePipelineScreen.module.scss';

export type TakePipelineScreenProps = {
  scriptId: string;
  takeId: string;
};

export function TakePipelineScreen({ scriptId, takeId }: TakePipelineScreenProps) {
  const { layout, 
    api,
    mobile,
    onOpenFilm,
    refreshKey,
    invalidateAll,
    loadLocalTakes,
    retryIcloudExport,
    takesRevision } = useOutdoorUi();
  const layoutStyles = layoutStylesFor(layout);
  const { navigateToScript, navigateToFilm } = useOutdoorRoute();

  const [meta, setMeta] = useState<VideoOpsCatalogScript | null>(null);
  const [localTakes, setLocalTakes] = useState<LocalTakeView[]>([]);
  const [inboxIngests, setInboxIngests] = useState<InboxFileSighting[]>([]);
  const [exportingTakeId, setExportingTakeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [resultsTick, setResultsTick] = useState(0);
  const stageSigRef = useRef('');
  const metaKeyRef = useRef('');
  const inboxKeyRef = useRef('');

  const jobId = `job-${takeId}`;

  const load = useCallback(
    async (silent = false) => {
      if (!silent) {
        setError(null);
      }
      try {
        const [catalog, inbox] = await Promise.all([
          api.getCatalog(),
          api.getInboxStatus().catch(() => null),
        ]);
        const catalogMeta =
          (catalog.scripts ?? []).find((entry) => entry.scriptId === scriptId) ?? null;
        const nextMetaKey = JSON.stringify({
          scriptId: catalogMeta?.scriptId,
          title: catalogMeta?.title,
          takes: (catalogMeta?.takes ?? []).map((take) => ({
            takeId: take.takeId,
            selectedRuns: take.selectedRuns,
            hasSourceVideo: take.hasSourceVideo,
            pipelineStatus: take.pipelineStatus,
          })),
        });
        if (nextMetaKey !== metaKeyRef.current) {
          metaKeyRef.current = nextMetaKey;
          setMeta(catalogMeta);
        }
        const nextInbox = inbox?.recentIngests ?? [];
        const nextInboxKey = JSON.stringify(
          nextInbox.map((item) => ({ takeId: item.takeId, takeDir: item.takeDir })),
        );
        if (nextInboxKey !== inboxKeyRef.current) {
          inboxKeyRef.current = nextInboxKey;
          setInboxIngests(nextInbox);
        }
        setStatus(catalogMeta?.title ? `Script: ${catalogMeta.title}` : null);
      } catch (loadError) {
        if (!silent) {
          setError(formatOutdoorApiError(loadError));
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
    if (loadLocalTakes) {
      setLocalTakes(await loadLocalTakes(scriptId).catch(() => []));
    }
    setRefreshing(false);
    setResultsTick((value) => value + 1);
  }, [load, loadLocalTakes, scriptId]);

  useEffect(() => {
    void load();
  }, [load]);

  const softReadyRef = useRef(false);
  useEffect(() => {
    // Soft refresh when global invalidate fires — never blank the page.
    if (!softReadyRef.current) {
      softReadyRef.current = true;
      return;
    }
    void load(true);
    setResultsTick((value) => value + 1);
  }, [load, refreshKey, takesRevision]);

  useEffect(() => {
    if (!mobile || !loadLocalTakes) {
      setLocalTakes([]);
      return;
    }
    void loadLocalTakes(scriptId).then(setLocalTakes).catch(() => setLocalTakes([]));
  }, [loadLocalTakes, mobile, scriptId, takesRevision, refreshKey]);

  useEffect(() => {
    const timer = setInterval(() => {
      void load(true);
    }, 8000);
    return () => clearInterval(timer);
  }, [load]);

  const handleSnapshot = useCallback((snapshot: {
    stages: Array<{ stage: string; status?: string | null; runId?: string | null }>;
  }) => {
    const sig = snapshot.stages
      .map((stage) => `${stage.stage}:${stage.status}:${stage.runId ?? ''}`)
      .join('|');
    if (sig === stageSigRef.current) {
      return;
    }
    const previous = stageSigRef.current;
    stageSigRef.current = sig;
    if (!previous) {
      return;
    }
    setResultsTick((value) => value + 1);
  }, []);

  const ingestByTakeId = useMemo(() => {
    const map = new Map<string, InboxFileSighting>();
    for (const ingest of inboxIngests) {
      map.set(ingest.takeId, ingest);
    }
    return map;
  }, [inboxIngests]);

  const entry = useMemo(
    () => buildTakeEntries(localTakes, meta?.takes ?? []).find((item) => item.takeId === takeId) ?? null,
    [localTakes, meta?.takes, takeId],
  );

  const ingest = ingestByTakeId.get(takeId) ?? null;

  const handleOpenFilm = useCallback(() => {
    if (Platform.OS === 'web') {
      navigateToFilm(scriptId);
      return;
    }
    onOpenFilm(scriptId);
  }, [navigateToFilm, onOpenFilm, scriptId]);

  const handleRetryIcloud = useCallback(async () => {
    if (!retryIcloudExport) {
      return;
    }
    setExportingTakeId(takeId);
    try {
      await retryIcloudExport(takeId);
      if (loadLocalTakes) {
        setLocalTakes(await loadLocalTakes(scriptId));
      }
      invalidateAll();
    } catch (exportError) {
      setError(formatOutdoorApiError(exportError));
    } finally {
      setExportingTakeId(null);
    }
  }, [invalidateAll, loadLocalTakes, retryIcloudExport, scriptId, takeId]);

  return (
    <View style={sharedStyles.screen}>
      <Header
        title={entry?.label ?? 'Take pipeline'}
        actions={[
          {
            label: 'Back',
            onPress: () => navigateToScript(scriptId),
            variant: 'back',
          },
          {
            label: refreshing ? '…' : 'Refresh',
            onPress: () => {
              void handleRefresh();
            },
            disabled: refreshing,
          },
          { label: 'Film', onPress: handleOpenFilm, variant: 'primary' },
        ]}
      />

      <View style={styles.shell}>
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={colors.orange} />
          </View>
        ) : (
          <ScrollView
            style={styles.pipelineScroll}
            contentContainerStyle={styles.pipelineScrollContent}
            nestedScrollEnabled
          >
            <View
              style={[
                {
                  maxWidth: layoutStyles.main.maxWidth,
                  width: '100%',
                  alignSelf: 'center',
                  paddingHorizontal: layoutStyles.main.paddingHorizontal,
                  paddingTop: layoutStyles.main.paddingTop,
                  paddingBottom: layoutStyles.main.paddingBottom,
                },
                styles.mainColumn,
              ]}
            >
              {error ? (
                <Text style={styles.error} numberOfLines={2}>
                  {error}
                </Text>
              ) : status ? (
                <Text style={styles.status} numberOfLines={1}>
                  {status}
                </Text>
              ) : null}

              {!entry ? (
                <Text style={sharedStyles.mutedText}>
                  Take not found on this phone or Mac yet.
                </Text>
              ) : (
                <>
                  <Text style={styles.takeIdLine}>{entry.takeId}</Text>

                  {entry.local ? (
                    <LocalTakeCard
                      take={entry.local}
                      exporting={exportingTakeId === takeId}
                      onExportToIcloud={
                        retryIcloudExport ? () => void handleRetryIcloud() : undefined
                      }
                    />
                  ) : null}

                  {entry.mac ? (
                    <View style={styles.pipelineWrap}>
                      <SectionLabel>Results</SectionLabel>
                      <TakeResults
                        scriptId={scriptId}
                        take={entry.mac}
                        refreshTick={resultsTick}
                      />
                      <PipelineStagesPanel
                        jobId={jobId}
                        onSnapshot={handleSnapshot}
                      />
                      {ingest?.takeDir ? (
                        <Text style={styles.pathLine}>Mac folder: {ingest.takeDir}</Text>
                      ) : null}
                    </View>
                  ) : (
                    <View style={styles.pipelineWaiting}>
                      <SectionLabel>Pipeline</SectionLabel>
                      <Text style={sharedStyles.mutedText}>
                        Pipeline unlocks after this take reaches your Mac (iCloud export or
                        auto-upload when online).
                      </Text>
                    </View>
                  )}
                </>
              )}
            </View>
          </ScrollView>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    minHeight: 0,
    width: '100%',
    alignSelf: 'stretch',
  },
  mainColumn: {
    gap: spacing.sm,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  status: {
    color: colors.online,
    fontSize: typography.small,
    fontWeight: '600',
    flexShrink: 0,
  },
  error: {
    color: colors.offline,
    fontSize: typography.small,
    flexShrink: 0,
  },
  pipelineScroll: {
    flex: 1,
    minHeight: 0,
    width: '100%',
  },
  pipelineScrollContent: {
    flexGrow: 1,
    width: '100%',
  },
  pipelineWrap: {
    gap: spacing.sm,
  },
  takeIdLine: {
    color: colors.muted,
    fontFamily: 'Menlo',
    fontSize: typography.tiny,
  },
  pathLine: {
    color: colors.code,
    fontFamily: 'Menlo',
    fontSize: typography.tiny,
    lineHeight: 15,
  },
  pipelineWaiting: {
    ...sharedStyles.slideCard,
    gap: spacing.xs,
  },
});
