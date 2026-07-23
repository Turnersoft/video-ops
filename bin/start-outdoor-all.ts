/**
 * Outdoor filming stack — Tailscale + hotspot/LAN (auto fastest transport).
 *
 *   npm run outdoor:all
 *
 * Dev mode: Vite outdoor UI on :8788 (HMR + source maps), agent API on :8789
 * (Vite proxies /api → agent). Remotion + Expo run in dev as before.
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
const OUTDOOR_UI_ROOT = path.join(VIDEO_OPS_ROOT, "editor/outdoor-ui");
const IOS_TELEPROMPTER_ROOT = path.join(VIDEO_OPS_ROOT, "editor/ios-teleprompter");
/** Public Mac/iPhone URL — Vite dev server (proxies /api). */
const UI_PORT = Number(Deno.env.get("OUTDOOR_UI_PORT") || 8788);
/** Internal agent API — not served to browsers directly in outdoor:all. */
const AGENT_INTERNAL_PORT = Number(Deno.env.get("AGENT_INTERNAL_PORT") || 8789);
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
  options: { cwd?: string; env?: Record<string, string> } = {},
): ChildProcess {
  const child = spawn(command, args, {
    stdio: "inherit",
    cwd: options.cwd,
    env: { ...process.env, ...options.env },
  });
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

// Endpoints + iPhone clients use the public UI port (API via Vite proxy).
Deno.env.set("AGENT_PORT", String(UI_PORT));

log(`Starting outdoor agent API on 0.0.0.0:${AGENT_INTERNAL_PORT}`);
spawnProc(
  "deno",
  [
    "task",
    "--config",
    path.join(VIDEO_OPS_ROOT, "editor/outdoor_agent/deno.json"),
    "start:lan",
    "--",
    "--port",
    String(AGENT_INTERNAL_PORT),
  ],
  { cwd: VIDEO_OPS_ROOT },
);

await new Promise((resolve) => setTimeout(resolve, 1200));

log(`Starting outdoor UI (Vite dev) on 0.0.0.0:${UI_PORT} → API :${AGENT_INTERNAL_PORT}`);
spawnProc(
  "npm",
  ["run", "dev:web", "--", "--host", "0.0.0.0", "--port", String(UI_PORT)],
  {
    cwd: OUTDOOR_UI_ROOT,
    env: {
      OUTDOOR_UI_PORT: String(UI_PORT),
      OUTDOOR_UI_HOST: "0.0.0.0",
      AGENT_INTERNAL_PORT: String(AGENT_INTERNAL_PORT),
    },
  },
);

await new Promise((resolve) => setTimeout(resolve, 1500));

log("Starting Remotion Studio + animation.md watcher (dev API)");
spawnProc("npm", ["run", "studio:lan"], {
  cwd: path.join(VIDEO_OPS_ROOT, "editor/remotion"),
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
console.log("OUTDOOR — dev stack (Vite UI + agent API + Remotion + Expo)");
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
console.log(`Mac browser (outdoor UI): http://127.0.0.1:${UI_PORT}/`);
console.log(`Agent API (internal):    http://127.0.0.1:${AGENT_INTERNAL_PORT}/api/health`);
console.log(`Remotion Studio:         http://127.0.0.1:${REMOTION_PORT}/`);
console.log(`iCloud:                  ${OUTDOOR_ENDPOINTS_FILE}`);
console.log(
  "UI = Vite HMR · /api proxied to agent · animation.md compiled live (sync only for render/export)",
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
