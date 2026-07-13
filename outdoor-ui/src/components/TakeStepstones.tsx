import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '../theme';
import type { LocalTakeView, TakeDeliveryStep } from '../types';

const STEP_ORDER: TakeDeliveryStep[] = ['iphone', 'icloud', 'mac'];

const STEP_TITLES: Record<TakeDeliveryStep, string> = {
  iphone: 'iPhone',
  icloud: 'iCloud',
  mac: 'Mac',
};

type TakeStepstonesProps = {
  steps: LocalTakeView['steps'];
  compact?: boolean;
};

export function TakeStepstones({ steps, compact = false }: TakeStepstonesProps) {
  return (
    <View style={[styles.row, compact ? styles.rowCompact : null]}>
      {STEP_ORDER.map((step, index) => {
        const state = steps[step];
        const isDone = state === 'done';
        const isPending = state === 'pending';
        return (
          <View key={step} style={styles.stepWrap}>
            {index > 0 ? (
              <View
                style={[
                  styles.connector,
                  isDone ? styles.connectorDone : null,
                ]}
              />
            ) : null}
            <View
              style={[
                styles.dot,
                compact ? styles.dotCompact : null,
                isDone ? styles.dotDone : isPending ? styles.dotPending : styles.dotWaiting,
              ]}
            >
              <Text style={styles.dotText}>{isDone ? '✓' : isPending ? '…' : '○'}</Text>
            </View>
            <Text style={[styles.stepLabel, compact ? styles.stepLabelCompact : null]}>
              {STEP_TITLES[step]}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.xs,
    marginVertical: spacing.sm,
  },
  rowCompact: {
    marginVertical: spacing.xs,
  },
  stepWrap: {
    flex: 1,
    alignItems: 'center',
    position: 'relative',
  },
  connector: {
    position: 'absolute',
    top: 11,
    left: -18,
    width: 36,
    height: 2,
    backgroundColor: 'rgba(148, 163, 184, 0.35)',
  },
  connectorDone: {
    backgroundColor: colors.online,
  },
  dot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  dotCompact: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  dotDone: {
    backgroundColor: 'rgba(22, 101, 52, 0.35)',
    borderColor: colors.online,
  },
  dotPending: {
    backgroundColor: 'rgba(249, 115, 22, 0.2)',
    borderColor: colors.orange,
  },
  dotWaiting: {
    backgroundColor: 'rgba(51, 65, 85, 0.5)',
    borderColor: colors.muted,
  },
  dotText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '900',
  },
  stepLabel: {
    color: colors.muted,
    fontSize: typography.tiny,
    fontWeight: '700',
    marginTop: 4,
    textAlign: 'center',
  },
  stepLabelCompact: {
    fontSize: 10,
  },
});
