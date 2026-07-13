import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system/legacy';
import { Alert, Linking, Platform } from 'react-native';

const LOCKDOWN_ACK_PATH = `${FileSystem.documentDirectory ?? ''}turn-outdoor-teleprompter/lockdown-exempt-ack.json`;

/** Shown in Settings → Lockdown Mode → Configure Web Browsing. */
export function lockdownExemptAppName(): string {
  if (Constants.appOwnership === 'expo') {
    return 'Expo Go';
  }
  return Constants.expoConfig?.name ?? 'Turn Outdoor Teleprompter';
}

function lockdownExemptSteps(): string {
  const appName = lockdownExemptAppName();
  return (
    `Keep Lockdown Mode ON if you want — exempt only this app:\n\n` +
    `1. Settings → Privacy & Security → Lockdown Mode\n` +
    `2. Tap "Configure Web Browsing"\n` +
    `3. Turn OFF the switch for "${appName}"\n` +
    `   (If it is missing, open Remotion preview once, then check again.)\n` +
    `4. Force-quit ${appName} and reopen it.\n\n` +
    `Only needed if WebAssembly is blocked. Connection errors are usually Mac URL / ngrok.`
  );
}

const LOCKDOWN_SETTINGS_URLS = [
  'App-Prefs:Privacy&path=LOCKDOWN_MODE',
  'App-prefs:Privacy&path=LOCKDOWN',
  'App-Prefs:root=Privacy&path=LOCKDOWN_MODE',
] as const;

export async function isLockdownExemptionAcknowledged(): Promise<boolean> {
  try {
    const raw = await FileSystem.readAsStringAsync(LOCKDOWN_ACK_PATH);
    const parsed = JSON.parse(raw) as { acknowledged?: boolean };
    return parsed.acknowledged === true;
  } catch {
    return false;
  }
}

export async function acknowledgeLockdownExemption(): Promise<void> {
  const dir = `${FileSystem.documentDirectory ?? ''}turn-outdoor-teleprompter/`;
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }
  await FileSystem.writeAsStringAsync(
    LOCKDOWN_ACK_PATH,
    JSON.stringify({ acknowledged: true, at: new Date().toISOString() }, null, 2),
  );
}

/** True only when iOS has removed WebAssembly — the definitive Lockdown signal. */
export function isDefiniteLockdownWasmBlock(detail: string | undefined): boolean {
  if (!detail) {
    return false;
  }
  const normalized = detail.toLowerCase();
  return (
    normalized.includes('webassembly missing') ||
    normalized.includes('webassembly is not defined') ||
    normalized.includes('webassembly validate failed')
  );
}

/** Try to open iOS Lockdown Mode settings; fall back to this app's Settings page. */
export async function openLockdownExemptionSettings(): Promise<boolean> {
  if (Platform.OS !== 'ios') {
    await Linking.openSettings();
    return false;
  }

  for (const url of LOCKDOWN_SETTINGS_URLS) {
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
        return true;
      }
    } catch {
      // Try the next candidate URL.
    }
  }

  await Linking.openSettings();
  return false;
}

export function promptLockdownExemption(reason?: string): void {
  const appName = lockdownExemptAppName();
  const steps = lockdownExemptSteps();
  const message = reason ? `${reason}\n\n${steps}` : steps;
  Alert.alert(`Allow ${appName}`, message, [
    {
      text: 'Open Lockdown Settings',
      onPress: () => {
        void openLockdownExemptionSettings();
      },
    },
    {
      text: 'Already exempted',
      onPress: () => {
        void acknowledgeLockdownExemption();
      },
    },
    { text: 'Not now', style: 'cancel' },
  ]);
}

/** Auto-prompt only for confirmed WASM blocks, and only if user has not dismissed. */
export function maybePromptLockdownExemption(reason: string, detail?: string): void {
  if (!isDefiniteLockdownWasmBlock(detail)) {
    return;
  }
  void isLockdownExemptionAcknowledged().then((acknowledged) => {
    if (!acknowledged) {
      promptLockdownExemption(reason);
    }
  });
}

/** @deprecated Use promptLockdownExemption */
export function promptDisableLockdownMode(reason?: string): void {
  promptLockdownExemption(reason);
}

/** Injected into WebView — only reports lockdown when WebAssembly is actually missing. */
export const LOCKDOWN_PROBE_SCRIPT = `
(function () {
  function post(type, detail) {
    try {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: type, detail: detail || '' }));
    } catch (e) {}
  }
  if (typeof WebAssembly === 'undefined') {
    post('lockdown-wasm', 'WebAssembly missing');
    return;
  }
  var bytes = new Uint8Array([0,97,115,109,1,0,0,0]);
  try {
    if (typeof WebAssembly.validate === 'function' && !WebAssembly.validate(bytes)) {
      post('lockdown-wasm', 'WebAssembly validate failed');
      return;
    }
    WebAssembly.instantiate(bytes).then(function () {
      post('wasm-ok', '');
    }).catch(function (err) {
      post('wasm-probe-failed', String(err));
    });
  } catch (err) {
    post('wasm-probe-failed', String(err));
  }
})();
true;
`;

export function remotionConnectionHelpMessage(): string {
  return (
    'Could not reach Remotion Studio on your Mac.\n\n' +
    '• Mac: cd video_ops && npm run outdoor:all\n' +
    '• Mac: cd video_ops/remotion && npm run studio:lan\n' +
    '• iPhone: Mac connection → Refresh from iCloud\n' +
    '• Use the ngrok https URL (not 127.0.0.1)\n' +
    '• Link iCloud inbox once so endpoints sync'
  );
}

export function isLikelyLockdownUserAgent(userAgent: string): boolean {
  if (Platform.OS !== 'ios') {
    return false;
  }
  return /iPhone|iPad|iPod/i.test(userAgent);
}
