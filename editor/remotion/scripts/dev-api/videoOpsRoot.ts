import path from 'node:path';
import { fileURLToPath } from 'node:url';

const devApiDir = path.dirname(fileURLToPath(import.meta.url));

/** `editor/remotion` package root. */
export const REMOTION_ROOT = path.resolve(devApiDir, '../..');

/** `video_ops` repo root. */
export const VIDEO_OPS_DIR = path.resolve(REMOTION_ROOT, '../..');
