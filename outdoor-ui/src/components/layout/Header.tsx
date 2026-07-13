import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useOutdoorUi } from '../../context/OutdoorUiContext';
import { colors, typography } from '../../theme';
import { Button, type ButtonProps } from '../ui/Button';

export type HeaderAction = Pick<ButtonProps, 'label' | 'onPress' | 'variant' | 'disabled'>;

export type HeaderProps = {
  title: string;
  actions?: HeaderAction[];
};

export function Header({ title, actions = [] }: HeaderProps) {
  const { layoutStyles, transport, refreshTransport } = useOutdoorUi();
  const transportLabel = transport
    ? `Agent ${transport.agentSource} · Remotion ${transport.remotionSource}`
    : null;

  return (
    <View style={layoutStyles.header}>
      <View style={styles.titleBlock}>
        <Text style={layoutStyles.headerTitle} numberOfLines={2}>
          {title}
        </Text>
        {transportLabel ? (
          <Pressable onPress={() => void refreshTransport()}>
            <Text style={styles.transport} numberOfLines={1}>
              {transportLabel} · tap to re-race
            </Text>
          </Pressable>
        ) : null}
      </View>
      {actions.length > 0 ? (
        <View style={layoutStyles.headerActions}>
          {actions.map((action) => (
            <Button
              key={`${action.label}-${action.variant ?? 'default'}`}
              label={action.label}
              onPress={action.onPress}
              variant={action.variant}
              disabled={action.disabled}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  titleBlock: {
    flexShrink: 1,
    minWidth: 0,
  },
  transport: {
    color: colors.muted,
    fontSize: typography.tiny,
    marginTop: 4,
  },
});
