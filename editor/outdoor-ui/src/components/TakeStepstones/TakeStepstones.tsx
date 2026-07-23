import classes from './TakeStepstones.module.scss';
import { webModuleStyle, webClassName } from '../../utils/webClassName';
import type { TakeStepstonesProps } from './TakeStepstones.types';
import { Text, View } from 'react-native';

import type { TakeDeliveryStep } from '../../types';

export type { TakeStepstonesProps } from './TakeStepstones.types';

const STEP_ORDER: TakeDeliveryStep[] = ['iphone', 'icloud', 'mac'];

const STEP_TITLES: Record<TakeDeliveryStep, string> = {
  iphone: 'iPhone',
  icloud: 'iCloud',
  mac: 'Mac',
};

export function TakeStepstones({ steps, compact = false }: TakeStepstonesProps) {
  return (
    <View style={webModuleStyle(classes.row, compact ? classes.rowCompact : null)}>
      {STEP_ORDER.map((step, index) => {
        const state = steps[step];
        const isDone = state === 'done';
        const isPending = state === 'pending';
        return (
          <View key={step} style={webModuleStyle(classes.stepWrap)}>
            {index > 0 ? (
              <View
                style={webModuleStyle(classes.connector,
                  isDone ? classes.connectorDone : null,)}
              />
            ) : null}
            <View
              style={webModuleStyle(classes.dot,
                compact ? classes.dotCompact : null,
                isDone ? classes.dotDone : isPending ? classes.dotPending : classes.dotWaiting,)}
            >
              <Text style={webModuleStyle(classes.dotText)}>{isDone ? '✓' : isPending ? '…' : '○'}</Text>
            </View>
            <Text style={webModuleStyle(classes.stepLabel, compact ? classes.stepLabelCompact : null)}>
              {STEP_TITLES[step]}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
