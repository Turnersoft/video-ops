/**
 * Outdoor filming stack — Tailscale + hotspot/LAN (auto fastest transport).
 *
 *   npm run outdoor:all
 *
 * iPhone on tailnet:     100.x (Tailscale fallback)
 * iPhone hotspot to Mac: 172.20.10.x (preferred when available)
 */

import { spawn, type ChildProcess } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { launchOutdoorExpoLan } from "./outdoor-expo-ngrok.ts";
import {
  OUTDOOR_ENDPOINTS_FILE,
  readOutdoorEndpoints,
} from "./outdoor-endpoints.ts";
import { resolveOutdoorLanUrls } from "./outdoor-lan.ts";
import { resolveOutdoorTailscaleUrls } from "./outdoor-tailscale.ts";
import { syncOutdoorEndpoints } from "./sync-outdoor-endpoints.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const VIDEO_OPS_ROOT = path.resolve(__dirname, "..");
const IOS_TELEPROMPTER_ROOT = path.join(VIDEO_OPS_ROOT, "ios-teleprompter");
const AGENT_PORT = Number(Deno.env.get("AGENT_PORT") || 8788);
const METRO_PORT = Number(
  Deno.env.get("EXPO_PORT") || Deno.env.get("RCT_METRO_PORT") || 8081,
);
const REMOTION_PORT = Number(Deno.env.get("REMOTION_PORT") || 3000);

const children: ChildProcess[] = [];

function log(message: string): void {
  console.log(`[outdoor:all] ${message}`);
}

function spawnProc(
  command: string,
  args: string[],
  options: { cwd?: string } = {},
): ChildProcess {
  const child = spawn(command, args, { stdio: "inherit", ...options });
  child.on("error", (error) => {
    console.error(`[outdoor:all] failed to start ${command}: ${error.message}`);
  });
  children.push(child);
  return child;
}

function shutdown(): void {
  for (const child of children) {
    child.kill("SIGTERM");
  }
  Deno.exit(0);
}

Deno.addSignalListener("SIGINT", shutdown);
Deno.addSignalListener("SIGTERM", shutdown);

log("Building shared outdoor UI (web)");
const uiBuild = spawn("npm", ["run", "outdoor-ui:build"], {
  cwd: VIDEO_OPS_ROOT,
  stdio: "inherit",
});
const uiExit = await new Promise<number>((resolve) => {
  uiBuild.on("close", (code) => resolve(code ?? 1));
});
if (uiExit !== 0) {
  console.error("[outdoor:all] outdoor-ui build failed");
  Deno.exit(uiExit);
}

log("Starting outdoor agent on 0.0.0.0:" + AGENT_PORT);
spawnProc(
  "deno",
  [
    "task",
    "--config",
    path.join(VIDEO_OPS_ROOT, "outdoor_agent/deno.json"),
    "start:lan",
    "--",
    "--port",
    String(AGENT_PORT),
  ],
  { cwd: VIDEO_OPS_ROOT },
);

await new Promise((resolve) => setTimeout(resolve, 1200));

log("Starting Remotion Studio + animation.md watcher (dev API)");
spawnProc("npm", ["run", "studio:lan"], {
  cwd: path.join(VIDEO_OPS_ROOT, "remotion"),
});

await new Promise((resolve) => setTimeout(resolve, 1500));

const tailscale = await resolveOutdoorTailscaleUrls();
const lan = resolveOutdoorLanUrls();

log("Syncing Tailscale + hotspot/LAN URLs to iCloud");
await syncOutdoorEndpoints();
setInterval(() => {
  void syncOutdoorEndpoints();
}, 30_000);

const endpoints = readOutdoorEndpoints();

console.log("\n" + "=".repeat(72));
console.log("OUTDOOR — hotspot/LAN preferred, Tailscale fallback");
console.log("=".repeat(72));
console.log(`Tailscale host:          ${tailscale.host}`);
if (lan) {
  console.log(
    `Hotspot/LAN host:        ${lan.host}${lan.isHotspot ? " (iPhone hotspot)" : ""}`,
  );
  console.log(`Agent (LAN, preferred):  ${lan.agentUrl}`);
  console.log(
    `Expo (LAN, preferred):     exp://${lan.host}:${METRO_PORT}`,
  );
}
console.log(`Agent (Tailscale):       ${endpoints?.agentUrl ?? tailscale.agentUrl}`);
console.log(
  `Expo (Tailscale):        ${(endpoints?.expoPackagerUrl ?? tailscale.expoPackagerUrl).replace(/^http:\/\//, "exp://")}`,
);
console.log(`Mac browser (videos):    http://127.0.0.1:${AGENT_PORT}/`);
console.log(`Remotion Studio:         http://127.0.0.1:${REMOTION_PORT}/`);
console.log(`iCloud:                  ${OUTDOOR_ENDPOINTS_FILE}`);
console.log(
  "animation.md changes → agent scripts-watch + Remotion Studio watcher",
);
console.log("iPhone → Refresh from iCloud (auto picks hotspot when reachable)");
console.log("=".repeat(72) + "\n");

await launchOutdoorExpoLan({
  logPrefix: "outdoor:all",
  children,
  videoOpsRoot: VIDEO_OPS_ROOT,
  iosTeleprompterRoot: IOS_TELEPROMPTER_ROOT,
  agentPublicUrl: tailscale.agentUrl,
  remotionPublicUrl: tailscale.remotionStudioUrl,
  expoPublicUrl: tailscale.expoPackagerUrl,
  tailscaleHost: tailscale.host,
});

await new Promise(() => {});
