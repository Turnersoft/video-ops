import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useOutdoorUi } from '../../context/OutdoorUiContext';
import { colors, radii, spacing, typography } from '../../theme';
import type { InboxStatusSnapshot } from '../../types';

export function InboxBanner() {
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

  if (!inbox) {
    return (
      <View style={[styles.banner, styles.offline]}>
        <Text style={styles.offlineText}>
          Inbox status unavailable — is the outdoor agent running?
        </Text>
      </View>
    );
  }

  const pending = (inbox.files ?? []).filter(
    (file) => file.status === 'ready' || file.status === 'pending',
  );
  const latest = inbox.recentIngests?.[0];
  const lines: string[] = [];
  lines.push(`Watching ${(inbox.watchedFolders ?? []).length} folder(s)`);

  if (latest) {
    lines.push(
      `Last picked: take ${latest.takeId} · video ${latest.videoFileName ?? '—'}`,
    );
    lines.push(`Inbox path: ${latest.videoPath ?? latest.inboxDir}`);
    if (latest.takeDir) {
      lines.push(`Post-process folder: ${latest.takeDir}`);
    }
  } else {
    lines.push('No ingest yet — export {takeId}.mp4 + {takeId}.json to TurnOutdoor/inbox');
  }

  if (pending.length) {
    lines.push(
      `${pending.length} file pair(s) waiting: ${pending
        .map((file) => `${file.takeId} (${file.status})`)
        .join(', ')}`,
    );
  }

  return (
    <View style={[styles.banner, styles.online]}>
      {lines.map((line) => (
        <Text key={line} style={styles.onlineText}>
          {line}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radii.sm,
    gap: 4,
  },
  online: {
    backgroundColor: colors.bannerOnlineBg,
  },
  offline: {
    backgroundColor: colors.bannerOfflineBg,
  },
  onlineText: {
    color: colors.online,
    fontSize: typography.small,
    fontWeight: '600',
  },
  offlineText: {
    color: colors.offline,
    fontSize: typography.small,
    fontWeight: '600',
  },
});
