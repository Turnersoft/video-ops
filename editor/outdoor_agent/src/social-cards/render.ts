import path from 'node:path';

import { runCommand } from '../subprocess.ts';
import { fileExists } from '../fs_util.ts';

const CHROME_CANDIDATES = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
];

export function resolveChromeBinary(): string {
  const fromEnv = Deno.env.get('SOCIAL_CARD_CHROME')?.trim();
  if (fromEnv && fileExists(fromEnv)) {
    return fromEnv;
  }
  for (const candidate of CHROME_CANDIDATES) {
    if (fileExists(candidate)) {
      return candidate;
    }
  }
  throw new Error(
    'Headless Chrome not found — install Google Chrome or set SOCIAL_CARD_CHROME to the binary path',
  );
}

export async function screenshotHtmlFile(
  htmlPath: string,
  pngPath: string,
  width: number,
  height: number,
): Promise<void> {
  const chrome = resolveChromeBinary();
  const htmlUrl = `file://${path.resolve(htmlPath)}`;
  await Deno.mkdir(path.dirname(pngPath), { recursive: true });
  await runCommand(chrome, [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--no-sandbox',
    '--force-device-scale-factor=1',
    '--run-all-compositor-stages-before-draw',
    '--virtual-time-budget=8000',
    `--window-size=${width},${height}`,
    `--screenshot=${path.resolve(pngPath)}`,
    htmlUrl,
  ]);
  if (!fileExists(pngPath)) {
    throw new Error('Chrome headless did not produce a PNG screenshot');
  }
}
