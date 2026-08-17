export type { CutReviewPanelProps } from './CutReviewPanel.types';

import classes from './CutReviewPanel.module.scss';
import { webModuleStyle, webClassName } from '../../utils/webClassName';
import type { CutReviewPanelProps } from './CutReviewPanel.types';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { AbortStageButton } from '../AbortStageButton/AbortStageButton';
import { useOutdoorUi } from '../../context/OutdoorUiContext';
import { pipelineStudioHeight, layoutStylesFor } from '../../layout';
import { colors, radii, spacing, typography } from '../../theme';
import type { CutReviewPayload, CutTranscriptLine } from '../../types';
import { cutReviewPreviewPath, parseTakeVideoPath, type TakeVideoRevealTarget } from '../../api/urls';
import { PipelineVideo, type PipelineVideoHandle } from '../PipelineVideo/PipelineVideo';
import { StaleBanner } from '../StaleBanner/StaleBanner';
import { Button } from '../Button/Button';
import { SectionLabel } from '../SectionLabel/SectionLabel';

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
  const {  api, layout, invalidateAll, refreshKey  } = useOutdoorUi();
  const layoutStyles = layoutStylesFor(layout);
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
  const [videoReveal, setVideoReveal] = useState<TakeVideoRevealTarget | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [busyLabel, setBusyLabel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeLineId, setActiveLineId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const videoRef = useRef<PipelineVideoHandle | null>(null);

  const resolvePreviewSrc = useCallback(
    async (payload: CutReviewPayload) => {
      const previewPath = cutReviewPreviewPath(payload, scriptId, takeId);
      setVideoReveal(parseTakeVideoPath(previewPath) ?? undefined);
      return api.absoluteUrl(previewPath);
    },
    [api, scriptId, takeId],
  );

  const load = useCallback(async () => {
    setError(null);
    try {
      const [nextReview] = await Promise.all([api.getCutReview(jobId)]);
      const source = await resolvePreviewSrc(nextReview);
      setReview(nextReview);
      setVideoSrc(source);
    } catch (loadError) {
      setReview(null);
      setVideoSrc(null);
      setError(loadError instanceof Error ? loadError.message : 'Cut review unavailable');
    } finally {
      setLoading(false);
    }
  }, [api, jobId, resolvePreviewSrc]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  useEffect(() => {
    if (!reviewFromParent) {
      return;
    }
    void (async () => {
      const source = await resolvePreviewSrc(reviewFromParent);
      setReview(reviewFromParent);
      setVideoSrc(source);
      setLoading(false);
    })();
  }, [api, reviewFromParent, resolvePreviewSrc]);

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
      setVideoSrc(await resolvePreviewSrc(next));
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
      setVideoSrc(await resolvePreviewSrc(next));
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
      <View style={webModuleStyle(classes.card)}>
        <SectionLabel>Cut · sentence keep / cut</SectionLabel>
        <ActivityIndicator color={colors.orange} />
      </View>
    );
  }

  if (error || !review || !videoSrc) {
    return (
      <View style={webModuleStyle(classes.card)}>
        <SectionLabel>Cut · sentence keep / cut</SectionLabel>
        <Text style={webModuleStyle(classes.meta)}>{error ?? 'No cut analysis yet. Run cut to build the transcript.'}</Text>
        <View style={webModuleStyle(classes.actionsRow)}>
          <Button
            label={busy ? busyLabel ?? 'Working…' : 'Rerun Cut · sentence keep / cut'}
            onPress={() => void rerunCut()}
            variant="primary"
            disabled={busy}
          />
          <Button label="Retry load" onPress={() => void load()} disabled={busy} />
        </View>
        {busy ? (
          <View style={webModuleStyle(classes.rebuildBanner)}>
            <ActivityIndicator color={colors.orange} />
            <Text style={webModuleStyle(classes.rebuildText)}>{busyLabel ?? 'Working…'}</Text>
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
    <View style={webModuleStyle(classes.card)}>
      <SectionLabel>Cut · sentence keep / cut</SectionLabel>
      <Text style={webModuleStyle(classes.meta)}>
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
          actionLabel={
            review.needsStabilizedApply
              ? 'Apply selection & rebuild cut (stabilized)'
              : 'Rerun Cut · sentence keep / cut'
          }
          busy={busy}
          onAction={() => void (review.needsStabilizedApply ? rebuild() : rerunCut())}
        />
      ) : null}

      <View style={webModuleStyle(classes.actionsRow)}>
        <Button
          label={busy && busyLabel?.startsWith('Rerunning') ? 'Rerunning cut…' : 'Rerun Cut · sentence keep / cut'}
          onPress={() => void rerunCut()}
          disabled={busy}
        />
      </View>

      {/* Mobile portrait: video on top, transcript underneath. Else side-by-side. */}
      <View
        style={[
          webModuleStyle(
            stackPortrait ? classes.studioStack : null,
            stackPortrait ? classes.studioStackSizing : null,
          ),
          stackPortrait ? null : { height: studioHeight, minHeight: studioHeight },
          layoutStyles.studioRow,
        ].filter(Boolean)}
      >
        <View style={[webModuleStyle(stackPortrait ? classes.videoPaneStack : null), layoutStyles.studioVideoPane]}>
          <PipelineVideo
            ref={videoRef}
            src={videoSrc}
            label={
              review.previewUsesStabilized ?? review.appliesWithStabilizedVideo
                ? 'Stabilized take'
                : 'Source take'
            }
            reveal={videoReveal}
            tall
            tallHeight={videoTallHeight}
            onTimeUpdate={handleTimeUpdate}
          />
          <Text style={webModuleStyle(classes.timeLabel)}>{currentTime.toFixed(2)}s</Text>
          {review.editedVideoUrl ? (
            <Text style={webModuleStyle(classes.meta)}>Edited cut ready — rebuild after keep/cut changes.</Text>
          ) : null}
        </View>
        <ScrollView
          style={[webModuleStyle(stackPortrait ? classes.scriptPaneStack : null), layoutStyles.studioScriptPane, { maxHeight: transcriptMaxHeight }]}
          contentContainerStyle={webModuleStyle(classes.transcriptContent)}
          nestedScrollEnabled
        >
          {review.slides.map((slide) => (
            <View key={slide.slideId} style={webModuleStyle(classes.slideBlock)}>
              <Text style={webModuleStyle(classes.slideTitle)}>{slide.slideTitle}</Text>
              <Text style={webModuleStyle(classes.slideMeta)}>
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
                      style={webModuleStyle(classes.line, active ? classes.lineActive : null)}
                    >
                      <View style={webModuleStyle(classes.lineTop)}>
                        <Text style={webModuleStyle(classes.lineTime)}>{line.start.toFixed(1)}s</Text>
                        <Text style={webModuleStyle(classes.kindBadge, line.kept ? classes.kindKeep : null)}>
                          {kindLabel(line)}
                        </Text>
                        <Text style={webModuleStyle(classes.lineReason)}>{line.reason}</Text>
                        <Pressable style={webModuleStyle(classes.toggle)} onPress={() => void toggleLine(line)}>
                          <Text style={webModuleStyle(classes.toggleText)}>{line.kept ? 'Cut' : 'Keep'}</Text>
                        </Pressable>
                      </View>
                      <Pressable onPress={() => seekToLine(line)}>
                        <Text style={webModuleStyle(classes.lineText, !line.kept ? classes.lineRemoved : null)}>
                          {line.text}
                        </Text>
                      </Pressable>
                    </View>
                  );
                })
              ) : (
                <Pressable
                  style={webModuleStyle(classes.beatJump)}
                  onPress={() => {
                    videoRef.current?.seekTo(slide.sourceStart);
                    videoRef.current?.play();
                  }}
                >
                  <Text style={webModuleStyle(classes.lineText)}>Jump to beat start</Text>
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
        <View style={webModuleStyle(classes.rebuildBanner)}>
          <ActivityIndicator color={colors.orange} />
          <Text style={webModuleStyle(classes.rebuildText)}>
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
