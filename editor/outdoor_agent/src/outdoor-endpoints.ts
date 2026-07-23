/**
 * Read iCloud outdoor-endpoints.json and expose multi-transport URL candidates
 * (localhost / hotspot-LAN / Tailscale) for the web UI race picker.
 */
import path from 'node:path';

import { fileExists, readJson } from './fs_util.ts';

export type OutdoorEndpointsFile = {
  schemaVersion?: number;
  updatedAt?: string;
  transport?: string;
  agentUrl?: string | null;
  remotionStudioUrl?: string | null;
  expoPackagerUrl?: string | null;
  lanHost?: string | null;
  agentUrlLan?: string | null;
  remotionStudioUrlLan?: string | null;
  expoPackagerUrlLan?: string | null;
};

export type OutdoorEndpointsPayload = {
  schemaVersion: number;
  updatedAt: string | null;
  transport: string;
  endpoints: OutdoorEndpointsFile | null;
  agentCandidates: string[];
  remotionCandidates: string[];
};

const LOCAL_AGENT = 'http://127.0.0.1:8788';
const LOCAL_REMOTION = 'http://127.0.0.1:3000';

function endpointsPath(): string {
  const home = Deno.env.get('HOME') ?? '';
  return path.join(
    home,
    'Library/Mobile Documents/com~apple~CloudDocs/TurnOutdoor/outdoor-endpoints.json',
  );
}

function normalizeUrl(url: string | null | undefined): string | null {
  const trimmed = url?.trim();
  if (!trimmed) {
    return null;
  }
  return trimmed.replace(/\/+$/, '');
}

function pushUnique(list: string[], url: string | null | undefined): void {
  const normalized = normalizeUrl(url);
  if (!normalized) {
    return;
  }
  if (!list.includes(normalized)) {
    list.push(normalized);
  }
}

export function readOutdoorEndpointsFile(): OutdoorEndpointsFile | null {
  try {
    const filePath = endpointsPath();
    if (!fileExists(filePath)) {
      return null;
    }
    return readJson<OutdoorEndpointsFile>(filePath);
  } catch {
    return null;
  }
}

/** Prefer order for racing: localhost → hotspot/LAN → Tailscale. */
export function buildOutdoorEndpointsPayload(): OutdoorEndpointsPayload {
  const endpoints = readOutdoorEndpointsFile();
  const agentCandidates: string[] = [];
  const remotionCandidates: string[] = [];

  pushUnique(agentCandidates, LOCAL_AGENT);
  pushUnique(agentCandidates, endpoints?.agentUrlLan);
  pushUnique(agentCandidates, endpoints?.agentUrl);

  // LAN / Tailscale first — iPhone cannot reach Mac loopback.
  pushUnique(remotionCandidates, endpoints?.remotionStudioUrlLan);
  pushUnique(remotionCandidates, endpoints?.remotionStudioUrl);

  // Derive remotion from lanHost / agent hosts when LAN remotion field is missing.
  const lanHost = endpoints?.lanHost?.trim();
  if (lanHost) {
    pushUnique(remotionCandidates, `http://${lanHost}:3000`);
    pushUnique(agentCandidates, `http://${lanHost}:8788`);
  }
  pushUnique(remotionCandidates, LOCAL_REMOTION);

  return {
    schemaVersion: 2,
    updatedAt: endpoints?.updatedAt ?? null,
    transport: endpoints?.transport ?? 'auto',
    endpoints,
    agentCandidates,
    remotionCandidates,
  };
}

export function preferredRemotionStudioUrl(): string {
  const payload = buildOutdoorEndpointsPayload();
  const remote = payload.remotionCandidates.find((url) => {
    try {
      const host = new URL(url).hostname;
      return host !== '127.0.0.1' && host !== 'localhost';
    } catch {
      return false;
    }
  });
  return remote ?? payload.remotionCandidates[0] ?? LOCAL_REMOTION;
}
