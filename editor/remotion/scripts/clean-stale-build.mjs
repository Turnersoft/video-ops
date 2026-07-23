#!/usr/bin/env node
/** Remove webpack bundle output so public-dir copies cannot recurse into old builds. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const remotionDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const buildDir = path.join(remotionDir, 'build');

if (fs.existsSync(buildDir)) {
    fs.rmSync(buildDir, { recursive: true, force: true });
    console.log(`[clean-stale-build] removed ${buildDir}`);
}
