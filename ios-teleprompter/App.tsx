import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { OutdoorApp, type OutdoorRoute } from '@turn/outdoor-ui';

import { LockdownRegistrationProbe } from './src/LockdownRegistrationProbe';
import { AgentSettingsScreen } from './src/screens/AgentSettingsScreen';
import { FilmScreen } from './src/screens/FilmScreen';
import { fetchOutdoorScript } from './src/catalogClient';
import { CachedOutdoorApi } from './src/cachedOutdoorApi';
import type { OutdoorScript } from './src/scriptSchema';
import {
  agentUrlProblemOnDevice,
  ensureOutdoorEndpointsCache,
  loadOutdoorEndpointsFromIcloud,
  probeAgentUrlOnDevice,
} from './src/outdoorEndpoints';
import { NGROK_BYPASS_HEADERS } from './src/outdoorFetch';
import { loadAgentBaseUrl } from './src/agentSettings';
import { getOutdoorJob } from './src/agentClient';
import { hasOfflineFilmingContent } from './src/scriptCache';
import { toLocalTakeView } from './src/localTakeViews';
import { exportTakeToIcloudWorkflow } from './src/processTake';
import { getTake, loadTakesForScript, seedBundledScripts } from './src/storage';
import { startUploadQueue } from './src/uploadQueue';

type Screen =
  | { name: 'pipeline'; initialRoute?: OutdoorRoute }
  | { name: 'film'; script: OutdoorScript }
  | { name: 'settings' };

export default function App() {
  return (
    <SafeAreaProvider>
      <LockdownRegistrationProbe />
      <AppScreens />
    </SafeAreaProvider>
  );
}

