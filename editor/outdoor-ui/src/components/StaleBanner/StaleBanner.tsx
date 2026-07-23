export type { StaleBannerProps } from './StaleBanner.types';

import classes from './StaleBanner.module.scss';
import { webModuleStyle, webClassName } from '../../utils/webClassName';
import type { StaleBannerProps } from './StaleBanner.types';
import { Text, View } from 'react-native';

import { Button } from '../Button/Button';

export function StaleBanner({ reason, actionLabel, onAction, busy = false }: StaleBannerProps) {
  return (
    <View style={webModuleStyle(classes.wrap)}>
      <Text style={webModuleStyle(classes.title)}>Outdated — upstream changed</Text>
      <Text style={webModuleStyle(classes.message)}>{reason}</Text>
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
