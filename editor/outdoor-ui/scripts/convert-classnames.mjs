#!/usr/bin/env node
/**
 * Convert className={classes...} on RN components to style={webModuleStyle(...)}.
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

function readJsxExpression(source, start) {
  if (source[start] !== '{') throw new Error(`Expected { at ${start}`);
  let depth = 0;
  for (let i = start; i < source.length; i++) {
    const ch = source[i];
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return { inner: source.slice(start + 1, i), end: i + 1 };
    }
  }
  throw new Error(`Unbalanced at ${start}`);
}

function parseClassExpression(inner) {
  const trimmed = inner.trim();
  const joinMatch = trimmed.match(/^\[([\s\S]*)\]\.filter\(Boolean\)\.join\(['"]\s*['"]\)$/);
  if (joinMatch) {
    return joinMatch[1].trim();
  }
  return trimmed;
}

function toModuleStyle(args) {
  if (!args) return null;
  return `webModuleStyle(${args})`;
}

function ensureImport(source, file) {
  if (!source.includes('webModuleStyle(')) return source;
  if (source.includes('utils/webClassName')) return source;
  const rel = path.relative(path.dirname(file), path.join(srcRoot, 'utils/webClassName')).replace(/\\/g, '/');
  const line = `import { webModuleStyle, webClassName } from '${rel.startsWith('.') ? rel : './' + rel}';`;
  const firstImport = source.match(/^import .+;\n/m);
  if (!firstImport) return line + '\n' + source;
  const insertAt = firstImport.index + firstImport[0].length;
  return source.slice(0, insertAt) + line + '\n' + source.slice(insertAt);
}

function transformSource(source) {
  let out = '';
  let i = 0;

  while (i < source.length) {
    const idx = source.indexOf('className={', i);
    if (idx === -1) {
      out += source.slice(i);
      break;
    }

    // Skip createElement object props: `className:`
    const prev = source[idx - 1];
    if (prev === ':') {
      out += source.slice(i, idx + 'className={'.length);
      i = idx + 'className={'.length;
      continue;
    }

    out += source.slice(i, idx);
    const exprStart = idx + 'className='.length;
    const expr = readJsxExpression(source, exprStart);
    const args = parseClassExpression(expr.inner);
    const moduleStyle = toModuleStyle(args);
    if (!moduleStyle) {
      out += source.slice(idx, expr.end);
      i = expr.end;
      continue;
    }

    let k = expr.end;
    while (k < source.length && /\s/.test(source[k])) k++;

    if (source.slice(k, k + 6) === 'style=') {
      const styleStart = k + 6;
      const styleExpr = readJsxExpression(source, styleStart);
      const styleInner = styleExpr.inner.trim();
      const merged = styleInner.startsWith('[')
        ? `[${moduleStyle}, ${styleInner.slice(1)}`
        : `[${moduleStyle}, ${styleInner}]`;
      out += `style={${merged}}`;
      i = styleExpr.end;
    } else {
      out += `style={${moduleStyle}}`;
      i = expr.end;
    }
  }

  return out;
}

let changed = 0;
for (const file of walk(srcRoot)) {
  const before = fs.readFileSync(file, 'utf8');
  if (!before.includes('className={')) continue;
  let after = transformSource(before);
  if (after.includes('webModuleStyle(')) {
    after = ensureImport(after, file);
  }
  if (after !== before) {
    fs.writeFileSync(file, after);
    changed++;
    console.log(path.relative(srcRoot, file));
  }
}
console.log(`Updated ${changed} files.`);
