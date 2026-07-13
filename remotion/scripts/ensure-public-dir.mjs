#!/usr/bin/env node
/**
 * Remotion public/ must NOT include the remotion project itself (causes recursive
 * build/public/remotion/build/… copies → ENAMETOOLONG + multi-GB bundles).
 *
 * Creates video_ops/public/ with symlinks to runtime assets only.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const remotionDir = path.resolve(__dirname, '..');
const videoOpsRoot = path.join(remotionDir, '..');
const publicDir = path.join(videoOpsRoot, 'public');

/** Paths served via staticFile() — keep in sync with videoOpsPaths / scriptAssetPath. */
const SYMLINKS = ['scripts', 'assets'];

/** Removed after scripts/ migration — delete if still present. */
const STALE_PUBLIC_ENTRIES = ['script', 'script_v2', 'generated'];

const EXTRA_SYMLINKS = [
    {
        link: 'turn-user/language_server/examples/AATA/01_preliminaries',
        target: path.resolve(videoOpsRoot, '../codetree/turn/turn-user/language_server/examples/AATA/01_preliminaries'),
    },
];

function pathsEqual(left, right) {
    try {
        return fs.realpathSync(left) === fs.realpathSync(right);
    } catch {
        return path.resolve(left) === path.resolve(right);
    }
}

function removePublicEntry(linkRelativePath) {
    const link = path.join(publicDir, linkRelativePath);
    try {
        const stat = fs.lstatSync(link);
        if (stat.isSymbolicLink()) {
            fs.unlinkSync(link);
            return;
        }
        if (stat.isDirectory()) {
            fs.rmSync(link, { recursive: true, force: true });
            return;
        }
        fs.unlinkSync(link);
    } catch (error) {
        if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
            return;
        }
        throw error;
    }
}

function ensureSymlinkPath(linkRelativePath, target) {
    const link = path.join(publicDir, linkRelativePath);

    if (!fs.existsSync(target)) {
        console.warn(`[ensure-public-dir] skip missing source: ${target}`);
        return;
    }

    fs.mkdirSync(path.dirname(link), { recursive: true });

    try {
        const stat = fs.lstatSync(link);
        if (stat.isSymbolicLink()) {
            const current = fs.readlinkSync(link);
            const currentResolved = path.isAbsolute(current)
                ? current
                : path.resolve(path.dirname(link), current);
            if (pathsEqual(currentResolved, target)) {
                return;
            }
        }
    } catch (error) {
        if (!(error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT')) {
            throw error;
        }
    }

    removePublicEntry(linkRelativePath);
    fs.symlinkSync(target, link, 'dir');
    console.log(`[ensure-public-dir] ${linkRelativePath} → ${target}`);
}

function ensureSymlink(name) {
    ensureSymlinkPath(name, path.join(videoOpsRoot, name));
}

fs.mkdirSync(publicDir, { recursive: true });

for (const stale of STALE_PUBLIC_ENTRIES) {
    removePublicEntry(stale);
}

for (const name of SYMLINKS) {
    ensureSymlink(name);
}

for (const { link, target } of EXTRA_SYMLINKS) {
    ensureSymlinkPath(link, target);
}
