import fs from 'node:fs';
import path from 'node:path';

import { videoOpsScriptDiskFolder } from '../../src/lib/videoOpsPaths';
import {
    mergeVideoOpsCoverOverride,
    type VideoOpsCoverOverride,
} from '../../src/lib/cover/videoOpsCover';

/** Merge cover editor state into animation.json composition.cover. */
export function updateCoverInAnimation(
    videoOpsDir: string,
    scriptId: string,
    patch: VideoOpsCoverOverride,
): VideoOpsCoverOverride {
    const animPath = path.join(videoOpsDir, videoOpsScriptDiskFolder(scriptId), 'animation.json');
    if (!fs.existsSync(animPath)) {
        throw new Error(`Missing animation.json for ${scriptId}.`);
    }

    const animation = JSON.parse(fs.readFileSync(animPath, 'utf8')) as {
        composition?: { cover?: VideoOpsCoverOverride };
    };
    if (!animation.composition) {
        animation.composition = {};
    }

    const merged = mergeVideoOpsCoverOverride(animation.composition.cover, patch);
    animation.composition.cover = merged;
    fs.writeFileSync(animPath, `${JSON.stringify(animation, null, 2)}\n`, 'utf8');
    return merged;
}
