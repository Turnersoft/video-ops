export type { OrientationToggleProps } from './OrientationToggle.types';

import classes from './OrientationToggle.module.scss';
import { webModuleStyle } from '../../utils/webClassName';
import type { OrientationToggleProps } from './OrientationToggle.types';
import { Pressable, Text, View } from 'react-native';

import type { OutdoorPreviewFormat } from '../../utils/animationMdFormat';

const OPTIONS: Array<{ value: OutdoorPreviewFormat; label: string }> = [
  { value: 'portrait', label: 'Portrait' },
  { value: 'landscape', label: 'Landscape' },
];

export function OrientationToggle({ value, onChange, disabled }: OrientationToggleProps) {
  return (
    <View style={webModuleStyle(classes.wrap)}>
      <Text style={webModuleStyle(classes.label)}>Format</Text>
      {OPTIONS.map((option) => {
        const active = value === option.value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            disabled={disabled}
            onPress={() => onChange(option.value)}
            style={webModuleStyle(classes.chip, active ? classes.chipActive : null)}
          >
            <Text
              style={webModuleStyle(classes.chipText, active ? classes.chipTextActive : null)}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
