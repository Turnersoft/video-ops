import { Platform } from 'react-native';

/**
 * Race localhost / hotspot-LAN / Tailscale candidates and pick the fastest reachable URL
 * for agent + Remotion (used by all outdoor-ui media and embeds).
 */

export type OutdoorEndpointsResponse = {
  schemaVersion: number;
  updatedAt: string | null;
  transport: string;
  agentCandidates: string[];
  remotionCandidates: string[];
};

export type OutdoorTransportPick = {
  agentBaseUrl: string;
  remotionOrigin: string;
  agentSource: string;
  remotionSource: string;
  probedAt: string;
};

export type ResolveOutdoorTransportOptions = {
  /** Current page/agent origin (same-origin wins when healthy). */
  pageOrigin?: string | null;
  /** Seed candidates when /api/outdoor-endpoints is unreachable. */
  seedAgentCandidates?: string[];
  seedRemotionCandidates?: string[];
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
};

const LOCAL_AGENT = 'http://127.0.0.1:8788';
const LOCAL_REMOTION = 'http://127.0.0.1:3000';
/** Bundled Mac Tailscale IP — used when /api/outdoor-endpoints is unavailable (agent not restarted yet). */
const FALLBACK_TAILSCALE_HOST = '100.66.185.67';
const FALLBACK_TAILSCALE_AGENT = `http://${FALLBACK_TAILSCALE_HOST}:8788`;
const FALLBACK_TAILSCALE_REMOTION = `http://${FALLBACK_TAILSCALE_HOST}:3000`;

function normalizeUrl(url: string): string {
  return url.replace(/\/+$/, '');
}

function uniqueUrls(urls: Array<string | null | undefined>): string[] {
  const out: string[] = [];
  for (const raw of urls) {
    const trimmed = raw?.trim();
    if (!trimmed) {
      continue;
    }
    const normalized = normalizeUrl(trimmed);
    if (!out.includes(normalized)) {
      out.push(normalized);
    }
  }
  return out;
}

function describeHost(url: string): string {
  try {
    const host = new URL(url).hostname;
    if (host === '127.0.0.1' || host === 'localhost') {
      return 'localhost';
    }
    if (/^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(host)) {
      return 'Tailscale';
    }
    const parts = host.split('.').map((part) => Number(part));
    if (
      parts.length === 4 &&
      parts[0] === 172 &&
      parts[1] === 20 &&
      parts[2] === 10
    ) {
      return 'iPhone hotspot';
    }
    if (
      parts.length === 4 &&
      (parts[0] === 10 ||
        (parts[0] === 192 && parts[1] === 168) ||
        (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31))
    ) {
      return 'LAN';
    }
    return host;
  } catch {
    return 'unknown';
  }
}

async function probeAgentHealth(
  url: string,
  timeoutMs: number,
  fetchImpl: typeof fetch,
): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const response = await fetchImpl(`${normalizeUrl(url)}/api/health`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    clearTimeout(timer);
    if (!response.ok) {
      return false;
    }
    const payload = (await response.json()) as { ok?: boolean; service?: string };
    return payload.ok === true && payload.service === 'outdoor-agent';
  } catch {
    return false;
  }
}

function isLoopbackUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return host === '127.0.0.1' || host === 'localhost';
  } catch {
    return false;
  }
}

async function probeHttpReachable(
  url: string,
  timeoutMs: number,
  fetchImpl: typeof fetch,
): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const init: RequestInit = {
      method: 'GET',
      signal: controller.signal,
    };
    // Browser: Remotion may lack CORS — no-cors still fails on network errors.
    // React Native has no opaque responses; a normal GET that connects is enough.
    if (Platform.OS === 'web') {
      init.mode = 'no-cors';
    }
    const response = await fetchImpl(normalizeUrl(url), init);
    clearTimeout(timer);
    if (response.type === 'opaque') {
      return true;
    }
    return response.status > 0 && response.status < 500;
  } catch {
    return false;
  }
}

function remotionFallbackFromAgent(agentBaseUrl: string): string {
  try {
    const url = new URL(agentBaseUrl);
    if (!isLoopbackUrl(agentBaseUrl)) {
      url.port = '3000';
      return normalizeUrl(url.origin);
    }
  } catch {
    // fall through
  }
  return LOCAL_REMOTION;
}

/**
 * Parallel race: first healthy candidate wins (usually the lowest-latency path).
 */
export async function raceFirstHealthy(
  candidates: string[],
  probe: (url: string) => Promise<boolean>,
): Promise<string | null> {
  const urls = uniqueUrls(candidates);
  if (urls.length === 0) {
    return null;
  }
  return new Promise((resolve) => {
    let remaining = urls.length;
    let settled = false;
    for (const url of urls) {
      void probe(url).then((ok) => {
        if (ok && !settled) {
          settled = true;
          resolve(url);
          return;
        }
        remaining -= 1;
        if (remaining === 0 && !settled) {
          resolve(null);
        }
      });
    }
  });
}

