import { Image, StyleSheet, Text, View } from 'react-native';

import { colors, sharedStyles, spacing, typography } from '../theme';
import type { LocalTakeView } from '../types';
import { fmtDate, fmtDuration } from '../utils/format';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { TakeStepstones } from './TakeStepstones';

export type LocalTakeCardProps = {
  take: LocalTakeView;
  exporting?: boolean;
  onExportToIcloud?: () => void;
};

function formatMarkerLine(take: LocalTakeView): string | null {
  if (take.markers.length === 0 && take.slideEvents.length === 0) {
    return null;
  }
  const slidePreview = take.slideEvents
    .slice(0, 4)
    .map((event) => `slide ${event.index + 1} @ ${Math.round(event.atMs / 1000)}s`)
    .join(' · ');
  const markerPreview = take.markers
    .slice(0, 3)
    .map((marker) => `${marker.kind.toUpperCase()} @ ${Math.round(marker.atMs / 1000)}s`)
    .join(' · ');
  return [slidePreview, markerPreview].filter(Boolean).join('\n');
}

export function LocalTakeCard({ take, exporting = false, onExportToIcloud }: LocalTakeCardProps) {
  const metadataLine = formatMarkerLine(take);
  const icloudPending = take.steps.icloud === 'pending';

  return (
    <View style={[sharedStyles.card, styles.card]}>
      <View style={sharedStyles.cardTop}>
        {take.thumbnailUri ? (
          <Image source={{ uri: take.thumbnailUri }} style={styles.thumb} />
        ) : (
          <View style={styles.thumbPlaceholder}>
            <Text style={styles.thumbPlaceholderText}>REC</Text>
          </View>
        )}
        <View style={styles.headerText}>
          <Text style={sharedStyles.cardTitle}>{take.takeId}</Text>
          <Text style={sharedStyles.cardMeta}>
            {fmtDate(take.recordedAt)}
            {take.durationMs ? ` · ${fmtDuration(take.durationMs)}` : ''}
          </Text>
          <Text style={styles.metaSummary}>{take.metadataSummary}</Text>
          <Text style={styles.status}>{take.statusLabel}</Text>
        </View>
        <Badge label="iPhone" filmed />
      </View>

      <TakeStepstones steps={take.steps} />

      {metadataLine ? (
        <View style={styles.metadataBox}>
          <Text style={styles.metadataLabel}>Take metadata</Text>
          <Text style={styles.metadataText}>{metadataLine}</Text>
        </View>
      ) : null}

      {take.photoLibraryHint ? (
        <Text style={styles.hint}>Photos backup: {take.photoLibraryHint}</Text>
      ) : null}

      {icloudPending && onExportToIcloud ? (
        <Button
          label={exporting ? 'Exporting to iCloud…' : 'Export to iCloud inbox'}
          variant="primary"
          disabled={exporting}
          onPress={onExportToIcloud}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.xs,
    borderColor: 'rgba(249, 115, 22, 0.28)',
  },
  headerText: {
    flex: 1,
    gap: 3,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: 8,
    marginRight: spacing.sm,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
  },
  thumbPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 8,
    marginRight: spacing.sm,
    backgroundColor: 'rgba(127, 29, 29, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbPlaceholderText: {
    color: '#fecaca',
    fontWeight: '900',
    fontSize: typography.tiny,
  },
  metaSummary: {
    color: colors.muted,
    fontSize: typography.small,
    fontWeight: '600',
  },
  status: {
    color: colors.orange,
    fontSize: typography.small,
    fontWeight: '800',
  },
  metadataBox: {
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    borderRadius: 10,
    padding: spacing.sm,
    gap: 4,
  },
  metadataLabel: {
    color: colors.orange,
    fontSize: typography.tiny,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  metadataText: {
    color: colors.code,
    fontFamily: 'Menlo',
    fontSize: typography.tiny,
    lineHeight: 16,
  },
  hint: {
    color: colors.muted,
    fontSize: typography.tiny,
    lineHeight: 16,
  },
});
