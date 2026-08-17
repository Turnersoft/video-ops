import path from 'node:path';

import { attachSpokenZhToCaptionSegments } from './caption_translate.ts';
import { fileExists, readJson, writeJson } from './fs_util.ts';
import type { CaptionSegment } from './sentence-captions.ts';

type OutdoorAnimationDoc = {
  scenes?: Array<{
    outdoorEdit?: {
      captionSegments?: CaptionSegment[];
    };
  }>;
};

export async function runRefreshCaptionZh(argv: string[]): Promise<void> {
  let editDir = '';
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--edit-dir' && argv[index + 1]) {
      editDir = path.resolve(argv[index + 1]);
      index += 1;
    }
  }
  if (!editDir) {
    throw new Error('Usage: refresh-caption-zh --edit-dir <align-or-composite-dir>');
  }

  const outdoorPath = path.join(editDir, 'animation-outdoor.json');
  if (!fileExists(outdoorPath)) {
    throw new Error(`Missing ${outdoorPath}`);
  }

  const outdoor = readJson<OutdoorAnimationDoc>(outdoorPath);
  const scene = outdoor.scenes?.[0];
  const segments = scene?.outdoorEdit?.captionSegments ?? [];
  if (!segments.length) {
    throw new Error(`No captionSegments in ${outdoorPath}`);
  }

  const withZhBefore = segments.filter((segment) => segment.zh?.trim()).length;
  console.log(
    `[refresh-caption-zh] ${segments.length} segments (${withZhBefore} with zh) → translating spoken English…`,
  );

  const translated = await attachSpokenZhToCaptionSegments(editDir, segments);
  const withZhAfter = translated.filter((segment) => segment.zh?.trim()).length;

  if (scene?.outdoorEdit) {
    scene.outdoorEdit.captionSegments = translated;
  }
  writeJson(outdoorPath, outdoor);
  console.log(
    `[refresh-caption-zh] wrote ${outdoorPath} (${withZhAfter}/${translated.length} with zh)`,
  );
}
