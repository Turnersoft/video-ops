import { providerFor, SUPPORTED_PLATFORMS } from './publish/index.ts';
import {
  hasPostizApiKey,
  isPostizPlatform,
  listPostizIntegrations,
  postizApiKeysUrl,
  postizDashboardUrl,
  postizDocsUrl,
  postizEnvDocs,
  postizIntegrationIdFor,
  postizPublishMode,
  postizSignupUrl,
  suggestedPostizIntegrationTypesJson,
  suggestedPostizIntegrationsJson,
  testPostizConnection,
  type PostizConnectedIntegration,
} from './publish/postiz.ts';
import {
  checkSauPlatformLogin,
  isSauPlatform,
  sauAccountName,
  sauCliPlatform,
  sauDashboardHint,
  sauEnvDocs,
  sauPublishMode,
  SAU_MANUAL_PLATFORMS,
  testSauConnection,
  testSauPlatformConnection,
  type SauLoginCheck,
} from './publish/sau.ts';
import { loginKindForPlatform } from './platform-login.ts';
import {
  applyPublishCredentials,
  loadPublishCredentials,
  savePublishCredentials,
} from './publish-credentials.ts';

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
  provider: 'postiz' | 'social-auto-upload' | 'unknown';
  mode: 'stub' | 'live';
  status: PlatformConnectionStatus;
  accountLabel: string | null;
  accountMasked: string | null;
  envHints: string[];
  dashboardUrl: string | null;
  loginCommand: string | null;
  loginKind: 'qr' | 'portal' | 'browser' | null;
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
    postiz: {
      mode: 'stub' | 'live';
      hasApiKey: boolean;
      dashboardUrl: string;
      signupUrl?: string;
      apiKeysUrl?: string;
      connectGuideUrl?: string;
      envDocs: string[];
      loginLinks?: LoginLink[];
      signupSteps?: SignupStep[];
      liveIntegrations: PostizConnectedIntegration[];
      suggestedIntegrationsJson: Record<string, string> | null;
      suggestedIntegrationsExport: string | null;
    };
    sau: {
      mode: 'stub' | 'live';
      dashboardHint: string;
      installHint?: string;
      envDocs: string[];
      loginLinks?: LoginLink[];
      signupSteps?: SignupStep[];
    };
  };
  platforms: PlatformStatus[];
  manualPlatforms: string[];
};

const SAU_REPO_URL = 'https://github.com/dreammis/social-auto-upload';
const POSTIZ_CONNECT_GUIDE =
  'https://docs.postiz.com/providers/overview';

function maskId(value: string | null): string | null {
  if (!value) return null;
  if (value.length <= 6) return '••••';
  return `${value.slice(0, 4)}…${value.slice(-2)}`;
}

function postizSignupSteps(): SignupStep[] {
  return [
    {
      step: 1,
      title: 'Start local Postiz',
      detail:
        'Docker: cd ~/Documents/company/postiz-docker-compose && docker compose up -d → http://localhost:4007',
      url: 'http://localhost:4007',
    },
    {
      step: 2,
      title: 'Create Postiz account + API key',
      detail:
        'Sign up in the local UI → Settings → Developers → Public API. Paste the key into outdoor #/platforms.',
      url: postizApiKeysUrl(),
    },
    {
      step: 3,
      title: 'Add provider OAuth apps',
      detail:
        'Create developer apps (YouTube, X, Meta, …), put CLIENT_ID/SECRET into postiz-docker-compose env, docker compose down && up.',
      url: POSTIZ_CONNECT_GUIDE,
    },
    {
      step: 4,
      title: 'Connect channels + Sync',
      detail:
        'In Postiz UI connect each channel (OAuth). Then Sync on this page — integration IDs save and Postiz goes live.',
      url: postizDashboardUrl(),
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
      detail:
        'Use Login on this page or Mass publish — the QR appears in the UI. No terminal needed.',
      url: SAU_REPO_URL,
    },
    {
      step: 3,
      title: 'Enable live publish',
      detail: 'After QR logins, toggle SAU live on this page (Save credentials).',
      command: 'sau bilibili login --account default',
    },
  ];
}

function postizLoginLinks(): LoginLink[] {
  return [
    { label: 'Open Postiz', url: postizDashboardUrl() },
    { label: 'API keys', url: postizApiKeysUrl() },
    { label: 'Provider docs', url: POSTIZ_CONNECT_GUIDE },
    { label: 'Public API docs', url: postizDocsUrl() },
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
      ].join('\n'),
    },
  ];
}

