/**
 * Outdoor filming stack — Tailscale + hotspot/LAN (auto fastest transport).
 *
 *   npm run outdoor:all
 *
 * Dev mode: Vite outdoor UI on :8788 (HMR + source maps), agent API on :8789
 * (Vite proxies /api → agent). Remotion + Expo run in dev as before.
 * Also: caption translate :8790, VoxCPM voice clone :8791, IndexTTS :8792, Postiz via Docker.
 *
 * iPhone on tailnet:     100.x (Tailscale fallback)
 * iPhone hotspot to Mac: 172.20.10.x (preferred when available)
 */

import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
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
/** Sibling checkout used by docs/postiz-self-host-connect.md */
const DEFAULT_POSTIZ_COMPOSE_DIR = path.resolve(
  VIDEO_OPS_ROOT,
  "../postiz-docker-compose",
);
/** Public Mac/iPhone URL — Vite dev server (proxies /api). */
const UI_PORT = Number(Deno.env.get("OUTDOOR_UI_PORT") || 8788);
/** Internal agent API — not served to browsers directly in outdoor:all. */
const AGENT_INTERNAL_PORT = Number(Deno.env.get("AGENT_INTERNAL_PORT") || 8789);
const METRO_PORT = Number(
  Deno.env.get("EXPO_PORT") || Deno.env.get("RCT_METRO_PORT") || 8081,
);
const REMOTION_PORT = Number(Deno.env.get("REMOTION_PORT") || 3000);
/** animation.md dev write API sidecar — VIDEO_OPS_DEV_API_PORT in editor/remotion/src/lib/studio/videoOpsDevApi. */
const REMOTION_DEV_API_PORT = 3021;
const CAPTION_TRANSLATE_PORT = Number(Deno.env.get("CAPTION_TRANSLATE_PORT") || 8790);
const VOXCPM_PORT = Number(Deno.env.get("VOXCPM_PORT") || 8791);
const INDEX_TTS_PORT = Number(Deno.env.get("INDEX_TTS_PORT") || 8792);
const POSTIZ_PORT = Number(Deno.env.get("POSTIZ_PORT") || 4007);
/** Our own server-side calls — loopback IP avoids localhost DNS/IPv6 ambiguity. */
const POSTIZ_LOOPBACK_URL = `http://127.0.0.1:${POSTIZ_PORT}`;
/**
 * Browser origin. Must match MAIN_URL/FRONTEND_URL in postiz-docker-compose, otherwise
 * the dashboard's own POST /api/auth/login is cross-origin and dies on CORS preflight.
 */
const POSTIZ_DASHBOARD_URL =
  Deno.env.get("POSTIZ_DASHBOARD_URL")?.trim() ||
  `http://localhost:${POSTIZ_PORT}`;
const POSTIZ_API_BASE =
  Deno.env.get("POSTIZ_API_BASE")?.trim() ||
  `${POSTIZ_LOOPBACK_URL}/api/public/v1`;
const INDEX_TTS_ROOT = Deno.env.get("INDEX_TTS_ROOT")?.trim() ||
  path.join(Deno.env.get("HOME") || "", "index-tts");
const VOXCPM_ROOT = Deno.env.get("VOXCPM_ROOT")?.trim() ||
  path.join(Deno.env.get("HOME") || "", "VoxCPM");
const SKIP_VOXCPM =
  Deno.env.get("OUTDOOR_SKIP_VOXCPM") === "1" ||
  Deno.env.get("OUTDOOR_SKIP_VOXCPM") === "true";
const SKIP_INDEX_TTS =
  Deno.env.get("OUTDOOR_SKIP_INDEX_TTS") === "1" ||
  Deno.env.get("OUTDOOR_SKIP_INDEX_TTS") === "true";
const SKIP_POSTIZ =
  Deno.env.get("OUTDOOR_SKIP_POSTIZ") === "1" ||
  Deno.env.get("OUTDOOR_SKIP_POSTIZ") === "true";

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

