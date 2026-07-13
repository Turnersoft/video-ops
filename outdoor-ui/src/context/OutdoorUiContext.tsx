import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type JSX,
  type ReactNode,
} from 'react';

import { OutdoorApi } from '../api/client';
import {
  resolveOutdoorTransport,
  type OutdoorTransportPick,
} from '../api/transport';
import { layoutStylesFor, type OutdoorLayout, type OutdoorLayoutStyles } from '../layout';

export type PickedImage = {
  uri: string;
  name: string;
  type: string;
};

export type OutdoorUiContextValue = {
  api: OutdoorApi;
  /** Rigorous layout profile — browser (spacious) vs mobile (stacked / full-bleed). */
  layout: OutdoorLayout;
  /** Convenience: layout === 'mobile'. Prefer `layout` for new code. */
  mobile: boolean;
  layoutStyles: OutdoorLayoutStyles;
  onOpenFilm: (scriptId: string) => void;
  onOpenSettings: () => void;
  refreshKey: number;
  invalidateAll: () => void;
  /** Fastest reachable agent + Remotion origins (localhost / LAN / Tailscale race). */
  transport: OutdoorTransportPick | null;
  transportReady: boolean;
  refreshTransport: () => Promise<void>;
  pickImage?: () => Promise<PickedImage | null>;
  /** Mac agent offline — scripts served from iPhone cache. */
  offlineFilming?: boolean;
  /** iPhone-local takes for script detail (mobile only). */
  loadLocalTakes?: (scriptId: string) => Promise<import('../types').LocalTakeView[]>;
  retryIcloudExport?: (takeId: string) => Promise<void>;
  takesRevision?: number;
};

export type OutdoorUiProviderProps = {
  api: OutdoorApi;
  layout?: OutdoorLayout;
  /** @deprecated Prefer `layout`. Mapped to layout when `layout` is omitted. */
  mobile?: boolean;
  onOpenFilm?: (scriptId: string) => void;
  onOpenSettings?: () => void;
  pickImage?: () => Promise<PickedImage | null>;
  offlineFilming?: boolean;
  loadLocalTakes?: (scriptId: string) => Promise<import('../types').LocalTakeView[]>;
  retryIcloudExport?: (takeId: string) => Promise<void>;
  takesRevision?: number;
  /** When false, skip auto race (tests / injected transport). Default true. */
  autoResolveTransport?: boolean;
  children: ReactNode;
};

const noop = (): void => {};

const OutdoorUiContext = createContext<OutdoorUiContextValue | null>(null);

function resolveLayout(layout: OutdoorLayout | undefined, mobile: boolean | undefined): OutdoorLayout {
  if (layout) {
    return layout;
  }
  return mobile ? 'mobile' : 'browser';
}

function fallbackTransport(api: OutdoorApi): OutdoorTransportPick {
  const agentBaseUrl =
    api.baseUrl ||
    (typeof window !== 'undefined' ? window.location.origin : 'http://127.0.0.1:8788');
  let remotionOrigin = 'http://127.0.0.1:3000';
  try {
    const url = new URL(agentBaseUrl);
    if (url.hostname !== '127.0.0.1' && url.hostname !== 'localhost') {
      url.port = '3000';
      remotionOrigin = url.origin;
    }
  } catch {
    // keep localhost remotion
  }
  return {
    agentBaseUrl,
    remotionOrigin,
    agentSource: 'page',
    remotionSource: 'page',
    probedAt: new Date().toISOString(),
  };
}

export function OutdoorUiProvider({
  api,
  layout,
  mobile,
  onOpenFilm = noop,
  onOpenSettings = noop,
  pickImage,
  offlineFilming = false,
  loadLocalTakes,
  retryIcloudExport,
  takesRevision = 0,
  autoResolveTransport = true,
  children,
}: OutdoorUiProviderProps): JSX.Element {
  const [refreshKey, setRefreshKey] = useState(0);
  const [transport, setTransport] = useState<OutdoorTransportPick | null>(null);
  const [transportReady, setTransportReady] = useState(!autoResolveTransport);
  const resolvedLayout = resolveLayout(layout, mobile);
  const layoutStyles = useMemo(() => layoutStylesFor(resolvedLayout), [resolvedLayout]);

  const refreshTransport = useCallback(async () => {
    if (!autoResolveTransport) {
      setTransport(fallbackTransport(api));
      setTransportReady(true);
      return;
    }
    try {
      const pick = await resolveOutdoorTransport({
        pageOrigin:
          typeof window !== 'undefined' ? window.location.origin : api.baseUrl || null,
        seedAgentCandidates: api.baseUrl ? [api.baseUrl] : [],
      });
      if (pick.agentBaseUrl && api.baseUrl && pick.agentBaseUrl !== api.baseUrl) {
        api.setBaseUrl(pick.agentBaseUrl);
      }
      setTransport(pick);
    } catch {
      setTransport(fallbackTransport(api));
    } finally {
      setTransportReady(true);
    }
  }, [api, autoResolveTransport]);

  useEffect(() => {
    void refreshTransport();
  }, [refreshTransport]);

  const invalidateAll = useCallback(() => {
    setRefreshKey((value: number) => value + 1);
    void refreshTransport();
  }, [refreshTransport]);

  const value = useMemo<OutdoorUiContextValue>(
    () => ({
      api,
      layout: resolvedLayout,
      mobile: resolvedLayout === 'mobile',
      layoutStyles,
      onOpenFilm,
      onOpenSettings,
      refreshKey,
      invalidateAll,
      transport,
      transportReady,
      refreshTransport,
      pickImage,
      offlineFilming,
      loadLocalTakes,
      retryIcloudExport,
      takesRevision,
    }),
    [
      api,
      resolvedLayout,
      layoutStyles,
      onOpenFilm,
      onOpenSettings,
      refreshKey,
      invalidateAll,
      transport,
      transportReady,
      refreshTransport,
      pickImage,
      offlineFilming,
      loadLocalTakes,
      retryIcloudExport,
      takesRevision,
    ],
  );

  return (
    <OutdoorUiContext.Provider value={value}>{children}</OutdoorUiContext.Provider>
  );
}

export function useOutdoorUi(): OutdoorUiContextValue {
  const context = useContext(OutdoorUiContext);
  if (!context) {
    throw new Error('useOutdoorUi must be used within OutdoorUiProvider');
  }
  return context;
}

export { OutdoorUiContext };