function postizPlatformStatus(
  platform: string,
  liveByOutdoor: Map<string, PostizConnectedIntegration>,
): PlatformStatus {
  const mode = postizPublishMode();
  const envId = postizIntegrationIdFor(platform);
  const live = liveByOutdoor.get(platform) ?? null;
  const accountId = envId ?? live?.id ?? null;
  const hasKey = hasPostizApiKey();
  const notes: string[] = [];
  let status: PlatformConnectionStatus;

  if (live && envId) {
    status = 'connected';
    notes.push(`Live in Postiz as ${live.name ?? live.id}`);
  } else if (live && !envId) {
    status = 'configured';
    notes.push(
      `Connected in Postiz (${live.name ?? live.id}) — Sync into POSTIZ_INTEGRATIONS_JSON`,
    );
  } else if (!hasKey) {
    status = 'missing_credentials';
    notes.push('Set POSTIZ_API_KEY on the Mac agent');
  } else if (!live) {
    status = 'missing_credentials';
    notes.push(
      envId
        ? `Saved channel id is not connected in Postiz — reconnect ${platform}`
        : `Connect ${platform} through this page, then Sync`,
    );
  } else {
    status = 'configured';
    notes.push('Connected channel needs Sync before project publishing');
  }
  if (live && mode === 'stub') {
    notes.push('Connected, but publishing is disabled until Postiz mode is live');
  }

  return {
    platform,
    provider: 'postiz',
    mode,
    status,
    accountLabel: accountId ? (live?.name ?? 'Postiz channel') : null,
    accountMasked: maskId(accountId),
    envHints: [
      'POSTIZ_API_KEY',
      `POSTIZ_INTEGRATIONS_JSON["${platform}"]`,
      'POSTIZ_PUBLISH_MODE',
    ],
    dashboardUrl: postizDashboardUrl(),
    loginCommand: null,
    loginKind: loginKindForPlatform(platform),
    loginLinks: [
      { label: 'Dashboard', url: postizDashboardUrl() },
      { label: 'Provider docs', url: `${POSTIZ_CONNECT_GUIDE}` },
    ],
    signupUrl: postizSignupUrl(),
    signupSteps: [
      {
        step: 1,
        title: `Connect ${platform} in Postiz`,
        detail: 'Complete OAuth for this channel in the local Postiz UI.',
        url: postizDashboardUrl(),
      },
    ],
    notes,
  };
}

function sauPlatformStatus(
  platform: string,
  login?: SauLoginCheck,
): PlatformStatus {
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
      loginKind: loginKindForPlatform(platform),
      loginLinks: [{ label: 'SAU GitHub', url: SAU_REPO_URL }],
      signupUrl: null,
      signupSteps: [
        {
          step: 1,
          title: platform === 'wechat' ? 'Login 微信公众号' : 'Manual publish',
          detail: platform === 'wechat'
            ? 'Press Login and sign in at mp.weixin.qq.com. Publishing stays manual.'
            : `${platform} is not automated via SAU.`,
        },
      ],
      notes: platform === 'wechat'
        ? ['Login opens 微信公众号. Publishing stays manual.']
        : [`${platform} is manual-only`],
    };
  }
  const account = sauAccountName(platform);
  const loginCommand = `sau ${cli} login --account ${account}`;
  const loggedIn = login?.valid === true;
  const accountLabel = loggedIn ? (login?.accountName ?? 'Logged in') : null;
  let status: PlatformConnectionStatus;
  if (!loggedIn) {
    status = 'missing_credentials';
  } else if (mode === 'live') {
    status = 'connected';
  } else {
    status = 'configured';
  }
  const notes: string[] = [];
  if (!loggedIn) {
    notes.push(login?.message ?? 'Login expired or missing — use Login on this page');
    notes.push('QR appears here. You do not need the SAU CLI.');
  } else if (mode === 'stub') {
    notes.push(`Logged in as ${accountLabel} — toggle SAU live on this page to publish`);
  } else {
    notes.push(`Ready to publish as ${accountLabel}`);
  }
  return {
    platform,
    provider: 'social-auto-upload',
    mode,
    status,
    accountLabel,
    accountMasked: accountLabel,
    envHints: ['SAU_BIN', 'SAU_ACCOUNT', 'SAU_PUBLISH_MODE'],
    dashboardUrl: null,
    loginCommand,
    loginKind: loginKindForPlatform(platform),
    loginLinks: [
      { label: 'SAU GitHub', url: SAU_REPO_URL },
    ],
    signupUrl: SAU_REPO_URL,
    signupSteps: [
      {
        step: 1,
        title: `Login ${platform}`,
        detail: 'Press Login on this page and scan the QR.',
      },
    ],
    notes,
  };
}

