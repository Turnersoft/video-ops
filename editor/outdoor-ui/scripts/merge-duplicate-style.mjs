#!/usr/bin/env node
/**
 * Merge duplicate style props where webModuleStyle(...) is followed by style={...}.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const srcRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '../src');

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.name.endsWith('.tsx')) out.push(full);
  }
  return out;
}

/** @param {string} source @param {number} start index of opening `{` after `style=` */
function readJsxExpression(source, start) {
  if (source[start] !== '{') {
    throw new Error(`Expected { at ${start}`);
  }
  let depth = 0;
  for (let i = start; i < source.length; i++) {
    const ch = source[i];
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) {
        return { inner: source.slice(start + 1, i), end: i + 1 };
      }
    }
  }
  throw new Error(`Unbalanced braces at ${start}`);
}

/** @param {string} source */
function mergeDuplicateStyles(source) {
  let out = '';
  let i = 0;

  while (i < source.length) {
    const marker = 'style={webModuleStyle(';
    const idx = source.indexOf(marker, i);
    if (idx === -1) {
      out += source.slice(i);
      break;
    }

    out += source.slice(i, idx);
    const exprStart = idx + 'style='.length;
    const first = readJsxExpression(source, exprStart);

    let k = first.end;
    while (k < source.length && /\s/.test(source[k])) k++;

    if (source.slice(k, k + 6) !== 'style=') {
      out += source.slice(idx, first.end);
      i = first.end;
      continue;
    }

    const secondStart = k + 6;
    const second = readJsxExpression(source, secondStart);

    const firstInner = first.inner.trim();
    const secondInner = second.inner.trim();
    let mergedInner;
    if (secondInner.startsWith('[')) {
      mergedInner = `[${firstInner}, ${secondInner.slice(1)}`;
    } else {
      mergedInner = `[${firstInner}, ${secondInner}]`;
    }

    out += `style={${mergedInner}}`;
    i = second.end;
  }

  return out;
}

let changed = 0;
for (const file of walk(srcRoot)) {
  const before = fs.readFileSync(file, 'utf8');
  const after = mergeDuplicateStyles(before);
  if (after !== before) {
    fs.writeFileSync(file, after);
    changed++;
    console.log(path.relative(srcRoot, file));
  }
}
console.log(`Merged duplicates in ${changed} files.`);
