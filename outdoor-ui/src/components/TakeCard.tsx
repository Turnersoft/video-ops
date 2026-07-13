import { StyleSheet, Text, View } from 'react-native';

import { colors, sharedStyles, typography } from '../theme';
import type { InboxFileSighting, VideoOpsCatalogTake } from '../types';
import { fmtDate, fmtDuration } from '../utils/format';
import { TakeResults } from './TakeResults';
import { Badge } from './ui/Badge';

export type TakeCardProps = {
  scriptId: string;
  take: VideoOpsCatalogTake;
  ingest?: InboxFileSighting | null;
};

export function TakeCard({ scriptId, take, ingest }: TakeCardProps) {
  return (
    <View style={sharedStyles.card}>
      <View style={sharedStyles.cardTop}>
        <View style={styles.headerText}>
          <Text style={sharedStyles.cardTitle}>{take.takeId}</Text>
          <Text style={sharedStyles.cardMeta}>
            video file: {ingest?.videoFileName ?? `${take.takeId}.mp4`}
            {take.recordedAt ? ` · ${fmtDate(take.recordedAt)}` : ''}
            {take.durationMs ? ` · ${fmtDuration(take.durationMs)}` : ''}
            {take.pipelineStatus ? ` · ${take.pipelineStatus}` : ''}
          </Text>
          {ingest?.videoPath || ingest?.inboxDir ? (
            <Text style={styles.path}>
              Mac picked from: {ingest.videoPath ?? ingest.inboxDir}
            </Text>
          ) : null}
          {ingest?.takeDir ? (
            <Text style={styles.path}>Post-process folder: {ingest.takeDir}</Text>
          ) : null}
        </View>
        <Badge label={take.pipelineStatus || 'take'} filmed />
      </View>

      <TakeResults scriptId={scriptId} take={take} />
    </View>
  );
}

const styles = StyleSheet.create({
  headerText: {
    flex: 1,
    gap: 4,
  },
  path: {
    color: colors.code,
    fontSize: typography.tiny,
    fontFamily: 'Menlo',
    lineHeight: 15,
    marginTop: 4,
  },
});
