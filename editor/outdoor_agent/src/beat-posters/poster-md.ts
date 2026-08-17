import { fileExists } from '../fs_util.ts';
import { beatPosterMdPath } from '../paths.ts';

export type BeatPosterMdFile = {
  scriptId: string;
  path: string;
  markdown: string;
  exists: boolean;
  updatedAt: string | null;
};

export function readBeatPosterMd(scriptId: string): BeatPosterMdFile {
  const filePath = beatPosterMdPath(scriptId);
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