function runCommand(
  command: string,
  args: string[],
  options: { cwd?: string } = {},
): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      stdio: ["ignore", "pipe", "pipe"],
      env: process.env,
    });
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr?.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.on("error", (error) => {
      resolve({ code: 1, stdout, stderr: error.message });
    });
    child.on("close", (code) => {
      resolve({ code: code ?? 1, stdout, stderr });
    });
  });
}

async function listeningPids(port: number): Promise<number[]> {
  const { stdout } = await runCommand("lsof", [
    "-ti",
    `tcp:${port}`,
    "-sTCP:LISTEN",
  ]);
  return [...new Set(stdout.split("\n"))]
    .map((line) => Number(line.trim()))
    .filter((pid) => Number.isInteger(pid) && pid > 0 && pid !== Deno.pid);
}

/** Reclaim a port from a previous outdoor:all run so restarts never need manual kills. */
async function freePort(port: number, label: string): Promise<void> {
  let pids = await listeningPids(port);
  if (!pids.length) {
    return;
  }
  log(`Port ${port} (${label}) held by pid ${pids.join(", ")} — killing stale session`);
  for (const signal of ["SIGTERM", "SIGKILL"] as const) {
    for (const pid of pids) {
      try {
        Deno.kill(pid, signal);
      } catch {
        // already exited between lsof and kill
      }
    }
    for (let attempt = 0; attempt < 20; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 150));
      pids = await listeningPids(port);
      if (!pids.length) {
        log(`Port ${port} (${label}) freed`);
        return;
      }
    }
  }
  log(`Port ${port} (${label}) still held by pid ${pids.join(", ")} — startup may fail`);
}

function resolvePostizComposeDir(): string | null {
  const fromEnv = Deno.env.get("POSTIZ_COMPOSE_DIR")?.trim();
  const candidates = [
    fromEnv,
    DEFAULT_POSTIZ_COMPOSE_DIR,
    path.join(VIDEO_OPS_ROOT, "postiz-docker-compose"),
  ].filter((value): value is string => Boolean(value));
  for (const dir of candidates) {
    const composePath = path.join(dir, "docker-compose.yaml");
    const altComposePath = path.join(dir, "docker-compose.yml");
    if (fs.existsSync(composePath) || fs.existsSync(altComposePath)) {
      return dir;
    }
  }
  return null;
}

/** Detached Docker stack — left running after outdoor:all exits. */
async function ensurePostiz(): Promise<"started" | "skipped" | "failed"> {
  if (SKIP_POSTIZ) {
    log("Skipping Postiz (OUTDOOR_SKIP_POSTIZ=1)");
    return "skipped";
  }
  const composeDir = resolvePostizComposeDir();
  if (!composeDir) {
    log(
      `Postiz compose not found (set POSTIZ_COMPOSE_DIR or clone next to video_ops as postiz-docker-compose)`,
    );
    return "skipped";
  }
  const docker = await runCommand("docker", ["info"]);
  if (docker.code !== 0) {
    log("Docker not running — start Docker Desktop, then re-run outdoor:all for Postiz");
    return "failed";
  }
  log(`Starting Postiz (docker compose up -d) in ${composeDir}`);
  const up = await runCommand("docker", ["compose", "up", "-d"], {
    cwd: composeDir,
  });
  if (up.code !== 0) {
    log(`Postiz docker compose failed: ${(up.stderr || up.stdout).trim()}`);
    return "failed";
  }
  // Best-effort readiness probe (image pull / Temporal can take minutes first time).
  let ready = false;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      const response = await fetch(POSTIZ_LOOPBACK_URL, {
        signal: AbortSignal.timeout(1500),
      });
      if (response.ok || response.status < 500) {
        log(`Postiz ready at ${POSTIZ_DASHBOARD_URL} (127.0.0.1:4007 redirects here)`);
        ready = true;
        break;
      }
    } catch {
      // still booting
    }
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
  if (!ready) {
    log(
      `Postiz containers started; UI may still be pulling/booting → ${POSTIZ_DASHBOARD_URL}`,
    );
  }
  // Personal LinkedIn OAuth needs a known Postiz patch (org scopes + prompt=none).
  const linkedinPatch = path.join(composeDir, "scripts", "patch-linkedin.sh");
  if (fs.existsSync(linkedinPatch)) {
    log("Applying Postiz LinkedIn personal-OAuth patch");
    const patched = await runCommand("bash", [linkedinPatch]);
    if (patched.code !== 0) {
      log(
        `LinkedIn patch warning: ${(patched.stderr || patched.stdout).trim()}`,
      );
    }
  }
  // Meta renamed Instagram scopes; stock Postiz still requests deprecated names.
  const instagramPatch = path.join(
    composeDir,
    "scripts",
    "patch-instagram-scopes.sh",
  );
  if (fs.existsSync(instagramPatch)) {
    log("Applying Postiz Instagram scope patch");
    const patched = await runCommand("bash", [instagramPatch]);
    if (patched.code !== 0) {
      log(
        `Instagram patch warning: ${(patched.stderr || patched.stdout).trim()}`,
      );
    }
  }
  // Drop deprecated Facebook Page scopes (read_insights / manage_engagement).
  const facebookPatch = path.join(
    composeDir,
    "scripts",
    "patch-facebook-scopes.sh",
  );
  if (fs.existsSync(facebookPatch)) {
    log("Applying Postiz Facebook scope patch");
    const patched = await runCommand("bash", [facebookPatch]);
    if (patched.code !== 0) {
      log(
        `Facebook patch warning: ${(patched.stderr || patched.stdout).trim()}`,
      );
    }
  }
  return "started";
}

