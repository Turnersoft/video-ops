/**
 * ngrok + Expo launchers.
 * outdoor:all → reserved ngrok domain → localhost:8788 (agent); Expo on LAN :8081.
 * start:ngrok → ad-hoc ngrok → localhost:8081 (Expo only; steals hostname from agent).
 */

import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";

import { writeOutdoorEndpoints } from "./outdoor-endpoints.ts";
import { isTailscaleUrl } from "./outdoor-tailscale.ts";
import { resolveOutdoorLanUrls } from "./outdoor-lan.ts";
import { DEFAULT_NGROK_HTTPS } from "./outdoor-ngrok.ts";
import { startLocaltunnel } from "./public-tunnels.ts";
import type { NgrokTunnel } from "./ngrok-types.ts";

const NGROK_API = "http://127.0.0.1:4040/api/tunnels";

export type LaunchOutdoorExpoOptions = {
  logPrefix: string;
  children: ChildProcess[];
  videoOpsRoot: string;
  iosTeleprompterRoot: string;
  metroPort?: number;
  agentPort?: number;
  /** When true, also starts outdoor agent (used by start:ngrok alone). */
  startAgent?: boolean;
};

function log(prefix: string, message: string): void {
  console.log(`[${prefix}] ${message}`);
}

function fail(prefix: string, message: string): never {
  console.error(`[${prefix}] ${message}`);
  Deno.exit(1);
}

function whichNgrok(): string {
  return Deno.env.get("NGROK_BIN") || "ngrok";
}

/** User authtoken lives here; project ngrok.outdoor.yml only defines tunnels. */
function defaultNgrokConfigPath(): string | null {
  const home = Deno.env.get("HOME") ?? os.homedir();
  if (!home) {
    return null;
  }
  const candidates = [
    path.join(home, "Library/Application Support/ngrok/ngrok.yml"),
    path.join(home, ".config/ngrok/ngrok.yml"),
    path.join(home, ".ngrok2/ngrok.yml"),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

function ngrokStartArgs(
  tunnelNames: string[],
  projectConfigPath: string,
): string[] {
  const args = ["start", ...tunnelNames];
  const userConfig = defaultNgrokConfigPath();
  if (userConfig) {
    args.push("--config", userConfig);
  }
  args.push("--config", projectConfigPath, "--log=stdout");
  return args;
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchTunnels(): Promise<NgrokTunnel[]> {
  const response = await fetch(NGROK_API);
  if (!response.ok) {
    throw new Error(`ngrok API ${response.status}`);
  }
  const payload = (await response.json()) as { tunnels?: NgrokTunnel[] };
  return Array.isArray(payload.tunnels) ? payload.tunnels : [];
}

function tunnelForPort(
  tunnels: NgrokTunnel[],
  port: number,
): NgrokTunnel | undefined {
  return tunnels.find((tunnel) => {
    const addr = tunnel.config?.addr ?? "";
    return addr.includes(`:${port}`) || addr === String(port);
  });
}

function detectLanIp(): string | null {
  const nets = os.networkInterfaces();
  for (const entries of Object.values(nets)) {
    for (const net of entries ?? []) {
      if (net.family === "IPv4" && !net.internal) {
        return net.address;
      }
    }
  }
  return null;
}

async function waitForTunnelUrl(
  port: number,
  timeoutMs = 20000,
): Promise<string | null> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const tunnels = await fetchTunnels();
      const tunnel = tunnelForPort(tunnels, port);
      if (tunnel?.public_url) {
        return tunnel.public_url;
      }
    } catch {
      // ngrok web UI not ready yet
    }
    await sleep(400);
  }
  return null;
}

export function toExpoDeepLink(publicUrl: string): string {
  const withoutProtocol = publicUrl.replace(/^https?:\/\//, "");
  if (withoutProtocol.includes(":")) {
    return `exp://${withoutProtocol}`;
  }
  return `exp://${withoutProtocol}:80`;
}

function writeLinkFile(
  iosTeleprompterRoot: string,
  deepLink: string,
  note: string,
): void {
  const linkFile = path.join(iosTeleprompterRoot, "outdoor-expo-link.txt");
  const body = [
    "# Outdoor Expo Go link",
    "#",
    "# On iPhone (same Wi‑Fi as Mac): Expo Go → Enter URL → paste exp:// line below",
    "# Do NOT use the agent ngrok URL here — that is pipeline API (:8788), not Metro (:8081).",
    "",
    deepLink,
    "",
    `# ${note}`,
    `# Started: ${new Date().toISOString()}`,
    "",
  ].join("\n");
  fs.writeFileSync(linkFile, body, "utf8");
}

function spawnTracked(
  children: ChildProcess[],
  command: string,
  args: string[],
  options: {
    stdio?: "inherit" | "ignore" | ("ignore" | "pipe" | "inherit")[];
    cwd?: string;
    env?: NodeJS.ProcessEnv;
  } = {},
): ChildProcess {
  const child = spawn(command, args, {
    stdio: options.stdio ?? "inherit",
    cwd: options.cwd,
    env: options.env ?? process.env,
  });
  children.push(child);
  return child;
}

async function isPortInUse(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const tester = net
      .createServer()
      .once("error", () => resolve(true))
      .once("listening", () => {
        tester.close(() => resolve(false));
      })
      .listen(port, "127.0.0.1");
  });
}

