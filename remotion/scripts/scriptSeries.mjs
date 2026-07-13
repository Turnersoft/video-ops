import path from 'node:path';

const SERIES_PREFIX_RULES = [
  ['sets-v2-', 'abstract_algebra_in_proof_assistant'],
  ['algebra-', 'algebra'],
  ['syntax-', 'syntax'],
  ['pitfalls-', 'pitfalls'],
  ['why-need-', 'why-need'],
];

export const REFERENCE_SHARED_SERIES = 'algebra';

export function seriesForScriptId(scriptId) {
  for (const [prefix, series] of SERIES_PREFIX_RULES) {
    if (scriptId.startsWith(prefix)) {
      return series;
    }
  }
  return 'algebra';
}

export function scriptDirFor(videoOpsDir, scriptId) {
  return path.join(videoOpsDir, 'scripts', seriesForScriptId(scriptId), scriptId);
}

export function scriptFolderRelative(scriptId) {
  return `scripts/${seriesForScriptId(scriptId)}/${scriptId}`;
}

export function resolveSharedAssetPath(videoOpsDir, relativePath) {
  return path.join(videoOpsDir, 'scripts', REFERENCE_SHARED_SERIES, relativePath);
}
