import { fileExists } from './fs_util.ts';
import { animationMdPath, ensureDir } from './paths.ts';
import { compileAnimationSource } from './scripts-watcher.ts';
import path from 'node:path';

export type AnimationMdDocument = {
  scriptId: string;
  path: string;
  markdown: string;
  exists: boolean;
  updatedAt: string | null;
};

export function readAnimationMd(scriptId: string): AnimationMdDocument {
  const filePath = animationMdPath(scriptId);
  if (!fileExists(filePath)) {
    return {
      scriptId,
      path: filePath,
      markdown: '',
      exists: false,
      updatedAt: null,
    };
  }
  const stat = Deno.statSync(filePath);
  return {
    scriptId,
    path: filePath,
    markdown: Deno.readTextFileSync(filePath),
    exists: true,
    updatedAt: stat.mtime?.toISOString() ?? null,
  };
}

export async function writeAnimationMd(
  scriptId: string,
  markdown: string,
  options: { compile?: boolean } = {},
): Promise<AnimationMdDocument> {
  const filePath = animationMdPath(scriptId);
  ensureDir(path.dirname(filePath));
  const body = markdown.endsWith('\n') ? markdown : `${markdown}\n`;
  Deno.writeTextFileSync(filePath, body);
  if (options.compile !== false) {
    await compileAnimationSource(scriptId);
  }
  return readAnimationMd(scriptId);
}

export function titleFromAnimationMd(markdown: string, fallback: string): string {
  const match = markdown.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!match) {
    return fallback;
  }
  const titleLine = match[1].split('\n').find((line) => line.startsWith('title:'));
  if (!titleLine) {
    return fallback;
  }
  return titleLine.replace(/^title:\s*/, '').trim() || fallback;
}
