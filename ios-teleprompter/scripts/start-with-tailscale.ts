/**
 * Start Expo with Mac Tailscale host so iPhone on tailnet can load Metro.
 *
 *   Mac Metro :8081  ←  Tailscale 100.x  ←  iPhone Expo Go
 *
 * Usage: npm run start:tailscale
 *
 * For agent + Expo in one terminal: npm run outdoor:all (from video_ops root)
 */

import { type ChildProcess } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { launchOutdoorExpoLan } from "../../bin/outdoor-expo-ngrok.ts";
import { resolveOutdoorTailscaleUrls } from "../../bin/outdoor-tailscale.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const IOS_TELEPROMPTER_ROOT = path.resolve(__dirname, "..");
const VIDEO_OPS_ROOT = path.resolve(IOS_TELEPROMPTER_ROOT, "..");

const children: ChildProcess[] = [];

function cleanup(): void {
  for (const child of children) {
    try {
      if (!child.killed) {
        child.kill("SIGTERM");
      }
    } catch {
      // ignore
    }
  }
}

Deno.addSignalListener("SIGINT", () => {
  cleanup();
  Deno.exit(0);
});
Deno.addSignalListener("SIGTERM", () => {
  cleanup();
  Deno.exit(0);
});

const tailscale = await resolveOutdoorTailscaleUrls();

await launchOutdoorExpoLan({
  logPrefix: "start:tailscale",
  children,
  videoOpsRoot: VIDEO_OPS_ROOT,
  iosTeleprompterRoot: IOS_TELEPROMPTER_ROOT,
  agentPublicUrl: tailscale.agentUrl,
  remotionPublicUrl: tailscale.remotionStudioUrl,
  expoPublicUrl: tailscale.expoPackagerUrl,
  tailscaleHost: tailscale.host,
});

await new Promise(() => {});
