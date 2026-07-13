/**
 * Tailscale URLs for outdoor Mac ↔ iPhone (replaces ngrok).
 * Mac: johns-macbook-pro @ 100.66.185.67
 */

export const BUNDLED_TAILSCALE_MAC_IP = '100.66.185.67';

const AGENT_PORT = Number(Deno.env.get('AGENT_PORT') || 8788);
const METRO_PORT = Number(Deno.env.get('EXPO_PORT') || Deno.env.get('RCT_METRO_PORT') || 8081);
const REMOTION_PORT = Number(Deno.env.get('REMOTION_PORT') || 3000);

export type OutdoorTailscaleUrls = {
  host: string;
  agentUrl: string;
  remotionStudioUrl: string;
  expoPackagerUrl: string;
};

export function isTailscaleIpv4(host: string): boolean {
  const parts = host.split('.').map((part) => Number(part));
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

export function outdoorUrlOnHost(host: string, port: number): string {
  return `http://${host}:${port}`;
}

export function buildOutdoorTailscaleUrls(
  host: string,
  ports: { agent?: number; remotion?: number; metro?: number } = {},
): OutdoorTailscaleUrls {
  const agent = ports.agent ?? AGENT_PORT;
  const remotion = ports.remotion ?? REMOTION_PORT;
  const metro = ports.metro ?? METRO_PORT;
  return {
    host,
    agentUrl: outdoorUrlOnHost(host, agent),
    remotionStudioUrl: outdoorUrlOnHost(host, remotion),
    expoPackagerUrl: outdoorUrlOnHost(host, metro),
  };
}

/** Resolve this Mac's Tailscale IPv4 (CLI → env → bundled default). */
export async function resolveMacTailscaleHost(): Promise<string> {
  const fromEnv = Deno.env.get('OUTDOOR_TAILSCALE_HOST')?.trim();
  if (fromEnv && isTailscaleIpv4(fromEnv)) {
    return fromEnv;
  }

  try {
    const command = new Deno.Command('tailscale', {
      args: ['ip', '-4'],
      stdout: 'piped',
      stderr: 'null',
    });
    const { code, stdout } = await command.output();
    if (code === 0) {
      const line = new TextDecoder().decode(stdout).trim().split('\n')[0]?.trim() ?? '';
      if (line && isTailscaleIpv4(line)) {
        return line;
      }
    }
  } catch {
    // tailscale CLI not installed or not on PATH
  }

  return BUNDLED_TAILSCALE_MAC_IP;
}

export async function resolveOutdoorTailscaleUrls(): Promise<OutdoorTailscaleUrls> {
  const host = await resolveMacTailscaleHost();
  return buildOutdoorTailscaleUrls(host);
}
