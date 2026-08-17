export type { VoiceEngineToggleProps } from './VoiceEngineToggle.types';

import classes from './VoiceEngineToggle.module.scss';
import { webModuleStyle } from '../../utils/webClassName';
import type { VoiceEngineToggleProps } from './VoiceEngineToggle.types';
import { Pressable, Text, View } from 'react-native';

import {
  VOICE_ENGINE_IDS,
  VOICE_ENGINE_LABELS,
  type VoiceEngineId,
} from '../../utils/voiceEngine';

export function VoiceEngineToggle({
  value,
  onChange,
  disabled,
  disabledEngines = [],
  label = 'Voice',
}: VoiceEngineToggleProps) {
  return (
    <View style={webModuleStyle(classes.wrap)}>
      <Text style={webModuleStyle(classes.label)}>{label}</Text>
      {VOICE_ENGINE_IDS.map((engine: VoiceEngineId) => {
        const active = value === engine;
        const chipDisabled = disabled || disabledEngines.includes(engine);
        return (
          <Pressable
            key={engine}
            accessibilityRole="button"
            disabled={chipDisabled}
            onPress={() => onChange(engine)}
            style={webModuleStyle(
              classes.chip,
              active ? classes.chipActive : null,
              chipDisabled && !active ? classes.chipDisabled : null,
            )}
          >
            <Text
              style={webModuleStyle(classes.chipText, active ? classes.chipTextActive : null)}
            >
              {VOICE_ENGINE_LABELS[engine]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