function spawnOutdoorAgent(
  children: ChildProcess[],
  videoOpsRoot: string,
  agentPort: number,
  prefix: string,
): void {
  log(prefix, `Starting outdoor agent on 0.0.0.0:${agentPort}`);
  const agent = spawnTracked(
    children,
    Deno.build.os === "windows" ? "deno.cmd" : "deno",
    [
      "task",
      "--config",
      path.join(videoOpsRoot, "outdoor_agent/deno.json"),
      "start:lan",
      "--",
      "--port",
      String(agentPort),
    ],
    { cwd: videoOpsRoot },
  );
  agent.on("exit", (code) => {
    if (code && code !== 0) {
      log(prefix, `outdoor agent exited with code ${code}`);
    }
  });
}

function startCaffeinate(children: ChildProcess[]): void {
  if (Deno.build.os === "darwin") {
    spawnTracked(children, "caffeinate", ["-dims"], { stdio: "ignore" });
  }
}

function startExpoWithHostname(
  children: ChildProcess[],
  iosTeleprompterRoot: string,
  metroPort: number,
  packagerHost: string,
  label: string,
  prefix: string,
): ChildProcess {
  log(prefix, `Starting Expo on ${label} ${packagerHost}:${metroPort}…`);
  return spawnTracked(
    children,
    Deno.build.os === "windows" ? "npx.cmd" : "npx",
    ["expo", "start", "--lan", "--port", String(metroPort)],
    {
      cwd: iosTeleprompterRoot,
      env: {
        ...process.env,
        REACT_NATIVE_PACKAGER_HOSTNAME: packagerHost,
      },
      stdio: "inherit",
    },
  );
}

function startExpoTailscale(
  children: ChildProcess[],
  iosTeleprompterRoot: string,
  metroPort: number,
  tailscaleHost: string,
  prefix: string,
): ChildProcess {
  return startExpoWithHostname(
    children,
    iosTeleprompterRoot,
    metroPort,
    tailscaleHost,
    "Tailscale",
    prefix,
  );
}

function startExpoLan(
  children: ChildProcess[],
  iosTeleprompterRoot: string,
  metroPort: number,
  prefix: string,
): ChildProcess {
  log(prefix, "Starting Expo on LAN (scan QR — same Wi‑Fi as Mac)…");
  return spawnTracked(
    children,
    Deno.build.os === "windows" ? "npx.cmd" : "npx",
    ["expo", "start", "--lan", "--port", String(metroPort)],
    { cwd: iosTeleprompterRoot, stdio: "inherit" },
  );
}

function startExpoNgrok(
  children: ChildProcess[],
  iosTeleprompterRoot: string,
  metroPort: number,
  publicUrl: string,
  prefix: string,
): ChildProcess {
  log(prefix, "Starting Expo with ngrok proxy (scan QR code below)…");
  const expoEnv = {
    ...process.env,
    EXPO_PACKAGER_PROXY_URL: publicUrl,
    RCT_METRO_PORT: String(metroPort),
  };
  return spawnTracked(
    children,
    Deno.build.os === "windows" ? "npx.cmd" : "npx",
    ["expo", "start", "--lan", "--port", String(metroPort)],
    { cwd: iosTeleprompterRoot, env: expoEnv, stdio: "inherit" },
  );
}

async function stopExistingNgrok(prefix: string): Promise<void> {
  try {
    const tunnels = await fetchTunnels();
    if (tunnels.length === 0) {
      return;
    }
    const other = tunnels[0];
    log(
      prefix,
      `Stopping ngrok (${other?.public_url ?? "?"} → ${other?.config?.addr ?? "?"})…`,
    );
  } catch {
    // ngrok API not up
  }
  if (Deno.build.os === "windows") {
    spawn("taskkill", ["/F", "/IM", "ngrok.exe"], { stdio: "ignore" });
  } else {
    spawn("pkill", ["-f", "ngrok"], { stdio: "ignore" });
  }
  await sleep(800);
}

