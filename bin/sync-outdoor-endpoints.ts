/**
 * Write Mac Tailscale + LAN/hotspot URLs into iCloud outdoor-endpoints.json.
 * iPhone picks the fastest reachable transport (auto).
 */

import {
  OUTDOOR_ENDPOINTS_FILE,
  readOutdoorEndpoints,
  writeOutdoorEndpoints,
  type OutdoorEndpoints,
  type OutdoorEndpointsPartial,
} from "./outdoor-endpoints.ts";
import { resolveOutdoorLanUrls } from "./outdoor-lan.ts";
import { resolveOutdoorTailscaleUrls } from "./outdoor-tailscale.ts";

function endpointsChanged(
  before: OutdoorEndpoints | null,
  after: OutdoorEndpoints,
): boolean {
  return (
    before?.agentUrl !== after.agentUrl ||
    before?.remotionStudioUrl !== after.remotionStudioUrl ||
    before?.expoPackagerUrl !== after.expoPackagerUrl ||
    before?.agentUrlLan !== after.agentUrlLan ||
    before?.remotionStudioUrlLan !== after.remotionStudioUrlLan ||
    before?.expoPackagerUrlLan !== after.expoPackagerUrlLan ||
    before?.lanHost !== after.lanHost
  );
}

function isStaleNgrokUrl(url: string | null | undefined): boolean {
  return Boolean(url && (url.includes("ngrok") || url.includes("loca.lt")));
}

export async function syncOutdoorEndpoints(): Promise<void> {
  const before = readOutdoorEndpoints();
  const tailscale = await resolveOutdoorTailscaleUrls();
  const lan = resolveOutdoorLanUrls();

  const partial: OutdoorEndpointsPartial = {
    transport: "auto",
    agentUrl: tailscale.agentUrl,
    remotionStudioUrl: tailscale.remotionStudioUrl,
    expoPackagerUrl: tailscale.expoPackagerUrl,
    lanHost: lan?.host ?? null,
    agentUrlLan: lan?.agentUrl ?? null,
    remotionStudioUrlLan: lan?.remotionStudioUrl ?? null,
    expoPackagerUrlLan: lan?.expoPackagerUrl ?? null,
  };

  if (
    !partial.agentUrl &&
    !partial.remotionStudioUrl &&
    !partial.expoPackagerUrl
  ) {
    return;
  }

  const endpoints = writeOutdoorEndpoints(partial);
  if (
    !endpointsChanged(before, endpoints) &&
    !isStaleNgrokUrl(before?.agentUrl)
  ) {
    return;
  }

  console.log(`[sync-outdoor-endpoints] wrote ${OUTDOOR_ENDPOINTS_FILE}`);
  console.log(`  tailscale: ${tailscale.host}`);
  console.log(`  agent:     ${endpoints.agentUrl ?? "(none)"}`);
  console.log(`  remotion:  ${endpoints.remotionStudioUrl ?? "(none)"}`);
  const expoTs = endpoints.expoPackagerUrl
    ? endpoints.expoPackagerUrl.replace(/^http:\/\//, "exp://")
    : "(none)";
  console.log(`  expo:      ${expoTs}`);
  if (lan) {
    console.log(
      `  hotspot:   ${lan.host}${lan.isHotspot ? " (iPhone hotspot)" : " (LAN)"}`,
    );
    console.log(`  agent↑:    ${endpoints.agentUrlLan ?? "(none)"}`);
    const expoLan = endpoints.expoPackagerUrlLan
      ? endpoints.expoPackagerUrlLan.replace(/^http:\/\//, "exp://")
      : "(none)";
    console.log(`  expo↑:     ${expoLan}`);
  }
}

if (import.meta.main) {
  await syncOutdoorEndpoints();
}
