import { videoOpsDevApiUrl } from '../studio/videoOpsDevApi';

function looksLikeHtml(text: string): boolean {
  const trimmed = text.trimStart().toLowerCase();
  return trimmed.startsWith('<!doctype') || trimmed.startsWith('<html');
}

/** Dev/studio: compile animation.md on the server — no .cache/render-props.json read. */
export async function fetchLiveRenderPropsJson(
  scriptId: string,
  cacheBust: number,
): Promise<string | null> {
  const query = `scriptId=${encodeURIComponent(scriptId)}&v=${cacheBust}`;
  const urls = [
    `/video_ops/api/render-props?${query}`,
    `${videoOpsDevApiUrl('/video_ops/api/render-props')}?${query}`,
  ];
  for (const url of urls) {
    try {
      const response = await fetch(url, { cache: 'no-store' });
      if (!response.ok) {
        continue;
      }
      const text = await response.text();
      if (looksLikeHtml(text)) {
        continue;
      }
      return text;
    } catch {
      // try next origin
    }
  }
  return null;
}
