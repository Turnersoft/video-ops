import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";

import {
  DEFAULT_AGENT_TAILSCALE_URL,
  DEFAULT_REMOTION_TAILSCALE_URL,
  isHotspotLanIpv4,
  isLocalhostUrl,
  isNgrokHttpsUrl,
  isPrivateLanUrl,
  isTailscaleUrl,
} from "./outdoorNgrokConfig";
import { withNgrokHeaders } from "./outdoorFetch";

const INBOX_SETTINGS_PATH = `${FileSystem.documentDirectory ?? ""}turn-outdoor-teleprompter/icloud-inbox-settings.json`;
const ENDPOINTS_CACHE_PATH = `${FileSystem.documentDirectory ?? ""}turn-outdoor-teleprompter/outdoor-endpoints-cache.json`;

export type OutdoorTransport = "auto" | "tailscale" | "lan";

export type OutdoorEndpoints = {
  schemaVersion?: number;
  updatedAt?: string;
  transport?: OutdoorTransport;
  agentUrl?: string | null;
  remotionStudioUrl?: string | null;
  expoPackagerUrl?: string | null;
  lanHost?: string | null;
  agentUrlLan?: string | null;
  remotionStudioUrlLan?: string | null;
  expoPackagerUrlLan?: string | null;
};

const LOCAL_AGENT_URL = "http://127.0.0.1:8788";
const LOCAL_REMOTION_URL = "http://127.0.0.1:3000";

function normalizeUrl(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

function isUsableUrl(value: string | null | undefined): value is string {
  if (!value?.trim()) {
    return false;
  }
  return /^https?:\/\//i.test(value.trim());
}

function isNativeDevice(): boolean {
  return Platform.OS !== "web";
}

async function readInboxUri(): Promise<string | null> {
  try {
    const raw = await FileSystem.readAsStringAsync(INBOX_SETTINGS_PATH);
    const parsed = JSON.parse(raw) as { inboxUri?: string };
    return parsed.inboxUri?.trim() || null;
  } catch {
    return null;
  }
}

function turnOutdoorDirFromInboxUri(inboxUri: string): string | null {
  const trimmed = inboxUri.replace(/\/+$/, "");
  if (trimmed.endsWith("/inbox")) {
    return trimmed.slice(0, -"/inbox".length);
  }
  if (trimmed.endsWith("/TurnOutdoor")) {
    return trimmed;
  }
  return null;
}

async function readEndpointsFile(
  fileUri: string,
): Promise<OutdoorEndpoints | null> {
  try {
    const info = await FileSystem.getInfoAsync(fileUri);
    if (!info.exists) {
      return null;
    }
    const raw = await FileSystem.readAsStringAsync(fileUri);
    return JSON.parse(raw) as OutdoorEndpoints;
  } catch {
    return null;
  }
}

async function writeEndpointsCache(endpoints: OutdoorEndpoints): Promise<void> {
  const dir = `${FileSystem.documentDirectory ?? ""}turn-outdoor-teleprompter/`;
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }
  await FileSystem.writeAsStringAsync(
    ENDPOINTS_CACHE_PATH,
    JSON.stringify(endpoints, null, 2),
  );
}

async function readEndpointsCache(): Promise<OutdoorEndpoints | null> {
  return readEndpointsFile(ENDPOINTS_CACHE_PATH);
}

function sanitizeEndpoints(endpoints: OutdoorEndpoints): OutdoorEndpoints {
  const agent = endpoints.agentUrl?.trim().replace(/\/+$/, "") ?? null;
  let expo = endpoints.expoPackagerUrl?.trim().replace(/\/+$/, "") ?? null;
  let remotion =
    endpoints.remotionStudioUrl?.trim().replace(/\/+$/, "") ?? null;

  if (agent && expo && agent === expo) {
    expo = null;
  }
  if (agent && remotion && agent === remotion) {
    remotion = null;
  }

  return {
    ...endpoints,
    transport: endpoints.transport ?? "auto",
    agentUrl: agent,
    expoPackagerUrl: expo,
    remotionStudioUrl: remotion,
  };
}

