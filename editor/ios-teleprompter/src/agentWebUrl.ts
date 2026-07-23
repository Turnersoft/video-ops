/** Build outdoor agent SPA URL for iPhone WebView (same UI as Mac browser). */
export function agentWebUrl(baseUrl: string, hash = ''): string {
  const root = baseUrl.trim().replace(/\/+$/, '');
  const path = hash.replace(/^#?\/?/, '');
  const fragment = path ? `#/${path}` : '#/';
  return `${root}/?mobile=1${fragment}`;
}

export function parseAgentWebHash(url: string): string | null {
  const match = /#\/(.*)$/.exec(url);
  return match?.[1] ?? null;
}

export function isFilmHash(hash: string): string | null {
  const match = /^film\/([^/]+)$/.exec(hash.replace(/^#?\/?/, ''));
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}
