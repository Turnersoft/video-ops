import { useCallback, useEffect, useRef, useState } from 'react';

import { formatOutdoorApiError } from '../api/client';
import { useOutdoorUi } from '../context/OutdoorUiContext';
import type { PlatformLoginSession } from '../types';

export function usePlatformLogin(onSucceeded?: (platform: string) => void) {
  const { api } = useOutdoorUi();
  const [platform, setPlatform] = useState<string | null>(null);
  const [session, setSession] = useState<PlatformLoginSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const succeededFor = useRef<string | null>(null);

  const start = useCallback(async (nextPlatform: string) => {
    succeededFor.current = null;
    setBusy(true);
    setError(null);
    setPlatform(nextPlatform);
    try {
      const payload = await api.startPlatformLogin(nextPlatform);
      setSession(payload.session);
    } catch (startError) {
      setError(formatOutdoorApiError(startError));
      setSession(null);
    } finally {
      setBusy(false);
    }
  }, [api]);

  const cancel = useCallback(async () => {
    if (!platform) {
      return;
    }
    try {
      await api.cancelPlatformLogin(platform);
    } catch {
      // session may already be gone
    }
    setSession(null);
    setPlatform(null);
  }, [api, platform]);

  useEffect(() => {
    if (!platform || !session) {
      return;
    }
    if (
      session.status === 'succeeded' ||
      session.status === 'failed' ||
      session.status === 'cancelled'
    ) {
      return;
    }
    const timer = window.setInterval(() => {
      void api.getPlatformLogin(platform).then((payload) => {
        if (payload.session) {
          setSession(payload.session);
        }
      }).catch((pollError) => {
        setError(formatOutdoorApiError(pollError));
      });
    }, 1500);
    return () => {
      window.clearInterval(timer);
    };
  }, [api, platform, session?.status]);

  useEffect(() => {
    if (session?.status === 'succeeded' && session.platform !== succeededFor.current) {
      succeededFor.current = session.platform;
      onSucceeded?.(session.platform);
    }
  }, [onSucceeded, session?.platform, session?.status]);

  useEffect(() => {
    if (session?.status !== 'succeeded' || typeof window === 'undefined') {
      return;
    }
    const timer = window.setTimeout(() => {
      setSession(null);
      setPlatform(null);
    }, 1600);
    return () => {
      window.clearTimeout(timer);
    };
  }, [session?.status]);

  const showQr =
    session?.status === 'starting' || session?.status === 'waiting_scan';
  const qrUrl =
    showQr && session?.qrImageUrl && platform
      ? api.platformLoginQrUrl(platform, session.updatedAt)
      : null;

  return {
    platform,
    session,
    error,
    busy,
    start,
    cancel,
    qrUrl,
  };
}
