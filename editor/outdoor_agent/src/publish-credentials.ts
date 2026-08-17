import path from 'node:path';

import { fileExists, readJson, writeJson } from './fs_util.ts';
import { AGENT_ROOT, ensureDir } from './paths.ts';

export type PublishMode = 'stub' | 'live';

export type PublishCredentials = {
  postizApiKey: string | null;
  postizIntegrationsJson: Record<string, string>;
  /** Outdoor platform → actual Postiz provider identifier (e.g. instagram-standalone). */
  postizIntegrationTypesJson: Record<string, string>;
  postizPublishMode: PublishMode;
  postizApiBase: string;
  postizDashboardUrl: string;
  sauPublishMode: PublishMode;
  sauAccount: string;
  updatedAt: string;
};

/** Safe for API responses — never returns the raw API key. */
export type PublishCredentialsPublic = {
  hasPostizApiKey: boolean;
  postizApiKeyHint: string | null;
  postizIntegrationsJson: Record<string, string>;
  postizIntegrationTypesJson: Record<string, string>;
  postizIntegrationCount: number;
  postizPublishMode: PublishMode;
  postizApiBase: string;
  postizDashboardUrl: string;
  sauPublishMode: PublishMode;
  sauAccount: string;
  updatedAt: string;
  storedPath: string;
};

const SETTINGS_PATH = path.join(AGENT_ROOT, 'data', 'publish-credentials.json');
const DEFAULT_POSTIZ_API_BASE = 'http://localhost:4007/api/public/v1';
const DEFAULT_POSTIZ_DASHBOARD = 'http://localhost:4007';

function modeFromEnv(name: string): PublishMode {
  return Deno.env.get(name)?.trim() === 'live' ? 'live' : 'stub';
}

function parseAccountsJson(raw: string | undefined): Record<string, string> {
  if (!raw?.trim()) {
    return {};
  }
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const out: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === 'string' && value.trim()) {
        out[key] = value.trim();
      }
    }
    return out;
  } catch {
    return {};
  }
}

function maskKey(key: string | null): string | null {
  if (!key) {
    return null;
  }
  if (key.length <= 8) {
    return '••••';
  }
  return `${key.slice(0, 4)}…${key.slice(-4)}`;
}

export function defaultPublishCredentials(): PublishCredentials {
  return {
    postizApiKey: Deno.env.get('POSTIZ_API_KEY')?.trim() || null,
    postizIntegrationsJson: parseAccountsJson(
      Deno.env.get('POSTIZ_INTEGRATIONS_JSON'),
    ),
    postizIntegrationTypesJson: parseAccountsJson(
      Deno.env.get('POSTIZ_INTEGRATION_TYPES_JSON'),
    ),
    postizPublishMode: modeFromEnv('POSTIZ_PUBLISH_MODE'),
    postizApiBase:
      Deno.env.get('POSTIZ_API_BASE')?.trim() || DEFAULT_POSTIZ_API_BASE,
    postizDashboardUrl:
      Deno.env.get('POSTIZ_DASHBOARD_URL')?.trim() || DEFAULT_POSTIZ_DASHBOARD,
    sauPublishMode: modeFromEnv('SAU_PUBLISH_MODE'),
    sauAccount: Deno.env.get('SAU_ACCOUNT')?.trim() || 'default',
    updatedAt: new Date().toISOString(),
  };
}

export function loadPublishCredentials(): PublishCredentials {
  const defaults = defaultPublishCredentials();
  if (!fileExists(SETTINGS_PATH)) {
    return defaults;
  }
  try {
    const stored = readJson<
      Partial<PublishCredentials> & {
        zernioApiKey?: string | null;
        zernioAccountsJson?: Record<string, string>;
        zernioPublishMode?: PublishMode;
      }
    >(SETTINGS_PATH);

    // Prefer Postiz fields; migrate leftover Zernio-shaped files by ignoring them.
    const integrations =
      stored.postizIntegrationsJson &&
        typeof stored.postizIntegrationsJson === 'object'
        ? Object.fromEntries(
          Object.entries(stored.postizIntegrationsJson).filter(
            (entry): entry is [string, string] =>
              typeof entry[0] === 'string' && typeof entry[1] === 'string',
          ),
        )
        : defaults.postizIntegrationsJson;

    return {
      postizApiKey:
        typeof stored.postizApiKey === 'string' && stored.postizApiKey.trim()
          ? stored.postizApiKey.trim()
          : defaults.postizApiKey,
      postizIntegrationsJson: integrations,
      postizIntegrationTypesJson:
        stored.postizIntegrationTypesJson &&
          typeof stored.postizIntegrationTypesJson === 'object'
          ? Object.fromEntries(
            Object.entries(stored.postizIntegrationTypesJson).filter(
              (entry): entry is [string, string] =>
                typeof entry[0] === 'string' && typeof entry[1] === 'string',
            ),
          )
          : defaults.postizIntegrationTypesJson,
      postizPublishMode:
        stored.postizPublishMode === 'live' ||
          stored.postizPublishMode === 'stub'
          ? stored.postizPublishMode
          : defaults.postizPublishMode,
      postizApiBase:
        typeof stored.postizApiBase === 'string' && stored.postizApiBase.trim()
          ? stored.postizApiBase.trim().replace(/\/+$/, '')
          : defaults.postizApiBase,
      postizDashboardUrl:
        typeof stored.postizDashboardUrl === 'string' &&
          stored.postizDashboardUrl.trim()
          ? stored.postizDashboardUrl.trim().replace(/\/+$/, '')
          : defaults.postizDashboardUrl,
      sauPublishMode:
        stored.sauPublishMode === 'live' || stored.sauPublishMode === 'stub'
          ? stored.sauPublishMode
          : defaults.sauPublishMode,
      sauAccount:
        typeof stored.sauAccount === 'string' && stored.sauAccount.trim()
          ? stored.sauAccount.trim()
          : defaults.sauAccount,
      updatedAt:
        typeof stored.updatedAt === 'string'
          ? stored.updatedAt
          : defaults.updatedAt,
    };
  } catch {
    return defaults;
  }
}