function buildConnectProgress(platforms: PlatformStatus[]): ConnectProgress {
  const actionable = platforms.filter((entry) => entry.status !== 'manual');
  const ready = actionable.filter(
    (entry) =>
      entry.status === 'connected' ||
      (entry.provider === 'social-auto-upload' &&
        entry.status === 'configured'),
  );
  const missing = actionable
    .filter(
      (entry) =>
        entry.status === 'missing_credentials' || entry.status === 'stub',
    )
    .map((entry) => entry.platform);
  const manual = platforms
    .filter((entry) => entry.status === 'manual')
    .map((entry) => entry.platform);
  const stubOnly =
    actionable.length > 0 && actionable.every((entry) => entry.mode === 'stub');
  return {
    total: actionable.length,
    ready: ready.length,
    missing,
    manual,
    stubOnly,
  };
}

export async function buildPlatformsHealth(): Promise<PlatformsHealthResponse> {
  await ensurePostizIntegrationsSynced();
  let liveIntegrations: PostizConnectedIntegration[] = [];
  let suggested: Record<string, string> | null = null;
  if (hasPostizApiKey()) {
    try {
      liveIntegrations = await listPostizIntegrations();
      suggested = suggestedPostizIntegrationsJson(liveIntegrations);
    } catch (error) {
      console.warn(
        '[platforms] Postiz integrations:',
        error instanceof Error ? error.message : error,
      );
    }
  }
  const liveByOutdoor = new Map<string, PostizConnectedIntegration>();
  for (const entry of liveIntegrations) {
    if (
      entry.outdoorPlatform &&
      (!liveByOutdoor.has(entry.outdoorPlatform) ||
        postizIntegrationIdFor(entry.outdoorPlatform) === entry.id)
    ) {
      liveByOutdoor.set(entry.outdoorPlatform, entry);
    }
  }

  const sauLoginByPlatform = new Map<string, SauLoginCheck>();
  const sauPlatformsToCheck = [
    ...SUPPORTED_PLATFORMS.filter((platform) => isSauPlatform(platform)),
    ...SAU_MANUAL_PLATFORMS,
  ];
  await Promise.all(
    sauPlatformsToCheck.map(async (platform) => {
      if (!isSauPlatform(platform)) {
        return;
      }
      try {
        sauLoginByPlatform.set(platform, await checkSauPlatformLogin(platform));
      } catch (error) {
        sauLoginByPlatform.set(platform, {
          valid: false,
          message: error instanceof Error ? error.message : String(error),
          accountName: null,
        });
      }
    }),
  );

  const platforms: PlatformStatus[] = [];
  for (const platform of SUPPORTED_PLATFORMS) {
    if (isPostizPlatform(platform)) {
      if (platform === 'twitter') continue;
      platforms.push(postizPlatformStatus(platform, liveByOutdoor));
    } else if (isSauPlatform(platform)) {
      platforms.push(sauPlatformStatus(platform, sauLoginByPlatform.get(platform)));
    }
  }
  for (const platform of SAU_MANUAL_PLATFORMS) {
    if (!platforms.some((entry) => entry.platform === platform)) {
      platforms.push(sauPlatformStatus(platform, sauLoginByPlatform.get(platform)));
    }
  }

  return {
    checkedAt: new Date().toISOString(),
    connectProgress: buildConnectProgress(platforms),
    providers: {
      postiz: {
        mode: postizPublishMode(),
        hasApiKey: hasPostizApiKey(),
        dashboardUrl: postizDashboardUrl(),
        signupUrl: postizSignupUrl(),
        apiKeysUrl: postizApiKeysUrl(),
        connectGuideUrl: POSTIZ_CONNECT_GUIDE,
        envDocs: postizEnvDocs(),
        loginLinks: postizLoginLinks(),
        signupSteps: postizSignupSteps(),
        liveIntegrations,
        suggestedIntegrationsJson:
          suggested && Object.keys(suggested).length ? suggested : null,
        suggestedIntegrationsExport:
          suggested && Object.keys(suggested).length
            ? `export POSTIZ_INTEGRATIONS_JSON='${JSON.stringify(suggested)}'`
            : null,
      },
      sau: {
        mode: sauPublishMode(),
        dashboardHint: sauDashboardHint(),
        envDocs: sauEnvDocs(),
        loginLinks: sauLoginLinks(),
        signupSteps: sauSignupSteps(),
        installHint:
          'sau via ~/.local/bin — login China platforms, then SAU live on this page.',
      },
    },
    platforms,
    manualPlatforms: SAU_MANUAL_PLATFORMS,
  };
}

