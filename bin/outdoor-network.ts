/**
 * Pick Tailscale vs direct LAN (iPhone hotspot / same Wi‑Fi) for outdoor URLs.
 */

import os from 'node:os';

import {
  buildOutdoorTailscaleUrls,
  isTailscaleIpv4,
  resolveMacTailscaleHost,
  type OutdoorTailscaleUrls,
} from './outdoor-tailscale.ts';

export type OutdoorNetworkMode = 'hotspot-lan' | 'lan' | 'tailscale';

export type OutdoorConnectionUrls = OutdoorTailscaleUrls & {
  mode: OutdoorNetworkMode;
  lanIp: string | null;
  tailscaleHost: string;
};

/** iPhone Personal Hotspot usually assigns Mac 172.20.10.2+ (gateway .1). */
export function isIphoneHotspotIp(ip: string): boolean {
  const parts = ip.split('.').map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) {
    return false;
  }
  return parts[0] === 172 && parts[1] === 20 && parts[2] === 10 && parts[3] >= 2;
}

export function isPrivateLanIp(ip: string): boolean {
  if (isTailscaleIpv4(ip)) {
    return false;
  }
  const parts = ip.split('.').map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) {
    return false;
  }
  if (parts[0] === 10) {
    return true;
  }
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) {
    return true;
  }
  if (parts[0] === 192 && parts[1] === 168) {
    return true;
  }
  return false;
}

export function listLanIpv4Addresses(): string[] {
  const addresses: string[] = [];
  for (const entries of Object.values(os.networkInterfaces())) {
    for (const net of entries ?? []) {
      if (net.family === 'IPv4' && !net.internal && isPrivateLanIp(net.address)) {
        addresses.push(net.address);
      }
    }
  }
  return addresses;
}

/** Prefer iPhone hotspot IP, then any other private LAN (home Wi‑Fi). */
export function detectPreferredLanIp(): string | null {
  const addresses = listLanIpv4Addresses();
  const hotspot = addresses.find(isIphoneHotspotIp);
  if (hotspot) {
    return hotspot;
  }
  return addresses[0] ?? null;
}

export async function resolveOutdoorConnectionUrls(): Promise<OutdoorConnectionUrls> {
  const forceTailscale = Deno.env.get('OUTDOOR_FORCE_TAILSCALE') === '1';
  const tailscaleHost = await resolveMacTailscaleHost();
  const tailscale = buildOutdoorTailscaleUrls(tailscaleHost);
  const lanIp = detectPreferredLanIp();

  if (!forceTailscale && lanIp) {
    const lanUrls = buildOutdoorTailscaleUrls(lanIp);
    return {
      mode: isIphoneHotspotIp(lanIp) ? 'hotspot-lan' : 'lan',
      host: lanIp,
      lanIp,
      tailscaleHost,
      agentUrl: lanUrls.agentUrl,
      remotionStudioUrl: lanUrls.remotionStudioUrl,
      expoPackagerUrl: lanUrls.expoPackagerUrl,
    };
  }

  return {
    mode: 'tailscale',
    host: tailscaleHost,
    lanIp: null,
    tailscaleHost,
    agentUrl: tailscale.agentUrl,
    remotionStudioUrl: tailscale.remotionStudioUrl,
    expoPackagerUrl: tailscale.expoPackagerUrl,
  };
}
