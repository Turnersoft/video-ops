/** @deprecated ngrok removed — outdoor uses Mac Tailscale IP. */
export const DEFAULT_NGROK_HOST = 'scanning-glisten-upturned.ngrok-free.dev';
export const DEFAULT_NGROK_HTTPS = `https://${DEFAULT_NGROK_HOST}`;

export function ngrokOrigin(url: string | null | undefined): string | null {
  if (!url?.trim()) {
    return null;
  }
  try {
    return new URL(url.trim()).origin.replace(/\/+$/, '');
  } catch {
    return null;
  }
}