/** Apply stored credentials into process env so publish adapters see them without restart. */
export function applyPublishCredentials(
  credentials = loadPublishCredentials(),
): void {
  if (credentials.postizApiKey) {
    Deno.env.set('POSTIZ_API_KEY', credentials.postizApiKey);
  }
  Deno.env.set(
    'POSTIZ_INTEGRATIONS_JSON',
    JSON.stringify(credentials.postizIntegrationsJson ?? {}),
  );
  Deno.env.set(
    'POSTIZ_INTEGRATION_TYPES_JSON',
    JSON.stringify(credentials.postizIntegrationTypesJson ?? {}),
  );
  Deno.env.set('POSTIZ_PUBLISH_MODE', credentials.postizPublishMode);
  Deno.env.set('POSTIZ_API_BASE', credentials.postizApiBase);
  Deno.env.set('POSTIZ_DASHBOARD_URL', credentials.postizDashboardUrl);
  Deno.env.set('SAU_PUBLISH_MODE', credentials.sauPublishMode);
  Deno.env.set('SAU_ACCOUNT', credentials.sauAccount || 'default');
}

export function toPublicPublishCredentials(
  credentials = loadPublishCredentials(),
): PublishCredentialsPublic {
  const integrations = credentials.postizIntegrationsJson ?? {};
  return {
    hasPostizApiKey: Boolean(credentials.postizApiKey?.trim()),
    postizApiKeyHint: maskKey(credentials.postizApiKey),
    postizIntegrationsJson: integrations,
    postizIntegrationTypesJson: credentials.postizIntegrationTypesJson ?? {},
    postizIntegrationCount: Object.keys(integrations).length,
    postizPublishMode: credentials.postizPublishMode,
    postizApiBase: credentials.postizApiBase,
    postizDashboardUrl: credentials.postizDashboardUrl,
    sauPublishMode: credentials.sauPublishMode,
    sauAccount: credentials.sauAccount,
    updatedAt: credentials.updatedAt,
    storedPath: SETTINGS_PATH,
  };
}

export type PublishCredentialsPatch = {
  postizApiKey?: string | null;
  postizIntegrationsJson?: Record<string, string>;
  postizIntegrationTypesJson?: Record<string, string>;
  postizPublishMode?: PublishMode;
  postizApiBase?: string;
  postizDashboardUrl?: string;
  sauPublishMode?: PublishMode;
  sauAccount?: string;
};

export function savePublishCredentials(
  patch: PublishCredentialsPatch,
): PublishCredentialsPublic {
  const current = loadPublishCredentials();
  const next: PublishCredentials = {
    postizApiKey:
      patch.postizApiKey === undefined
        ? current.postizApiKey
        : patch.postizApiKey === null || patch.postizApiKey.trim() === ''
        ? null
        : patch.postizApiKey.trim(),
    postizIntegrationsJson:
      patch.postizIntegrationsJson === undefined
        ? current.postizIntegrationsJson
        : Object.fromEntries(
          Object.entries(patch.postizIntegrationsJson).filter(
            (entry): entry is [string, string] =>
              typeof entry[0] === 'string' &&
              typeof entry[1] === 'string' &&
              entry[1].trim().length > 0,
          ),
        ),
    postizIntegrationTypesJson:
      patch.postizIntegrationTypesJson === undefined
        ? current.postizIntegrationTypesJson
        : Object.fromEntries(
          Object.entries(patch.postizIntegrationTypesJson).filter(
            (entry): entry is [string, string] =>
              typeof entry[0] === 'string' &&
              typeof entry[1] === 'string' &&
              entry[1].trim().length > 0,
          ),
        ),
    postizPublishMode: patch.postizPublishMode ?? current.postizPublishMode,
    postizApiBase: (patch.postizApiBase ?? current.postizApiBase)
      .trim()
      .replace(/\/+$/, '') || DEFAULT_POSTIZ_API_BASE,
    postizDashboardUrl: (patch.postizDashboardUrl ?? current.postizDashboardUrl)
      .trim()
      .replace(/\/+$/, '') || DEFAULT_POSTIZ_DASHBOARD,
    sauPublishMode: patch.sauPublishMode ?? current.sauPublishMode,
    sauAccount: (patch.sauAccount ?? current.sauAccount).trim() || 'default',
    updatedAt: new Date().toISOString(),
  };
  ensureDir(path.dirname(SETTINGS_PATH));
  writeJson(SETTINGS_PATH, next);
  applyPublishCredentials(next);
  return toPublicPublishCredentials(next);
}
