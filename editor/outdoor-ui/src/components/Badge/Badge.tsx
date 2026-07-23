export type { BadgeProps } from './Badge.types';

import classes from './Badge.module.scss';
import { webModuleStyle, webClassName } from '../../utils/webClassName';
import type { BadgeProps } from './Badge.types';
import { Text, View } from 'react-native';

export function Badge({ label, filmed = false }: BadgeProps) {
  return (
    <View style={webModuleStyle(classes.badge, filmed ? classes.filmed : null)}>
      <Text style={webModuleStyle(classes.text, filmed ? classes.filmedText : null)}>{label}</Text>
    </View>
  );
}