function pageHostRemotionOrigin(pageOrigin: string | null | undefined): string | null {
  if (!pageOrigin) {
    return null;
  }
  try {
    const url = new URL(pageOrigin);
    url.port = '3000';
    url.protocol = 'http:';
    url.pathname = '';
    url.search = '';
    url.hash = '';
    return normalizeUrl(url.origin);
  } catch {
    return null;
  }
}

export async function fetchOutdoorEndpoints(
  agentBaseUrl: string,
  fetchImpl: typeof fetch = fetch,
): Promise<OutdoorEndpointsResponse | null> {
  try {
    const root = normalizeUrl(agentBaseUrl || (typeof window !== 'undefined' ? window.location.origin : ''));
    const response = await fetchImpl(`${root}/api/outdoor-endpoints`, {
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as OutdoorEndpointsResponse;
  } catch {
    return null;
  }
}

export async function resolveOutdoorTransport(
  options: ResolveOutdoorTransportOptions = {},
): Promise<OutdoorTransportPick> {
  const timeoutMs = options.timeoutMs ?? 2500;
  const fetchImpl = options.fetchImpl ?? fetch;
  const pageOrigin =
    options.pageOrigin ??
    (typeof window !== 'undefined' ? window.location.origin : null);

  const bootstrapAgent = normalizeUrl(
    pageOrigin && pageOrigin.startsWith('http')
      ? pageOrigin
      : LOCAL_AGENT,
  );

  const endpoints = await fetchOutdoorEndpoints(bootstrapAgent, fetchImpl);

  const agentCandidates = uniqueUrls([
    pageOrigin,
    LOCAL_AGENT,
    ...(endpoints?.agentCandidates ?? []),
    ...(options.seedAgentCandidates ?? []),
    FALLBACK_TAILSCALE_AGENT,
  ]);

  // Prefer seeded / published LAN+Tailscale before loopback (iPhone cannot use 127.0.0.1).
  const remotionCandidates = uniqueUrls([
    ...(options.seedRemotionCandidates ?? []),
    pageHostRemotionOrigin(pageOrigin),
    ...(endpoints?.remotionCandidates ?? []),
    FALLBACK_TAILSCALE_REMOTION,
    Platform.OS === 'web' ? LOCAL_REMOTION : null,
  ]);

  const isBrowserSameOrigin =
    typeof window !== 'undefined' &&
    Boolean(pageOrigin) &&
    normalizeUrl(window.location.origin) === normalizeUrl(pageOrigin ?? '');

  const pageAgentOk = isBrowserSameOrigin && pageOrigin
    ? await probeAgentHealth(pageOrigin, timeoutMs, fetchImpl)
    : false;

  let agentBaseUrl: string;
  if (pageAgentOk && pageOrigin) {
    // Mac browser already on a working agent — keep same-origin (relative API + media).
    agentBaseUrl = normalizeUrl(pageOrigin);
  } else {
    // iPhone / remote: race all candidates so hotspot/LAN beats Tailscale when reachable.
    const agentWinner = await raceFirstHealthy(agentCandidates, (url) =>
      probeAgentHealth(url, timeoutMs, fetchImpl),
    );
    agentBaseUrl = agentWinner ?? bootstrapAgent;
  }

  const remotionWinner = await raceFirstHealthy(remotionCandidates, (url) =>
    probeHttpReachable(url, timeoutMs, fetchImpl),
  );
  const remotionOrigin =
    remotionWinner ?? remotionFallbackFromAgent(agentBaseUrl);

  return {
    agentBaseUrl,
    remotionOrigin,
    agentSource: describeHost(agentBaseUrl),
    remotionSource: describeHost(remotionOrigin),
    probedAt: new Date().toISOString(),
  };
}

/** Build composition embed URL from a raced Remotion origin. */
export function remotionEmbedFromOrigin(
  remotionOrigin: string,
  compositionPath: string,
  options: { scriptId?: string; takeId?: string } = {},
): string {
  const origin = normalizeUrl(remotionOrigin);
  const id = compositionPath.replace(/^\/+|\/+$/g, '');
  const params = new URLSearchParams({ outdoorEmbed: '1' });
  if (options.scriptId?.trim()) {
    params.set('scriptId', options.scriptId.trim());
  }
  if (options.takeId?.trim()) {
    params.set('takeId', options.takeId.trim());
  }
  return `${origin}/${encodeURIComponent(id)}?${params.toString()}`;
}
