import { toJpeg, toPng } from 'html-to-image';

import { BEAT_POSTER_WIDTH } from '../../../../src/beatPosterPublishPreview';

export type BeatPosterDomExportItem = {
  beatId: string;
  lang: 'en' | 'zh';
  root: HTMLElement;
};

async function waitForPosterImages(root: HTMLElement): Promise<void> {
  const images = Array.from(root.querySelectorAll('img'));
  await Promise.all(
    images.map((image) => {
      if (image.complete) {
        return Promise.resolve();
      }
      return new Promise<void>((resolve) => {
        image.addEventListener('load', () => resolve(), { once: true });
        image.addEventListener('error', () => resolve(), { once: true });
      });
    }),
  );
  if (typeof document !== 'undefined' && document.fonts?.ready) {
    await document.fonts.ready;
  }
}

function captureOptions(root: HTMLElement): {
  cacheBust: true;
  pixelRatio: number;
} {
  const width = Math.max(root.offsetWidth, 1);
  return {
    cacheBust: true,
    pixelRatio: BEAT_POSTER_WIDTH / width,
  };
}

/** Capture on-screen poster frames to JPEG data URLs for social feed preview. */
export async function captureBeatPosterSlidesFromDom(
  roots: HTMLElement[],
): Promise<string[]> {
  const urls: string[] = [];
  for (const root of roots) {
    await waitForPosterImages(root);
    const dataUrl = await toJpeg(root, {
      quality: 0.92,
      ...captureOptions(root),
    });
    urls.push(dataUrl);
  }
  return urls;
}

/** Full-size PNG of the live React poster — same CSS the preview uses. */
export async function captureBeatPosterPngFromDom(root: HTMLElement): Promise<string> {
  await waitForPosterImages(root);
  return toPng(root, captureOptions(root));
}

export function pngDataUrlToBase64(dataUrl: string): string {
  const comma = dataUrl.indexOf(',');
  return comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
}

export function listBeatPosterExportRoots(): HTMLElement[] {
  if (typeof document === 'undefined') {
    return [];
  }
  return Array.from(document.querySelectorAll<HTMLElement>('[data-beat-poster-export="true"]'));
}

export function listBeatPosterFullExportItems(): BeatPosterDomExportItem[] {
  if (typeof document === 'undefined') {
    return [];
  }
  return Array.from(
    document.querySelectorAll<HTMLElement>('[data-beat-poster-full-export="true"]'),
  ).flatMap((root) => {
    const beatId = root.dataset.beatId?.trim();
    const lang = root.dataset.lang;
    if (!beatId || (lang !== 'en' && lang !== 'zh')) {
      return [];
    }
    return [{ beatId, lang, root }];
  });
}

export async function probeImageUrl(url: string): Promise<boolean> {
  if (typeof Image === 'undefined') {
    return false;
  }
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
  });
}
