import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import { fileExists } from '../fs_util.ts';

/**
 * Browser handoff for platforms that refuse automated uploads (小红书 today).
 *
 * Instead of driving the account with the sau CLI, the agent opens the creator
 * page in the default browser — where the account is already signed in — puts
 * the caption on the clipboard and reveals the poster PNGs in Finder. The
 * upload and the publish click stay with the human.
 *
 * macOS only: `open` and `pbcopy` are the whole implementation.
 *
 * Env:
 *   PUBLISH_HANDOFF_BROWSER (optional app name, e.g. "Google Chrome" — the
 *     browser holding the platform session; default is the system browser)
 */

const execFileAsync = promisify(execFile);

const CREATOR_UPLOAD_URLS: Record<string, string> = {
  xiaohongshu: 'https://creator.xiaohongshu.com/publish/publish?source=official&target=image',
};

export type BrowserHandoff = {
  platform: string;
  creatorUrl: string;
  captionCopied: boolean;
  revealedPath: string | null;
  message: string;
};

export function creatorUploadUrl(platform: string): string | null {
  return CREATOR_UPLOAD_URLS[platform] ?? null;
}

async function openInBrowser(url: string): Promise<void> {
  const app = Deno.env.get('PUBLISH_HANDOFF_BROWSER')?.trim();
  await execFileAsync('open', app ? ['-a', app, url] : [url]);
}

async function copyToClipboard(text: string): Promise<void> {
  const child = new Deno.Command('pbcopy', { stdin: 'piped' }).spawn();
  const writer = child.stdin.getWriter();
  try {
    await writer.write(new TextEncoder().encode(text));
  } finally {
    await writer.close();
  }
  const { code } = await child.status;
  if (code !== 0) {
    throw new Error(`pbcopy failed (exit ${code})`);
  }
}

async function revealDirInFinder(dirPath: string): Promise<void> {
  await execFileAsync('open', [dirPath]);
}

function captionForClipboard(title: string, body: string): string {
  return [title.trim(), body.trim()].filter(Boolean).join('\n\n');
}

/** Open the creator page, hand over the caption, and show the album folder. */
export async function prepareBrowserHandoff(params: {
  platform: string;
  captionTitle: string;
  captionBody: string;
  albumDir: string | null;
}): Promise<BrowserHandoff> {
  const { platform, captionTitle, captionBody, albumDir } = params;
  const creatorUrl = creatorUploadUrl(platform);
  if (!creatorUrl) {
    throw new Error(`No creator upload page registered for ${platform}`);
  }
  if (Deno.build.os !== 'darwin') {
    throw new Error('Browser handoff is only supported on macOS');
  }

  const caption = captionForClipboard(captionTitle, captionBody);
  let captionCopied = false;
  if (caption) {
    try {
      await copyToClipboard(caption);
      captionCopied = true;
    } catch (error) {
      console.warn(`[handoff] clipboard copy failed: ${error instanceof Error ? error.message : error}`);
    }
  }

  let revealedPath: string | null = null;
  if (albumDir && fileExists(albumDir)) {
    try {
      await revealDirInFinder(albumDir);
      revealedPath = albumDir;
    } catch (error) {
      console.warn(`[handoff] Finder reveal failed: ${error instanceof Error ? error.message : error}`);
    }
  }

  await openInBrowser(creatorUrl);

  const prepared = [
    'creator page open',
    captionCopied ? 'caption on clipboard' : null,
    revealedPath ? 'posters in Finder' : null,
  ].filter(Boolean).join(' · ');

  return {
    platform,
    creatorUrl,
    captionCopied,
    revealedPath,
    message: `Your turn — ${prepared}. Publish, then mark this cell live.`,
  };
}
