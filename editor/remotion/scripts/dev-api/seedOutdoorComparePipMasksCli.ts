#!/usr/bin/env node
/**
 * Seed DEFAULT_BEAT_PIP_MASK onto compare-dual beats in animation.md and optionally
 * patch a take's animation-outdoor.json outdoorEdit.
 *
 * Usage:
 *   npx tsx scripts/dev-api/seedOutdoorComparePipMasksCli.ts --script <scriptId> [--outdoor-animation <path>]
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
    patchOutdoorAnimationFileWithPipPreset,
    seedOutdoorCompareBeatPipMasksForScript,
} from '../../src/lib/outdoor/seedOutdoorComparePipMasks';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const remotionDir = path.resolve(__dirname, '../..');
const videoOpsDir = path.resolve(remotionDir, '../..');

function readArg(flag: string): string | undefined {
    const index = process.argv.indexOf(flag);
    if (index < 0) {
        return undefined;
    }
    return process.argv[index + 1];
}

const scriptId = readArg('--script');
if (!scriptId) {
    console.error('Usage: seedOutdoorComparePipMasksCli.ts --script <scriptId> [--outdoor-animation <path>]');
    process.exit(1);
}

const outdoorAnimationPath = readArg('--outdoor-animation');
const seededCount = seedOutdoorCompareBeatPipMasksForScript(videoOpsDir, scriptId);
if (seededCount > 0) {
    console.log(`[seed-outdoor-pip] wrote mask preset onto ${seededCount} compare beat(s) in animation.md`);
    const sync = spawnSync('npm', ['run', 'sync', '--', '--script', scriptId], {
        cwd: remotionDir,
        stdio: 'inherit',
        env: process.env,
    });
    if (sync.status !== 0) {
        process.exit(sync.status ?? 1);
    }
}

if (outdoorAnimationPath) {
    const resolvedOutdoorPath = path.isAbsolute(outdoorAnimationPath)
        ? outdoorAnimationPath
        : path.resolve(process.cwd(), outdoorAnimationPath);
    if (patchOutdoorAnimationFileWithPipPreset(resolvedOutdoorPath)) {
        console.log(`[seed-outdoor-pip] patched ${resolvedOutdoorPath}`);
    }
}
