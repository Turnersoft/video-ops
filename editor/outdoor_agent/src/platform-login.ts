import { homedir } from 'node:os';
import path from 'node:path';

import { fileExists } from './fs_util.ts';
import { AGENT_ROOT, ensureDir } from './paths.ts';
import {
  getPostizConnectUrl,
  isPostizPlatform,
  listPostizIntegrations,
} from './publish/postiz.ts';
import {
  checkSauPlatformLogin,
  isSauPlatform,
  sauAccountName,
  sauBin,
  sauCliPlatform,
  sauCookiePath,
  sauRepoRoot,
} from './publish/sau.ts';

export type PlatformLoginKind = 'qr' | 'portal' | 'browser';
export type PlatformLoginStatus =
  | 'starting'
  | 'waiting_scan'
  | 'waiting_portal'
  | 'succeeded'
  | 'failed'
  | 'cancelled';

export type PlatformLoginSession = {
  platform: string;
  provider: 'postiz' | 'social-auto-upload';
  kind: PlatformLoginKind;
  status: PlatformLoginStatus;
  message: string;
  qrImageUrl: string | null;
  portalUrl: string | null;
  startedAt: string;
  updatedAt: string;
};

type LoginRuntime = {
  session: PlatformLoginSession;
  child?: Deno.ChildProcess;
  qrPath?: string;
  extraQrDirs: string[];
  cookieStem?: string;
  pollTimer?: number;
};

const LOGIN_DIR = path.join(AGENT_ROOT, 'data', 'platform-login');
const runtimes = new Map<string, LoginRuntime>();

const WECHAT_MP_LOGIN_URL = 'https://mp.weixin.qq.com';

export function loginKindForPlatform(platform: string): PlatformLoginKind | null {
  if (platform === 'wechat') {
    return 'portal';
  }
  if (isPostizPlatform(platform) && platform !== 'twitter') {
    return 'portal';
  }
  if (isSauPlatform(platform)) {
    return 'qr';
  }
  return null;
}

export function getPlatformLogin(platform: string): PlatformLoginSession | null {
  return runtimes.get(platform)?.session ?? null;
}

export function platformLoginQrPath(platform: string): string | null {
  const runtime = runtimes.get(platform);
  if (!runtime?.qrPath || !fileExists(runtime.qrPath)) {
    return null;
  }
  if (!isAllowedQrPath(runtime.qrPath)) {
    return null;
  }
  return runtime.qrPath;
}

export function findNewestLoginQrcode(
  dirs: string[],
  cookieStem?: string,
): string | null {
  let newest: { path: string; mtime: number } | null = null;
  for (const dir of dirs) {
    if (!fileExists(dir)) {
      continue;
    }
    for (const entry of Deno.readDirSync(dir)) {
      if (!entry.isFile || !entry.name.endsWith('.png')) {
        continue;
      }
      const lower = entry.name.toLowerCase();
      const looksLikeQr =
        lower.includes('qrcode') || lower === 'qrcode.png';
      if (!looksLikeQr) {
        continue;
      }
      if (cookieStem && !lower.startsWith(cookieStem.toLowerCase()) && lower !== 'qrcode.png') {
        continue;
      }
      const fullPath = path.join(dir, entry.name);
      const mtime = Deno.statSync(fullPath).mtime?.getTime() ?? 0;
      if (!newest || mtime > newest.mtime) {
        newest = { path: fullPath, mtime };
      }
    }
  }
  return newest?.path ?? null;
}

export async function startPlatformLogin(
  platform: string,
): Promise<PlatformLoginSession> {
  const kind = loginKindForPlatform(platform);
  if (!kind) {
    throw new Error(`${platform} has no in-app login (manual publish only)`);
  }

  const existing = runtimes.get(platform);
  if (existing && isActiveStatus(existing.session.status)) {
    return existing.session;
  }
  if (existing) {
    stopRuntime(platform);
  }

  if (platform === 'wechat') {
    return startManualPortalLogin(
      platform,
      WECHAT_MP_LOGIN_URL,
      'Log in to 微信公众号 in the portal. Publishing stays manual.',
    );
  }
  if (kind === 'portal') {
    return startPostizLogin(platform);
  }
  return startSauLogin(platform);
}

export function cancelPlatformLogin(platform: string): PlatformLoginSession | null {
  const runtime = runtimes.get(platform);
  if (!runtime) {
    return null;
  }
  finishSession(runtime, 'cancelled', 'Login cancelled');
  stopRuntime(platform, runtime.session);
  return runtime.session;
}

