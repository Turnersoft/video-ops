import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '../theme';
import { Button } from './ui/Button';

export type StaleBannerProps = {
  reason: string;
  actionLabel?: string;
  onAction?: () => void;
  busy?: boolean;
};

export function StaleBanner({ reason, actionLabel, onAction, busy = false }: StaleBannerProps) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Outdated — upstream changed</Text>
      <Text style={styles.message}>{reason}</Text>
      {actionLabel && onAction ? (
        <Button
          label={busy ? 'Working…' : actionLabel}
          variant="primary"
          disabled={busy}
          onPress={onAction}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: 10,
    backgroundColor: 'rgba(249, 115, 22, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.45)',
  },
  title: {
    color: colors.orange,
    fontSize: typography.small,
    fontWeight: '900',
  },
  message: {
    color: colors.text,
    fontSize: typography.small,
    lineHeight: 18,
  },
});
