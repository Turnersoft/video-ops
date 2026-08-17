import { OutdoorApiError } from '../api/client';

export type PublishErrorDetails = {
  summary: string;
  status?: number;
  path?: string;
  hint?: string;
  details?: string;
  platform?: string;
  step?: string;
  rawBody?: string;
};

function hintForOutdoorApiError(error: OutdoorApiError): string | undefined {
  if (error.hint) {
    return error.hint;
  }
  const message = error.message.toLowerCase();
  if (error.status === 404) {
    if (error.path.includes('beat-posters/publish')) {
      return (
        'Beat-poster publish API is missing on the running outdoor_agent. ' +
        'Restart the Mac agent (npm run outdoor:all) so POST /api/scripts/.../beat-posters/publish/... is registered.'
      );
    }
    return (
      `HTTP 404 — route ${error.path} does not exist on this agent. ` +
      'Restart outdoor_agent after pulling the latest code.'
    );
  }
  if (error.status === 400 || error.status === 502 || error.status === 503) {
    if (message.includes('stub mode') || message.includes('stub')) {
      return 'Postiz is in stub mode. Open #/platforms → switch to live mode, then retry.';
    }
    if (message.includes('integration') || message.includes('postiz')) {
      return 'Open #/platforms → Postiz live mode → Sync integrations → confirm the platform is connected.';
    }
    if (message.includes('already published')) {
      return 'This album was already submitted. Hide or delete the Postiz post, then retry.';
    }
    if (message.includes('no beats') || message.includes('infographic')) {
      return 'Generate infographics first (cover + all beats), then publish again.';
    }
  }
  if (error.status >= 500) {
    return 'Outdoor agent or Postiz returned a server error. Check agent logs on the Mac.';
  }
  return undefined;
}

export function parsePublishErrorDetails(error: unknown): PublishErrorDetails {
  if (error instanceof OutdoorApiError) {
    const hint = hintForOutdoorApiError(error);
    const details = error.details ?? (error.body !== error.message ? error.body : undefined);
    return {
      summary: error.message,
      status: error.status,
      path: error.path,
      hint,
      details,
      platform: error.platform,
      step: error.step,
      rawBody: error.body,
    };
  }
  if (error instanceof Error) {
    return { summary: error.message, details: error.stack };
  }
  return { summary: String(error) };
}

export function formatPublishErrorLines(details: PublishErrorDetails): string[] {
  const lines: string[] = [details.summary];
  if (details.status !== undefined) {
    lines.push(`HTTP ${details.status}${details.path ? ` · ${details.path}` : ''}`);
  } else if (details.path) {
    lines.push(details.path);
  }
  if (details.platform) {
    lines.push(`Platform: ${details.platform}`);
  }
  if (details.step) {
    lines.push(`Step: ${details.step}`);
  }
  if (details.hint) {
    lines.push(`Fix: ${details.hint}`);
  }
  if (details.details && details.details !== details.summary) {
    lines.push(details.details);
  }
  return lines;
}
