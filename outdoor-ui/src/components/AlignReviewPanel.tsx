import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { AbortStageButton } from './AbortStageButton';
import { remotionEmbedFromOrigin } from '../api/transport';
import { remotionStudioEmbedUrl, remotionStudioOrigin } from '../api/urls';
import { useOutdoorUi } from '../context/OutdoorUiContext';
import { pipelineStudioHeight } from '../layout';
import { colors, radii, spacing, typography } from '../theme';
import type { AlignReviewPayload, AlignSaidLine, AlignSlidePreview } from '../types';
import { RemotionEmbed, type RemotionEmbedHandle } from './RemotionEmbed';
import { StaleBanner } from './StaleBanner';
import { Button } from './ui/Button';
import { SectionLabel } from './ui/SectionLabel';

export type AlignReviewPanelProps = {
  jobId: string;
  compositeLandscapeUrl?: string | null;
  onPipelineChange?: () => void;
};

type AlignFormat = 'landscape' | 'portrait';

const BEAT_TOOLBAR_HEIGHT = 88;
const COMPARE_ROW_HEIGHT = 200;

export function AlignReviewPanel({
  jobId,
  onPipelineChange,
}: AlignReviewPanelProps) {
  const { api, layout, layoutStyles, invalidateAll, refreshKey, transport } = useOutdoorUi();
  const { height: windowHeight } = useWindowDimensions();
  const studioHeight = pipelineStudioHeight(windowHeight, layout);
  const chromeHeight = BEAT_TOOLBAR_HEIGHT + COMPARE_ROW_HEIGHT + 16;
  const remotionHeight = Math.max(400, studioHeight - chromeHeight);
  const [review, setReview] = useState<AlignReviewPayload | null>(null);
  const [alignStaleReason, setAlignStaleReason] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [format, setFormat] = useState<AlignFormat>('landscape');
  const [seekStatus, setSeekStatus] = useState('');
  const [activeSlideId, setActiveSlideId] = useState<string | null>(null);
  const embedRef = useRef<RemotionEmbedHandle | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [next, detail] = await Promise.all([
        api.getAlignReview(jobId),
        api.getJob(jobId).catch(() => null),
      ]);
      setReview(next);
      const alignStage = detail?.results?.stages?.find((stage) => stage.stage === 'align');
      setAlignStaleReason(
        alignStage?.stale ? alignStage.staleReason ?? 'Align is outdated — rerun to refresh.' : null,
      );
      setActiveSlideId((prev) => prev ?? next.slides[0]?.slideId ?? null);
    } catch (loadError) {
      setReview(null);
      setError(loadError instanceof Error ? loadError.message : 'Align review unavailable');
    } finally {
      setLoading(false);
    }
  }, [api, jobId]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  const landscapeUrl = useMemo(() => {
    if (transport?.remotionOrigin) {
      return remotionEmbedFromOrigin(transport.remotionOrigin, 'video-outdoor-landscape');
    }
    if (!review) {
      return null;
    }
    return remotionStudioEmbedUrl(
      review.remotionCompositionUrl ?? review.remotionStudioUrl,
      'video-outdoor-landscape',
    );
  }, [review, transport?.remotionOrigin]);

  const portraitUrl = useMemo(() => {
    if (transport?.remotionOrigin) {
      return remotionEmbedFromOrigin(transport.remotionOrigin, 'video-outdoor-portrait');
    }
    if (!review) {
      return null;
    }
    return remotionStudioEmbedUrl(
      review.remotionPortraitUrl ?? review.remotionStudioUrl,
      'video-outdoor-portrait',
    );
  }, [review, transport?.remotionOrigin]);

  const embedUrl = format === 'portrait' ? portraitUrl : landscapeUrl;
  const compositionId =
    format === 'portrait' ? 'video-outdoor-portrait' : 'video-outdoor-landscape';

  const activeSlide = useMemo(
    () =>
      (review?.slides ?? []).find((slide) => slide.slideId === activeSlideId) ??
      review?.slides[0] ??
      null,
    [activeSlideId, review?.slides],
  );

  const seekSlide = (slide: AlignSlidePreview) => {
    const frame = Math.max(0, Math.round(slide.editedStart * 30));
    const label = slide.slideTitle || `Beat ${slide.beatIndex + 1}`;
    setActiveSlideId(slide.slideId);
    setSeekStatus(
      `${label} · seek ~${slide.editedStart.toFixed(1)}s (frame ${frame}) · ${format}`,
    );
    embedRef.current?.seekToFrame(frame, compositionId);
  };

  const seekLine = (line: AlignSaidLine) => {
    if (!activeSlide) {
      return;
    }
    const frame = Math.max(0, Math.round(line.start * 30));
    setSeekStatus(
      `${line.text.slice(0, 48)} · seek ~${line.start.toFixed(1)}s (frame ${frame}) · ${format}`,
    );
    embedRef.current?.seekToFrame(frame, compositionId);
  };

  const runStudioAction = async (label: string, action: () => Promise<void>) => {
    setBusy(label);
    try {
      await action();
      await load();
      invalidateAll();
      onPipelineChange?.();
    } catch (actionError) {
      Alert.alert(label, actionError instanceof Error ? actionError.message : 'Action failed');
    } finally {
      setBusy('');
    }
  };

  if (loading && !review) {
    return (
      <View style={styles.card}>
        <SectionLabel>Align · Remotion editor</SectionLabel>
        <ActivityIndicator color={colors.orange} />
      </View>
    );
  }

  if (error || !review) {
    return (
      <View style={styles.card}>
        <SectionLabel>Align · Remotion editor</SectionLabel>
        <Text style={styles.meta}>{error ?? 'No align run yet.'}</Text>
        <Button label="Retry" onPress={() => void load()} />
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <SectionLabel>Align · Remotion editor</SectionLabel>
      <Text style={styles.meta}>
        Beats + script/said above Remotion · tap beats to seek · on the video: yellow = mask
        net, blue = video net (original take) · layout {review.layoutPath}
      </Text>

      {alignStaleReason ? (
        <StaleBanner
          reason={alignStaleReason}
          actionLabel="Rerun align"
          busy={Boolean(busy)}
          onAction={() => {
            void runStudioAction('Rerun align', async () => {
              await api.runStage(jobId, 'align', { rerun: true });
              Alert.alert('Align updated', 'Align now uses the latest cut.');
            });
          }}
        />
      ) : null}

      {busy ? (
        <View style={styles.busyRow}>
          <ActivityIndicator color={colors.orange} />
          <Text style={styles.meta}>{busy}…</Text>
          <AbortStageButton
            jobId={jobId}
            label="Abort"
            onAborted={() => {
              setBusy('');
              void load();
              invalidateAll();
            }}
          />
        </View>
      ) : null}

      <View style={layoutStyles.pipelineToolbar}>
        {embedUrl ? (
          <Button
            label="Pop out Studio"
            onPress={() => void Linking.openURL(embedUrl)}
            variant="primary"
          />
        ) : null}
        <Button
          label={busy === 'Sync Studio layout → take' ? 'Syncing…' : 'Sync Studio layout → take'}
          onPress={() =>
            void runStudioAction('Sync Studio layout → take', async () => {
              await api.syncAlignStudio(jobId);
              Alert.alert('Synced', 'Pulled Remotion Studio layout into this take.');
            })
          }
          disabled={Boolean(busy)}
        />
        <Pressable
          style={[styles.formatChip, format === 'landscape' ? styles.formatChipActive : null]}
          onPress={() => setFormat('landscape')}
        >
          <Text style={styles.formatChipText}>Landscape</Text>
        </Pressable>
        <Pressable
          style={[styles.formatChip, format === 'portrait' ? styles.formatChipActive : null]}
          onPress={() => setFormat('portrait')}
        >
          <Text style={styles.formatChipText}>Portrait</Text>
        </Pressable>
      </View>

      {seekStatus ? <Text style={styles.meta}>{seekStatus}</Text> : null}

      <View style={styles.alignStudio}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.beatScroll}
          contentContainerStyle={layoutStyles.beatRow}
        >
          {(review.slides ?? []).map((slide) => {
            const active = activeSlideId === slide.slideId;
            return (
              <Pressable
                key={slide.slideId}
                style={[layoutStyles.beatChip, active ? styles.beatChipActive : null]}
                onPress={() => seekSlide(slide)}
              >
                <Text style={styles.beatIndex}>{slide.beatIndex + 1}</Text>
                <Text style={styles.beatLabel}>{slide.slideTitle}</Text>
                <Text style={styles.beatTime}>{slide.editedStart.toFixed(1)}s</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={[layoutStyles.compareRow, styles.compareRow]}>
          <View style={[styles.comparePane, { maxHeight: COMPARE_ROW_HEIGHT }]}>
            <Text style={styles.compareTitle}>Script</Text>
            <ScrollView nestedScrollEnabled contentContainerStyle={styles.compareBodyScroll}>
              <Text style={styles.compareBody}>
                {activeSlide?.say || 'No script for this beat.'}
              </Text>
            </ScrollView>
          </View>
          <View style={[styles.comparePane, { maxHeight: COMPARE_ROW_HEIGHT }]}>
            <Text style={styles.compareTitle}>Said</Text>
            <ScrollView nestedScrollEnabled contentContainerStyle={styles.compareBodyScroll}>
              {(activeSlide?.saidLines ?? []).length ? (
                (activeSlide?.saidLines ?? []).map((line) => (
                  <Pressable key={line.id} onPress={() => seekLine(line)}>
                    <Text style={styles.saidLine}>{line.text}</Text>
                  </Pressable>
                ))
              ) : (
                <Text style={styles.meta}>No spoken lines for this beat.</Text>
              )}
            </ScrollView>
          </View>
        </View>

        {embedUrl ? (
          <View
            style={[
              styles.remotionWrap,
              format === 'portrait' ? styles.remotionPortrait : null,
              { height: remotionHeight, minHeight: remotionHeight },
            ]}
          >
            <RemotionEmbed
              ref={embedRef}
              url={embedUrl}
              studioOrigin={remotionStudioOrigin(
                transport?.remotionOrigin ?? landscapeUrl ?? embedUrl,
              )}
              compositionId={compositionId}
            />
          </View>
        ) : (
          <Text style={styles.meta}>
            Start Remotion on Mac: cd video_ops/remotion && npm run studio:lan
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
    marginBottom: spacing.xl,
    overflow: 'hidden',
  },
  meta: {
    color: colors.muted,
    fontSize: typography.small,
    lineHeight: 18,
  },
  busyRow: {
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.35)',
    backgroundColor: 'rgba(249, 115, 22, 0.08)',
  },
  alignStudio: {
    width: '100%',
    gap: 10,
    overflow: 'hidden',
  },
  beatScroll: {
    flexGrow: 0,
    flexShrink: 0,
    maxHeight: BEAT_TOOLBAR_HEIGHT,
  },
  compareRow: {
    flexGrow: 0,
    flexShrink: 0,
  },
  beatChipActive: {
    backgroundColor: 'rgba(249, 115, 22, 0.35)',
  },
  beatIndex: {
    color: colors.orange,
    fontWeight: '800',
    fontSize: typography.tiny,
  },
  beatLabel: {
    color: colors.text,
    fontWeight: '700',
    fontSize: typography.tiny,
  },
  beatTime: {
    color: colors.muted,
    fontSize: 11,
  },
  remotionWrap: {
    width: '100%',
    minHeight: 0,
    overflow: 'hidden',
    flexShrink: 0,
  },
  remotionPortrait: {
    maxWidth: 420,
    alignSelf: 'center',
    width: '100%',
  },
  comparePane: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.55)',
    borderRadius: radii.sm,
    padding: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.14)',
    minHeight: 120,
    overflow: 'hidden',
  },
  compareTitle: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  compareBodyScroll: {
    paddingBottom: spacing.sm,
  },
  compareBody: {
    color: '#e2e8f0',
    fontSize: typography.small,
    lineHeight: 20,
  },
  saidLine: {
    color: '#cbd5e1',
    fontSize: typography.small,
    lineHeight: 18,
    marginBottom: 6,
  },
  formatChip: {
    borderRadius: radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(51, 65, 85, 0.9)',
  },
  formatChipActive: {
    backgroundColor: 'rgba(249, 115, 22, 0.35)',
  },
  formatChipText: {
    color: '#e2e8f0',
    fontWeight: '800',
    fontSize: typography.tiny,
  },
});
