import { createElement } from 'react';
import { Linking, Text, View } from 'react-native';

import { Button } from '../Button/Button';
import type { PlatformLoginSession } from '../../types';
import { platformLabel } from '../../utils/format';
import { webClassName, webModuleStyle } from '../../utils/webClassName';
import classes from './PlatformLoginPanel.module.scss';

type PlatformLoginPanelProps = {
  session: PlatformLoginSession | null;
  qrUrl: string | null;
  error?: string | null;
  busy?: boolean;
  onCancel: () => void;
};

function statusLabel(status: PlatformLoginSession['status']): string {
  switch (status) {
    case 'starting':
      return 'Starting';
    case 'waiting_scan':
      return 'Scan QR';
    case 'waiting_portal':
      return 'Finish login';
    case 'succeeded':
      return 'Connected';
    case 'failed':
      return 'Failed';
    case 'cancelled':
      return 'Cancelled';
    default: {
      const exhaustive: never = status;
      return exhaustive;
    }
  }
}

export function PlatformLoginPanel({
  session,
  qrUrl,
  error,
  busy,
  onCancel,
}: PlatformLoginPanelProps) {
  if (!session && !error && !busy) {
    return null;
  }

  return (
    <View style={webModuleStyle(classes.panel)}>
      <View style={webModuleStyle(classes.head)}>
        <Text style={webModuleStyle(classes.title)}>
          {session ? `${platformLabel(session.platform)} login` : 'Platform login'}
        </Text>
        {session ? (
          <Text
            style={webModuleStyle(
              classes.status,
              session.status === 'succeeded' ? classes.statusOk : null,
            )}
          >
            {statusLabel(session.status)}
          </Text>
        ) : null}
      </View>
      {busy && !session ? (
        <Text style={webModuleStyle(classes.message)}>Opening login…</Text>
      ) : null}
      {session ? (
        <Text style={webModuleStyle(classes.message)}>{session.message}</Text>
      ) : null}
      {error ? <Text style={webModuleStyle(classes.error)}>{error}</Text> : null}
      {qrUrl ? createElement('img', {
        src: qrUrl,
        alt: 'Login QR',
        className: webClassName(classes.qr),
      }) : null}
      {session?.portalUrl ? (
        <View style={webModuleStyle(classes.portalWrap)}>
          {createElement('iframe', {
            src: session.portalUrl,
            title: `${platformLabel(session.platform)} login portal`,
            className: webClassName(classes.portal),
          })}
          <Button
            label="Open portal"
            variant="primary"
            onPress={() => {
              void Linking.openURL(session.portalUrl ?? '');
            }}
          />
        </View>
      ) : null}
      <View style={webModuleStyle(classes.actions)}>
        <Button label="Close" onPress={onCancel} />
      </View>
    </View>
  );
}
