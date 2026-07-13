import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export type OutdoorTransport = "auto" | "tailscale" | "lan";

export type OutdoorEndpoints = {
  schemaVersion: number;
  updatedAt: string;
  transport: OutdoorTransport;
  /** Tailscale URLs — always present when outdoor:all runs. */
  agentUrl: string | null;
  remotionStudioUrl: string | null;
  expoPackagerUrl: string | null;
  /** LAN / hotspot URLs — present when Mac has a private IPv4 (e.g. 172.20.10.x). */
  lanHost?: string | null;
  agentUrlLan?: string | null;
  remotionStudioUrlLan?: string | null;
  expoPackagerUrlLan?: string | null;
};

export type OutdoorEndpointsPartial = Partial<{
  transport: OutdoorTransport;
  agentUrl: string | null;
  remotionStudioUrl: string | null;
  expoPackagerUrl: string | null;
  lanHost: string | null;
  agentUrlLan: string | null;
  remotionStudioUrlLan: string | null;
  expoPackagerUrlLan: string | null;
}>;

/** Synced to iPhone via iCloud Drive — same folder as TurnOutdoor/inbox. */
export const TURN_OUTDOOR_ICLOUD = path.join(
  os.homedir(),
  "Library/Mobile Documents/com~apple~CloudDocs/TurnOutdoor",
);

export const OUTDOOR_ENDPOINTS_FILE = path.join(
  TURN_OUTDOOR_ICLOUD,
  "outdoor-endpoints.json",
);

export function readOutdoorEndpoints(): OutdoorEndpoints | null {
  try {
    if (!fs.existsSync(OUTDOOR_ENDPOINTS_FILE)) {
      return null;
    }
    const raw = JSON.parse(
      fs.readFileSync(OUTDOOR_ENDPOINTS_FILE, "utf8"),
    ) as OutdoorEndpoints;
    return {
      ...raw,
      transport: raw.transport ?? "auto",
      schemaVersion: raw.schemaVersion ?? 1,
    };
  } catch {
    return null;
  }
}

/** Merge partial URLs into outdoor-endpoints.json (iCloud → iPhone). */
export function writeOutdoorEndpoints(
  partial: OutdoorEndpointsPartial = {},
): OutdoorEndpoints {
  const existing = readOutdoorEndpoints();
  const pick = <K extends keyof OutdoorEndpointsPartial>(
    field: K,
  ): OutdoorEndpoints[K] | null => {
    if (field in partial) {
      return (partial[field] ?? null) as OutdoorEndpoints[K] | null;
    }
    return (existing?.[field] ?? null) as OutdoorEndpoints[K] | null;
  };
  const next: OutdoorEndpoints = {
    schemaVersion: 2,
    updatedAt: new Date().toISOString(),
    transport: pick("transport") ?? "auto",
    agentUrl: pick("agentUrl"),
    remotionStudioUrl: pick("remotionStudioUrl"),
    expoPackagerUrl: pick("expoPackagerUrl"),
    lanHost: pick("lanHost"),
    agentUrlLan: pick("agentUrlLan"),
    remotionStudioUrlLan: pick("remotionStudioUrlLan"),
    expoPackagerUrlLan: pick("expoPackagerUrlLan"),
  };
  fs.mkdirSync(TURN_OUTDOOR_ICLOUD, { recursive: true });
  fs.writeFileSync(
    OUTDOOR_ENDPOINTS_FILE,
    `${JSON.stringify(next, null, 2)}\n`,
  );
  return next;
}