function mergeEndpoints(
  cached: OutdoorEndpoints | null,
  fromIcloud: OutdoorEndpoints | null,
): OutdoorEndpoints | null {
  if (!cached && !fromIcloud) {
    return null;
  }
  const cachedTime = cached?.updatedAt ? Date.parse(cached.updatedAt) : 0;
  const icloudTime = fromIcloud?.updatedAt
    ? Date.parse(fromIcloud.updatedAt)
    : 0;
  const base =
    icloudTime >= cachedTime
      ? { ...cached, ...fromIcloud }
      : { ...fromIcloud, ...cached };
  return sanitizeEndpoints(base);
}

/** Read Tailscale/LAN URLs from cache + iCloud TurnOutdoor/outdoor-endpoints.json. */
export async function loadOutdoorEndpointsFromIcloud(): Promise<OutdoorEndpoints | null> {
  const cached = await readEndpointsCache();
  let fromIcloud: OutdoorEndpoints | null = null;

  const inboxUri = await readInboxUri();
  if (inboxUri) {
    const turnOutdoorDir = turnOutdoorDirFromInboxUri(inboxUri);
    if (turnOutdoorDir) {
      fromIcloud = await readEndpointsFile(
        `${turnOutdoorDir}/outdoor-endpoints.json`,
      );
    }
  }

  const merged = mergeEndpoints(cached, fromIcloud);
  if (merged) {
    if (isExpoPackagerUrl(merged.agentUrl, merged)) {
      merged.agentUrl =
        fromIcloud?.agentUrl &&
        isValidAgentCandidate(fromIcloud.agentUrl, merged)
          ? fromIcloud.agentUrl
          : cached?.agentUrl && isValidAgentCandidate(cached.agentUrl, merged)
            ? cached.agentUrl
            : null;
    }
    await writeEndpointsCache(merged);
    return merged;
  }
  return cached;
}

function isExpoPackagerUrl(
  url: string | null | undefined,
  endpoints: OutdoorEndpoints | null | undefined,
): boolean {
  if (!isUsableUrl(url) || !isUsableUrl(endpoints?.expoPackagerUrl)) {
    return false;
  }
  return normalizeUrl(url) === normalizeUrl(endpoints.expoPackagerUrl);
}

function isValidAgentCandidate(
  url: string | null | undefined,
  endpoints: OutdoorEndpoints | null | undefined,
): url is string {
  if (!isUsableUrl(url)) {
    return false;
  }
  if (isNgrokHttpsUrl(url)) {
    return false;
  }
  if (isLocalhostUrl(url) && isNativeDevice()) {
    return false;
  }
  return !isExpoPackagerUrl(url, endpoints);
}

export async function ensureOutdoorEndpointsCache(): Promise<void> {
  const cached = await readEndpointsCache();
  if (isValidAgentCandidate(cached?.agentUrl, cached)) {
    return;
  }
  await writeEndpointsCache({
    schemaVersion: 2,
    updatedAt: new Date().toISOString(),
    transport: "auto",
    agentUrl: DEFAULT_AGENT_TAILSCALE_URL,
    remotionStudioUrl:
      cached?.remotionStudioUrl ?? DEFAULT_REMOTION_TAILSCALE_URL,
    expoPackagerUrl: cached?.expoPackagerUrl ?? null,
    agentUrlLan: cached?.agentUrlLan ?? null,
    remotionStudioUrlLan: cached?.remotionStudioUrlLan ?? null,
    expoPackagerUrlLan: cached?.expoPackagerUrlLan ?? null,
    lanHost: cached?.lanHost ?? null,
  });
}

async function probeAgentHealth(url: string, timeoutMs = 2500): Promise<boolean> {
  if (!isUsableUrl(url) || isLocalhostUrl(url)) {
    return false;
  }
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const response = await fetch(
      `${normalizeUrl(url)}/api/health`,
      withNgrokHeaders({ signal: controller.signal }),
    );
    clearTimeout(timer);
    if (!response.ok) {
      return false;
    }
    const payload = (await response.json()) as {
      ok?: boolean;
      service?: string;
    };
    return payload.ok === true && payload.service === "outdoor-agent";
  } catch {
    return false;
  }
}

async function probeHttpReachable(url: string, timeoutMs = 2500): Promise<boolean> {
  if (!isUsableUrl(url) || isLocalhostUrl(url)) {
    return false;
  }
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const response = await fetch(
      normalizeUrl(url),
      withNgrokHeaders({ signal: controller.signal }),
    );
    clearTimeout(timer);
    return response.status < 500;
  } catch {
    return false;
  }
}

