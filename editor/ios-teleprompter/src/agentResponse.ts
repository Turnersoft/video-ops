import { withNgrokHeaders } from './outdoorFetch';

export class AgentConnectionError extends Error {
  readonly baseUrl: string;
  readonly status: number;

  constructor(message: string, baseUrl: string, status = 0) {
    super(message);
    this.name = 'AgentConnectionError';
    this.baseUrl = baseUrl;
    this.status = status;
  }
}

export function explainAgentFailure(status: number, body: string, baseUrl: string): string {
  const snippet = body.replace(/\s+/g, ' ').trim().slice(0, 160);
  if (body.includes('ERR_NGROK_3200') || body.includes('ngrok-error-code')) {
    return (
      `Ngrok tunnel is offline.\n\n` +
      `On Mac:\n` +
      `  ngrok http 8788\n` +
      `  cd video_ops && npm run sync-outdoor-endpoints\n\n` +
      `iPhone → Mac connection → Refresh from iCloud\n\n` +
      `Tried: ${baseUrl}`
    );
  }
  if (body.trim().startsWith('<!DOCTYPE') || body.trim().startsWith('<html')) {
    return (
      `Received a web page instead of the outdoor agent API.\n\n` +
      `Free ngrok can only tunnel one port. Point it at the agent:\n` +
      `  ngrok http 8788\n\n` +
      `If Expo is running on ngrok (:8081), swap ngrok to :8788 before opening pipeline.\n\n` +
      `Tried: ${baseUrl}`
    );
  }
  if (status === 404 && body.includes('"error"')) {
    try {
      const parsed = JSON.parse(body) as { error?: string };
      if (parsed.error) {
        return parsed.error;
      }
    } catch {
      // fall through
    }
  }
  if (status > 0) {
    return `Agent error ${status}${snippet ? `: ${snippet}` : ''}\n\nTried: ${baseUrl}`;
  }
  return `Agent unreachable at ${baseUrl}${snippet ? `: ${snippet}` : ''}`;
}

export async function parseAgentJson<T>(response: Response, baseUrl: string): Promise<T> {
  const body = await response.text();
  if (!response.ok) {
    throw new AgentConnectionError(explainAgentFailure(response.status, body, baseUrl), baseUrl, response.status);
  }
  const trimmed = body.trim();
  if (trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('<html')) {
    throw new AgentConnectionError(explainAgentFailure(response.status, body, baseUrl), baseUrl, response.status);
  }
  try {
    return JSON.parse(body) as T;
  } catch {
    throw new AgentConnectionError(
      `Invalid JSON from agent.\n\nTried: ${baseUrl}`,
      baseUrl,
      response.status,
    );
  }
}

export async function agentFetchJson<T>(
  baseUrl: string,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${baseUrl.replace(/\/+$/, '')}${path}`, withNgrokHeaders(init));
  return parseAgentJson<T>(response, baseUrl);
}