function isActiveStatus(status: PlatformLoginStatus): boolean {
  return (
    status === 'starting' ||
    status === 'waiting_scan' ||
    status === 'waiting_portal'
  );
}

function nowIso(): string {
  return new Date().toISOString();
}

function qrApiPath(platform: string): string {
  return `/api/platforms/${encodeURIComponent(platform)}/login/qr`;
}

function isAllowedQrPath(filePath: string): boolean {
  const resolved = path.resolve(filePath);
  const roots = [
    path.resolve(path.join(sauRepoRoot(), 'cookies')),
    path.resolve(LOGIN_DIR),
  ];
  return roots.some((root) => resolved === root || resolved.startsWith(`${root}${path.sep}`));
}

function startManualPortalLogin(
  platform: string,
  portalUrl: string,
  message: string,
): PlatformLoginSession {
  const session: PlatformLoginSession = {
    platform,
    provider: 'social-auto-upload',
    kind: 'portal',
    status: 'waiting_portal',
    message,
    qrImageUrl: null,
    portalUrl,
    startedAt: nowIso(),
    updatedAt: nowIso(),
  };
  runtimes.set(platform, { session, extraQrDirs: [] });
  return session;
}

async function startPostizLogin(platform: string): Promise<PlatformLoginSession> {
  const connect = await getPostizConnectUrl(platform);
  const session: PlatformLoginSession = {
    platform,
    provider: 'postiz',
    kind: 'portal',
    status: 'waiting_portal',
    message: 'Complete OAuth in the portal. This page detects the channel when you finish.',
    qrImageUrl: null,
    portalUrl: connect.url,
    startedAt: nowIso(),
    updatedAt: nowIso(),
  };
  const runtime: LoginRuntime = { session, extraQrDirs: [] };
  runtimes.set(platform, runtime);
  runtime.pollTimer = setInterval(() => {
    void refreshPostizLogin(platform);
  }, 2500);
  return session;
}

async function refreshPostizLogin(platform: string): Promise<void> {
  const runtime = runtimes.get(platform);
  if (!runtime || runtime.session.status !== 'waiting_portal') {
    return;
  }
  try {
    const integrations = await listPostizIntegrations();
    const connected = integrations.some(
      (entry) => entry.outdoorPlatform === platform,
    );
    if (connected) {
      finishSession(
        runtime,
        'succeeded',
        'Channel connected in Postiz. Press Sync on Platforms if the board still shows offline.',
      );
      stopRuntime(platform, runtime.session);
    }
  } catch (error) {
    runtime.session.message =
      error instanceof Error ? error.message : String(error);
    runtime.session.updatedAt = nowIso();
  }
}

async function startSauLogin(platform: string): Promise<PlatformLoginSession> {
  const cli = sauCliPlatform(platform);
  if (!cli) {
    throw new Error(`${platform} has no SAU login`);
  }
  const account = sauAccountName(platform);
  const cookieFile = sauCookiePath(platform);
  const cookieDir = cookieFile ? path.dirname(cookieFile) : path.join(sauRepoRoot(), 'cookies');
  const workDir = path.join(LOGIN_DIR, platform);
  ensureDir(cookieDir);
  ensureDir(workDir);

  const session: PlatformLoginSession = {
    platform,
    provider: 'social-auto-upload',
    kind: 'qr',
    status: 'starting',
    message: `Starting ${cli} login for account ${account}…`,
    qrImageUrl: null,
    portalUrl: null,
    startedAt: nowIso(),
    updatedAt: nowIso(),
  };
  const runtime: LoginRuntime = {
    session,
    extraQrDirs: [cookieDir, workDir],
    cookieStem: cookieFile
      ? path.basename(cookieFile, path.extname(cookieFile))
      : undefined,
  };
  runtimes.set(platform, runtime);

  try {
    runtime.child = spawnSauLogin(cli, account, cookieFile, workDir);
  } catch (error) {
    finishSession(
      runtime,
      'failed',
      error instanceof Error ? error.message : String(error),
    );
    return session;
  }

  runtime.pollTimer = setInterval(() => {
    refreshSauQr(platform);
  }, 1000);
  void runtime.child.status.then((status) => {
    void onSauLoginExit(platform, status.code ?? 1);
  });
  return session;
}

