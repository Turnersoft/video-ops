import { useMemo } from 'react';
import { Platform, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { OutdoorApi } from './api/client';
import { ScreenShell } from './components/ScreenShell/ScreenShell';
import { OutdoorUiProvider } from './context/OutdoorUiContext';
import { OutdoorRouteProvider, useOutdoorRoute } from './hooks/useOutdoorRoute';
import type { OutdoorLayout } from './layout';
import { FilmScreen } from './pages/FilmScreen/FilmScreen';
import { LibraryScreen } from './pages/LibraryScreen/LibraryScreen';
import { PlatformsScreen } from './pages/PlatformsScreen/PlatformsScreen';
import { AnimationEditorScreen } from './pages/AnimationEditorScreen/AnimationEditorScreen';
import { ScriptDetailScreen } from './pages/ScriptDetailScreen/ScriptDetailScreen';
import { TakePipelineScreen } from './pages/TakePipelineScreen/TakePipelineScreen';
import type { OutdoorRoute } from './types';

export type OutdoorAppProps = {
  apiBaseUrl?: string;
  /** Inject a custom API client (e.g. iPhone cache wrapper). */
  api?: OutdoorApi;
  /** Rigorous layout: browser = spacious Mac UI; mobile = iPhone stacked UI. */
  layout?: OutdoorLayout;
  /** @deprecated Prefer `layout="mobile"`. */
  mobile?: boolean;
  initialRoute?: OutdoorRoute;
  onOpenFilm?: (scriptId: string) => void;
  onOpenSettings?: () => void;
  apiHeaders?: Record<string, string>;
  pickImage?: () => Promise<{ uri: string; name: string; type: string } | null>;
  /** Mac agent unreachable — show cached scripts for offline filming. */
  offlineFilming?: boolean;
  loadLocalTakes?: (scriptId: string) => Promise<import('./types').LocalTakeView[]>;
  retryIcloudExport?: (takeId: string) => Promise<void>;
  takesRevision?: number;
  /** Remotion Studio origins from iPhone settings / iCloud. */
  seedRemotionCandidates?: string[];
};

function OutdoorRouteSwitch() {
  const { route } = useOutdoorRoute();

  switch (route.name) {
    case 'library':
      return <LibraryScreen />;
    case 'script':
      // Script route IS the project animation editor (beat board + Remotion preview).
      return <AnimationEditorScreen scriptId={route.scriptId} />;
    case 'post':
      return <ScriptDetailScreen scriptId={route.scriptId} mode="post" />;
    case 'take':
      return <TakePipelineScreen scriptId={route.scriptId} takeId={route.takeId} />;
    case 'animation':
      return <AnimationEditorScreen scriptId={route.scriptId} />;
    case 'platforms':
      return <PlatformsScreen />;
    case 'film':
      return null;
    default: {
      const exhaustive: never = route;
      return exhaustive;
    }
  }
}

function OutdoorAppBody() {
  const { route } = useOutdoorRoute();

  if (route.name === 'film') {
    return <FilmScreen scriptId={route.scriptId} />;
  }

  return (
    <ScreenShell>
      <OutdoorRouteSwitch />
    </ScreenShell>
  );
}

export function OutdoorApp({
  apiBaseUrl = '',
  api: apiOverride,
  layout,
  mobile = false,
  initialRoute = { name: 'library' },
  onOpenFilm,
  onOpenSettings,
  apiHeaders,
  pickImage,
  offlineFilming = false,
  loadLocalTakes,
  retryIcloudExport,
  takesRevision = 0,
  seedRemotionCandidates,
}: OutdoorAppProps) {
  const api = useMemo(
    () => apiOverride ?? new OutdoorApi({ baseUrl: apiBaseUrl, headers: apiHeaders }),
    [apiOverride, apiBaseUrl, apiHeaders],
  );

  return (
    <SafeAreaProvider style={styles.appRoot}>
      <OutdoorUiProvider
        api={api}
        layout={layout}
        mobile={mobile}
        onOpenFilm={onOpenFilm}
        onOpenSettings={onOpenSettings}
        pickImage={pickImage}
        offlineFilming={offlineFilming}
        loadLocalTakes={loadLocalTakes}
        retryIcloudExport={retryIcloudExport}
        takesRevision={takesRevision}
        seedRemotionCandidates={seedRemotionCandidates}
      >
        <OutdoorRouteProvider initialRoute={initialRoute}>
          <OutdoorAppBody />
        </OutdoorRouteProvider>
      </OutdoorUiProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  appRoot: {
    flex: 1,
    height: '100%',
    minHeight: Platform.OS === 'web' ? ('100vh' as unknown as number) : 0,
    overflow: 'hidden',
  },
});
