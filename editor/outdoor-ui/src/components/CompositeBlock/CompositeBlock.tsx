export type { CompositeBlockProps } from './CompositeBlock.types';

import classes from './CompositeBlock.module.scss';
import { layoutStylesFor } from '../../layout';
import { webModuleStyle, webClassName } from '../../utils/webClassName';
import type { CompositeBlockProps } from './CompositeBlock.types';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';

import { AbortStageButton } from '../AbortStageButton/AbortStageButton';
import { formatOutdoorApiError } from '../../api/client';
import { useOutdoorUi } from '../../context/OutdoorUiContext';
import { colors, sharedStyles, spacing, typography } from '../../theme';
import type { OutdoorJob, PipelineStageSnapshot, StageResultPreview } from '../../types';
import { fmtDate } from '../../utils/format';
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

export function CompositeBlock({ jobId, job, stage }: CompositeBlockProps) {
  const { layout,  api, invalidateAll  } = useOutdoorUi();
  const layoutStyles = layoutStylesFor(layout);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [liveStage, setLiveStage] = useState<PipelineStageSnapshot | null>(null);
  const notifiedRef = useRef(false);

  const runs = useMemo(
    () =>
      [...(job?.runs.composite ?? [])].sort((a, b) =>
        String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? '')),
      ),
    [job?.runs.composite],
  );
  const selected = job?.selectedRuns.composite ?? null;
  const baseStatus =
    stage?.status ??
    runs.find((entry) => entry.runId === selected)?.status ??
    'pending';
  const liveStatus = liveStage?.status ?? baseStatus;
  const running = liveStatus === 'running' || busy;
  const displayStatus = running ? 'running' : baseStatus;
  const progress = liveStage?.progress ?? null;
  const logTail = liveStage?.logTail ?? null;
  const summary = (stage?.summary ?? []).join(' · ');
  const videos = stage?.videos ?? [];

  const loadSnapshot = useCallback(async () => {
    try {
      const snapshot = await api.getPipelineSnapshot(jobId);
      const entry = snapshot.stages.find((item) => item.stage === 'composite') ?? null;
      setLiveStage(entry);
      setError(null);
      return entry;
    } catch (loadError) {
      setError(formatOutdoorApiError(loadError));
      return null;
    }
  }, [api, jobId]);

  useEffect(() => {
    void loadSnapshot();
  }, [loadSnapshot, baseStatus, stage?.runId]);

  useEffect(() => {
    if (!running) {
      return;
    }
    const timer = setInterval(() => {
      void loadSnapshot();
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [loadSnapshot, running]);

  useEffect(() => {
    if (!busy) {
      notifiedRef.current = false;
      return;
    }
    if (liveStatus === 'succeeded' || liveStatus === 'failed' || liveStatus === 'cancelled') {
      setBusy(false);
      if (!notifiedRef.current) {
        notifiedRef.current = true;
        invalidateAll();
      }
    }
  }, [busy, invalidateAll, liveStatus]);

  const startCompositeRun = useCallback(
    async (options: { syncStudio?: boolean } = {}) => {
      setBusy(true);
      setError(null);
      notifiedRef.current = false;
      try {
        if (options.syncStudio) {
          await api.syncAlignStudio(jobId);
        }
        await api.runStage(jobId, 'composite', { rerun: true });
        void loadSnapshot();
      } catch (runError) {
        setError(formatOutdoorApiError(runError));
        setBusy(false);
      }
    },
    [api, jobId, loadSnapshot],
  );

  const selectRun = async (runId: string) => {
    setBusy(true);
    try {
      await api.updateSelection(jobId, { composite: runId });
      invalidateAll();
    } catch (selectError) {
      Alert.alert(
        'Composite run',
        selectError instanceof Error ? selectError.message : 'Could not select composite run',
      );
    } finally {
      setBusy(false);
    }
  };

  const progressDetail = shortMessage(progress?.message ?? undefined);
  const progressPercent =
    running && typeof progress?.percent === 'number' ? `${Math.round(progress.percent)}%` : null;

  const stageEntry: PipelineStageSnapshot = liveStage ?? {
    stage: 'composite',
    runId: stage?.runId ?? selected,
    status: liveStatus,
    progress,
    logTail,
    logUrl: null,
  };

  return (
    <View style={webModuleStyle(classes.wrap)}>
      <SectionLabel>
        Composite · {displayStatus}
        {!running && stage?.stale ? ' · outdated' : ''}
      </SectionLabel>
      {stage?.stale && stage.staleReason && !running ? (
        <StaleBanner
          reason={stage.staleReason}
          actionLabel="Rerun composite"
          busy={busy}
          onAction={() => void startCompositeRun()}
        />
      ) : null}

      {running ? (
        <View style={webModuleStyle(classes.progressCard)}>
          <View style={webModuleStyle(classes.progressTop)}>
            <ActivityIndicator color={colors.orange} />
            <Text style={webModuleStyle(classes.progressLabel)}>
              {progressPercent ? `${progressPercent} · ` : ''}
              {progressDetail ?? 'Rendering composite…'}
            </Text>
          </View>
          {typeof progress?.percent === 'number' ? (
            <View style={webModuleStyle(classes.progressTrack)}>
              <View
                style={[webModuleStyle(classes.progressFill), { width: `${Math.min(100, progress.percent)}%` }]}
              />
            </View>
          ) : null}
        </View>
      ) : null}

      {running ? (
        <AbortStageButton
          jobId={jobId}
          label="Abort composite render"
          onAborted={() => {
            setBusy(false);
            void loadSnapshot();
          }}
        />
      ) : null}

      <View style={layoutStyles.pipelineToolbar}>
        <Button
          label={
            busy
              ? 'Working…'
              : running
                ? 'Rendering composite…'
                : 'Render composite'
          }
          onPress={() => void startCompositeRun({ syncStudio: true })}
          variant="primary"
          disabled={busy || running}
        />
      </View>

      {runs.length ? (
        <View style={sharedStyles.runChips}>
          {runs.map((run) => {
            const active = run.runId === selected;
            const shortId = run.runId.slice(-10);
            const when = run.createdAt ? fmtDate(run.createdAt) : '';
            return (
              <Pressable
                key={run.runId}
                style={[sharedStyles.runChip, active ? sharedStyles.runChipActive : null]}
                onPress={() => void selectRun(run.runId)}
                disabled={busy || running}
              >
                <Text
                  style={[
                    sharedStyles.runChipText,
                    active ? sharedStyles.runChipActiveText : null,
                  ]}
                >
                  {shortId} · {run.status}
                  {active ? ' · active' : ''}
                  {when ? ` · ${when}` : ''}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <Text style={webModuleStyle(classes.meta)}>No composite runs yet — render after you finish review.</Text>
      )}

      {summary ? <Text style={webModuleStyle(classes.meta)}>{summary}</Text> : null}

      {logTail ? (
        <CollapsibleSection
          title={`Composite log (${logLineCount(logTail)} lines)`}
          summary={progressDetail}
          defaultOpen={running || liveStatus === 'failed'}
        >
          <Text style={webModuleStyle(classes.logBox)} selectable>
            {logTail}
          </Text>
        </CollapsibleSection>
      ) : running ? (
        <Text style={webModuleStyle(classes.meta)}>Waiting for composite log…</Text>
      ) : null}

      <StageErrorBlock entry={stageEntry} />

      <View style={layoutStyles.videos}>
        {videos.length ? (
          videos.map((video) => (
            <View key={`${video.label}-${video.url}`} style={layoutStyles.gridItemHalf}>
              <CompositeVideo
                video={video}
                resolveUrl={(path) => Promise.resolve(api.absoluteUrl(path))}
              />
            </View>
          ))
        ) : (
          <Text style={webModuleStyle(classes.meta)}>No composite video yet</Text>
        )}
      </View>

      {error ? <Text style={webModuleStyle(classes.error)}>{error}</Text> : null}
    </View>
  );
}

function CompositeVideo({
  video,
  resolveUrl,
}: {
  video: { label: string; url: string };
  resolveUrl: (path: string) => Promise<string>;
}) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    void resolveUrl(video.url).then(setSrc);
  }, [resolveUrl, video.url]);

  if (!src) {
    return null;
  }

  return (
    <View style={sharedStyles.videoCard}>
      <PipelineVideo src={src} label={video.label} />
    </View>
  );
}
