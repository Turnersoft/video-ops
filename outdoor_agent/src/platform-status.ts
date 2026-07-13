import { providerFor, SUPPORTED_PLATFORMS } from './publish/index.ts';
import {
  hasZernioApiKey,
  isZernioPlatform,
  listZernioConnectedAccounts,
  suggestedZernioAccountsJson,
  testZernioConnection,
  zernioAccountIdFor,
  zernioApiKeysUrl,
  zernioConnectGuideUrl,
  zernioDashboardUrl,
  zernioEnvDocs,
  zernioPublishMode,
  zernioSignupUrl,
  type ZernioConnectedAccount,
} from './publish/zernio.ts';
import {
  isSauPlatform,
  sauAccountName,
  sauCliPlatform,
  sauDashboardHint,
  sauEnvDocs,
  sauPublishMode,
  SAU_MANUAL_PLATFORMS,
  testSauConnection,
} from './publish/sau.ts';

export type PlatformConnectionStatus =
  | 'connected'
  | 'configured'
  | 'missing_credentials'
  | 'manual'
  | 'stub';

export type LoginLink = {
  label: string;
  url?: string;
  command?: string;
};

export type SignupStep = {
  step: number;
  title: string;
  detail: string;
  url?: string;
  command?: string;
};

export type PlatformStatus = {
  platform: string;
  provider: 'zernio' | 'social-auto-upload' | 'unknown';
  mode: 'stub' | 'live';
  status: PlatformConnectionStatus;
  accountLabel: string | null;
  accountMasked: string | null;
  envHints: string[];
  dashboardUrl: string | null;
  loginCommand: string | null;
  loginLinks: LoginLink[];
  signupUrl: string | null;
  signupSteps: SignupStep[];
  notes: string[];
};

export type ConnectProgress = {
  total: number;
  ready: number;
  missing: string[];
  manual: string[];
  stubOnly: boolean;
};

export type PlatformsHealthResponse = {
  checkedAt: string;
  connectProgress: ConnectProgress;
  providers: {
    zernio: {
      mode: 'stub' | 'live';
      hasApiKey: boolean;
      dashboardUrl: string;
      signupUrl: string;
      apiKeysUrl: string;
      connectGuideUrl: string;
      envDocs: string[];
      loginLinks: LoginLink[];
      signupSteps: SignupStep[];
      liveAccounts: ZernioConnectedAccount[];
      suggestedAccountsJson: Record<string, string> | null;
      suggestedAccountsExport: string | null;
    };
    sau: {
      mode: 'stub' | 'live';
      dashboardHint: string;
      envDocs: string[];
      loginLinks: LoginLink[];
      signupSteps: SignupStep[];
      installHint: string;
    };
  };
  platforms: PlatformStatus[];
  manualPlatforms: string[];
};

const SAU_REPO_URL = 'https://github.com/dreammis/social-auto-upload';

function maskId(value: string | null): string | null {
  if (!value) return null;
  if (value.length <= 6) return '••••';
  return `${value.slice(0, 4)}…${value.slice(-2)}`;
}

function zernioSignupSteps(): SignupStep[] {
  return [
    {
      step: 1,
      title: 'Open Zernio',
      detail: 'Sign up or log in at zernio.com.',
      url: zernioSignupUrl(),
    },
    {
      step: 2,
      title: 'Create API key',
      detail: 'Dashboard → API keys, then export ZERNIO_API_KEY on the Mac agent.',
      url: zernioApiKeysUrl(),
    },
    {
      step: 3,
      title: 'Connect English channels',
      detail: 'Connect YouTube, X, LinkedIn, Instagram, TikTok, Facebook, Bluesky, Threads, Reddit, etc.',
      url: zernioConnectGuideUrl(),
    },
    {
      step: 4,
      title: 'Sync account IDs',
      detail: 'Sync on this page → ZERNIO_ACCOUNTS_JSON, then ZERNIO_PUBLISH_MODE=live and restart.',
      url: zernioDashboardUrl(),
    },
  ];
}

function sauSignupSteps(): SignupStep[] {
  return [
    {
      step: 1,
      title: 'Install social-auto-upload',
      detail: 'Ensure `sau` is on PATH.',
      url: SAU_REPO_URL,
    },
    {
      step: 2,
      title: 'Login each China platform',
      detail: 'sau bilibili|douyin|xiaohongshu|kuaishou|tencent login --account default',
      url: SAU_REPO_URL,
    },
    {
      step: 3,
      title: 'Enable live publish',
      detail: 'export SAU_PUBLISH_MODE=live and restart outdoor agent.',
      command: 'export SAU_ACCOUNT=default\nexport SAU_PUBLISH_MODE=live',
    },
  ];
}

function zernioLoginLinks(): LoginLink[] {
  return [
    { label: 'Open Zernio', url: zernioDashboardUrl() },
    { label: 'API keys', url: zernioApiKeysUrl() },
    { label: 'Connect accounts guide', url: zernioConnectGuideUrl() },
    {
      label: 'Copy env template',
      command:
        'export ZERNIO_API_KEY=…\nexport ZERNIO_ACCOUNTS_JSON=\'{"youtube":"acc_…","x":"acc_…"}\'\nexport ZERNIO_PUBLISH_MODE=live',
    },
  ];
}