async function resolveAutoAgentUrl(
  endpoints: OutdoorEndpoints | null,
  savedUrl?: string | null,
): Promise<string> {
  const transport = endpoints?.transport ?? "auto";
  const lan = endpoints?.agentUrlLan;
  const tailscale = endpoints?.agentUrl;

  if (isNativeDevice() && transport === "auto" && isUsableUrl(lan)) {
    if (await probeAgentHealth(lan, 2500)) {
      return normalizeUrl(lan);
    }
  }

  if (
    isUsableUrl(savedUrl) &&
    !isNgrokHttpsUrl(savedUrl) &&
    isValidAgentCandidate(savedUrl, endpoints) &&
    (transport !== "auto" || (await probeAgentHealth(savedUrl, 4000)))
  ) {
    return normalizeUrl(savedUrl);
  }

  if (isUsableUrl(tailscale) && isValidAgentCandidate(tailscale, endpoints)) {
    return normalizeUrl(tailscale);
  }

  return DEFAULT_AGENT_TAILSCALE_URL;
}

async function resolveAutoServiceUrl(
  endpoints: OutdoorEndpoints | null,
  lanField: "agentUrlLan" | "remotionStudioUrlLan" | "expoPackagerUrlLan",
  tailscaleField: "agentUrl" | "remotionStudioUrl" | "expoPackagerUrl",
  savedUrl: string | null | undefined,
  defaultTailscale: string,
  localhostFallback: string,
): Promise<string> {
  const transport = endpoints?.transport ?? "auto";
  const lan = endpoints?.[lanField];
  const tailscale = endpoints?.[tailscaleField];

  if (isNativeDevice() && transport === "auto" && isUsableUrl(lan)) {
    if (await probeHttpReachable(lan, 2500)) {
      return normalizeUrl(lan);
    }
  }

  if (isUsableUrl(savedUrl) && !isLocalhostUrl(savedUrl)) {
    if (transport !== "auto" || (await probeHttpReachable(savedUrl, 4000))) {
      return normalizeUrl(savedUrl);
    }
  }

  if (isUsableUrl(tailscale) && !isLocalhostUrl(tailscale)) {
    return normalizeUrl(tailscale);
  }

  if (isNativeDevice()) {
    return defaultTailscale;
  }
  return localhostFallback;
}

export async function resolveAgentBaseUrl(
  savedUrl?: string | null,
): Promise<string> {
  await ensureOutdoorEndpointsCache();
  const endpoints = await loadOutdoorEndpointsFromIcloud();
  return resolveAutoAgentUrl(endpoints, savedUrl);
}

export async function resolveRemotionStudioUrl(
  savedUrl?: string | null,
): Promise<string> {
  await ensureOutdoorEndpointsCache();
  const endpoints = await loadOutdoorEndpointsFromIcloud();
  return resolveAutoServiceUrl(
    endpoints,
    "remotionStudioUrlLan",
    "remotionStudioUrl",
    savedUrl,
    DEFAULT_REMOTION_TAILSCALE_URL,
    LOCAL_REMOTION_URL,
  );
}

export function describeEndpointSource(
  endpoints: OutdoorEndpoints | null,
  savedUrl: string | null,
  field: "agentUrl" | "remotionStudioUrl",
): string {
  const lanField =
    field === "agentUrl" ? endpoints?.agentUrlLan : endpoints?.remotionStudioUrlLan;
  const value = endpoints?.[field];
  if (isUsableUrl(lanField) && isPrivateLanUrl(lanField)) {
    try {
      const host = new URL(lanField).hostname;
      if (isHotspotLanIpv4(host)) {
        return "iPhone hotspot";
      }
      return "LAN";
    } catch {
      return "LAN";
    }
  }
  if (isUsableUrl(value) && isTailscaleUrl(value)) {
    return "Tailscale";
  }
  if (isUsableUrl(value) && isNgrokHttpsUrl(value)) {
    return "ngrok (stale)";
  }
  if (isUsableUrl(value) && isPrivateLanUrl(value)) {
    return "LAN";
  }
  if (isUsableUrl(value)) {
    return "iCloud";
  }
  if (isUsableUrl(savedUrl) && !isLocalhostUrl(savedUrl)) {
    return "saved";
  }
  if (isNativeDevice()) {
    return "Tailscale default";
  }
  return "localhost";
}

