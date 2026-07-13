import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '../theme';
import type { PipelineStageSnapshot } from '../types';

export function StageErrorBlock({ entry }: { entry: PipelineStageSnapshot }) {
  if (entry.status !== 'failed' && entry.status !== 'cancelled') {
    return null;
  }

  const title = entry.errorTitle ?? (entry.status === 'cancelled' ? 'Aborted' : 'Stage failed');
  const message = entry.error ?? entry.progress?.message ?? 'Unknown error';
  const hint = entry.errorHint;

  return (
    <View style={styles.box}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    gap: 4,
    marginTop: spacing.xs,
    padding: spacing.sm,
    borderRadius: 8,
    backgroundColor: 'rgba(127, 29, 29, 0.22)',
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.35)',
  },
  title: {
    color: '#fecaca',
    fontSize: typography.small,
    fontWeight: '900',
  },
  message: {
    color: colors.text,
    fontSize: typography.small,
    lineHeight: 18,
  },
  hint: {
    color: colors.muted,
    fontSize: typography.tiny,
    lineHeight: 16,
  },
});