function AppScreens() {
  const [screen, setScreen] = useState<Screen>({ name: 'pipeline' });
  const [agentBaseUrl, setAgentBaseUrl] = useState<string | null>(null);
  const [agentUrlProblem, setAgentUrlProblem] = useState<string | null>(null);
  const [startupError, setStartupError] = useState<string | null>(null);
  const [filmLoading, setFilmLoading] = useState(false);
  const [macOnline, setMacOnline] = useState(true);
  const [offlineFilmingReady, setOfflineFilmingReady] = useState(false);
  const [takesRevision, setTakesRevision] = useState(0);
  const cachedApiRef = useRef<CachedOutdoorApi | null>(null);

  const cachedApi = useMemo(() => {
    if (!agentBaseUrl) {
      return null;
    }
    if (!cachedApiRef.current || cachedApiRef.current.baseUrl !== agentBaseUrl) {
      cachedApiRef.current = new CachedOutdoorApi({
        baseUrl: agentBaseUrl,
        headers: NGROK_BYPASS_HEADERS,
      });
    }
    return cachedApiRef.current;
  }, [agentBaseUrl]);

  const refreshAgentUrl = useCallback(async () => {
    setStartupError(null);
    try {
      await ensureOutdoorEndpointsCache();
      const [url, endpoints] = await Promise.all([
        loadAgentBaseUrl(),
        loadOutdoorEndpointsFromIcloud(),
      ]);
      const probeProblem = await probeAgentUrlOnDevice(url, endpoints);
      const configProblem = agentUrlProblemOnDevice(url, endpoints);
      const problem = probeProblem ?? configProblem;
      const offlineReady = await hasOfflineFilmingContent();
      setAgentBaseUrl(url);
      setAgentUrlProblem(problem);
      setMacOnline(probeProblem === null);
      setOfflineFilmingReady(offlineReady);
    } catch (error) {
      const offlineReady = await hasOfflineFilmingContent();
      const savedUrl = await loadAgentBaseUrl().catch(() => null);
      setAgentBaseUrl(savedUrl);
      setAgentUrlProblem(null);
      setMacOnline(false);
      setOfflineFilmingReady(offlineReady);
      if (!offlineReady) {
        setStartupError(error instanceof Error ? error.message : 'Could not resolve Mac agent URL');
      } else {
        setStartupError(null);
      }
    }
  }, []);

  useEffect(() => {
    void seedBundledScripts();
    void refreshAgentUrl();
    return startUploadQueue((jobId) => {
      void (async () => {
        let initialRoute: OutdoorRoute = { name: 'library' };
        try {
          const detail = await getOutdoorJob(jobId);
          initialRoute = { name: 'script', scriptId: detail.job.scriptId };
        } catch {
          // stay on library
        }
        setScreen({ name: 'pipeline', initialRoute });
      })();
    });
  }, [refreshAgentUrl]);

  const openFilm = useCallback(async (scriptId: string) => {
    setFilmLoading(true);
    try {
      const script = await fetchOutdoorScript(scriptId);
      const fromCache = !macOnline;
      setScreen({ name: 'film', script });
      if (fromCache) {
        Alert.alert(
          'Offline script',
          'Using the last cached copy from this iPhone. Export the take via iCloud when you are done.',
        );
      }
    } catch (error) {
      Alert.alert(
        'Script unavailable offline',
        error instanceof Error
          ? error.message
          : 'Open the library once while the Mac is online to cache scripts for filming.',
      );
      setScreen({
        name: 'pipeline',
        initialRoute: { name: 'script', scriptId },
      });
    } finally {
      setFilmLoading(false);
    }
  }, [macOnline]);

  const returnToPipeline = useCallback((scriptId?: string) => {
    setScreen({
      name: 'pipeline',
      initialRoute: scriptId ? { name: 'script', scriptId } : { name: 'library' },
    });
  }, []);

  const loadLocalTakes = useCallback(async (scriptId: string) => {
    const takes = await loadTakesForScript(scriptId);
    return takes.map(toLocalTakeView);
  }, []);

  const retryIcloudExport = useCallback(async (takeId: string) => {
    const take = await getTake(takeId);
    if (!take) {
      throw new Error(`Take ${takeId} is not on this iPhone anymore.`);
    }
    const result = await exportTakeToIcloudWorkflow(take);
    if (!result.exported) {
      throw new Error(result.message);
    }
    setTakesRevision((value) => value + 1);
  }, []);

  const handleTakeSaved = useCallback(
    (scriptId: string, takeId?: string) => {
      setTakesRevision((value) => value + 1);
      setScreen({
        name: 'pipeline',
        initialRoute: takeId
          ? { name: 'take', scriptId, takeId }
          : { name: 'script', scriptId },
      });
    },
    [],
  );

  const pickImage = useCallback(async () => {
    const picked = await DocumentPicker.getDocumentAsync({
      type: ['image/png', 'image/jpeg', 'image/webp'],
      copyToCacheDirectory: true,
    });
    if (picked.canceled || !picked.assets?.[0]) {
      return null;
    }
    const asset = picked.assets[0];
    return {
      uri: asset.uri,
      name: asset.name ?? 'cover.jpg',
      type: asset.mimeType ?? 'image/jpeg',
    };
  }, []);

  const apiHeaders = useMemo(() => NGROK_BYPASS_HEADERS, []);
  const offlineFilming = !macOnline && offlineFilmingReady;
  const canUsePipeline = Boolean(agentBaseUrl && cachedApi && (macOnline || offlineFilmingReady));

  if (screen.name === 'settings') {
    return (
      <AgentSettingsScreen
        onBack={async () => {
          await refreshAgentUrl();
          setScreen({ name: 'pipeline' });
        }}
      />
    );
  }

  if (filmLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color="#f97316" size="large" />
      </View>
    );
  }

  if (screen.name === 'film') {
    return (
      <FilmScreen
        script={screen.script}
        onBack={() => returnToPipeline(screen.script.id)}
        onTakeSaved={(takeId) => handleTakeSaved(screen.script.id, takeId)}
      />
    );
  }

  if (!canUsePipeline) {
    return (
      <View style={styles.loading}>
        {startupError ? (
          <>
            <Text style={styles.startupTitle}>Could not start pipeline UI</Text>
            <Text style={styles.startupError}>{startupError}</Text>
            <Pressable style={styles.startupButton} onPress={() => void refreshAgentUrl()}>
              <Text style={styles.startupButtonText}>Retry</Text>
            </Pressable>
            <Pressable
              style={styles.startupButtonSecondary}
              onPress={() => setScreen({ name: 'settings' })}
            >
              <Text style={styles.startupButtonSecondaryText}>Mac connection</Text>
            </Pressable>
          </>
        ) : (
          <ActivityIndicator color="#f97316" size="large" />
        )}
      </View>
    );
  }

  if (agentUrlProblem && !offlineFilmingReady) {
    return (
      <View style={styles.loading}>
        <Text style={styles.startupTitle}>Mac agent URL needs setup</Text>
        <Text style={styles.startupError}>{agentUrlProblem}</Text>
        <Text style={styles.startupMeta}>Current URL: {agentBaseUrl}</Text>
        <Pressable
          style={styles.startupButton}
          onPress={() => setScreen({ name: 'settings' })}
        >
          <Text style={styles.startupButtonText}>Open Mac connection</Text>
        </Pressable>
        <Pressable style={styles.startupButtonSecondary} onPress={() => void refreshAgentUrl()}>
          <Text style={styles.startupButtonSecondaryText}>Retry after iCloud refresh</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <OutdoorApp
      api={cachedApi ?? undefined}
      apiBaseUrl={agentBaseUrl ?? ''}
      apiHeaders={apiHeaders}
      layout="mobile"
      initialRoute={screen.initialRoute}
      pickImage={pickImage}
      onOpenFilm={(scriptId) => void openFilm(scriptId)}
      onOpenSettings={() => setScreen({ name: 'settings' })}
      offlineFilming={offlineFilming}
      loadLocalTakes={loadLocalTakes}
      retryIcloudExport={retryIcloudExport}
      takesRevision={takesRevision}
    />
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: '#020617',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 14,
  },
  startupTitle: {
    color: '#f8fafc',
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  startupError: {
    color: '#fca5a5',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  startupMeta: {
    color: '#94a3b8',
    fontSize: 12,
    textAlign: 'center',
  },
  startupButton: {
    backgroundColor: '#f97316',
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  startupButtonText: {
    color: '#111827',
    fontWeight: '800',
  },
  startupButtonSecondary: {
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: 'rgba(51, 65, 85, 0.9)',
  },
  startupButtonSecondaryText: {
    color: '#e2e8f0',
    fontWeight: '700',
  },
});
