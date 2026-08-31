import { createElement, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { formatOutdoorApiError } from '../../api/client';
import { Button } from '../../components/Button/Button';
import { Header } from '../../components/Header/Header';
import { useOutdoorUi } from '../../context/OutdoorUiContext';
import { useOutdoorRoute } from '../../hooks/useOutdoorRoute';
import { PlatformLoginPanel } from '../../components/PlatformLoginPanel/PlatformLoginPanel';
import { usePlatformLogin } from '../../hooks/usePlatformLogin';
import type {
  MassDispatch,
  MassDispatchItem,
  MassDispatchItemStatus,
  MassDispatchRef,
  MassPublishBoard,
  MassPublishItem,
  MassPublishKind,
  PlatformStatus,
  VideoOpsCatalogSeries,
} from '../../types';
import { platformLabel } from '../../utils/format';
import { webClassName, webModuleStyle } from '../../utils/webClassName';
import classes from './MassPublishScreen.module.scss';

const SERIES_KEY = 'outdoor-mass-publish-series';
const LANG_KEY = 'outdoor-mass-publish-lang';
const SELECTED_KEY = 'outdoor-mass-publish-selected';
const EPISODE_COL = '188px';
const PLATFORM_COL = 'minmax(92px, 1fr)';
function columnAccount(entry?: PlatformStatus): string | null {
  if (!entry) {
    return null;
  }
  if (entry.status !== 'connected' && entry.status !== 'configured') {
    return null;
  }
  return entry.accountLabel ?? entry.accountMasked;
}

function platformNeedsLogin(entry?: PlatformStatus): boolean {
  return Boolean(entry?.loginKind) && (
    entry?.status === 'missing_credentials' || entry?.status === 'manual'
  );
}

function platformCanAddAccount(entry?: PlatformStatus): boolean {
  return Boolean(entry?.loginKind) && (entry?.status === 'connected' || entry?.status === 'configured');
}

function readStored(key: string, fallback: string): string {
  try {
    return window.localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

function writeStored(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

function readStoredSelected(): string[] {
  try {
    const raw = window.localStorage.getItem(SELECTED_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((id): id is string => typeof id === 'string');
  } catch {
    return [];
  }
}

function isPendingQueuePick(item: MassPublishItem, selected: boolean): boolean {
  return selected && item.status === 'pending';
}

function statusLabel(item: MassPublishItem, selected: boolean, clickOrder?: number): string {
  if (isPendingQueuePick(item, selected)) {
    return clickOrder !== undefined ? `#${clickOrder}` : 'Queued';
  }
  switch (item.status) {
    case 'published':
      if (item.stub) {
        return 'Stub';
      }
      return item.openUrl ? 'Live' : 'Repub';
    case 'failed':
      return 'Fail';
    case 'blocked':
      return 'Wait';
    case 'pending':
      if (item.provider === 'browser') {
        return item.publishMode === 'manual' ? 'Manual' : 'Paste';
      }
      return item.publishMode === 'manual' ? 'Manual' : 'Ready';
    default: {
      const exhaustive: never = item.status;
      return exhaustive;
    }
  }
}

function statusClass(item: MassPublishItem, selected: boolean): string | null {
  if (isPendingQueuePick(item, selected)) {
    return classes.statusPending;
  }
  switch (item.status) {
    case 'published':
      return classes.statusLive;
    case 'failed':
      return classes.statusFail;
    case 'blocked':
      return classes.statusWait;
    case 'pending':
      return classes.statusPending;
    default: {
      const exhaustive: never = item.status;
      return exhaustive;
    }
  }
}

function laneClass(item: MassPublishItem, selected: boolean): string | null {
  if (isPendingQueuePick(item, selected)) {
    return classes.laneOn;
  }
  switch (item.status) {
    case 'published':
      return classes.laneLive;
    case 'failed':
      return classes.laneFail;
    case 'blocked':
      return classes.laneWait;
    case 'pending':
      return null;
    default: {
      const exhaustive: never = item.status;
      return exhaustive;
    }
  }
}

function kindShort(kind: MassPublishKind, lang: MassPublishBoard['lang']): string {
  if (lang === 'en') {
    return kind === 'infographic' ? 'P' : 'V';
  }
  return kind === 'infographic' ? '图' : '片';
}

function dispatchProgress(dispatch: MassDispatch | null): number {
  if (!dispatch || !dispatch.items.length) {
    return 0;
  }
  const done = dispatch.items.filter((item) =>
    item.status === 'published' ||
    item.status === 'failed' ||
    item.status === 'skipped' ||
    item.status === 'cancelled',
  ).length;
  return Math.round((done / dispatch.items.length) * 100);
}

type HoverCard = {
  top: number;
  left: number;
  eyebrow: string;
  title: string;
  body?: string;
  note?: string;
  link?: string;
};

function placeHoverCard(rect: { top: number; right: number; left: number }): { top: number; left: number } {
  const width = 360;
  let left = rect.right + 10;
  if (typeof window !== 'undefined' && left + width > window.innerWidth - 8) {
    left = Math.max(8, rect.left - width - 10);
  }
  return { top: Math.max(8, rect.top), left: Math.max(8, left) };
}

function queueEpisodeTitle(entry: MassPublishItem | MassDispatchItem): string {
  if (entry.episodeTitle) {
    return entry.episodeTitle;
  }
  return entry.title;
}

function queueStatusLabel(status: MassDispatchItemStatus): string {
  switch (status) {
    case 'queued':
      return 'Queued';
    case 'running':
      return 'Uploading';
    case 'awaiting_manual':
      return 'Your turn';
    case 'published':
      return 'Live';
    case 'failed':
      return 'Failed';
    case 'skipped':
      return 'Skipped';
    case 'cancelled':
      return 'Stopped';
    default: {
      const exhaustive: never = status;
      return exhaustive;
    }
  }
}

function queueItemClass(status: MassDispatchItemStatus): string | null {
  switch (status) {
    case 'queued':
    case 'skipped':
      return null;
    case 'running':
      return classes.queueItemRun;
    case 'awaiting_manual':
      return classes.queueItemWait;
    case 'published':
      return classes.queueItemLive;
    case 'failed':
      return classes.queueItemFail;
    case 'cancelled':
      return classes.queueItemStop;
    default: {
      const exhaustive: never = status;
      return exhaustive;
    }
  }
}

function hoverFromLane(
  item: MassPublishItem,
  pos: { top: number; left: number },
): HoverCard {
  return {
    ...pos,
    eyebrow: `${item.kind === 'infographic' ? 'Poster' : 'Video'} · ${platformLabel(item.platform)}`,
    title: item.captionTitle?.trim() || item.title,
    body: item.captionBody?.trim() || undefined,
    link: item.openUrl ?? undefined,
    note: item.status === 'blocked' && item.blockers[0]
      ? item.blockers[0]
      : item.status === 'published' && item.publishMode === 'auto' && !item.openUrl
        ? 'No public link stored. Click to queue republish.'
        : undefined,
  };
}

function isMassDispatchItem(
  entry: MassPublishItem | MassDispatchItem,
): entry is MassDispatchItem {
  return !('canDispatch' in entry);
}

function queueStatusOf(entry: MassPublishItem | MassDispatchItem): MassDispatchItemStatus {
  if (isMassDispatchItem(entry)) {
    return entry.status;
  }
  switch (entry.status) {
    case 'published':
      return 'published';
    case 'failed':
      return 'failed';
    case 'blocked':
    case 'pending':
      return 'queued';
    default: {
      const exhaustive: never = entry.status;
      return exhaustive;
    }
  }
}

function sameIdOrder(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((id, index) => id === right[index]);
}

function hoverFromQueue(
  entry: MassPublishItem | MassDispatchItem,
  pos: { top: number; left: number },
): HoverCard {
  const status = queueStatusOf(entry);
  const progress = 'progress' in entry ? entry.progress : undefined;
  const error = 'error' in entry ? entry.error : undefined;
  const errorDetail = 'errorDetail' in entry ? entry.errorDetail : undefined;
  const link = 'openUrl' in entry ? entry.openUrl : entry.url;
  return {
    ...pos,
    eyebrow: `${entry.kind === 'infographic' ? 'Poster' : 'Video'} · ${platformLabel(entry.platform)} · ${queueStatusLabel(status)}`,
    title: queueEpisodeTitle(entry),
    note: status === 'running' || status === 'cancelled' || status === 'awaiting_manual'
      ? progress ?? error
      : error,
    body: errorDetail && errorDetail !== error
      ? errorDetail
      : 'captionBody' in entry
        ? entry.captionBody?.trim() || undefined
        : undefined,
    link: link ?? undefined,
  };
}

function CaptionHover({ hover }: { hover: HoverCard | null }) {
  const cardRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    const node = cardRef.current;
    if (!node || !hover) {
      return;
    }
    const box = node.getBoundingClientRect();
    let top = hover.top;
    let left = hover.left;
    if (box.bottom > window.innerHeight - 8) {
      top = Math.max(8, window.innerHeight - box.height - 8);
    }
    if (box.right > window.innerWidth - 8) {
      left = Math.max(8, window.innerWidth - box.width - 8);
    }
    node.style.top = `${top}px`;
    node.style.left = `${left}px`;
  }, [hover]);

  if (!hover) {
    return null;
  }
  const card = createElement(
    'div',
    {
      ref: cardRef,
      className: webClassName(classes.captionCard),
      style: { top: hover.top, left: hover.left },
    },
    createElement(
      'div',
      { className: webClassName(classes.captionEyebrow) },
      hover.eyebrow,
    ),
    createElement('div', { className: webClassName(classes.captionTitle) }, hover.title),
    hover.note
      ? createElement('div', { className: webClassName(classes.captionNote) }, hover.note)
      : null,
    hover.body
      ? createElement('div', { className: webClassName(classes.captionBody) }, hover.body)
      : null,
    hover.link
      ? createElement('div', { className: webClassName(classes.captionLink) }, hover.link)
      : null,
  );
  if (typeof document === 'undefined') {
    return card;
  }
  return createPortal(card, document.body);
}

function itemFor(
  itemsById: Map<string, MassPublishItem>,
  episodeItemIds: string[],
  platform: string,
  kind: MassPublishKind,
): MassPublishItem | undefined {
  for (const id of episodeItemIds) {
    const item = itemsById.get(id);
    if (item && item.platform === platform && item.kind === kind) {
      return item;
    }
  }
  return undefined;
}

export function MassPublishScreen() {
  const { api } = useOutdoorUi();
  const {
    navigateToLibrary,
    navigateToPlatforms,
    navigateToPublishPlan,
    navigateToBeatPosters,
    navigateToScript,
  } = useOutdoorRoute();
  const [seriesList, setSeriesList] = useState<VideoOpsCatalogSeries[]>([]);
  const [seriesId, setSeriesId] = useState(() =>
    readStored(SERIES_KEY, 'abstract_algebra_in_proof_assistant'),
  );
  const [lang, setLang] = useState<MassPublishBoard['lang']>(() => {
    const stored = readStored(LANG_KEY, 'zh');
    return stored === 'en' || stored === 'all' ? stored : 'zh';
  });
  const [kindView, setKindView] = useState<'both' | MassPublishKind>('both');
  const [board, setBoard] = useState<MassPublishBoard | null>(null);
  const [selected, setSelected] = useState<string[]>(() => readStoredSelected());
  const [dispatch, setDispatch] = useState<MassDispatch | null>(null);
  const [history, setHistory] = useState<MassDispatchRef[]>([]);
  const [loading, setLoading] = useState(true);
  const [dispatching, setDispatching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [platforms, setPlatforms] = useState<PlatformStatus[]>([]);
  const [hover, setHover] = useState<HoverCard | null>(null);
  const loggedFailures = useRef(new Set<string>());

  const loadHealth = useCallback(async () => {
    try {
      const health = await api.getPlatformsHealth();
      setPlatforms(health.entries ?? health.platforms ?? []);
    } catch {
      setPlatforms([]);
    }
  }, [api]);

  const login = usePlatformLogin(() => {
    void loadHealth();
  });

  const loadBoard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [nextBoard, seriesPayload, dispatchList] = await Promise.all([
        api.getMassPublishBoard({ seriesId, lang }),
        api.getSeries(),
        api.listMassPublishDispatches().catch(() => ({
          dispatches: [] as MassDispatchRef[],
          activeDispatch: null,
        })),
      ]);
      setBoard(nextBoard);
      setSeriesList(seriesPayload);
      setHistory(dispatchList.dispatches);
      void loadHealth();
      const restored = nextBoard.activeDispatch ?? dispatchList.activeDispatch;
      if (restored) {
        setDispatch(restored);
      }
      const finishedIds = new Set(
        (restored?.items ?? [])
          .filter((item) =>
            item.status === 'published' ||
            item.status === 'failed' ||
            item.status === 'skipped' ||
            item.status === 'cancelled',
          )
          .map((item) => item.id),
      );
      setSelected((current) =>
        current.filter((id) =>
          !finishedIds.has(id) &&
          nextBoard.items.some((item) => item.id === id && item.canDispatch && item.status === 'pending'),
        ),
      );
    } catch (loadError) {
      setError(formatOutdoorApiError(loadError));
      setBoard(null);
    } finally {
      setLoading(false);
    }
  }, [api, lang, loadHealth, seriesId]);

  useEffect(() => {
    writeStored(SERIES_KEY, seriesId);
    writeStored(LANG_KEY, lang);
    void loadBoard();
  }, [lang, loadBoard, seriesId]);

  useEffect(() => {
    writeStored(SELECTED_KEY, JSON.stringify(selected));
  }, [selected]);

  useEffect(() => {
    if (!dispatch) {
      return;
    }
    for (const item of dispatch.items) {
      if (item.status !== 'failed' || !item.error) {
        continue;
      }
      const key = `${dispatch.id}:${item.id}:${item.finishedAt ?? item.error}`;
      if (loggedFailures.current.has(key)) {
        continue;
      }
      loggedFailures.current.add(key);
      if (dispatch.status !== 'running') {
        continue;
      }
      console.error(
        `[squat ${dispatch.id}] ${platformLabel(item.platform)} ${item.kind} ${item.scriptId} failed: ${item.error}`,
        item.errorDetail ?? '',
      );
    }
  }, [dispatch]);

  useEffect(() => {
    if (!dispatch || dispatch.status !== 'running' || typeof window === 'undefined') {
      return;
    }
    const timer = window.setInterval(() => {
      void api.getMassPublishDispatch(dispatch.id).then((payload) => {
        if (payload.dispatch) {
          setDispatch(payload.dispatch);
        }
        if (payload.dispatch && payload.dispatch.status !== 'running') {
          void loadBoard();
        }
      }).catch(() => {
        // Keep the squat on screen if the agent restarts mid-poll.
      });
    }, 1500);
    return () => {
      window.clearInterval(timer);
    };
  }, [api, dispatch, loadBoard]);

  const platformHealth = useMemo(() => {
    const map = new Map<string, PlatformStatus>();
    for (const entry of platforms) {
      map.set(entry.platform, entry);
    }
    return map;
  }, [platforms]);

  const itemsById = useMemo(() => {
    const map = new Map<string, MassPublishItem>();
    for (const item of board?.items ?? []) {
      map.set(item.id, item);
    }
    return map;
  }, [board]);

  const selectedItems = useMemo(
    () => selected.map((id) => itemsById.get(id)).filter((item): item is MassPublishItem => Boolean(item)),
    [itemsById, selected],
  );

  const seriesOptions = useMemo(() => {
    const options = [{ id: 'all', title: 'All series' }];
    for (const series of seriesList) {
      options.push({ id: series.id, title: series.title });
    }
    return options;
  }, [seriesList]);

  const toggleItem = useCallback((item: MassPublishItem) => {
    if (item.canDispatch) {
      setSelected((current) =>
        current.includes(item.id)
          ? current.filter((id) => id !== item.id)
          : [...current, item.id],
      );
      return;
    }
    if (item.status === 'published' && item.openUrl) {
      if (typeof window !== 'undefined') {
        window.open(item.openUrl, '_blank', 'noopener,noreferrer');
      }
      return;
    }
    if (item.kind === 'infographic') {
      navigateToBeatPosters(item.scriptId);
      return;
    }
    navigateToScript(item.scriptId);
  }, [navigateToBeatPosters, navigateToScript]);

  const queueKind = useCallback((kind: MassPublishKind) => {
    if (!board) {
      return;
    }
    const ids = board.items
      .filter((item) =>
        item.kind === kind &&
        item.canDispatch &&
        item.status !== 'published',
      )
      .map((item) => item.id);
    setSelected(ids);
    setNote(
      kind === 'infographic'
        ? `Queued ${ids.length} pending poster albums`
        : `Queued ${ids.length} pending videos`,
    );
  }, [board]);

  const handleDispatch = useCallback(async () => {
    if (!selected.length) {
      setError('Queue at least one ready cell');
      return;
    }
    setDispatching(true);
    setError(null);
    setNote(null);
    try {
      const payload = await api.startMassPublishDispatch(selected);
      setDispatch(payload.dispatch);
      setNote(`Squat ${payload.dispatch?.id ?? ''} started in click order`);
      const dispatchList = await api.listMassPublishDispatches().catch(() => null);
      if (dispatchList) {
        setHistory(dispatchList.dispatches);
      }
    } catch (startError) {
      setError(formatOutdoorApiError(startError));
    } finally {
      setDispatching(false);
    }
  }, [api, selected]);

  const handleManualResolve = useCallback(async (
    itemId: string,
    result: 'published' | 'skipped',
  ) => {
    setError(null);
    try {
      const payload = await api.resolveMassPublishManualItem(itemId, result);
      if (payload.dispatch) {
        setDispatch(payload.dispatch);
      }
      setNote(result === 'published' ? 'Marked live by hand' : 'Skipped');
      if (payload.dispatch && payload.dispatch.status !== 'running') {
        void loadBoard();
      }
    } catch (resolveError) {
      setError(formatOutdoorApiError(resolveError));
    }
  }, [api, loadBoard]);

  const handleClearQueue = useCallback(async () => {
    setSelected([]);
    if (dispatch?.status !== 'running' && dispatch?.status !== 'waiting') {
      setNote('Queue cleared');
      return;
    }
    try {
      const payload = await api.abortMassPublishDispatch();
      if (payload.dispatch) {
        setDispatch(payload.dispatch);
      }
      setNote('Stopping squat…');
    } catch (stopError) {
      setError(formatOutdoorApiError(stopError));
    }
  }, [api, dispatch]);

  const running = dispatch?.status === 'running';
  const waiting = dispatch?.status === 'waiting';
  const progress = dispatchProgress(dispatch);
  const dispatchIds = dispatch?.items.map((item) => item.id) ?? [];
  const queueEntries = dispatch?.items.length &&
      (running || waiting || selected.length === 0 || sameIdOrder(selected, dispatchIds))
    ? dispatch.items
    : selectedItems;
  const summary = board?.summary;

  return (
    <View style={[shell.screen, webModuleStyle(classes.screen)]}>
      <View style={webModuleStyle(classes.headerWrap)}>
        <Header
          title="Mass publish"
          actions={[
            { label: 'Library', onPress: navigateToLibrary, variant: 'back' },
            { label: 'Platforms', onPress: navigateToPlatforms },
            { label: 'Curriculum plan', onPress: navigateToPublishPlan },
            {
              label: loading ? 'Scanning…' : 'Refresh',
              onPress: () => {
                void loadBoard();
              },
              disabled: loading,
            },
          ]}
        />
      </View>

      <View style={webModuleStyle(classes.toolbar)}>
        <View style={webModuleStyle(classes.stats)}>
          <View style={webModuleStyle(classes.stat, classes.statPending)}>
            <Text style={webModuleStyle(classes.statValue)}>{summary?.pendingAuto ?? 0}</Text>
            <Text style={webModuleStyle(classes.statLabel)}>ready</Text>
          </View>
          <View style={webModuleStyle(classes.stat, classes.statPending)}>
            <Text style={webModuleStyle(classes.statValue)}>{summary?.posterPending ?? 0}</Text>
            <Text style={webModuleStyle(classes.statLabel)}>posters</Text>
          </View>
          <View style={webModuleStyle(classes.stat, classes.statWait)}>
            <Text style={webModuleStyle(classes.statValue)}>{summary?.videoPending ?? 0}</Text>
            <Text style={webModuleStyle(classes.statLabel)}>videos</Text>
          </View>
          <View style={webModuleStyle(classes.stat, classes.statLive)}>
            <Text style={webModuleStyle(classes.statValue)}>{summary?.published ?? 0}</Text>
            <Text style={webModuleStyle(classes.statLabel)}>live</Text>
          </View>
          <View style={webModuleStyle(classes.stat, classes.statWait)}>
            <Text style={webModuleStyle(classes.statValue)}>{summary?.pendingManual ?? 0}</Text>
            <Text style={webModuleStyle(classes.statLabel)}>manual</Text>
          </View>
        </View>
        <View style={webModuleStyle(classes.filters)}>
          {seriesOptions.map((option) => (
            <Pressable
              key={option.id}
              onPress={() => setSeriesId(option.id)}
              style={webModuleStyle(classes.chip, seriesId === option.id ? classes.chipOn : null)}
            >
              <Text
                style={webModuleStyle(classes.chipText, seriesId === option.id ? classes.chipOnText : null)}
                numberOfLines={1}
              >
                {option.title}
              </Text>
            </Pressable>
          ))}
          {([
            ['zh', 'China'],
            ['en', 'English'],
            ['all', 'Both'],
          ] as const).map(([id, label]) => (
            <Pressable
              key={id}
              onPress={() => setLang(id)}
              style={webModuleStyle(classes.chip, lang === id ? classes.chipOn : null)}
            >
              <Text style={webModuleStyle(classes.chipText, lang === id ? classes.chipOnText : null)}>
                {label}
              </Text>
            </Pressable>
          ))}
          {([
            ['both', 'P+V'],
            ['infographic', 'Posters'],
            ['video', 'Videos'],
          ] as const).map(([id, label]) => (
            <Pressable
              key={id}
              onPress={() => setKindView(id)}
              style={webModuleStyle(classes.chip, kindView === id ? classes.chipOn : null)}
            >
              <Text style={webModuleStyle(classes.chipText, kindView === id ? classes.chipOnText : null)}>
                {label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {error ? <Text style={webModuleStyle(classes.banner, classes.error)}>{error}</Text> : null}
      {note ? <Text style={webModuleStyle(classes.banner, classes.note)}>{note}</Text> : null}

      <View style={[shell.workspace, webModuleStyle(classes.workspace)]}>
        <View style={[shell.matrixPane, webModuleStyle(classes.matrixPane)]}>
          {loading && !board ? <ActivityIndicator style={webModuleStyle(classes.spinner)} /> : null}
          {board && board.episodes.length === 0 ? (
            <Text style={webModuleStyle(classes.empty)}>No episodes in this series.</Text>
          ) : null}
          {board ? createElement(
            'div',
            {
              className: webClassName(classes.matrixScroll),
              onScroll: () => setHover(null),
            },
            createElement(
              'div',
              {
                className: webClassName(classes.matrix),
                style: {
                  gridTemplateColumns: `${EPISODE_COL} repeat(${board.platforms.length}, ${PLATFORM_COL})`,
                },
              },
              createElement(
                'div',
                { className: webClassName(classes.corner) },
                createElement(
                  'span',
                  { className: webClassName(classes.colHeadText) },
                  `${board.summary.episodeCount} episodes`,
                ),
              ),
              ...board.platforms.map((platform) => {
                const entry = platformHealth.get(platform);
                const offline = platformNeedsLogin(entry);
                const account = columnAccount(entry);
                const canAdd = platformCanAddAccount(entry);
                return createElement(
                  'div',
                  {
                    key: platform,
                    className: webClassName(classes.colHead, offline ? classes.colHeadOffline : null),
                    title: account
                      ? `${platformLabel(platform)} · ${account}`
                      : offline
                        ? `Login ${platformLabel(platform)}`
                        : platformLabel(platform),
                  },
                  createElement(
                    'span',
                    { className: webClassName(classes.colHeadText) },
                    platformLabel(platform),
                  ),
                  account
                    ? createElement(
                        'span',
                        { className: webClassName(classes.colHeadAccount) },
                        account,
                      )
                    : null,
                  offline
                    ? createElement(
                        'button',
                        {
                          type: 'button',
                          className: webClassName(classes.colHeadHint),
                          onClick: () => {
                            void login.start(platform);
                          },
                        },
                        'Login',
                      )
                    : null,
                  canAdd
                    ? createElement(
                        'button',
                        {
                          type: 'button',
                          className: webClassName(classes.colHeadNew),
                          onClick: () => {
                            void login.start(platform);
                          },
                        },
                        'New',
                      )
                    : null,
                );
              }),
              ...board.episodes.flatMap((episode) => [
                createElement(
                  'button',
                  {
                    key: `${episode.scriptId}-ep`,
                    type: 'button',
                    className: webClassName(classes.episode),
                    title: `${episode.episodeTitle} · ${episode.scriptId}`,
                    onClick: () => navigateToBeatPosters(episode.scriptId),
                  },
                  episode.coverUrl
                    ? createElement('img', {
                        src: episode.coverUrl,
                        alt: '',
                        className: webClassName(classes.cover),
                      })
                    : null,
                  createElement(
                    'div',
                    { className: webClassName(classes.episodeCopy) },
                    createElement(
                      'div',
                      { className: webClassName(classes.episodeTitle) },
                      episode.episodeTitle,
                    ),
                    createElement(
                      'div',
                      { className: webClassName(classes.episodeMeta) },
                      episode.episodeIndex !== null
                        ? `${String(episode.episodeIndex).padStart(2, '0')} · ${episode.scriptId}`
                        : episode.scriptId,
                    ),
                  ),
                ),
                ...board.platforms.map((platform) => {
                  const poster = itemFor(itemsById, episode.itemIds, platform, 'infographic');
                  const video = itemFor(itemsById, episode.itemIds, platform, 'video');
                  const lanes = [poster, video].filter((item): item is MassPublishItem => {
                    if (!item) {
                      return false;
                    }
                    if (kindView === 'both') {
                      return true;
                    }
                    return item.kind === kindView;
                  });
                  return createElement(
                    'div',
                    {
                      key: `${episode.scriptId}-${platform}`,
                      className: webClassName(classes.cell),
                    },
                    ...lanes.map((item) => {
                      const selectedAt = selected.indexOf(item.id);
                      const isSelected = selectedAt >= 0;
                      return createElement(
                        'button',
                        {
                          key: item.id,
                          type: 'button',
                          className: webClassName(classes.lane, laneClass(item, isSelected)),
                          onClick: () => toggleItem(item),
                          onMouseEnter: (event: { currentTarget: HTMLElement }) => {
                            const rect = event.currentTarget.getBoundingClientRect();
                            setHover(hoverFromLane(item, placeHoverCard(rect)));
                          },
                          onMouseLeave: () => setHover(null),
                        },
                        createElement(
                          'div',
                          { className: webClassName(classes.laneRow) },
                          createElement(
                            'span',
                            { className: webClassName(classes.laneKind) },
                            kindShort(item.kind, board.lang),
                          ),
                          createElement(
                            'span',
                            { className: webClassName(classes.laneStatus, statusClass(item, isSelected)) },
                            statusLabel(item, isSelected, isSelected ? selectedAt + 1 : undefined),
                          ),
                        ),
                      );
                    }),
                  );
                }),
              ]),
            ),
          ) : null}
        </View>

        <View style={webModuleStyle(classes.dock)}>
          {login.session || login.error || login.busy ? (
            <PlatformLoginPanel
              session={login.session}
              qrUrl={login.qrUrl}
              error={login.error}
              busy={login.busy}
              onCancel={() => {
                void login.cancel();
              }}
            />
          ) : null}
          <View style={webModuleStyle(classes.dockBar)}>
            <Text style={webModuleStyle(classes.dockTitle)}>
              {dispatch ? `Squat ${dispatch.id}` : 'Squat'}
            </Text>
            <Text style={webModuleStyle(classes.dockMeta)} numberOfLines={1}>
              {selectedItems.length} selected
              {dispatch
                ? ` · ${dispatch.summary.published} live · ${dispatch.summary.failed} failed · ${dispatch.summary.cancelled ?? 0} stopped · ${dispatch.summary.queued} left`
                : ' · uploads run in the order you click'}
            </Text>
            {dispatch ? (
              <View style={webModuleStyle(classes.progressTrack)}>
                <View style={[webModuleStyle(classes.progressFill), { width: `${progress}%` }]} />
              </View>
            ) : null}
            <View style={webModuleStyle(classes.dockActions)}>
              <Button label="Queue posters" onPress={() => queueKind('infographic')} />
              <Button label="Queue videos" onPress={() => queueKind('video')} />
              <Button
                label="Clear queue"
                onPress={() => {
                  void handleClearQueue();
                }}
                disabled={!running && !waiting && selectedItems.length === 0}
              />
              <Button
                label={running || dispatching ? `${progress}%` : `Dispatch ${selectedItems.length}`}
                variant="primary"
                disabled={running || waiting || dispatching || selectedItems.length === 0}
                onPress={() => {
                  void handleDispatch();
                }}
              />
            </View>
          </View>
          <Text style={webModuleStyle(classes.dockHint)}>
            {waiting
              ? '小红书 blocks uploads: the creator page is open with the caption copied. Publish it, then hit Live.'
              : running
                ? 'Clear queue kills the current upload and cancels everything still queued.'
                : 'Clear queue removes the selection. If a squat is running, it stops that squat.'}
          </Text>
          {history.length > 0 ? (
            <View style={webModuleStyle(classes.historyRow)}>
              {history.slice(0, 8).map((entry) => (
                <Pressable
                  key={entry.id}
                  onPress={() => {
                    void api.getMassPublishDispatch(entry.id).then((payload) => {
                      if (payload.dispatch) {
                        setDispatch(payload.dispatch);
                      }
                    }).catch((loadError) => {
                      setError(formatOutdoorApiError(loadError));
                    });
                  }}
                  style={webModuleStyle(
                    classes.historyChip,
                    dispatch?.id === entry.id ? classes.historyChipOn : null,
                  )}
                >
                  <Text
                    style={webModuleStyle(
                      classes.historyChipText,
                      dispatch?.id === entry.id ? classes.historyChipOnText : null,
                    )}
                    numberOfLines={1}
                  >
                    {entry.id.replace('squat-', '')}
                    {` · ${entry.summary.published} live`}
                    {entry.summary.failed ? ` · ${entry.summary.failed} fail` : ''}
                    {entry.summary.cancelled ? ` · ${entry.summary.cancelled} stop` : ''}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}
          {queueEntries.length > 0 ? (
            <View style={webModuleStyle(classes.queueScroll)}>
              <View style={webModuleStyle(classes.queueRow)}>
                {queueEntries.map((entry, index) => {
                  const status = queueStatusOf(entry);
                  const progressText = 'progress' in entry ? entry.progress : undefined;
                  const errorText = 'error' in entry ? entry.error : undefined;
                  return createElement(
                    'div',
                    {
                      key: entry.id,
                      className: webClassName(classes.queueItem, queueItemClass(status)),
                      onMouseEnter: (event: { currentTarget: HTMLElement }) => {
                        const rect = event.currentTarget.getBoundingClientRect();
                        setHover(hoverFromQueue(entry, placeHoverCard(rect)));
                      },
                      onMouseLeave: () => setHover(null),
                    },
                    createElement(
                      'div',
                      { className: webClassName(classes.queueHead) },
                      createElement('span', { className: webClassName(classes.queueIndex) }, `#${index + 1}`),
                      createElement(
                        'span',
                        { className: webClassName(classes.queuePlatform) },
                        platformLabel(entry.platform),
                      ),
                      createElement(
                        'span',
                        { className: webClassName(classes.queueKind) },
                        kindShort(entry.kind, board?.lang ?? 'zh'),
                      ),
                      createElement(
                        'span',
                        { className: webClassName(classes.queueTitle) },
                        queueEpisodeTitle(entry),
                      ),
                    ),
                    createElement(
                      'div',
                      { className: webClassName(classes.queueMeta) },
                      queueStatusLabel(status),
                      progressText &&
                          (status === 'running' ||
                            status === 'cancelled' ||
                            status === 'awaiting_manual')
                        ? ` · ${progressText}`
                        : '',
                    ),
                    errorText
                      ? createElement('div', { className: webClassName(classes.queueError) }, errorText)
                      : null,
                    status === 'awaiting_manual'
                      ? createElement(
                          'div',
                          { className: webClassName(classes.queueActions) },
                          createElement(
                            'button',
                            {
                              type: 'button',
                              className: webClassName(classes.queueAction, classes.queueActionLive),
                              onClick: () => {
                                void handleManualResolve(entry.id, 'published');
                              },
                            },
                            'Live',
                          ),
                          createElement(
                            'button',
                            {
                              type: 'button',
                              className: webClassName(classes.queueAction),
                              onClick: () => {
                                void handleManualResolve(entry.id, 'skipped');
                              },
                            },
                            'Skip',
                          ),
                        )
                      : null,
                  );
                })}
              </View>
            </View>
          ) : null}
        </View>
      </View>
      <CaptionHover hover={hover} />
    </View>
  );
}

const shell = StyleSheet.create({
  screen: {
    flex: 1,
    height: '100%',
    minHeight: 0,
    overflow: 'hidden',
  },
  workspace: {
    flex: 1,
    minHeight: 0,
    minWidth: 0,
  },
  matrixPane: {
    flex: 1,
    minHeight: 0,
    minWidth: 0,
  },
});
