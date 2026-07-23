export type { LocalTakeCardProps } from './LocalTakeCard.types';

import classes from './LocalTakeCard.module.scss';
import { webModuleStyle, webClassName } from '../../utils/webClassName';
import type { LocalTakeCardProps } from './LocalTakeCard.types';
import { Image, Text, View } from 'react-native';

import { colors, sharedStyles, spacing, typography } from '../../theme';
import type { LocalTakeView } from '../../types';
import { fmtDate, fmtDuration } from '../../utils/format';
import { Badge } from '../Badge/Badge';
import { Button } from '../Button/Button';
import { TakeStepstones } from '../TakeStepstones/TakeStepstones';

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
    <View style={[webModuleStyle(classes.card), sharedStyles.card]}>
      <View style={sharedStyles.cardTop}>
        {take.thumbnailUri ? (
          <Image source={{ uri: take.thumbnailUri }} style={webModuleStyle(classes.thumb)} />
        ) : (
          <View style={webModuleStyle(classes.thumbPlaceholder)}>
            <Text style={webModuleStyle(classes.thumbPlaceholderText)}>REC</Text>
          </View>
        )}
        <View style={webModuleStyle(classes.headerText)}>
          <Text style={sharedStyles.cardTitle}>{take.takeId}</Text>
          <Text style={sharedStyles.cardMeta}>
            {fmtDate(take.recordedAt)}
            {take.durationMs ? ` · ${fmtDuration(take.durationMs)}` : ''}
          </Text>
          <Text style={webModuleStyle(classes.metaSummary)}>{take.metadataSummary}</Text>
          <Text style={webModuleStyle(classes.status)}>{take.statusLabel}</Text>
        </View>
        <Badge label="iPhone" filmed />
      </View>

      <TakeStepstones steps={take.steps} />

      {metadataLine ? (
        <View style={webModuleStyle(classes.metadataBox)}>
          <Text style={webModuleStyle(classes.metadataLabel)}>Take metadata</Text>
          <Text style={webModuleStyle(classes.metadataText)}>{metadataLine}</Text>
        </View>
      ) : null}

      {take.photoLibraryHint ? (
        <Text style={webModuleStyle(classes.hint)}>Photos backup: {take.photoLibraryHint}</Text>
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
