import { videoOpsDevApiUrl } from '../studio/videoOpsDevApi';

function looksLikeHtml(text: string): boolean {
  const trimmed = text.trimStart().toLowerCase();
  return trimmed.startsWith('<!doctype') || trimmed.startsWith('<html');
}

function parseCompileError(text: string): string | null {
  try {
    const payload = JSON.parse(text) as { error?: string };
    return payload.error?.trim() || null;
  } catch {
    return null;
  }
}

/** Dev/studio: compile animation.md on the server — no .cache/render-props.json read. */
export async function fetchLiveRenderPropsJson(
  scriptId: string,
  cacheBust: number,
  options: { includeOutdoorEdit?: boolean; takeId?: string } = {},
): Promise<string | null> {
  const includeOutdoorEdit = options.includeOutdoorEdit ? '&includeOutdoorEdit=1' : '';
  const takeId = options.takeId?.trim()
    ? `&takeId=${encodeURIComponent(options.takeId.trim())}`
    : '';
  const query = `scriptId=${encodeURIComponent(scriptId)}&v=${cacheBust}${includeOutdoorEdit}${takeId}`;
  const urls = [
    `${videoOpsDevApiUrl('/video_ops/api/render-props')}?${query}`,
    `/video_ops/api/render-props?${query}`,
  ];
  let compileError: string | null = null;
  let devApiUnreachable = true;
  for (const url of urls) {
    try {
      const response = await fetch(url, { cache: 'no-store' });
      devApiUnreachable = false;
      const text = await response.text();
      if (looksLikeHtml(text)) {
        continue;
      }
      if (!response.ok) {
        compileError = parseCompileError(text) ?? compileError;
        continue;
      }
      return text;
    } catch {
      // try next origin
    }
  }
  if (compileError) {
    throw new Error(compileError);
  }
  if (devApiUnreachable) {
    return null;
  }
  throw new Error(`Could not compile animation.md for ${scriptId}.`);
}
