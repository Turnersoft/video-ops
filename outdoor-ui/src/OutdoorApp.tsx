import { useMemo } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { OutdoorApi } from './api/client';
import { ScreenShell } from './components/layout/ScreenShell';
import { OutdoorUiProvider } from './context/OutdoorUiContext';
import { OutdoorRouteProvider, useOutdoorRoute } from './hooks/useOutdoorRoute';
import type { OutdoorLayout } from './layout';
import { FilmScreen } from './screens/FilmScreen';
import { LibraryScreen } from './screens/LibraryScreen';
import { PlatformsScreen } from './screens/PlatformsScreen';
import { ScriptDetailScreen } from './screens/ScriptDetailScreen';
import { AnimationEditorScreen } from './screens/AnimationEditorScreen';
import { TakePipelineScreen } from './screens/TakePipelineScreen';
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
};

function OutdoorRouteSwitch() {
  const { route } = useOutdoorRoute();

  switch (route.name) {
    case 'library':
      return <LibraryScreen />;
    case 'script':
      return <ScriptDetailScreen scriptId={route.scriptId} />;
    case 'take':
      return <TakePipelineScreen scriptId={route.scriptId} takeId={route.takeId} />;
    case 'animation':
      return <AnimationEditorScreen scriptId={route.scriptId} />;
    case 'platforms':
      return <PlatformsScreen />;
    case 'film':
      return <FilmScreen scriptId={route.scriptId} />;
    default: {
      const exhaustive: never = route;
      return exhaustive;
    }
  }
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
}: OutdoorAppProps) {
  const api = useMemo(
    () => apiOverride ?? new OutdoorApi({ baseUrl: apiBaseUrl, headers: apiHeaders }),
    [apiOverride, apiBaseUrl, apiHeaders],
  );

  return (
    <SafeAreaProvider>
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
      >
        <OutdoorRouteProvider initialRoute={initialRoute}>
          <ScreenShell>
            <OutdoorRouteSwitch />
          </ScreenShell>
        </OutdoorRouteProvider>
      </OutdoorUiProvider>
    </SafeAreaProvider>
  );
}