/** Agent ngrok (reserved hostname) + optional public HTTPS tunnels for remotion/expo. */
export type OutdoorNgrokTunnels = {
  agentPublicUrl: string;
  remotionPublicUrl: string | null;
  expoPublicUrl: string | null;
};

export async function ensureOutdoorNgrokTunnels(
  children: ChildProcess[],
  videoOpsRoot: string,
  agentPort: number,
  remotionPort: number,
  metroPort: number,
  prefix: string,
): Promise<OutdoorNgrokTunnels> {
  const ngrokBin = whichNgrok();
  const configPath = path.join(videoOpsRoot, "ngrok.outdoor.yml");

  try {
    const tunnels = await fetchTunnels();
    const agent = tunnelForPort(tunnels, agentPort);
    if (agent?.public_url) {
      log(
        prefix,
        `Reusing ngrok agent → localhost:${agentPort} (${agent.public_url})`,
      );
      const remotion = tunnelForPort(tunnels, remotionPort);
      const expo = tunnelForPort(tunnels, metroPort);
      return {
        agentPublicUrl: agent.public_url,
        remotionPublicUrl:
          remotion?.public_url && remotion.public_url !== agent.public_url
            ? remotion.public_url
            : null,
        expoPublicUrl:
          expo?.public_url && expo.public_url !== agent.public_url
            ? expo.public_url
            : null,
      };
    }
    if (tunnels.length > 0) {
      await stopExistingNgrok(prefix);
    }
  } catch {
    // ngrok not running — start below
  }

  log(
    prefix,
    `Starting ngrok agent only → localhost:${agentPort} (${DEFAULT_NGROK_HTTPS})`,
  );
  log(
    prefix,
    "Free ngrok = one hostname — remotion/expo get separate public HTTPS tunnels (localtunnel)",
  );
  const ngrok = spawnTracked(
    children,
    ngrokBin,
    ngrokStartArgs(["agent"], configPath),
    { stdio: ["ignore", "pipe", "pipe"] },
  );

  ngrok.stdout?.on("data", (chunk: Uint8Array) => {
    const text = new TextDecoder().decode(chunk);
    if (text.includes("ERR_") || text.toLowerCase().includes("error")) {
      process.stderr.write(text);
    }
  });
  ngrok.stderr?.on("data", (chunk: Uint8Array) => {
    process.stderr.write(chunk);
  });
  ngrok.on("exit", (code) => {
    if (code && code !== 0) {
      fail(
        prefix,
        "ngrok exited — run: ngrok config add-authtoken <token>  (ERR_NGROK_4018 = missing/invalid authtoken in ~/Library/Application Support/ngrok/ngrok.yml)",
      );
    }
  });

  const agentPublicUrl = await waitForTunnelUrl(agentPort);
  if (!agentPublicUrl) {
    fail(
      prefix,
      "Timed out waiting for agent ngrok URL. Check: ngrok config check",
    );
  }

  let remotionPublicUrl: string | null = null;
  let expoPublicUrl: string | null = null;
  try {
    remotionPublicUrl = await startLocaltunnel(
      children,
      remotionPort,
      "remotion",
      prefix,
    );
  } catch (error) {
    log(
      prefix,
      `Remotion public tunnel failed — LAN http://<mac-ip>:${remotionPort} (${error instanceof Error ? error.message : error})`,
    );
  }
  try {
    expoPublicUrl = await startLocaltunnel(children, metroPort, "expo", prefix);
  } catch (error) {
    log(
      prefix,
      `Expo public tunnel failed — LAN exp://<mac-ip>:${metroPort} (${error instanceof Error ? error.message : error})`,
    );
  }

  return { agentPublicUrl, remotionPublicUrl, expoPublicUrl };
}

/** @deprecated Use ensureOutdoorNgrokTunnels */
export async function ensureOutdoorAgentNgrok(
  children: ChildProcess[],
  videoOpsRoot: string,
  agentPort: number,
  prefix: string,
): Promise<string> {
  const remotionPort = Number(Deno.env.get("REMOTION_PORT") || 3000);
  const metroPort = Number(
    Deno.env.get("EXPO_PORT") || Deno.env.get("RCT_METRO_PORT") || 8081,
  );
  const tunnels = await ensureOutdoorNgrokTunnels(
    children,
    videoOpsRoot,
    agentPort,
    remotionPort,
    metroPort,
    prefix,
  );
  return tunnels.agentPublicUrl;
}

