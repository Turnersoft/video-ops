/**
 * LAN / iPhone hotspot detection for outdoor Mac ↔ iPhone.
 * iPhone Personal Hotspot usually assigns Mac 172.20.10.x.
 */

import os from "node:os";

import { outdoorUrlOnHost } from "./outdoor-tailscale.ts";

const AGENT_PORT = Number(Deno.env.get("AGENT_PORT") || 8788);
const METRO_PORT = Number(
  Deno.env.get("EXPO_PORT") || Deno.env.get("RCT_METRO_PORT") || 8081,
);
const REMOTION_PORT = Number(Deno.env.get("REMOTION_PORT") || 3000);

export type OutdoorLanUrls = {
  host: string;
  agentUrl: string;
  remotionStudioUrl: string;
  expoPackagerUrl: string;
  isHotspot: boolean;
};

export function isHotspotLanIpv4(host: string): boolean {
  return host.startsWith("172.20.10.");
}

export function isPrivateLanIpv4(host: string): boolean {
  const parts = host.split(".").map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) {
    return false;
  }
  if (parts[0] === 10) {
    return true;
  }
  if (parts[0] === 192 && parts[1] === 168) {
    return true;
  }
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) {
    return true;
  }
  return false;
}

function scoreLanCandidate(ip: string): number {
  if (isHotspotLanIpv4(ip)) {
    return 100;
  }
  if (ip.startsWith("192.168.")) {
    return 50;
  }
  if (isPrivateLanIpv4(ip)) {
    return 25;
  }
  return 0;
}

/** Best non-loopback IPv4 for iPhone ↔ Mac on same LAN / hotspot. */
export function detectOutdoorLanIp(): string | null {
  const nets = os.networkInterfaces();
  const candidates: string[] = [];

  for (const entries of Object.values(nets)) {
    for (const net of entries ?? []) {
      if (net.family === "IPv4" && !net.internal) {
        candidates.push(net.address);
      }
    }
  }

  if (candidates.length === 0) {
    return null;
  }

  candidates.sort((left, right) => scoreLanCandidate(right) - scoreLanCandidate(left));
  const best = candidates[0];
  return scoreLanCandidate(best) > 0 ? best : null;
}

export function buildOutdoorLanUrls(
  host: string,
  ports: { agent?: number; remotion?: number; metro?: number } = {},
): OutdoorLanUrls {
  const agent = ports.agent ?? AGENT_PORT;
  const remotion = ports.remotion ?? REMOTION_PORT;
  const metro = ports.metro ?? METRO_PORT;
  return {
    host,
    agentUrl: outdoorUrlOnHost(host, agent),
    remotionStudioUrl: outdoorUrlOnHost(host, remotion),
    expoPackagerUrl: outdoorUrlOnHost(host, metro),
    isHotspot: isHotspotLanIpv4(host),
  };
}

export function resolveOutdoorLanUrls(): OutdoorLanUrls | null {
  const host = detectOutdoorLanIp();
  if (!host) {
    return null;
  }
  return buildOutdoorLanUrls(host);
}