export async function syncPostizIntegrationsSuggestion(): Promise<{
  integrations: PostizConnectedIntegration[];
  suggestedIntegrationsJson: Record<string, string>;
  exportCommand: string;
  applied: boolean;
  postizPublishMode: 'stub' | 'live';
}> {
  if (!hasPostizApiKey()) {
    throw new Error(
      'POSTIZ_API_KEY is not set — paste the key on this page and Save, or create one in Postiz → Settings → Developers',
    );
  }
  const integrations = await listPostizIntegrations();
  const suggestedIntegrationsJson = suggestedPostizIntegrationsJson(integrations);
  const suggestedIntegrationTypesJson =
    suggestedPostizIntegrationTypesJson(integrations);
  if (!Object.keys(suggestedIntegrationsJson).length) {
    throw new Error(
      'No connected Postiz channels — connect platforms in the Postiz UI first',
    );
  }
  const saved = savePublishCredentials({
    postizIntegrationsJson: suggestedIntegrationsJson,
    postizIntegrationTypesJson: suggestedIntegrationTypesJson,
    postizPublishMode: 'live',
  });
  return {
    integrations,
    suggestedIntegrationsJson,
    applied: true,
    postizPublishMode: saved.postizPublishMode,
    exportCommand:
      `export POSTIZ_INTEGRATIONS_JSON='${JSON.stringify(suggestedIntegrationsJson)}'\nexport POSTIZ_PUBLISH_MODE=live`,
  };
}

export async function selectPostizIntegration(
  platform: string,
  integrationId: string,
): Promise<{
  integration: PostizConnectedIntegration;
  applied: boolean;
}> {
  const integrations = await listPostizIntegrations();
  const integration = integrations.find(
    (entry) =>
      entry.id === integrationId && entry.outdoorPlatform === platform,
  );
  if (!integration) {
    throw new Error(
      `Postiz channel ${integrationId} is not connected as ${platform}`,
    );
  }
  const current = loadPublishCredentials();
  savePublishCredentials({
    postizIntegrationsJson: {
      ...current.postizIntegrationsJson,
      [platform]: integration.id,
    },
    postizIntegrationTypesJson: {
      ...current.postizIntegrationTypesJson,
      [platform]: integration.identifier,
    },
    postizPublishMode: 'live',
  });
  return { integration, applied: true };
}

/** @deprecated Use syncPostizIntegrationsSuggestion */
export const syncZernioAccountsSuggestion = syncPostizIntegrationsSuggestion;

export async function ensurePostizIntegrationsSynced(): Promise<boolean> {
  applyPublishCredentials();
  if (!hasPostizApiKey()) {
    return false;
  }
  const current = loadPublishCredentials();
  if (Object.keys(current.postizIntegrationsJson ?? {}).length > 0) {
    return false;
  }
  try {
    const integrations = await listPostizIntegrations();
    const suggestedIntegrationsJson = suggestedPostizIntegrationsJson(integrations);
    const suggestedIntegrationTypesJson =
      suggestedPostizIntegrationTypesJson(integrations);
    if (!Object.keys(suggestedIntegrationsJson).length) {
      return false;
    }
    savePublishCredentials({
      postizIntegrationsJson: suggestedIntegrationsJson,
      postizIntegrationTypesJson: suggestedIntegrationTypesJson,
    });
    return true;
  } catch (error) {
    console.warn(
      '[platforms] Postiz auto-sync:',
      error instanceof Error ? error.message : error,
    );
    return false;
  }
}

/** Sync Postiz channels and turn on live publish for Postiz + SAU (one step before take publish). */
export async function prepareForPublish(): Promise<{
  postizPublishMode: 'stub' | 'live';
  sauPublishMode: 'stub' | 'live';
  syncedPlatforms: string[];
  applied: boolean;
}> {
  applyPublishCredentials();
  const sync = await syncPostizIntegrationsSuggestion();
  const saved = savePublishCredentials({ sauPublishMode: 'live' });
  return {
    postizPublishMode: saved.postizPublishMode,
    sauPublishMode: saved.sauPublishMode,
    syncedPlatforms: Object.keys(sync.suggestedIntegrationsJson),
    applied: true,
  };
}

export async function testPlatformConnection(platform: string): Promise<{
  platform: string;
  provider: string | null;
  ok: boolean;
  message: string;
}> {
  const provider = providerFor(platform);
  if (isPostizPlatform(platform)) {
    const result = await testPostizConnection();
    return { platform, provider, ...result };
  }
  if (isSauPlatform(platform) || SAU_MANUAL_PLATFORMS.includes(platform)) {
    if (SAU_MANUAL_PLATFORMS.includes(platform)) {
      return {
        platform,
        provider: 'social-auto-upload',
        ok: false,
        message: `${platform} is manual-only`,
      };
    }
    const result = await testSauPlatformConnection(platform);
    return { platform, provider, ...result };
  }
  return {
    platform,
    provider,
    ok: false,
    message: `Unsupported platform: ${platform}`,
  };
}

export async function testProviderConnection(
  provider: 'postiz' | 'sau' | 'zernio',
): Promise<{
  provider: string;
  ok: boolean;
  message: string;
}> {
  if (provider === 'postiz' || provider === 'zernio') {
    const result = await testPostizConnection();
    return { provider: 'postiz', ...result };
  }
  const result = await testSauConnection();
  return { provider: 'social-auto-upload', ...result };
}
