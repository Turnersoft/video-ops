export type { StabilizePanelProps } from './StabilizePanel.types';

import classes from './StabilizePanel.module.scss';
import { layoutStylesFor } from '../../layout';
import { webModuleStyle, webClassName } from '../../utils/webClassName';
import type { StabilizePanelProps } from './StabilizePanel.types';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { formatOutdoorApiError } from '../../api/client';
import { artifactPath, sourceUrl } from '../../api/urls';
import { AbortStageButton } from '../AbortStageButton/AbortStageButton';
import { useOutdoorUi } from '../../context/OutdoorUiContext';
import { colors, spacing, typography } from '../../theme';
import type { PipelineStageSnapshot, StageResultPreview } from '../../types';
import { PipelineVideo } from '../PipelineVideo/PipelineVideo';
import { StaleBanner } from '../StaleBanner/StaleBanner';
import { StageErrorBlock } from '../StageErrorBlock/StageErrorBlock';
import { Button } from '../Button/Button';
import { CollapsibleSection } from '../CollapsibleSection/CollapsibleSection';
import { SectionLabel } from '../SectionLabel/SectionLabel';

const POLL_MS = 1500;

function logLineCount(text: string | null | undefined): number {
  if (!text?.trim()) {
    return 0;
  }
  return text.split('\n').filter((line) => line.trim()).length;
}

function shortMessage(text: string | undefined, max = 120): string | null {
  if (!text?.trim()) {
    return null;
  }
  const trimmed = text.replace(/\s+/g, ' ').trim();
  if (trimmed.length <= max) {
    return trimmed;
  }
  return `${trimmed.slice(0, max - 1)}…`;
}

