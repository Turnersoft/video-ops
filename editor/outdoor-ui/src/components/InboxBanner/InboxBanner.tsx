import classes from './InboxBanner.module.scss';
import { webModuleStyle, webClassName } from '../../utils/webClassName';
import type { InboxBannerProps } from './InboxBanner.types';
import { useCallback, useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { useOutdoorUi } from '../../context/OutdoorUiContext';
import type { InboxStatusSnapshot } from '../../types';

type InboxLineKind = 'watch' | 'event' | 'path' | 'hint' | 'pending' | 'offline';

type InboxLine = {
  kind: InboxLineKind;
  text: string;
};

export type { InboxBannerProps } from './InboxBanner.types';

export function InboxBanner({ variant, docked = false }: InboxBannerProps) {
  const resolvedVariant = variant ?? (docked ? 'embedded' : 'standalone');
  const embedded = resolvedVariant === 'embedded';
  const { api, refreshKey } = useOutdoorUi();
  const [inbox, setInbox] = useState<InboxStatusSnapshot | null | undefined>(undefined);

  const load = useCallback(async () => {
    try {
      const status = await api.getInboxStatus();
      setInbox(status);
    } catch {
      setInbox(null);
    }
  }, [api]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  if (inbox === undefined) {
    return null;
  }

  const lines: InboxLine[] = !inbox
    ? [
        {
          kind: 'offline',
          text: 'Inbox status unavailable — is the outdoor agent running?',
        },
      ]
    : (() => {
        const pending = (inbox.files ?? []).filter(
          (file) => file.status === 'ready' || file.status === 'pending',
        );
        const latest = inbox.recentIngests?.[0];
        const next: InboxLine[] = [
          {
            kind: 'watch',
            text: `Watching ${(inbox.watchedFolders ?? []).length} folder(s)`,
          },
        ];
        if (latest) {
          next.push({
            kind: 'event',
            text: `Last picked: take ${latest.takeId} · video ${latest.videoFileName ?? '—'}`,
          });
          next.push({
            kind: 'path',
            text: `Inbox path: ${latest.videoPath ?? latest.inboxDir}`,
          });
          if (latest.takeDir) {
            next.push({
              kind: 'path',
              text: `Post-process folder: ${latest.takeDir}`,
            });
          }
        } else {
          next.push({
            kind: 'hint',
            text: 'No ingest yet — export {takeId}.mp4 + {takeId}.json to TurnOutdoor/inbox',
          });
        }
        if (pending.length) {
          next.push({
            kind: 'pending',
            text: `${pending.length} file pair(s) waiting: ${pending
              .map((file) => `${file.takeId} (${file.status})`)
              .join(', ')}`,
          });
        }
        return next;
      })();

  const rows = lines.map((line) => (
    <View
      key={`${line.kind}-${line.text}`}
      style={webModuleStyle(classes.lineRow, lineClassForKind(line.kind))}
    >
      <Text
        style={webModuleStyle(classes.lineText, textClassForKind(line.kind))}
        numberOfLines={1}
      >
        {line.text}
      </Text>
    </View>
  ));

  if (embedded) {
    return <View style={webModuleStyle(classes.embedded)}>{rows}</View>;
  }

  return (
    <View style={webModuleStyle(classes.banner, !inbox ? classes.offline : classes.online)}>{rows}</View>
  );
}

function lineClassForKind(kind: InboxLineKind) {
  switch (kind) {
    case 'watch':
      return classes.lineWatch;
    case 'event':
      return classes.lineEvent;
    case 'path':
      return classes.linePath;
    case 'hint':
      return classes.lineHint;
    case 'pending':
      return classes.linePending;
    case 'offline':
      return classes.lineOffline;
    default: {
      const exhaustive: never = kind;
      return exhaustive;
    }
  }
}

function textClassForKind(kind: InboxLineKind) {
  switch (kind) {
    case 'watch':
      return classes.textWatch;
    case 'event':
      return classes.textEvent;
    case 'path':
      return classes.textPath;
    case 'hint':
      return classes.textHint;
    case 'pending':
      return classes.textPending;
    case 'offline':
      return classes.offlineText;
    default: {
      const exhaustive: never = kind;
      return exhaustive;
    }
  }
}
