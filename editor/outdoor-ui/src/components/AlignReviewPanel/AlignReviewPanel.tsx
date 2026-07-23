export type { AlignReviewPanelProps } from './AlignReviewPanel.types';

import classes from './AlignReviewPanel.module.scss';
import { webModuleStyle, webClassName } from '../../utils/webClassName';
import type { AlignReviewPanelProps } from './AlignReviewPanel.types';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { AbortStageButton } from '../AbortStageButton/AbortStageButton';
import { remotionEmbedFromOrigin } from '../../api/transport';
import { remotionStudioEmbedUrl, remotionStudioOrigin } from '../../api/urls';
import { useOutdoorUi } from '../../context/OutdoorUiContext';
import { pipelineStudioHeight, layoutStylesFor } from '../../layout';
import { colors, radii, spacing, typography } from '../../theme';
import type { AlignReviewPayload, AlignSaidLine, AlignSlidePreview } from '../../types';
import { RemotionEmbed, type RemotionEmbedHandle } from '../RemotionEmbed/RemotionEmbed';
import { StaleBanner } from '../StaleBanner/StaleBanner';
import { Button } from '../Button/Button';
import { SectionLabel } from '../SectionLabel/SectionLabel';

type AlignFormat = 'landscape' | 'portrait';

const BEAT_TOOLBAR_HEIGHT = 88;
const COMPARE_ROW_HEIGHT = 200;

export function AlignReviewPanel({
  jobId,
  onPipelineChange,
}: AlignReviewPanelProps) {
  const {  api, layout, invalidateAll, refreshKey, transport  } = useOutdoorUi();
  const layoutStyles = layoutStylesFor(layout);
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
      <View style={webModuleStyle(classes.card)}>
        <SectionLabel>Align · Remotion editor</SectionLabel>
        <ActivityIndicator color={colors.orange} />
      </View>
    );
  }

  if (error || !review) {
    return (
      <View style={webModuleStyle(classes.card)}>
        <SectionLabel>Align · Remotion editor</SectionLabel>
        <Text style={webModuleStyle(classes.meta)}>{error ?? 'No align run yet.'}</Text>
        <Button label="Retry" onPress={() => void load()} />
      </View>
    );
  }

  return (
    <View style={webModuleStyle(classes.card)}>
      <SectionLabel>Align · Remotion editor</SectionLabel>
      <Text style={webModuleStyle(classes.meta)}>
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
        <View style={webModuleStyle(classes.busyRow)}>
          <ActivityIndicator color={colors.orange} />
          <Text style={webModuleStyle(classes.meta)}>{busy}…</Text>
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
          style={webModuleStyle(classes.formatChip, format === 'landscape' ? classes.formatChipActive : null)}
          onPress={() => setFormat('landscape')}
        >
          <Text style={webModuleStyle(classes.formatChipText)}>Landscape</Text>
        </Pressable>
        <Pressable
          style={webModuleStyle(classes.formatChip, format === 'portrait' ? classes.formatChipActive : null)}
          onPress={() => setFormat('portrait')}
        >
          <Text style={webModuleStyle(classes.formatChipText)}>Portrait</Text>
        </Pressable>
      </View>

      {seekStatus ? <Text style={webModuleStyle(classes.meta)}>{seekStatus}</Text> : null}

      <View style={webModuleStyle(classes.alignStudio)}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={webModuleStyle(classes.beatScroll)}
          contentContainerStyle={layoutStyles.beatRow}
        >
          {(review.slides ?? []).map((slide) => {
            const active = activeSlideId === slide.slideId;
            return (
              <Pressable
                key={slide.slideId}
                style={[webModuleStyle(active ? classes.beatChipActive : null), layoutStyles.beatChip]}
                onPress={() => seekSlide(slide)}
              >
                <Text style={webModuleStyle(classes.beatIndex)}>{slide.beatIndex + 1}</Text>
                <Text style={webModuleStyle(classes.beatLabel)}>{slide.slideTitle}</Text>
                <Text style={webModuleStyle(classes.beatTime)}>{slide.editedStart.toFixed(1)}s</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={[webModuleStyle(classes.compareRow), layoutStyles.compareRow]}>
          <View style={[webModuleStyle(classes.comparePane), { maxHeight: COMPARE_ROW_HEIGHT }]}>
            <Text style={webModuleStyle(classes.compareTitle)}>Script</Text>
            <ScrollView nestedScrollEnabled contentContainerStyle={webModuleStyle(classes.compareBodyScroll)}>
              <Text style={webModuleStyle(classes.compareBody)}>
                {activeSlide?.say || 'No script for this beat.'}
              </Text>
            </ScrollView>
          </View>
          <View style={[webModuleStyle(classes.comparePane), { maxHeight: COMPARE_ROW_HEIGHT }]}>
            <Text style={webModuleStyle(classes.compareTitle)}>Said</Text>
            <ScrollView nestedScrollEnabled contentContainerStyle={webModuleStyle(classes.compareBodyScroll)}>
              {(activeSlide?.saidLines ?? []).length ? (
                (activeSlide?.saidLines ?? []).map((line) => (
                  <Pressable key={line.id} onPress={() => seekLine(line)}>
                    <Text style={webModuleStyle(classes.saidLine)}>{line.text}</Text>
                  </Pressable>
                ))
              ) : (
                <Text style={webModuleStyle(classes.meta)}>No spoken lines for this beat.</Text>
              )}
            </ScrollView>
          </View>
        </View>

        {embedUrl ? (
          <View
            style={[webModuleStyle(classes.remotionWrap, format === 'portrait' ? classes.remotionPortrait : null), { height: remotionHeight, minHeight: remotionHeight }]}
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
          <Text style={webModuleStyle(classes.meta)}>
            Start Remotion on Mac: cd video_ops/remotion && npm run studio:lan
          </Text>
        )}
      </View>
    </View>
  );
}