async function ensureVoxCPM(): Promise<"ready" | "skipped" | "failed"> {
  if (SKIP_VOXCPM) {
    log("Skipping VoxCPM (OUTDOOR_SKIP_VOXCPM=1)");
    return "skipped";
  }
  const setupScript = path.join(VIDEO_OPS_ROOT, "bin/setup-voxcpm.sh");
  if (!fs.existsSync(setupScript)) {
    log("VoxCPM setup script missing — skip voice clone server");
    return "failed";
  }
  log(`Ensuring VoxCPM venv at ${VOXCPM_ROOT} (first run: pip install + HF weights on first clone)`);
  const setup = await runCommand("bash", [setupScript], { cwd: VIDEO_OPS_ROOT });
  if (setup.code !== 0) {
    log(`VoxCPM setup failed: ${(setup.stderr || setup.stdout).trim()}`);
    return "failed";
  }
  const venvPython = path.join(VOXCPM_ROOT, ".venv", "bin", "python");
  if (!fs.existsSync(venvPython)) {
    log(`VoxCPM venv python missing at ${venvPython}`);
    return "failed";
  }
  return "ready";
}

async function waitForAgentHealth(maxWaitMs = 20_000): Promise<boolean> {
  const url = `http://127.0.0.1:${AGENT_INTERNAL_PORT}/api/health`;
  const deadline = Date.now() + maxWaitMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(2000) });
      if (response.ok) {
        return true;
      }
    } catch {
      // still booting
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return false;
}

async function waitForVoxcpmHealth(maxWaitMs = 45_000): Promise<boolean> {
  const url = `http://127.0.0.1:${VOXCPM_PORT}/health`;
  const deadline = Date.now() + maxWaitMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(2000) });
      if (response.ok) {
        return true;
      }
    } catch {
      // still booting
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  return false;
}

