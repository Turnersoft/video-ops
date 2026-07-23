#!/usr/bin/env node
/**
 * Convert className={webClassName(...)} on RN components to style={webModuleStyle(...)}.
 * Merges with an existing style prop on the same element when present.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcRoot = path.join(__dirname, '../src');

/** @param {string} dir */
function walkTsx(dir) {
  /** @type {string[]} */
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walkTsx(full));
    } else if (entry.name.endsWith('.tsx')) {
      out.push(full);
    }
  }
  return out;
}

/**
 * @param {string} source
 * @returns {string}
 */
function transformSource(source) {
  let i = 0;
  let out = '';

  while (i < source.length) {
    const idx = source.indexOf('className={webClassName(', i);
    if (idx === -1) {
      out += source.slice(i);
      break;
    }

    out += source.slice(i, idx);

    const openParen = idx + 'className={webClassName('.length - 1;
    let depth = 0;
    let j = openParen;
    for (; j < source.length; j++) {
      const ch = source[j];
      if (ch === '(') depth++;
      else if (ch === ')') {
        depth--;
        if (depth === 0) break;
      }
    }
    if (depth !== 0) {
      throw new Error(`Unbalanced parens at ${idx}`);
    }

    j += 1; // past closing ')'

    let k = j;
    while (k < source.length && /\s/.test(source[k])) k++;

    const callText = source
      .slice(idx + 'className={'.length, j)
      .replace('webClassName', 'webModuleStyle');

    if (source.slice(k, k + 6) === 'style=') {
      const styleStart = k + 6;
      if (source[styleStart] !== '{') {
        throw new Error(`Expected style={{ at ${k}`);
      }

      let styleDepth = 0;
      let m = styleStart;
      for (; m < source.length; m++) {
        const ch = source[m];
        if (ch === '{') styleDepth++;
        else if (ch === '}') {
          styleDepth--;
          if (styleDepth === 0) break;
        }
      }
      if (styleDepth !== 0) {
        throw new Error(`Unbalanced braces in style at ${k}`);
      }

      const styleInner = source.slice(styleStart + 1, m).trim();
      let mergedInner;
      if (styleInner.startsWith('[')) {
        mergedInner = `[${callText}, ${styleInner.slice(1)}`;
      } else {
        mergedInner = `[${callText}, ${styleInner}]`;
      }
      out += `style={${mergedInner}}`;
      i = m + 1;
    } else {
      out += `style={${callText}}`;
      i = j + 1;
    }
  }

  return out;
}

/**
 * @param {string} source
 * @returns {string}
 */
function updateImports(source) {
  if (!source.includes('webModuleStyle')) {
    return source;
  }
  if (!source.includes('webClassName')) {
    if (source.includes('webModuleStyle')) {
      return source.replace(
        /import\s*\{\s*webClassName\s*\}\s*from\s*(['"][^'"]+webClassName['"])/,
        "import { webModuleStyle } from $1",
      );
    }
    return source;
  }
  return source.replace(
    /import\s*\{\s*webClassName\s*\}\s*from\s*(['"][^'"]+webClassName['"])/,
    "import { webModuleStyle, webClassName } from $1",
  );
}

let changed = 0;
for (const file of walkTsx(srcRoot)) {
  const before = fs.readFileSync(file, 'utf8');
  if (!before.includes('className={webClassName(')) {
    continue;
  }
  let after;
  try {
    after = transformSource(before);
  } catch (err) {
    console.error(`Failed: ${path.relative(srcRoot, file)}`);
    throw err;
  }
  after = updateImports(after);
  if (after !== before) {
    fs.writeFileSync(file, after);
    changed++;
    console.log(path.relative(srcRoot, file));
  }
}

console.log(`Updated ${changed} files.`);
