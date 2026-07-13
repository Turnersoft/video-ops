import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { AbortStageButton } from './AbortStageButton';
import { useOutdoorUi } from '../context/OutdoorUiContext';
import { pipelineStudioHeight } from '../layout';
import { colors, radii, spacing, typography } from '../theme';
import type { CutReviewPayload, CutTranscriptLine } from '../types';
import { sourceUrl } from '../api/urls';
import { PipelineVideo, type PipelineVideoHandle } from './PipelineVideo';
import { StaleBanner } from './StaleBanner';
import { Button } from './ui/Button';
import { SectionLabel } from './ui/SectionLabel';

export type CutReviewPanelProps = {
  jobId: string;
  scriptId: string;
  takeId: string;
  /** Parent reloads cut review after pipeline changes — keeps stale banners in sync. */
  reviewFromParent?: CutReviewPayload | null;
  /** Parent hides Align/Composite/Social and shows progress while rebuild runs. */
  onRebuildPhase?: (phase: string | null) => void;
};

function kindLabel(line: CutTranscriptLine): string {
  if (line.kind === 'silence') {
    return 'silent';
  }
  if (line.kind === 'keep') {
    return 'keep';
  }
  return line.kind;
}

export function CutReviewPanel({
  jobId,
  scriptId,
  takeId,
  reviewFromParent,
  onRebuildPhase,
}: CutReviewPanelProps) {
  const { api, layout, layoutStyles, invalidateAll, refreshKey } = useOutdoorUi();
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const studioHeight = pipelineStudioHeight(windowHeight, layout);
  // Stack transcript under video on iPhone / portrait / narrow shells.
  // Mac spacious browser stays side-by-side when wide + landscape.
  const stackPortrait =
    layout === 'mobile' || windowWidth < windowHeight || windowWidth < 720;
  const videoTallHeight = stackPortrait
    ? Math.max(220, Math.min(Math.round(windowWidth * (9 / 16)), Math.round(windowHeight * 0.4)))
    : Math.max(280, studioHeight - 48);
  const transcriptMaxHeight = stackPortrait
    ? Math.max(220, Math.round(windowHeight * 0.42))
    : studioHeight;
  const [review, setReview] = useState<CutReviewPayload | null>(null);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [busyLabel, setBusyLabel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeLineId, setActiveLineId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const videoRef = useRef<PipelineVideoHandle | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [nextReview] = await Promise.all([api.getCutReview(jobId)]);
      // Same footage cut/apply use: stabilized when available (audio timeline matches source).
      const previewPath =
        nextReview.previewVideoUrl ||
        nextReview.sourceVideoUrl ||
        sourceUrl(api.baseUrl, scriptId, takeId);
      const source = await api.absoluteUrl(previewPath);
      setReview(nextReview);
      setVideoSrc(source);
    } catch (loadError) {
      setReview(null);
      setVideoSrc(null);
      setError(loadError instanceof Error ? loadError.message : 'Cut review unavailable');
    } finally {
      setLoading(false);
    }
  }, [api, jobId, scriptId, takeId]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  useEffect(() => {
    if (!reviewFromParent) {
      return;
    }
    void (async () => {
      const previewPath =
        reviewFromParent.previewVideoUrl ||
        reviewFromParent.sourceVideoUrl ||
        sourceUrl(api.baseUrl, scriptId, takeId);
      const source = await api.absoluteUrl(previewPath);
      setReview(reviewFromParent);
      setVideoSrc(source);
      setLoading(false);
    })();
  }, [api, reviewFromParent, scriptId, takeId]);

  const toggleLine = async (line: CutTranscriptLine) => {
    if (!review || busy) {
      return;
    }
    const selection = {
      schemaVersion: 1 as const,
      restoreBad: [...(review.selection.restoreBad ?? [])],
      dropGood: [...(review.selection.dropGood ?? [])],
      updatedAt: new Date().toISOString(),
    };
    const keyMatch = (interval: { start: number; end: number }) =>
      Math.abs(interval.start - line.toggleStart) < 0.05 &&
      Math.abs(interval.end - line.toggleEnd) < 0.05;

    if (line.toggleMode === 'bad') {
      if (line.kept) {
        selection.restoreBad = selection.restoreBad.filter((interval) => !keyMatch(interval));
      } else if (!selection.restoreBad.some(keyMatch)) {
        selection.restoreBad.push({ start: line.toggleStart, end: line.toggleEnd });
      }
    } else if (line.kept) {
      if (!selection.dropGood.some(keyMatch)) {
        selection.dropGood.push({ start: line.toggleStart, end: line.toggleEnd });
      }
    } else {
      selection.dropGood = selection.dropGood.filter((interval) => !keyMatch(interval));
    }

    setBusy(true);
    try {
      const next = await api.saveCutSelection(jobId, selection);
      setReview(next);
    } catch (toggleError) {
      Alert.alert(
        'Cut selection',
        toggleError instanceof Error ? toggleError.message : 'Could not update selection',
      );
    } finally {
      setBusy(false);
    }
  };

  const waitForCutSuccess = async (prevCutId: string | null) => {
    const deadline = Date.now() + 15 * 60_000;
    while (Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      const snapshot = await api.getPipelineSnapshot(jobId).catch(() => null);
      const cutEntry = snapshot?.stages.find((stage) => stage.stage === 'cut');
      const cutStatus = cutEntry?.status;
      if (cutStatus === 'cancelled') {
        throw new Error('Pipeline aborted');
      }
      const detail = await api.getJob(jobId).catch(() => null);
      const cutId = detail?.job?.selectedRuns?.cut ?? null;
      const cutRun = (detail?.job?.runs?.cut ?? []).find((run) => run.runId === cutId);
      const status = cutRun?.status ?? cutStatus;
      if (cutId && cutId !== prevCutId && status === 'succeeded') {
        return;
      }
      if (status === 'failed' || status === 'cancelled') {
        throw new Error(status === 'failed' ? 'Cut failed' : 'Pipeline aborted');
      }
      const percent =
        typeof cutEntry?.progress?.percent === 'number'
          ? ` ${Math.round(cutEntry.progress.percent)}%`
          : '';
      const message = cutEntry?.progress?.message
        ? ` — ${cutEntry.progress.message}`
        : status === 'running'
          ? ' — running'
          : ' — starting';
      setBusyLabel(`Rerunning Cut · sentence keep / cut${percent}${message}`);
      onRebuildPhase?.(`Rerunning Cut · sentence keep / cut${percent}${message}`);
    }
    throw new Error('Timed out waiting for Cut');
  };

  const rerunCut = async () => {
    if (busy) {
      return;
    }
    setBusy(true);
    setBusyLabel('Rerunning Cut · sentence keep / cut…');
    onRebuildPhase?.('Rerunning Cut · sentence keep / cut…');
    try {
      const before = await api.getJob(jobId).catch(() => null);
      const prevCutId = before?.job?.selectedRuns?.cut ?? null;
      await api.runStage(jobId, 'cut', { rerun: true });
      await waitForCutSuccess(prevCutId);
      setBusyLabel('Refreshing sentence keep / cut…');
      onRebuildPhase?.('Refreshing sentence keep / cut…');
      await load();
      invalidateAll();
      Alert.alert('Cut updated', 'Sentence keep / cut transcript refreshed.');
    } catch (rerunError) {
      const message = rerunError instanceof Error ? rerunError.message : 'Could not rerun cut';
      if (message !== 'Pipeline aborted') {
        Alert.alert('Cut rerun failed', message);
      }
    } finally {
      setBusy(false);
      setBusyLabel(null);
      onRebuildPhase?.(null);
    }
  };

  const rebuild = async () => {
    if (!review || busy) {
      return;
    }
    setBusy(true);
    setBusyLabel(
      review.needsStabilizedApply
        ? 'Rebuilding edited cut from stabilized video…'
        : 'Rebuilding edited cut from your keep/cut choices…',
    );
    onRebuildPhase?.(
      review.needsStabilizedApply
        ? 'Rebuilding edited cut from stabilized video (same keep/cut choices)…'
        : 'Rebuilding edited cut from your keep/cut choices…',
    );
    try {
      await api.saveCutSelection(jobId, review.selection);
      const next = await api.applyCutSelection(jobId);
      setReview(next);
      onRebuildPhase?.('Updating Align / Remotion to the new cut…');
      const before = await api.getJob(jobId).catch(() => null);
      const prevAlignId = before?.job?.selectedRuns?.align ?? null;
      await api.runStage(jobId, 'align', { rerun: true });
      const deadline = Date.now() + 5 * 60_000;
      let alignReady = false;
      while (Date.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        const snapshot = await api.getPipelineSnapshot(jobId).catch(() => null);
        const alignEntry = snapshot?.stages.find((stage) => stage.stage === 'align');
        const alignStatus = alignEntry?.status;
        if (alignStatus === 'cancelled') {
          throw new Error('Pipeline aborted');
        }
        const detail = await api.getJob(jobId).catch(() => null);
        const alignId = detail?.job?.selectedRuns?.align ?? null;
        const alignRun = (detail?.job?.runs?.align ?? []).find((run) => run.runId === alignId);
        const status = alignRun?.status ?? alignStatus;
        if (alignId && alignId !== prevAlignId && status === 'succeeded') {
          alignReady = true;
          break;
        }
        if (status === 'failed' || status === 'cancelled') {
          throw new Error(
            status === 'failed' ? 'Align failed after cut rebuild' : 'Pipeline aborted',
          );
        }
        onRebuildPhase?.(
          `Updating Align / Remotion… ${status === 'running' ? 'running' : 'starting'}`,
        );
      }
      if (!alignReady) {
        throw new Error('Timed out waiting for Align after cut rebuild');
      }
      onRebuildPhase?.('Refreshing previews…');
      invalidateAll();
      Alert.alert('Cut rebuilt', 'Edited cut and Align previews updated.');
    } catch (rebuildError) {
      const message = rebuildError instanceof Error ? rebuildError.message : 'Could not rebuild cut';
      if (message !== 'Pipeline aborted') {
        Alert.alert('Rebuild failed', message);
      }
    } finally {
      setBusy(false);
      setBusyLabel(null);
      onRebuildPhase?.(null);
    }
  };

  const seekToLine = (line: CutTranscriptLine) => {
    videoRef.current?.seekTo(line.start);
    videoRef.current?.play();
    setActiveLineId(line.id);
  };

  const handleTimeUpdate = (time: number) => {
    setCurrentTime(time);
    if (!review) {
      return;
    }
    for (const slide of review.slides) {
      for (const line of slide.lines) {
        if (time >= line.start && time < line.end) {
          setActiveLineId(line.id);
          return;
        }
      }
    }
  };

  if (loading && !review) {
    return (
      <View style={styles.card}>
        <SectionLabel>Cut · sentence keep / cut</SectionLabel>
        <ActivityIndicator color={colors.orange} />
      </View>
    );
  }

  if (error || !review || !videoSrc) {
    return (
      <View style={styles.card}>
        <SectionLabel>Cut · sentence keep / cut</SectionLabel>
        <Text style={styles.meta}>{error ?? 'No cut analysis yet. Run cut to build the transcript.'}</Text>
        <View style={styles.actionsRow}>
          <Button
            label={busy ? busyLabel ?? 'Working…' : 'Rerun Cut · sentence keep / cut'}
            onPress={() => void rerunCut()}
            variant="primary"
            disabled={busy}
          />
          <Button label="Retry load" onPress={() => void load()} disabled={busy} />
        </View>
        {busy ? (
          <View style={styles.rebuildBanner}>
            <ActivityIndicator color={colors.orange} />
            <Text style={styles.rebuildText}>{busyLabel ?? 'Working…'}</Text>
            <AbortStageButton
              jobId={jobId}
              label="Abort"
              onAborted={() => {
                setBusy(false);
                setBusyLabel(null);
                onRebuildPhase?.(null);
                void load();
              }}
            />
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <SectionLabel>Cut · sentence keep / cut</SectionLabel>
      <Text style={styles.meta}>
        Preview uses the stabilized take when available (same timeline as the cut). Tap a sentence
        to jump · Cut removes it · Keep restores · grouped by slide.
        {review.appliesWithStabilizedVideo
          ? review.needsStabilizedApply
            ? ' Apply selection rebuilds the edited cut from the stabilized video using these same choices.'
            : ' Edited cut already rebuilt from the stabilized video.'
          : ''}
      </Text>

      {review.stale && review.staleReason ? (
        <StaleBanner
          reason={review.staleReason}
          actionLabel="Rerun Cut · sentence keep / cut"
          busy={busy}
          onAction={() => void rerunCut()}
        />
      ) : null}

      <View style={styles.actionsRow}>
        <Button
          label={busy && busyLabel?.startsWith('Rerunning') ? 'Rerunning cut…' : 'Rerun Cut · sentence keep / cut'}
          onPress={() => void rerunCut()}
          disabled={busy}
        />
      </View>

      {/* Mobile portrait: video on top, transcript underneath. Else side-by-side. */}
      <View
        style={[
          layoutStyles.studioRow,
          stackPortrait ? styles.studioStack : null,
          stackPortrait
            ? styles.studioStackSizing
            : { height: studioHeight, minHeight: studioHeight },
        ]}
      >
        <View style={[layoutStyles.studioVideoPane, stackPortrait ? styles.videoPaneStack : null]}>
          <PipelineVideo
            ref={videoRef}
            src={videoSrc}
            label={
              review.previewUsesStabilized ?? review.appliesWithStabilizedVideo
                ? 'Stabilized take'
                : 'Source take'
            }
            tall
            tallHeight={videoTallHeight}
            onTimeUpdate={handleTimeUpdate}
          />
          <Text style={styles.timeLabel}>{currentTime.toFixed(2)}s</Text>
          {review.editedVideoUrl ? (
            <Text style={styles.meta}>Edited cut ready — rebuild after keep/cut changes.</Text>
          ) : null}
        </View>
        <ScrollView
          style={[
            layoutStyles.studioScriptPane,
            stackPortrait ? styles.scriptPaneStack : null,
            { maxHeight: transcriptMaxHeight },
          ]}
          contentContainerStyle={styles.transcriptContent}
          nestedScrollEnabled
        >
          {review.slides.map((slide) => (
            <View key={slide.slideId} style={styles.slideBlock}>
              <Text style={styles.slideTitle}>{slide.slideTitle}</Text>
              <Text style={styles.slideMeta}>
                {slide.sourceStart.toFixed(1)}s → {slide.sourceEnd.toFixed(1)}s ·{' '}
                {(slide.lines ?? []).length
                  ? `${(slide.lines ?? []).length} lines`
                  : 'slide beat'}
              </Text>
              {(slide.lines ?? []).length ? (
                (slide.lines ?? []).map((line) => {
                  const active = activeLineId === line.id;
                  return (
                    <View
                      key={line.id}
                      style={[styles.line, active ? styles.lineActive : null]}
                    >
                      <View style={styles.lineTop}>
                        <Text style={styles.lineTime}>{line.start.toFixed(1)}s</Text>
                        <Text style={[styles.kindBadge, line.kept ? styles.kindKeep : null]}>
                          {kindLabel(line)}
                        </Text>
                        <Text style={styles.lineReason}>{line.reason}</Text>
                        <Pressable style={styles.toggle} onPress={() => void toggleLine(line)}>
                          <Text style={styles.toggleText}>{line.kept ? 'Cut' : 'Keep'}</Text>
                        </Pressable>
                      </View>
                      <Pressable onPress={() => seekToLine(line)}>
                        <Text style={[styles.lineText, !line.kept ? styles.lineRemoved : null]}>
                          {line.text}
                        </Text>
                      </Pressable>
                    </View>
                  );
                })
              ) : (
                <Pressable
                  style={styles.beatJump}
                  onPress={() => {
                    videoRef.current?.seekTo(slide.sourceStart);
                    videoRef.current?.play();
                  }}
                >
                  <Text style={styles.lineText}>Jump to beat start</Text>
                </Pressable>
              )}
            </View>
          ))}
        </ScrollView>
      </View>

      <Button
        label={
          busy && !busyLabel?.startsWith('Rerunning')
            ? 'Rebuilding…'
            : review.needsStabilizedApply
              ? 'Apply selection & rebuild cut (stabilized)'
              : 'Apply selection & rebuild cut'
        }
        onPress={() => void rebuild()}
        variant="primary"
        disabled={busy}
      />
      {busy ? (
        <View style={styles.rebuildBanner}>
          <ActivityIndicator color={colors.orange} />
          <Text style={styles.rebuildText}>
            {busyLabel ??
              'Rebuilding cut — Align / Composite / Social are paused until this finishes.'}
          </Text>
          <AbortStageButton
            jobId={jobId}
            label="Abort"
            onAborted={() => {
              setBusy(false);
              setBusyLabel(null);
              onRebuildPhase?.(null);
              void load();
            }}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    alignItems: 'center',
  },
  studioStack: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  studioStackSizing: {
    height: undefined,
    minHeight: 0,
  },
  videoPaneStack: {
    flex: 0,
    width: '100%',
    alignSelf: 'stretch',
  },
  scriptPaneStack: {
    flex: 0,
    width: '100%',
    alignSelf: 'stretch',
  },
  meta: {
    color: colors.muted,
    fontSize: typography.small,
    lineHeight: 18,
  },
  timeLabel: {
    color: colors.muted2,
    fontSize: typography.tiny,
  },
  transcriptContent: {
    paddingRight: 4,
    paddingBottom: spacing.md,
  },
  slideBlock: {
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.16)',
    borderRadius: radii.sm,
    padding: 10,
    gap: 6,
    marginBottom: spacing.sm,
    backgroundColor: 'rgba(2, 6, 23, 0.45)',
  },
  slideTitle: {
    color: colors.text,
    fontWeight: '800',
    fontSize: 15,
  },
  slideMeta: {
    color: colors.muted2,
    fontSize: typography.tiny,
    marginBottom: 4,
  },
  line: {
    borderRadius: 10,
    padding: 10,
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    borderWidth: 1,
    borderColor: 'transparent',
    marginBottom: 6,
  },
  lineActive: {
    borderColor: 'rgba(253, 230, 138, 0.85)',
    backgroundColor: 'rgba(120, 53, 15, 0.35)',
  },
  lineTop: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  lineTime: {
    color: colors.section,
    fontWeight: '800',
    fontSize: typography.tiny,
  },
  kindBadge: {
    color: colors.text,
    backgroundColor: 'rgba(51, 65, 85, 0.95)',
    overflow: 'hidden',
    borderRadius: radii.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
    fontSize: 11,
    fontWeight: '800',
  },
  kindKeep: {
    backgroundColor: colors.badgeFilmed,
    color: colors.badgeFilmedText,
  },
  lineReason: {
    color: colors.muted2,
    fontSize: typography.tiny,
    flexShrink: 1,
  },
  toggle: {
    marginLeft: 'auto',
    backgroundColor: 'rgba(249, 115, 22, 0.2)',
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  toggleText: {
    color: '#fdba74',
    fontWeight: '800',
    fontSize: typography.tiny,
  },
  lineText: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  lineRemoved: {
    textDecorationLine: 'line-through',
    color: colors.muted,
  },
  beatJump: {
    paddingVertical: spacing.xs,
  },
  rebuildBanner: {
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: 8,
    backgroundColor: 'rgba(249, 115, 22, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.35)',
  },
  rebuildText: {
    flex: 1,
    color: colors.text,
    fontSize: typography.small,
    lineHeight: 18,
  },
});