async function voxcpmAlreadyRunning(): Promise<boolean> {
  try {
    const response = await fetch(`http://127.0.0.1:${VOXCPM_PORT}/health`, {
      signal: AbortSignal.timeout(2000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

function startVoxcpmServer(status: "ready" | "skipped" | "failed"): void {
  if (status !== "ready") {
    return;
  }
  const voxcpmPython = path.join(VOXCPM_ROOT, ".venv", "bin", "python");
  const voxcpmScript = path.join(
    VIDEO_OPS_ROOT,
    "editor/outdoor_post/voxcpm-serve-local.py",
  );
  log(
    `Starting VoxCPM voice clone on 127.0.0.1:${VOXCPM_PORT} (${voxcpmPython})`,
  );
  spawnProc(
    voxcpmPython,
    [
      voxcpmScript,
      "--serve",
      "--host",
      "127.0.0.1",
      "--port",
      String(VOXCPM_PORT),
    ],
    {
      cwd: VIDEO_OPS_ROOT,
      env: {
        VIDEO_OPS_ROOT,
        VOXCPM_ROOT,
        VOXCPM_URL: `http://127.0.0.1:${VOXCPM_PORT}`,
        VOXCPM_MODEL: Deno.env.get("VOXCPM_MODEL") || "openbmb/VoxCPM2",
        VOXCPM_DEVICE: Deno.env.get("VOXCPM_DEVICE") || "auto",
        VOXCPM_INFERENCE_TIMESTEPS: Deno.env.get("VOXCPM_INFERENCE_TIMESTEPS") || "10",
        VOXCPM_CFG_VALUE: Deno.env.get("VOXCPM_CFG_VALUE") || "2.0",
        VOXCPM_REFERENCE_MAX_SECONDS: Deno.env.get("VOXCPM_REFERENCE_MAX_SECONDS") || "0",
        VOXCPM_TEXT_CHUNK_MAX_CHARS: Deno.env.get("VOXCPM_TEXT_CHUNK_MAX_CHARS") || "0",
        HF_HUB_OFFLINE: Deno.env.get("HF_HUB_OFFLINE") || "0",
      },
    },
  );
}

async function ensureIndexTTS(): Promise<"ready" | "skipped" | "failed"> {
  if (SKIP_INDEX_TTS) {
    log("Skipping IndexTTS (OUTDOOR_SKIP_INDEX_TTS=1)");
    return "skipped";
  }
  const venvPython = path.join(INDEX_TTS_ROOT, ".venv", "bin", "python");
  const indexTtsScript = path.join(
    VIDEO_OPS_ROOT,
    "editor/outdoor_post/indextts-serve-local.py",
  );
  if (!fs.existsSync(venvPython)) {
    log(
      `IndexTTS venv python missing at ${venvPython} — install IndexTTS at ${INDEX_TTS_ROOT}`,
    );
    return "failed";
  }
  if (!fs.existsSync(indexTtsScript)) {
    log("IndexTTS serve script missing — skip IndexTTS server");
    return "failed";
  }
  const checkpoints = path.join(INDEX_TTS_ROOT, "checkpoints");
  if (!fs.existsSync(checkpoints)) {
    log(`IndexTTS checkpoints missing at ${checkpoints}`);
    return "failed";
  }
  return "ready";
}

async function waitForIndexTtsHealth(maxWaitMs = 45_000): Promise<boolean> {
  const url = `http://127.0.0.1:${INDEX_TTS_PORT}/health`;
  const deadline = Date.now() + maxWaitMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(2000) });
      if (response.ok) {
        return true;
      }
    } catch {
      // still booting
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  return false;
}

async function indexTtsAlreadyRunning(): Promise<boolean> {
  try {
    const response = await fetch(`http://127.0.0.1:${INDEX_TTS_PORT}/health`, {
      signal: AbortSignal.timeout(2000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

function startIndexTtsServer(status: "ready" | "skipped" | "failed"): void {
  if (status !== "ready") {
    return;
  }
  const indexTtsPython = path.join(INDEX_TTS_ROOT, ".venv", "bin", "python");
  const indexTtsScript = path.join(
    VIDEO_OPS_ROOT,
    "editor/outdoor_post/indextts-serve-local.py",
  );
  log(
    `Starting IndexTTS voice clone on 127.0.0.1:${INDEX_TTS_PORT} (${indexTtsPython})`,
  );
  spawnProc(
    indexTtsPython,
    [
      indexTtsScript,
      "--serve",
      "--host",
      "127.0.0.1",
      "--port",
      String(INDEX_TTS_PORT),
    ],
    {
      cwd: VIDEO_OPS_ROOT,
      env: {
        VIDEO_OPS_ROOT,
        INDEX_TTS_ROOT,
        INDEX_TTS_URL: `http://127.0.0.1:${INDEX_TTS_PORT}`,
        INDEX_TTS_DEVICE: Deno.env.get("INDEX_TTS_DEVICE") || "auto",
        INDEX_TTS_REFERENCE_MAX_SECONDS:
          Deno.env.get("INDEX_TTS_REFERENCE_MAX_SECONDS") || "12",
        HF_HUB_OFFLINE: Deno.env.get("HF_HUB_OFFLINE") || "0",
      },
    },
  );
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
Deno.env.set("POSTIZ_API_BASE", POSTIZ_API_BASE);
Deno.env.set("POSTIZ_DASHBOARD_URL", POSTIZ_DASHBOARD_URL);

// Every port this script spawns fresh: a leftover owner makes the new process exit
// (or, for :3021, restart-loop forever). VoxCPM/IndexTTS are deliberately reused to
// avoid reloading model weights, and Postiz is docker-managed, so both are excluded.
for (
  const [port, label] of [
    [UI_PORT, "outdoor UI"],
    [AGENT_INTERNAL_PORT, "outdoor agent"],
    [CAPTION_TRANSLATE_PORT, "caption translate"],
    [REMOTION_PORT, "Remotion Studio"],
    [REMOTION_DEV_API_PORT, "Remotion dev write API"],
    [METRO_PORT, "Expo/Metro"],
  ] as const
) {
  await freePort(port, label);
}

// Postiz can take minutes on first docker pull — never block agent/UI on it.
void ensurePostiz().then((status) => {
  log(`Postiz startup finished (${status})`);
});

const voxcpmStatus = await ensureVoxCPM();
const voxcpmUrl = `http://127.0.0.1:${VOXCPM_PORT}`;

if (voxcpmStatus === "ready") {
  if (await voxcpmAlreadyRunning()) {
    log(`VoxCPM already listening on ${voxcpmUrl} — reusing existing server`);
  } else {
    startVoxcpmServer(voxcpmStatus);
    const voxcpmReady = await waitForVoxcpmHealth();
    if (voxcpmReady) {
      log(`VoxCPM ready at ${voxcpmUrl} (model loads on first AI clone)`);
    } else {
      log(`VoxCPM still booting at ${voxcpmUrl} — AI clone may fail until /health responds`);
    }
  }
} else if (voxcpmStatus === "failed") {
  log(
    "VoxCPM not started — run bash bin/setup-voxcpm.sh manually or set OUTDOOR_SKIP_VOXCPM=1",
  );
}

const indexTtsStatus = await ensureIndexTTS();
const indexTtsUrl = `http://127.0.0.1:${INDEX_TTS_PORT}`;

if (indexTtsStatus === "ready") {
  if (await indexTtsAlreadyRunning()) {
    log(`IndexTTS already listening on ${indexTtsUrl} — reusing existing server`);
  } else {
    startIndexTtsServer(indexTtsStatus);
    const indexTtsReady = await waitForIndexTtsHealth();
    if (indexTtsReady) {
      log(`IndexTTS ready at ${indexTtsUrl} (model loads on first clone)`);
    } else {
      log(`IndexTTS still booting at ${indexTtsUrl} — beat editor may fail until /health responds`);
    }
  }
} else if (indexTtsStatus === "failed") {
  log(
    `IndexTTS not started — install at ${INDEX_TTS_ROOT} with checkpoints, or set OUTDOOR_SKIP_INDEX_TTS=1`,
  );
}

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
  {
    cwd: VIDEO_OPS_ROOT,
    env: {
      POSTIZ_API_BASE,
      POSTIZ_DASHBOARD_URL,
      VOXCPM_URL: voxcpmUrl,
      VOXCPM_INFERENCE_TIMESTEPS: Deno.env.get("VOXCPM_INFERENCE_TIMESTEPS") || "10",
      VOXCPM_CFG_VALUE: Deno.env.get("VOXCPM_CFG_VALUE") || "2.0",
      VOXCPM_REFERENCE_MAX_SECONDS: Deno.env.get("VOXCPM_REFERENCE_MAX_SECONDS") || "0",
      VOXCPM_TEXT_CHUNK_MAX_CHARS: Deno.env.get("VOXCPM_TEXT_CHUNK_MAX_CHARS") || "0",
      VOXCPM_SYNTHESIS_CONCURRENCY: Deno.env.get("VOXCPM_SYNTHESIS_CONCURRENCY") || "1",
      INDEX_TTS_URL: indexTtsUrl,
      INDEX_TTS_ROOT,
    },
  },
);

await new Promise((resolve) => setTimeout(resolve, 1200));

const agentReady = await waitForAgentHealth();
if (agentReady) {
  log(`Outdoor agent ready on :${AGENT_INTERNAL_PORT}`);
} else {
  log(
    `Outdoor agent did not respond on :${AGENT_INTERNAL_PORT} — UI /api calls will fail until it is up`,
  );
}

const captionTranslatePython = Deno.env.get("CAPTION_TRANSLATE_PYTHON")?.trim() ||
  path.join(INDEX_TTS_ROOT, ".venv", "bin", "python");
const captionTranslateScript = path.join(
  VIDEO_OPS_ROOT,
  "editor/outdoor_post/translate-captions-local.py",
);

log(
  `Starting offline caption translate on 127.0.0.1:${CAPTION_TRANSLATE_PORT} (${captionTranslatePython})`,
);
spawnProc(
  captionTranslatePython,
  [
    captionTranslateScript,
    "--serve",
    "--host",
    "127.0.0.1",
    "--port",
    String(CAPTION_TRANSLATE_PORT),
  ],
  {
    cwd: VIDEO_OPS_ROOT,
    env: {
      CAPTION_TRANSLATE_URL: `http://127.0.0.1:${CAPTION_TRANSLATE_PORT}`,
      HF_HUB_OFFLINE: Deno.env.get("HF_HUB_OFFLINE") || "1",
    },
  },
);

await new Promise((resolve) => setTimeout(resolve, 800));

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
console.log("OUTDOOR — Vite UI + agent + VoxCPM/IndexTTS AI clone + Remotion + Expo + Postiz");
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
console.log(
  `Caption translate (local): http://127.0.0.1:${CAPTION_TRANSLATE_PORT}/health`,
);
if (voxcpmStatus === "ready") {
  console.log(`VoxCPM voice clone (local): http://127.0.0.1:${VOXCPM_PORT}/health`);
} else {
  console.log(`VoxCPM voice clone:        skipped (${voxcpmStatus})`);
}
if (indexTtsStatus === "ready") {
  console.log(`IndexTTS voice clone (local): http://127.0.0.1:${INDEX_TTS_PORT}/health`);
} else {
  console.log(`IndexTTS voice clone:        skipped (${indexTtsStatus})`);
}
console.log(`Remotion Studio:         http://127.0.0.1:${REMOTION_PORT}/`);
console.log(
  `Postiz (EN publish):     ${POSTIZ_DASHBOARD_URL} (starting in background${SKIP_POSTIZ ? ", skipped" : ""})`,
);
console.log(`Postiz API:              ${POSTIZ_API_BASE}`);
console.log(`iCloud:                  ${OUTDOOR_ENDPOINTS_FILE}`);
console.log(
  "UI = Vite HMR · /api proxied to agent · animation.md compiled live (sync only for render/export)",
);
console.log(
  "AI clone = VoxCPM :8791 or IndexTTS :8792 (toggle Voice in beat editor; separate caches)",
);
console.log(
  "Postiz stays up after Ctrl+C (docker). Skip with OUTDOOR_SKIP_POSTIZ=1. Skip VoxCPM: OUTDOOR_SKIP_VOXCPM=1. Skip IndexTTS: OUTDOOR_SKIP_INDEX_TTS=1.",
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