function sauLoginLinks(): LoginLink[] {
  return [
    { label: 'SAU GitHub', url: SAU_REPO_URL },
    {
      label: 'Copy all SAU logins',
      command: [
        'sau bilibili login --account default',
        'sau douyin login --account default',
        'sau xiaohongshu login --account default',
        'sau kuaishou login --account default',
        'sau tencent login --account default',
        'export SAU_PUBLISH_MODE=live',
      ].join('\n'),
    },
  ];
}

function zernioPlatformStatus(
  platform: string,
  liveByOutdoor: Map<string, ZernioConnectedAccount>,
): PlatformStatus {
  const mode = zernioPublishMode();
  const envId = zernioAccountIdFor(platform);
  const live = liveByOutdoor.get(platform) ?? null;
  const accountId = envId ?? live?.id ?? null;
  const hasKey = hasZernioApiKey();
  const notes: string[] = [];
  let status: PlatformConnectionStatus;

  if (live && envId) {
    status = 'connected';
    notes.push(`Live in Zernio as ${live.username ?? live.id}`);
  } else if (live && !envId) {
    status = 'configured';
    notes.push(`Connected in Zernio (${live.username ?? live.id}) — Sync into ZERNIO_ACCOUNTS_JSON`);
  } else if (mode === 'stub') {
    status = 'stub';
    notes.push('Connect in Zernio, then set ZERNIO_PUBLISH_MODE=live');
  } else if (!hasKey) {
    status = 'missing_credentials';
    notes.push('Set ZERNIO_API_KEY on the Mac agent');
  } else if (!accountId) {
    status = 'missing_credentials';
    notes.push(`Connect ${platform} in Zernio, then Sync`);
  } else {
    status = 'configured';
    notes.push('Account id present — Test connection to verify');
  }

  return {
    platform,
    provider: 'zernio',
    mode,
    status,
    accountLabel: accountId ? (live?.username ?? 'Zernio account') : null,
    accountMasked: maskId(accountId),
    envHints: ['ZERNIO_API_KEY', `ZERNIO_ACCOUNTS_JSON["${platform}"]`, 'ZERNIO_PUBLISH_MODE'],
    dashboardUrl: zernioDashboardUrl(),
    loginCommand: null,
    loginLinks: [
      { label: 'Dashboard', url: zernioDashboardUrl() },
      { label: 'Connect guide', url: zernioConnectGuideUrl() },
    ],
    signupUrl: zernioSignupUrl(),
    signupSteps: [
      {
        step: 1,
        title: `Connect ${platform} in Zernio`,
        detail: 'Complete OAuth for this channel in Zernio.',
        url: zernioConnectGuideUrl(),
      },
    ],
    notes,
  };
}

function sauPlatformStatus(platform: string): PlatformStatus {
  const mode = sauPublishMode();
  const cli = sauCliPlatform(platform);
  if (!cli) {
    return {
      platform,
      provider: 'social-auto-upload',
      mode,
      status: 'manual',
      accountLabel: null,
      accountMasked: null,
      envHints: sauEnvDocs(),
      dashboardUrl: null,
      loginCommand: null,
      loginLinks: [{ label: 'SAU GitHub', url: SAU_REPO_URL }],
      signupUrl: null,
      signupSteps: [{ step: 1, title: 'Manual publish', detail: `${platform} is not automated via SAU.` }],
      notes: [`${platform} is manual-only`],
    };
  }
  const account = sauAccountName(platform);
  const loginCommand = `sau ${cli} login --account ${account}`;
  return {
    platform,
    provider: 'social-auto-upload',
    mode,
    status: mode === 'stub' ? 'stub' : 'configured',
    accountLabel: `SAU account (${account})`,
    accountMasked: account,
    envHints: ['SAU_BIN', 'SAU_ACCOUNT', 'SAU_PUBLISH_MODE'],
    dashboardUrl: null,
    loginCommand,
    loginLinks: [
      { label: 'SAU GitHub', url: SAU_REPO_URL },
      { label: 'Copy login', command: loginCommand },
    ],
    signupUrl: SAU_REPO_URL,
    signupSteps: [
      { step: 1, title: `Login ${platform}`, detail: 'Run on Mac, complete QR/browser login.', command: loginCommand },
    ],
    notes: [mode === 'stub' ? 'Run login, then SAU_PUBLISH_MODE=live' : `CLI: ${loginCommand}`],
  };
}

function buildConnectProgress(platforms: PlatformStatus[]): ConnectProgress {
  const actionable = platforms.filter((entry) => entry.status !== 'manual');
  const ready = actionable.filter(
    (entry) => entry.status === 'connected' || entry.status === 'configured',
  );
  const missing = actionable
    .filter((entry) => entry.status === 'missing_credentials' || entry.status === 'stub')
    .map((entry) => entry.platform);
  const manual = platforms.filter((entry) => entry.status === 'manual').map((entry) => entry.platform);
  const stubOnly = actionable.length > 0 && actionable.every((entry) => entry.mode === 'stub');
  return { total: actionable.length, ready: ready.length, missing, manual, stubOnly };
}

