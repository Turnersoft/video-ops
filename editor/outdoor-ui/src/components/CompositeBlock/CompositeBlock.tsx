export type { CompositeBlockProps } from './CompositeBlock.types';

import classes from './CompositeBlock.module.scss';
import { layoutStylesFor } from '../../layout';
import { webModuleStyle, webClassName } from '../../utils/webClassName';
import type { CompositeBlockProps } from './CompositeBlock.types';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';

import { AbortStageButton } from '../AbortStageButton/AbortStageButton';
import { formatOutdoorApiError } from '../../api/client';
import { revealTargetFromStageVideo } from '../../api/urls';
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

type SplitCompositeLog = {
  portrait: string;
  landscape: string;
  shared: string;
};

function splitCompositeLog(logTail: string): SplitCompositeLog {
  const portrait: string[] = [];
  const landscape: string[] = [];
  const shared: string[] = [];
  for (const line of logTail.split('\n')) {
    if (/\[portrait\]/i.test(line)) {
      portrait.push(line);
      continue;
    }
    if (/\[landscape\]/i.test(line)) {
      landscape.push(line);
      continue;
    }
    shared.push(line);
  }
  return {
    portrait: portrait.join('\n'),
    landscape: landscape.join('\n'),
    shared: shared.join('\n'),
  };
}

function latestRenderProgress(text: string): string | null {
  const matches = [...text.matchAll(/Rendered\s+(\d+)\/(\d+)/g)];
  const last = matches.at(-1);
  if (!last) {
    return null;
  }
  return `${last[1]}/${last[2]} frames`;
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

export function CompositeBlock({
  jobId,
  job,
  stage,
  remotionPreviewOnly = false,
}: CompositeBlockProps) {
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
        if (options.syncStudio && !remotionPreviewOnly) {
          await api.syncAlignStudio(jobId);
        }
        await api.runStage(jobId, 'composite', { rerun: true });
        void loadSnapshot();
      } catch (runError) {
        setError(formatOutdoorApiError(runError));
        setBusy(false);
      }
    },
    [api, jobId, loadSnapshot, remotionPreviewOnly],
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
  const splitLog = logTail ? splitCompositeLog(logTail) : null;
  const portraitLog =
    liveStage?.renderLogTails?.portrait?.trim() ||
    splitLog?.portrait.trim() ||
    null;
  const landscapeLog =
    liveStage?.renderLogTails?.landscape?.trim() ||
    splitLog?.landscape.trim() ||
    null;

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
          actionLabel={
            remotionPreviewOnly ? 'Rerun Remotion preview only' : 'Rerun composite'
          }
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
                ? remotionPreviewOnly
                  ? 'Rendering Remotion preview…'
                  : 'Rendering composite…'
                : remotionPreviewOnly
                  ? 'Render Remotion preview only'
                  : 'Render composite'
          }
          onPress={() =>
            void startCompositeRun({ syncStudio: !remotionPreviewOnly })
          }
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

      <View style={webModuleStyle(classes.logGrid)}>
        <CollapsibleSection
          title={`Portrait render (${logLineCount(portraitLog)} lines)`}
          summary={latestRenderProgress(portraitLog ?? '') ?? progressDetail}
          defaultOpen={running || liveStatus === 'failed'}
        >
          <Text style={webModuleStyle(classes.logBox)} selectable>
            {portraitLog ?? (running ? 'Waiting for portrait render log…' : 'No portrait render log')}
          </Text>
        </CollapsibleSection>
        <CollapsibleSection
          title={`Landscape render (${logLineCount(landscapeLog)} lines)`}
          summary={latestRenderProgress(landscapeLog ?? '') ?? progressDetail}
          defaultOpen={running || liveStatus === 'failed'}
        >
          <Text style={webModuleStyle(classes.logBox)} selectable>
            {landscapeLog ??
              (running ? 'Waiting for landscape render log…' : 'No landscape render log')}
          </Text>
        </CollapsibleSection>
      </View>

      {logTail && !portraitLog && !landscapeLog ? (
        <CollapsibleSection
          title={`Composite log (${logLineCount(logTail)} lines)`}
          summary={progressDetail}
          defaultOpen={running || liveStatus === 'failed'}
        >
          <Text style={webModuleStyle(classes.logBox)} selectable>
            {logTail}
          </Text>
        </CollapsibleSection>
      ) : null}

      {!portraitLog && !landscapeLog && !logTail && running ? (
        <Text style={webModuleStyle(classes.meta)}>Waiting for composite logs…</Text>
      ) : null}

      <StageErrorBlock entry={stageEntry} />

      <View style={layoutStyles.videos}>
        {videos.length ? (
          videos.map((video) => (
            <View key={`${video.label}-${video.url}`} style={layoutStyles.gridItemHalf}>
              <CompositeVideo
                video={video}
                scriptId={job?.scriptId ?? ''}
                takeId={job?.takeId ?? ''}
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
  scriptId,
  takeId,
  resolveUrl,
}: {
  video: StageResultPreview['videos'][number];
  scriptId: string;
  takeId: string;
  resolveUrl: (path: string) => Promise<string>;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const reveal =
    scriptId && takeId ? revealTargetFromStageVideo(scriptId, takeId, video) : undefined;

  useEffect(() => {
    void resolveUrl(video.url).then(setSrc);
  }, [resolveUrl, video.url]);

  if (!src) {
    return null;
  }

  return (
    <View style={sharedStyles.videoCard}>
      <PipelineVideo src={src} label={video.label} reveal={reveal} />
    </View>
  );
}