function spawnSauLogin(
  cli: string,
  account: string,
  cookieFile: string | null,
  workDir: string,
): Deno.ChildProcess {
  if (cli === 'bilibili') {
    const biliup = findBiliupBinary();
    if (!biliup) {
      throw new Error(
        'biliup is not installed yet. Wait for `sau bilibili login` to fetch it once, or install social-auto-upload tools.',
      );
    }
    if (!cookieFile) {
      throw new Error('Bilibili cookie path is missing');
    }
    const child = new Deno.Command(biliup, {
      args: ['-u', cookieFile, 'login'],
      cwd: workDir,
      stdout: 'piped',
      stderr: 'piped',
      env: Deno.env.toObject(),
    }).spawn();
    void drainStream(child.stdout);
    void drainStream(child.stderr);
    return child;
  }

  const child = new Deno.Command(sauBin(), {
    args: [cli, 'login', '--account', account, '--headless'],
    cwd: sauRepoRoot(),
    stdout: 'piped',
    stderr: 'piped',
    env: Deno.env.toObject(),
  }).spawn();
  void drainStream(child.stdout);
  void drainStream(child.stderr);
  return child;
}

function findBiliupBinary(): string | null {
  const home = homedir();
  const arch = Deno.build.arch === 'x86_64' ? 'x86_64' : 'aarch64';
  const candidates = [
    path.join(home, '.social-auto-upload', 'tools', 'biliup', `macos-${arch}`, 'biliup'),
    path.join(home, '.social-auto-upload', 'tools', 'biliup', 'macos-aarch64', 'biliup'),
    path.join(home, '.social-auto-upload', 'tools', 'biliup', 'macos-x86_64', 'biliup'),
  ];
  for (const candidate of candidates) {
    if (fileExists(candidate)) {
      return candidate;
    }
  }
  return null;
}

function refreshSauQr(platform: string): void {
  const runtime = runtimes.get(platform);
  if (!runtime || !isActiveStatus(runtime.session.status)) {
    return;
  }
  const qrPath = findNewestLoginQrcode(runtime.extraQrDirs, runtime.cookieStem);
  if (!qrPath) {
    return;
  }
  runtime.qrPath = qrPath;
  runtime.session.kind = 'qr';
  runtime.session.status = 'waiting_scan';
  runtime.session.qrImageUrl = qrApiPath(platform);
  runtime.session.message = 'Scan this QR with the platform app. It refreshes if the code expires.';
  runtime.session.updatedAt = nowIso();
}

async function onSauLoginExit(platform: string, code: number): Promise<void> {
  const runtime = runtimes.get(platform);
  if (!runtime || runtime.session.status === 'cancelled') {
    return;
  }
  if (code === 0) {
    const check = await checkSauPlatformLogin(platform);
    finishSession(
      runtime,
      check.valid ? 'succeeded' : 'failed',
      check.valid ? 'Login saved. Platform is ready.' : check.message,
    );
  } else {
    finishSession(
      runtime,
      'failed',
      `Login process exited ${code}. Try again from this page.`,
    );
  }
  stopRuntime(platform, runtime.session);
}

function finishSession(
  runtime: LoginRuntime,
  status: PlatformLoginStatus,
  message: string,
): void {
  runtime.session.status = status;
  runtime.session.message = message;
  runtime.session.updatedAt = nowIso();
  if (status !== 'waiting_scan') {
    // Keep last QR visible after success/fail so the user can see what happened.
  }
}

function stopRuntime(platform: string, keepSession?: PlatformLoginSession): void {
  const runtime = runtimes.get(platform);
  if (!runtime) {
    return;
  }
  if (runtime.pollTimer !== undefined) {
    clearInterval(runtime.pollTimer);
    runtime.pollTimer = undefined;
  }
  if (runtime.child) {
    try {
      runtime.child.kill('SIGTERM');
    } catch {
      // already exited
    }
    runtime.child = undefined;
  }
  if (keepSession) {
    runtimes.set(platform, {
      session: keepSession,
      qrPath: runtime.qrPath,
      extraQrDirs: runtime.extraQrDirs,
      cookieStem: runtime.cookieStem,
    });
    return;
  }
  runtimes.delete(platform);
}

async function drainStream(
  stream: ReadableStream<Uint8Array> | null,
): Promise<void> {
  if (!stream) {
    return;
  }
  const reader = stream.getReader();
  try {
    while (true) {
      const { done } = await reader.read();
      if (done) {
        break;
      }
    }
  } finally {
    reader.releaseLock();
  }
}
