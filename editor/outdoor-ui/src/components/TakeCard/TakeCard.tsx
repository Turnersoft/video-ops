export type { TakeCardProps } from './TakeCard.types';

import classes from './TakeCard.module.scss';
import { webModuleStyle, webClassName } from '../../utils/webClassName';
import type { TakeCardProps } from './TakeCard.types';
import { Text, View } from 'react-native';

import { colors, sharedStyles, typography } from '../../theme';
import type { InboxFileSighting, VideoOpsCatalogTake } from '../../types';
import { fmtDate, fmtDuration } from '../../utils/format';
import { TakeResults } from '../TakeResults/TakeResults';
import { Badge } from '../Badge/Badge';

export function TakeCard({ scriptId, take, ingest }: TakeCardProps) {
  return (
    <View style={sharedStyles.card}>
      <View style={sharedStyles.cardTop}>
        <View style={webModuleStyle(classes.headerText)}>
          <Text style={sharedStyles.cardTitle}>{take.takeId}</Text>
          <Text style={sharedStyles.cardMeta}>
            video file: {ingest?.videoFileName ?? `${take.takeId}.mp4`}
            {take.recordedAt ? ` · ${fmtDate(take.recordedAt)}` : ''}
            {take.durationMs ? ` · ${fmtDuration(take.durationMs)}` : ''}
            {take.pipelineStatus ? ` · ${take.pipelineStatus}` : ''}
          </Text>
          {ingest?.videoPath || ingest?.inboxDir ? (
            <Text style={webModuleStyle(classes.path)}>
              Mac picked from: {ingest.videoPath ?? ingest.inboxDir}
            </Text>
          ) : null}
          {ingest?.takeDir ? (
            <Text style={webModuleStyle(classes.path)}>Post-process folder: {ingest.takeDir}</Text>
          ) : null}
        </View>
        <Badge label={take.pipelineStatus || 'take'} filmed />
      </View>

      <TakeResults scriptId={scriptId} take={take} />
    </View>
  );
}