/** localhost URLs never work on a physical iPhone. */
export function agentUrlProblemOnDevice(
  url: string,
  endpoints?: OutdoorEndpoints | null,
): string | null {
  if (!isNativeDevice()) {
    return null;
  }
  if (isNgrokHttpsUrl(url)) {
    return (
      `Agent URL is ${url}\n\n` +
      "That is an old ngrok tunnel — ngrok is no longer used.\n\n" +
      "Run on Mac: cd video_ops && npm run outdoor:all\n" +
      "Then iPhone → Refresh from iCloud\n\n" +
      "Or set agent URL to hotspot/LAN or Tailscale in Mac connection."
    );
  }
  if (isExpoPackagerUrl(url, endpoints)) {
    return (
      `Agent URL is ${url}\n\n` +
      "That URL is the Expo Metro tunnel, not the outdoor agent (:8788).\n\n" +
      "Run: cd video_ops && npm run outdoor:all\n" +
      "Then iPhone → Refresh from iCloud\n\n" +
      `Agent should be: ${DEFAULT_AGENT_TAILSCALE_URL}`
    );
  }
  if (!isLocalhostUrl(url)) {
    return null;
  }
  return (
    `Agent URL is ${url}\n\n` +
    "On iPhone use Mac hotspot/LAN or Tailscale URL, not 127.0.0.1.\n\n" +
    "Run: cd video_ops && npm run outdoor:all\n" +
    `Default: ${DEFAULT_AGENT_TAILSCALE_URL}`
  );
}

/** Probe /api/health so stale iCloud URLs cannot masquerade as the agent. */
export async function probeAgentUrlOnDevice(
  url: string,
  endpoints?: OutdoorEndpoints | null,
): Promise<string | null> {
  const staticProblem = agentUrlProblemOnDevice(url, endpoints);
  if (staticProblem) {
    return staticProblem;
  }
  if (!isNativeDevice() || isLocalhostUrl(url)) {
    return staticProblem;
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const response = await fetch(
      `${url.replace(/\/+$/, "")}/api/health`,
      withNgrokHeaders({ signal: controller.signal }),
    );
    clearTimeout(timer);
    const body = await response.text();
    const trimmed = body.trim();
    if (
      trimmed.startsWith("<!DOCTYPE") ||
      trimmed.startsWith("<html") ||
      trimmed.includes("<html")
    ) {
      return (
        `Agent URL is ${url}\n\n` +
        "Ngrok or tunnel HTML returned instead of the outdoor agent API.\n\n" +
        "Use Tailscale: cd video_ops && npm run outdoor:all\n" +
        "Then iPhone → Tailscale ON → Refresh from iCloud"
      );
    }
    if (!response.ok) {
      return (
        `Agent URL is ${url}\n\n` +
        `Health check failed (${response.status}). Is npm run outdoor:all running on Mac?`
      );
    }
    let payload: { ok?: boolean; service?: string; runtimeVersion?: string };
    try {
      payload = JSON.parse(body) as {
        ok?: boolean;
        service?: string;
        runtimeVersion?: string;
      };
    } catch {
      return (
        `Agent URL is ${url}\n\n` +
        "Response was not outdoor-agent JSON (likely Expo Metro or Remotion on the same hostname).\n\n" +
        "Restart: cd video_ops && npm run outdoor:all\n" +
        "Then iPhone → Refresh from iCloud"
      );
    }
    if (payload.ok === true && payload.service === "outdoor-agent") {
      return null;
    }
    if (payload.runtimeVersion) {
      return (
        `Agent URL is ${url}\n\n` +
        "That URL is Expo Metro (:8081), not the outdoor agent (:8788).\n\n" +
        "Run: cd video_ops && npm run outdoor:all\n" +
        "Then iPhone → Refresh from iCloud"
      );
    }
    return `Agent at ${url} did not return outdoor-agent health.`;
  } catch (error) {
    return error instanceof Error ? error.message : "Agent unreachable";
  }
}

/** localhost URLs never work on a physical iPhone. */
export function remotionUrlProblemOnDevice(url: string): string | null {
  if (!isNativeDevice()) {
    return null;
  }
  if (!isLocalhostUrl(url)) {
    return null;
  }
  return (
    `Remotion URL is ${url}\n\n` +
    "On iPhone use Mac Tailscale http://100.x:3000 (not localhost).\n\n" +
    "Mac: cd video_ops && npm run outdoor:all\n" +
    "Then: cd remotion && npm run studio:lan"
  );
}
