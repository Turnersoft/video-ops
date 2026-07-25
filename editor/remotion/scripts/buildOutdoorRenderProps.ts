/**
 * Compile animation.md + overlay animation-outdoor.json → Remotion composition props.
 * Used by render-outdoor.mjs so CLI render does not mutate .cache or run sync.
 */
import fs from 'node:fs';
import path from 'node:path';

import { applyOutdoorAnimationPathToRenderProps } from '../src/lib/animation/applyTakeOutdoorEdit.ts';
import { compileEpisodeFromDir } from '../src/lib/compile/compileEpisode.ts';
import { canonicalVideoOpsScriptId } from '../src/lib/videoOpsPaths.ts';
import { resolveVideoOpsScriptDiskDir } from '../src/lib/videoOpsScriptDiskDir.ts';
import type { OutdoorRenderFormat, VideoFromScriptRenderProps } from '../src/lib/types/renderProps.ts';
import { VIDEO_OPS_DIR } from './dev-api/videoOpsRoot.ts';

function usage(): never {
  console.error(
    'Usage: npx tsx scripts/buildOutdoorRenderProps.ts <scriptId> <outdoorAnimationPath> <outPropsJson> <format>',
  );
  process.exit(1);
}

const scriptIdArg = process.argv[2]?.trim();
const outdoorPath = process.argv[3]?.trim();
const outPath = process.argv[4]?.trim();
const format = (process.argv[5]?.trim() || 'landscape') as OutdoorRenderFormat;

if (!scriptIdArg || !outdoorPath || !outPath) {
  usage();
}
if (format !== 'portrait' && format !== 'landscape') {
  console.error(`Invalid format "${format}" (portrait|landscape).`);
  process.exit(1);
}
if (!fs.existsSync(outdoorPath)) {
  console.error(`Missing outdoor animation: ${outdoorPath}`);
  process.exit(1);
}

const scriptId = canonicalVideoOpsScriptId(scriptIdArg);
const scriptDir = resolveVideoOpsScriptDiskDir(VIDEO_OPS_DIR, scriptId);
const compiled = compileEpisodeFromDir(scriptDir, scriptId);
const project: VideoFromScriptRenderProps = applyOutdoorAnimationPathToRenderProps(
  compiled.renderProps,
  VIDEO_OPS_DIR,
  scriptId,
  outdoorPath,
);

const props = {
  scriptId,
  format,
  project,
};

fs.mkdirSync(path.dirname(path.resolve(outPath)), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(props)}\n`, 'utf8');
console.log(
  `[buildOutdoorRenderProps] ${scriptId} ${format} → ${outPath} (${project.totalFrames} frames)`,
);
