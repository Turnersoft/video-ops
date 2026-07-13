import path from 'node:path';
import { fileURLToPath } from 'node:url';

const remotionDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const VIDEO_OPS_ROOT = path.resolve(remotionDir, '..');
export const BASIC_UI_ROOT = path.resolve(VIDEO_OPS_ROOT, '../basic_ui');
export const TURN_USER_ROOT = path.resolve(VIDEO_OPS_ROOT, '../codetree/turn/turn-user');

export function basicUiSrc(...segments: string[]): string {
  return path.join(BASIC_UI_ROOT, 'src', ...segments);
}
