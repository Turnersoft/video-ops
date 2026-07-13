import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Platform } from 'react-native';

import type { OutdoorRoute } from '../types';

export type OutdoorRouteApi = {
  route: OutdoorRoute;
  navigate: (route: OutdoorRoute) => void;
  navigateToLibrary: () => void;
  navigateToPlatforms: () => void;
  navigateToScript: (scriptId: string) => void;
  navigateToTake: (scriptId: string, takeId: string) => void;
  navigateToAnimation: (scriptId: string) => void;
};

const OutdoorRouteContext = createContext<OutdoorRouteApi | null>(null);

function readWindowHash(): string {
  try {
    if (typeof window === 'undefined') {
      return '';
    }
    const location = window.location;
    if (!location || typeof location !== 'object') {
      return '';
    }
    return typeof location.hash === 'string' ? location.hash : '';
  } catch {
    return '';
  }
}

export function parseRoute(rawHash?: string): OutdoorRoute {
  const hash = (rawHash ?? readWindowHash()).replace(/^#/, '') || '/';
  const parts = hash.replace(/^\/?/, '').split('/').filter(Boolean);

  if (parts[0] === 'take' && parts[1] && parts[2]) {
    return {
      name: 'take',
      scriptId: decodeURIComponent(parts[1]),
      takeId: decodeURIComponent(parts[2]),
    };
  }
  if (parts[0] === 'script' && parts[1]) {
    const scriptId = decodeURIComponent(parts[1]);
    if (parts[2] === 'take' && parts[3]) {
      return { name: 'take', scriptId, takeId: decodeURIComponent(parts[3]) };
    }
    return { name: 'script', scriptId };
  }
  if (parts[0] === 'animation' && parts[1]) {
    return { name: 'animation', scriptId: decodeURIComponent(parts[1]) };
  }
  if (parts[0] === 'film' && parts[1]) {
    return { name: 'film', scriptId: decodeURIComponent(parts[1]) };
  }
  if (parts[0] === 'platforms' || parts[0] === 'credentials') {
    return { name: 'platforms' };
  }
  return { name: 'library' };
}

export function routeToHash(route: OutdoorRoute): string {
  switch (route.name) {
    case 'library':
      return '#/';
    case 'script':
      return `#/script/${encodeURIComponent(route.scriptId)}`;
    case 'take':
      return `#/take/${encodeURIComponent(route.scriptId)}/${encodeURIComponent(route.takeId)}`;
    case 'animation':
      return `#/animation/${encodeURIComponent(route.scriptId)}`;
    case 'platforms':
      return '#/platforms';
    case 'film':
      return `#/film/${encodeURIComponent(route.scriptId)}`;
    default: {
      const exhaustive: never = route;
      return exhaustive;
    }
  }
}

function useOutdoorHashRoute(): OutdoorRouteApi {
  const [route, setRoute] = useState<OutdoorRoute>(() =>
    Platform.OS === 'web' ? parseRoute() : { name: 'library' },
  );

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') {
      return;
    }

    const onHashChange = () => {
      setRoute(parseRoute());
    };

    window.addEventListener('hashchange', onHashChange);
    setRoute(parseRoute());
    return () => {
      window.removeEventListener('hashchange', onHashChange);
    };
  }, []);

  const navigate = useCallback((next: OutdoorRoute) => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location) {
      const nextHash = routeToHash(next);
      if (window.location.hash !== nextHash) {
        window.location.hash = nextHash;
      }
      setRoute(next);
      return;
    }
    setRoute(next);
  }, []);

  return useMemo(
    () => ({
      route,
      navigate,
      navigateToLibrary: () => navigate({ name: 'library' }),
      navigateToPlatforms: () => navigate({ name: 'platforms' }),
      navigateToScript: (scriptId: string) => navigate({ name: 'script', scriptId }),
      navigateToTake: (scriptId: string, takeId: string) =>
        navigate({ name: 'take', scriptId, takeId }),
      navigateToAnimation: (scriptId: string) => navigate({ name: 'animation', scriptId }),
    }),
    [navigate, route],
  );
}

function useOutdoorStateRoute(initialRoute: OutdoorRoute): OutdoorRouteApi {
  const [route, setRoute] = useState<OutdoorRoute>(initialRoute);

  const navigate = useCallback((next: OutdoorRoute) => {
    setRoute(next);
  }, []);

  return useMemo(
    () => ({
      route,
      navigate,
      navigateToLibrary: () => navigate({ name: 'library' }),
      navigateToPlatforms: () => navigate({ name: 'platforms' }),
      navigateToScript: (scriptId: string) => navigate({ name: 'script', scriptId }),
      navigateToTake: (scriptId: string, takeId: string) =>
        navigate({ name: 'take', scriptId, takeId }),
      navigateToAnimation: (scriptId: string) => navigate({ name: 'animation', scriptId }),
    }),
    [navigate, route],
  );
}

export type OutdoorRouteProviderProps = {
  initialRoute?: OutdoorRoute;
  children: ReactNode;
};

export function OutdoorRouteProvider({
  initialRoute = { name: 'library' },
  children,
}: OutdoorRouteProviderProps) {
  const webRoute = useOutdoorHashRoute();
  const nativeRoute = useOutdoorStateRoute(initialRoute);
  const value = Platform.OS === 'web' ? webRoute : nativeRoute;

  return createElement(OutdoorRouteContext.Provider, { value }, children);
}

export function useOutdoorRoute(): OutdoorRouteApi {
  const context = useContext(OutdoorRouteContext);
  if (!context) {
    throw new Error('useOutdoorRoute must be used within OutdoorRouteProvider');
  }
  return context;
}
