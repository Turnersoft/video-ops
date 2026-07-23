/**
 * Mac Tailscale IPv4 on tailnet (johns-macbook-pro).
 * Synced via iCloud TurnOutdoor/outdoor-endpoints.json when outdoor:all runs.
 */
export const BUNDLED_TAILSCALE_MAC_IP = "100.66.185.67";

export const DEFAULT_AGENT_TAILSCALE_URL = `http://${BUNDLED_TAILSCALE_MAC_IP}:8788`;
export const DEFAULT_REMOTION_TAILSCALE_URL = `http://${BUNDLED_TAILSCALE_MAC_IP}:3000`;
export const DEFAULT_EXPO_TAILSCALE_URL = `http://${BUNDLED_TAILSCALE_MAC_IP}:8081`;

/** @deprecated Use DEFAULT_AGENT_TAILSCALE_URL */
export const DEFAULT_AGENT_NGROK_URL = DEFAULT_AGENT_TAILSCALE_URL;
export const DEFAULT_REMOTION_NGROK_URL: string | null =
  DEFAULT_REMOTION_TAILSCALE_URL;
export const DEFAULT_EXPO_NGROK_URL: string | null = DEFAULT_EXPO_TAILSCALE_URL;

export function isTailscaleIpv4(host: string): boolean {
  const parts = host.split(".").map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) {
    return false;
  }
  return parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127;
}

export function isTailscaleUrl(url: string): boolean {
  try {
    return isTailscaleIpv4(new URL(url).hostname);
  } catch {
    return false;
  }
}

/** @deprecated ngrok removed — kept so stale iCloud URLs are ignored */
export function isNgrokHttpsUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && parsed.hostname.includes("ngrok");
  } catch {
    return false;
  }
}

export function isLocalhostUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host === "127.0.0.1" || host === "localhost";
  } catch {
    return false;
  }
}

/** iPhone Personal Hotspot assigns Mac 172.20.10.x */
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

export function isPrivateLanUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return (
      !isLocalhostUrl(url) &&
      !isTailscaleUrl(url) &&
      !isNgrokHttpsUrl(url) &&
      isPrivateLanIpv4(host)
    );
  } catch {
    return false;
  }
}