export function StabilizePanel({
  jobId,
  scriptId,
  takeId,
  hasSourceVideo,
  stage,
  onPipelineChange,
}: StabilizePanelProps) {
  const { layout,  api, refreshKey  } = useOutdoorUi();
  const layoutStyles = layoutStylesFor(layout);
  const [sourceSrc, setSourceSrc] = useState<string | null>(null);
  const [stabilizedSrc, setStabilizedSrc] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [liveStage, setLiveStage] = useState<PipelineStageSnapshot | null>(null);
  const [needsStabilizedApply, setNeedsStabilizedApply] = useState(false);
  const [downstreamStale, setDownstreamStale] = useState<Array<{ stage: string; reason: string }>>(
    [],
  );
  const notifiedRef = useRef(false);

  const status = liveStage?.status ?? stage.status;
  const runId = liveStage?.runId ?? stage.runId;
  const progress = liveStage?.progress ?? null;
  const logTail = liveStage?.logTail ?? null;
  const running = status === 'running' || busy;

  const loadSnapshot = useCallback(async () => {
    try {
      const [snapshot, cutReview] = await Promise.all([
        api.getPipelineSnapshot(jobId),
        api.getCutReview(jobId).catch(() => null),
      ]);
      const entry = snapshot.stages.find((item) => item.stage === 'stabilize') ?? null;
      setLiveStage(entry);
      setNeedsStabilizedApply(Boolean(cutReview?.needsStabilizedApply));
      setDownstreamStale(
        snapshot.stages
          .filter((item) => item.stage !== 'stabilize' && item.stale && item.staleReason)
          .map((item) => ({ stage: item.stage, reason: item.staleReason as string })),
      );
      setError(null);
      return entry;
    } catch (loadError) {
      setError(formatOutdoorApiError(loadError));
      return null;
    }
  }, [api, jobId]);

  useEffect(() => {
    void loadSnapshot();
  }, [loadSnapshot, refreshKey, stage.status, stage.runId]);

  useEffect(() => {
    if (!running && !needsStabilizedApply && !downstreamStale.length) {
      return;
    }
    const timer = setInterval(() => {
      void loadSnapshot();
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [downstreamStale.length, loadSnapshot, needsStabilizedApply, running]);

  useEffect(() => {
    if (!busy) {
      notifiedRef.current = false;
      return;
    }
    if (status === 'succeeded' || status === 'failed' || status === 'cancelled') {
      setBusy(false);
      if (!notifiedRef.current) {
        notifiedRef.current = true;
        onPipelineChange?.();
      }
    }
  }, [busy, onPipelineChange, status]);

  useEffect(() => {
    void (async () => {
      if (!hasSourceVideo) {
        setSourceSrc(null);
        return;
      }
      setSourceSrc(await api.absoluteUrl(sourceUrl(api.baseUrl, scriptId, takeId)));
    })();
  }, [api, hasSourceVideo, scriptId, takeId]);

  const stabilizedPath = useMemo(() => {
    if (!runId || status !== 'succeeded') {
      return null;
    }
    const fromResults = stage.videos.find((video) => video.label === 'Stabilized')?.url;
    if (fromResults) {
      return fromResults;
    }
    return artifactPath(scriptId, takeId, 'stabilize', runId, 'stabilized.mp4');
  }, [runId, scriptId, stage.videos, status, takeId]);

  useEffect(() => {
    void (async () => {
      if (!stabilizedPath) {
        setStabilizedSrc(null);
        return;
      }
      setStabilizedSrc(await api.absoluteUrl(stabilizedPath));
    })();
  }, [api, stabilizedPath]);

  const handleRun = useCallback(() => {
    setBusy(true);
    setError(null);
    notifiedRef.current = false;
    void api
      .runStage(jobId, 'stabilize', { rerun: status === 'succeeded' })
      .catch((runError) => {
        setError(formatOutdoorApiError(runError));
        setBusy(false);
      });
    void loadSnapshot();
  }, [api, jobId, loadSnapshot, status]);

  const canRun =
    !busy &&
    !running &&
    hasSourceVideo &&
    (status === 'pending' || status === 'failed' || status === 'cancelled' || status === 'succeeded');

  const actionLabel = running
    ? 'Stabilizing…'
    : status === 'pending'
      ? 'Run stabilization'
      : status === 'succeeded'
        ? 'Rerun stabilization'
        : 'Retry stabilization';

  const progressDetail = shortMessage(progress?.message ?? undefined);
  const progressPercent =
    running && typeof progress?.percent === 'number' ? `${Math.round(progress.percent)}%` : null;

  const stageEntry: PipelineStageSnapshot = liveStage ?? {
    stage: 'stabilize',
    runId,
    status,
    progress,
    logTail,
    logUrl: null,
  };

  return (
    <View style={webModuleStyle(classes.wrap)}>
      <SectionLabel>Stabilize handheld shake</SectionLabel>
      <Text style={webModuleStyle(classes.meta)}>
        {status === 'pending'
          ? 'Smooth handheld shake before cut. Uses FFmpeg vid.stab on your Mac.'
          : running
            ? 'Analyzing shake and applying stabilization…'
            : status === 'succeeded'
              ? 'Apply selection in Cut to rebuild the edited video from stabilized.mp4 (same keep/cut choices).'
              : 'Stabilization did not complete. See the run log below.'}
      </Text>

      {status === 'succeeded' && needsStabilizedApply ? (
        <StaleBanner reason='After stabilization: use Cut → "Apply selection & rebuild cut (stabilized)" to refresh the edited video (same keep/cut choices).' />
      ) : null}

      {status === 'succeeded'
        ? downstreamStale.map((item) => (
            <StaleBanner key={item.stage} reason={item.reason} />
          ))
        : null}

      {running ? (
        <View style={webModuleStyle(classes.progressCard)}>
          <View style={webModuleStyle(classes.progressTop)}>
            <ActivityIndicator color={colors.orange} />
            <Text style={webModuleStyle(classes.progressLabel)}>
              {progressPercent ? `${progressPercent} · ` : ''}
              {progressDetail ?? 'Working…'}
            </Text>
          </View>
          {typeof progress?.percent === 'number' ? (
            <View style={webModuleStyle(classes.progressTrack)}>
              <View style={[webModuleStyle(classes.progressFill), { width: `${Math.min(100, progress.percent)}%` }]} />
            </View>
          ) : null}
        </View>
      ) : null}

      <View style={layoutStyles.videos}>
        {sourceSrc ? (
          <View style={layoutStyles.gridItemHalf}>
            <PipelineVideo src={sourceSrc} label="Source (handheld)" />
          </View>
        ) : null}
        {running && !stabilizedSrc ? (
          <View style={[webModuleStyle(classes.runningBox), layoutStyles.gridItemHalf]}>
            <ActivityIndicator color={colors.orange} />
            <Text style={webModuleStyle(classes.meta)}>Rendering stabilized.mp4…</Text>
          </View>
        ) : stabilizedSrc ? (
          <View style={layoutStyles.gridItemHalf}>
            <PipelineVideo src={stabilizedSrc} label="Stabilized" />
          </View>
        ) : !running && hasSourceVideo ? (
          <View style={[webModuleStyle(classes.placeholder), layoutStyles.gridItemHalf]}>
            <Text style={webModuleStyle(classes.meta)}>No stabilized video yet</Text>
          </View>
        ) : null}
      </View>

      {logTail ? (
        <CollapsibleSection
          title={`Stabilize log (${logLineCount(logTail)} lines)`}
          summary={progressDetail}
          defaultOpen={running || status === 'failed'}
        >
          <Text style={webModuleStyle(classes.logBox)} selectable>
            {logTail}
          </Text>
        </CollapsibleSection>
      ) : null}

      <StageErrorBlock entry={stageEntry} />

      {running ? (
        <AbortStageButton
          jobId={jobId}
          label="Abort stabilization"
          onAborted={() => {
            setBusy(false);
            void loadSnapshot();
          }}
        />
      ) : null}

      {canRun ? (
        <Button
          label={busy ? 'Starting…' : actionLabel}
          variant="primary"
          disabled={busy}
          onPress={handleRun}
        />
      ) : null}

      {error ? <Text style={webModuleStyle(classes.error)}>{error}</Text> : null}
    </View>
  );
}
