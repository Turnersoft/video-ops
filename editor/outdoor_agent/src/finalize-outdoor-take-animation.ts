import path from 'node:path';

import { VIDEO_OPS_ROOT } from './paths.ts';

/** Seed compare-dual pip directives in animation.md and patch take outdoor JSON. */
export async function finalizeOutdoorTakeAnimation(
  scriptId: string,
  outdoorAnimationPath: string,
): Promise<void> {
  const remotionDir = path.join(VIDEO_OPS_ROOT, 'editor/remotion');
  const command = new Deno.Command('npx', {
    args: [
      'tsx',
      'scripts/dev-api/seedOutdoorComparePipMasksCli.ts',
      '--script',
      scriptId,
      '--outdoor-animation',
      outdoorAnimationPath,
    ],
    cwd: remotionDir,
    stdout: 'inherit',
    stderr: 'inherit',
    env: Deno.env.toObject(),
  });
  const { code } = await command.output();
  if (code !== 0) {
    throw new Error(`seedOutdoorComparePipMasks failed for ${scriptId} (exit ${code})`);
  }
}