export async function buildPlatformsHealth(): Promise<PlatformsHealthResponse> {
  let liveAccounts: ZernioConnectedAccount[] = [];
  let suggested: Record<string, string> | null = null;
  if (hasZernioApiKey()) {
    try {
      liveAccounts = await listZernioConnectedAccounts();
      suggested = suggestedZernioAccountsJson(liveAccounts);
    } catch (error) {
      console.warn('[platforms] Zernio accounts:', error instanceof Error ? error.message : error);
    }
  }
  const liveByOutdoor = new Map<string, ZernioConnectedAccount>();
  for (const entry of liveAccounts) {
    if (entry.outdoorPlatform && !liveByOutdoor.has(entry.outdoorPlatform)) {
      liveByOutdoor.set(entry.outdoorPlatform, entry);
    }
  }

  const platforms: PlatformStatus[] = [];
  for (const platform of SUPPORTED_PLATFORMS) {
    if (isZernioPlatform(platform)) {
      if (platform === 'twitter') continue;
      platforms.push(zernioPlatformStatus(platform, liveByOutdoor));
    } else if (isSauPlatform(platform)) {
      platforms.push(sauPlatformStatus(platform));
    }
  }
  for (const platform of SAU_MANUAL_PLATFORMS) {
    if (!platforms.some((entry) => entry.platform === platform)) {
      platforms.push(sauPlatformStatus(platform));
    }
  }

  return {
    checkedAt: new Date().toISOString(),
    connectProgress: buildConnectProgress(platforms),
    providers: {
      zernio: {
        mode: zernioPublishMode(),
        hasApiKey: hasZernioApiKey(),
        dashboardUrl: zernioDashboardUrl(),
        signupUrl: zernioSignupUrl(),
        apiKeysUrl: zernioApiKeysUrl(),
        connectGuideUrl: zernioConnectGuideUrl(),
        envDocs: zernioEnvDocs(),
        loginLinks: zernioLoginLinks(),
        signupSteps: zernioSignupSteps(),
        liveAccounts,
        suggestedAccountsJson: suggested && Object.keys(suggested).length ? suggested : null,
        suggestedAccountsExport: suggested && Object.keys(suggested).length
          ? `export ZERNIO_ACCOUNTS_JSON='${JSON.stringify(suggested)}'`
          : null,
      },
      sau: {
        mode: sauPublishMode(),
        dashboardHint: sauDashboardHint(),
        envDocs: sauEnvDocs(),
        loginLinks: sauLoginLinks(),
        signupSteps: sauSignupSteps(),
        installHint: 'sau via ~/.local/bin — login China platforms, then SAU_PUBLISH_MODE=live.',
      },
    },
    platforms,
    manualPlatforms: SAU_MANUAL_PLATFORMS,
  };
}

export async function syncZernioAccountsSuggestion(): Promise<{
  accounts: ZernioConnectedAccount[];
  suggestedAccountsJson: Record<string, string>;
  exportCommand: string;
}> {
  if (!hasZernioApiKey()) {
    throw new Error('ZERNIO_API_KEY is not set — create a key in Zernio Dashboard → API keys');
  }
  const accounts = await listZernioConnectedAccounts();
  const suggestedAccountsJson = suggestedZernioAccountsJson(accounts);
  if (!Object.keys(suggestedAccountsJson).length) {
    throw new Error('No connected Zernio accounts — connect platforms in the Zernio dashboard first');
  }
  return {
    accounts,
    suggestedAccountsJson,
    exportCommand:
      `export ZERNIO_ACCOUNTS_JSON='${JSON.stringify(suggestedAccountsJson)}'\nexport ZERNIO_PUBLISH_MODE=live`,
  };
}

export async function testPlatformConnection(platform: string): Promise<{
  platform: string;
  provider: string | null;
  ok: boolean;
  message: string;
}> {
  const provider = providerFor(platform);
  if (isZernioPlatform(platform)) {
    const result = await testZernioConnection();
    return { platform, provider, ...result };
  }
  if (isSauPlatform(platform) || SAU_MANUAL_PLATFORMS.includes(platform)) {
    if (SAU_MANUAL_PLATFORMS.includes(platform)) {
      return { platform, provider: 'social-auto-upload', ok: false, message: `${platform} is manual-only` };
    }
    const result = await testSauConnection();
    return { platform, provider, ...result };
  }
  return { platform, provider, ok: false, message: `Unsupported platform: ${platform}` };
}

export async function testProviderConnection(provider: 'zernio' | 'sau'): Promise<{
  provider: string;
  ok: boolean;
  message: string;
}> {
  if (provider === 'zernio') {
    const result = await testZernioConnection();
    return { provider, ...result };
  }
  const result = await testSauConnection();
  return { provider: 'social-auto-upload', ...result };
}
