export type { HeaderAction, HeaderProps } from './Header.types';
import classes from './Header.module.scss';
import { layoutStylesFor } from '../../layout';
import { webModuleStyle, webClassName } from '../../utils/webClassName';

import type { HeaderProps } from './Header.types';
import { Pressable, Text, View } from 'react-native';

import { useOutdoorUi } from '../../context/OutdoorUiContext';
import { Button } from '../Button/Button';

export function Header({ title, actions = [] }: HeaderProps) {
  const { layout, transport, refreshTransport, scriptSidebarOpen, toggleScriptSidebar } =
    useOutdoorUi();
  const layoutStyles = layoutStylesFor(layout);
  const transportLabel = transport
    ? `Agent ${transport.agentSource} · Remotion ${transport.remotionSource}`
    : null;

  return (
    <View style={layoutStyles.header}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={scriptSidebarOpen ? 'Close scripts sidebar' : 'Open scripts sidebar'}
        onPress={toggleScriptSidebar}
        style={({ pressed }) => [
          webModuleStyle(classes.sidebarToggle),
          pressed ? { opacity: 0.88 } : undefined,
        ]}
      >
        <Text style={webModuleStyle(classes.sidebarToggleIcon)}>
          {scriptSidebarOpen ? '×' : '☰'}
        </Text>
      </Pressable>
      <View style={webModuleStyle(classes.titleBlock)}>
        <Text style={layoutStyles.headerTitle} numberOfLines={1}>
          {title}
        </Text>
        {transportLabel ? (
          <Pressable onPress={() => void refreshTransport()}>
            <Text style={webModuleStyle(classes.transport)} numberOfLines={1}>
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
