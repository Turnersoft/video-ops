/** Headers required for ngrok free-tier tunnels from mobile WebViews and fetch. */
export const NGROK_BYPASS_HEADERS: Record<string, string> = {
  'ngrok-skip-browser-warning': '1',
  'Ngrok-Skip-Browser-Warning': '1',
  'User-Agent': 'TurnOutdoor/1.0 (ReactNative)',
  Accept: 'application/json',
};

export function withNgrokHeaders(init?: RequestInit): RequestInit {
  const headers = new Headers(init?.headers ?? {});
  for (const [key, value] of Object.entries(NGROK_BYPASS_HEADERS)) {
    if (!headers.has(key)) {
      headers.set(key, value);
    }
  }
  return { ...init, headers };
}
