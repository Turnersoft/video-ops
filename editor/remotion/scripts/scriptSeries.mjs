/**
 * Resolve episode directories across canonical + legacy series under projects/.
 * Episode folder name === scriptId (no series prefix).
 */

import fs from 'node:fs';
import path from 'node:path';

export const PROJECTS_DIR = 'projects';

export const CANONICAL_SERIES = [
  'compare',
  'formal-math',
  'pitfalls',
  'ai-math',
  'syntax',
  'launch',
  'logic-for-life',
];

export const LEGACY_SERIES = [
  'abstract_algebra_in_proof_assistant',
  'algebra',
  'why-need',
];

const ALL_SERIES = [...CANONICAL_SERIES, ...LEGACY_SERIES];

/** Legacy prefix fallback for unmigrated / bookmarked ids. */
const SERIES_PREFIX_RULES = [
  ['formal-math-', 'formal-math'],
  ['sets-v2-', 'abstract_algebra_in_proof_assistant'],
  ['groups-v1-', 'abstract_algebra_in_proof_assistant'],
  ['compare-', 'compare'],
  ['ai-math-', 'ai-math'],
  ['launch-', 'launch'],
  ['life-', 'logic-for-life'],
  ['algebra-', 'algebra'],
  ['syntax-', 'syntax'],
  ['pitfalls-', 'pitfalls'],
  ['why-need-', 'why-need'],
];

function seriesFromPrefix(scriptId) {
  for (const [prefix, series] of SERIES_PREFIX_RULES) {
    if (scriptId.startsWith(prefix)) {
      return series;
    }
  }
  return 'algebra';
}

function stripSeriesPrefix(scriptId) {
  for (const [prefix] of SERIES_PREFIX_RULES) {
    if (scriptId.startsWith(prefix)) {
      const short = scriptId.slice(prefix.length);
      return short || null;
    }
  }
  return null;
}

function episodeLooksPresent(dir) {
  return fs.existsSync(path.join(dir, 'animation.md'));
}

export function seriesForScriptId(videoOpsDir, scriptId) {
  if (typeof videoOpsDir === 'string' && scriptId) {
    const templateDir = path.join(videoOpsDir, PROJECTS_DIR, '_templates', scriptId);
    if (episodeLooksPresent(templateDir)) {
      return '_templates';
    }

    let legacyHit = null;
    for (const series of ALL_SERIES) {
      const dir = path.join(videoOpsDir, PROJECTS_DIR, series, scriptId);
      if (!episodeLooksPresent(dir)) {
        continue;
      }
      if (CANONICAL_SERIES.includes(series)) {
        return series;
      }
      if (!legacyHit) {
        legacyHit = series;
      }
    }
    if (legacyHit) {
      return legacyHit;
    }
  }
  // Back-compat: seriesForScriptId(scriptId) used without videoOpsDir.
  const id = scriptId ?? videoOpsDir;
  return seriesFromPrefix(id);
}

function resolveExistingScriptDir(videoOpsDir, scriptId) {
  const templateDir = path.join(videoOpsDir, PROJECTS_DIR, '_templates', scriptId);
  if (episodeLooksPresent(templateDir)) {
    return templateDir;
  }

  let legacyHit = null;
  for (const series of ALL_SERIES) {
    const dir = path.join(videoOpsDir, PROJECTS_DIR, series, scriptId);
    if (!episodeLooksPresent(dir)) {
      continue;
    }
    const isCanonical = CANONICAL_SERIES.includes(series);
    if (isCanonical) {
      return dir;
    }
    if (!legacyHit) {
      legacyHit = dir;
    }
  }
  return legacyHit;
}

export function scriptDirFor(videoOpsDir, scriptId) {
  const direct = resolveExistingScriptDir(videoOpsDir, scriptId);
  if (direct) {
    return direct;
  }
  const short = stripSeriesPrefix(scriptId);
  if (short) {
    const aliased = resolveExistingScriptDir(videoOpsDir, short);
    if (aliased) {
      return aliased;
    }
  }
  return path.join(videoOpsDir, PROJECTS_DIR, seriesFromPrefix(scriptId), scriptId);
}

export function scriptFolderRelative(videoOpsDir, scriptId) {
  // Back-compat: scriptFolderRelative(scriptId)
  if (scriptId === undefined) {
    const id = videoOpsDir;
    return `${PROJECTS_DIR}/${seriesFromPrefix(id)}/${id}`;
  }
  const abs = scriptDirFor(videoOpsDir, scriptId);
  return path.relative(videoOpsDir, abs).split(path.sep).join('/');
}

export function resolveSharedAssetPath(videoOpsDir, relativePath) {
  return path.join(videoOpsDir, PROJECTS_DIR, 'algebra', relativePath);
}

export const ANIMATION_V4_CACHE_REL = '.cache/animation-v4.json';

export function animationV4CachePath(videoOpsDir, scriptId) {
  return path.join(scriptDirFor(videoOpsDir, scriptId), ANIMATION_V4_CACHE_REL);
}

export function readAnimationV4Cache(videoOpsDir, scriptId) {
  const cachePath = animationV4CachePath(videoOpsDir, scriptId);
  if (!fs.existsSync(cachePath)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(cachePath, 'utf8'));
}

export { ALL_SERIES };
