import { Platform, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { LOCKDOWN_PROBE_SCRIPT } from './lockdownMode';

/**
 * Hidden WebKit view on launch so iOS can list this app under
 * Settings → Lockdown Mode → Configure Web Browsing after WASM is blocked.
 */
export function LockdownRegistrationProbe() {
  if (Platform.OS !== 'ios') {
    return null;
  }

  return (
    <View
      style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <WebView
        originWhitelist={['*']}
        source={{
          html: '<!DOCTYPE html><html><head><meta charset="utf-8"></head><body></body></html>',
          baseUrl: 'https://turn-outdoor-lockdown-probe.local',
        }}
        injectedJavaScriptBeforeContentLoaded={LOCKDOWN_PROBE_SCRIPT}
        style={{ width: 1, height: 1 }}
        javaScriptEnabled
      />
    </View>
  );
}