async function ensureMetroNgrok(
  children: ChildProcess[],
  metroPort: number,
  prefix: string,
): Promise<string> {
  const ngrokBin = whichNgrok();

  try {
    const tunnels = await fetchTunnels();
    const metro = tunnelForPort(tunnels, metroPort);
    if (metro?.public_url) {
      log(prefix, `Reusing ngrok tunnel → localhost:${metroPort}`);
      return metro.public_url;
    }
    if (tunnels.length > 0) {
      const other = tunnels[0];
      const otherAddr = other?.config?.addr ?? "unknown";
      const otherUrl = other?.public_url ?? "unknown";
      log(
        prefix,
        `Free ngrok = one port. Was ${otherUrl} → ${otherAddr}; switching to Metro :${metroPort} for Expo.`,
      );
      log(prefix, "For pipeline API use: cd video_ops && npm run outdoor:all");
      await stopExistingNgrok(prefix);
    }
  } catch {
    // ngrok not running — start below
  }

  log(
    prefix,
    `Starting ngrok → localhost:${metroPort} (Expo only — not pipeline API)`,
  );
  const ngrok = spawnTracked(
    children,
    ngrokBin,
    ["http", String(metroPort), "--log=stdout"],
    {
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  ngrok.stdout?.on("data", (chunk: Uint8Array) => {
    const text = new TextDecoder().decode(chunk);
    if (text.includes("ERR_") || text.toLowerCase().includes("error")) {
      process.stderr.write(text);
    }
  });
  ngrok.stderr?.on("data", (chunk: Uint8Array) => {
    process.stderr.write(chunk);
  });
  ngrok.on("exit", (code) => {
    if (code && code !== 0) {
      fail(
        prefix,
        `ngrok exited with code ${code}. Run: ngrok config add-authtoken …`,
      );
    }
  });

  const publicUrl = await waitForTunnelUrl(metroPort);
  if (!publicUrl) {
    fail(
      prefix,
      "Timed out waiting for ngrok public URL. Check: ngrok config check",
    );
  }
  return publicUrl;
}

export type LaunchOutdoorExpoLanOptions = {
  logPrefix: string;
  children: ChildProcess[];
  videoOpsRoot: string;
  iosTeleprompterRoot: string;
  metroPort?: number;
  agentPublicUrl?: string;
  remotionPublicUrl?: string | null;
  expoPublicUrl?: string | null;
  tailscaleHost?: string | null;
};

/** Expo on hotspot/LAN or Tailscale. Dual URLs synced via syncOutdoorEndpoints. */
export async function launchOutdoorExpoLan(
  options: LaunchOutdoorExpoLanOptions,
): Promise<void> {
  const {
    logPrefix,
    children,
    videoOpsRoot,
    iosTeleprompterRoot,
    metroPort = Number(
      Deno.env.get("EXPO_PORT") || Deno.env.get("RCT_METRO_PORT") || 8081,
    ),
    agentPublicUrl = "http://127.0.0.1:8788",
    remotionPublicUrl = null,
    expoPublicUrl = null,
    tailscaleHost = null,
  } = options;

  const lan = resolveOutdoorLanUrls();
  const lanDeepLink = lan
    ? `exp://${lan.host}:${metroPort}`
    : `exp://127.0.0.1:${metroPort}`;
  const tailscaleDeepLink = expoPublicUrl ? toExpoDeepLink(expoPublicUrl) : null;
  const primaryDeepLink = lan ? lanDeepLink : (tailscaleDeepLink ?? lanDeepLink);

  const noteParts = [
    lan
      ? `Hotspot/LAN primary · ${lanDeepLink}`
      : null,
    tailscaleDeepLink ? `Tailscale fallback · ${tailscaleDeepLink}` : null,
    `Agent TS · ${agentPublicUrl}`,
    lan ? `Agent LAN · ${lan.agentUrl}` : null,
    `Remotion · ${remotionPublicUrl ?? (lan ? lan.remotionStudioUrl : "LAN")}`,
  ].filter(Boolean);

  writeLinkFile(iosTeleprompterRoot, primaryDeepLink, noteParts.join(" | "));

  console.log("");
  console.log("════════════════════════════════════════════════════════");
  console.log("  OUTDOOR URLS (hotspot/LAN preferred, Tailscale fallback)");
  console.log("");
  if (lan) {
    console.log(
      `  Hotspot/LAN:       ${lan.host}${lan.isHotspot ? " (iPhone hotspot)" : ""}`,
    );
    console.log(`  Agent (LAN):       ${lan.agentUrl}`);
    console.log(`  Expo (LAN):        ${lanDeepLink}  ← use when on hotspot`);
    console.log(
      `  Remotion (LAN):    ${lan.remotionStudioUrl}`,
    );
  }
  console.log(`  Tailscale host:    ${tailscaleHost ?? "(none)"}`);
  console.log(`  Agent (TS):        ${agentPublicUrl}`);
  if (tailscaleDeepLink) {
    console.log(`  Expo (TS):         ${tailscaleDeepLink}`);
  }
  console.log(
    `  Remotion (TS):     ${remotionPublicUrl ?? `http://${tailscaleHost ?? "127.0.0.1"}:3000`}`,
  );
  console.log("  Mac browser:       http://127.0.0.1:8788/");
  console.log("  iPhone → Refresh from iCloud (auto-picks fastest URL)");
  console.log("");
  console.log(
    `  Saved: ${path.relative(videoOpsRoot, path.join(iosTeleprompterRoot, "outdoor-expo-link.txt"))}`,
  );
  console.log("════════════════════════════════════════════════════════");
  console.log("");

  startCaffeinate(children);
  if (lan) {
    startExpoWithHostname(
      children,
      iosTeleprompterRoot,
      metroPort,
      lan.host,
      lan.isHotspot ? "iPhone hotspot" : "LAN",
      logPrefix,
    );
  } else if (tailscaleHost && expoPublicUrl && isTailscaleUrl(expoPublicUrl)) {
    startExpoTailscale(
      children,
      iosTeleprompterRoot,
      metroPort,
      tailscaleHost,
      logPrefix,
    );
  } else if (expoPublicUrl && !isTailscaleUrl(expoPublicUrl)) {
    startExpoNgrok(
      children,
      iosTeleprompterRoot,
      metroPort,
      expoPublicUrl,
      logPrefix,
    );
  } else {
    startExpoLan(children, iosTeleprompterRoot, metroPort, logPrefix);
  }
}

/**
 * Start ngrok (Metro only), write iCloud expo URL, then Expo dev server (shows QR).
 */
export async function launchOutdoorExpo(
  options: LaunchOutdoorExpoOptions,
): Promise<string> {
  const {
    logPrefix,
    children,
    videoOpsRoot,
    iosTeleprompterRoot,
    metroPort = Number(
      Deno.env.get("EXPO_PORT") || Deno.env.get("RCT_METRO_PORT") || 8081,
    ),
    agentPort = Number(Deno.env.get("AGENT_PORT") || 8788),
    startAgent = false,
  } = options;

  if (startAgent) {
    if (await isPortInUse(agentPort)) {
      log(logPrefix, `Outdoor agent already on :${agentPort} — reusing`);
    } else {
      spawnOutdoorAgent(children, videoOpsRoot, agentPort, logPrefix);
      await sleep(1200);
    }
  }

  const publicUrl = await ensureMetroNgrok(children, metroPort, logPrefix);
  const deepLink = toExpoDeepLink(publicUrl);
  writeLinkFile(
    iosTeleprompterRoot,
    deepLink,
    `Expo ngrok proxy: ${publicUrl} → localhost:${metroPort}`,
  );

  try {
    writeOutdoorEndpoints({
      expoPackagerUrl: publicUrl,
    });
    log(
      logPrefix,
      "Updated TurnOutdoor/outdoor-endpoints.json (expo URL only — not agent API)",
    );
  } catch {
    // iCloud folder may not exist yet
  }

  console.log("");
  console.log("════════════════════════════════════════════════════════");
  console.log("  EXPO GO — ngrok → Metro :8081 (Expo bundle only)");
  console.log("");
  console.log(`  ${deepLink}`);
  console.log("");
  console.log(
    "  Pipeline API: run npm run outdoor:all (ngrok → :8788) or same-Wi‑Fi LAN",
  );
  console.log("");
  console.log(
    `  Saved: ${path.relative(videoOpsRoot, path.join(iosTeleprompterRoot, "outdoor-expo-link.txt"))}`,
  );
  console.log("════════════════════════════════════════════════════════");
  console.log("");

  startCaffeinate(children);
  startExpoNgrok(
    children,
    iosTeleprompterRoot,
    metroPort,
    publicUrl,
    logPrefix,
  );
  return publicUrl;
}
