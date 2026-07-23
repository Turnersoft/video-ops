#!/usr/bin/env node
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

let fixed = 0;
for (const file of walk(srcRoot)) {
  let source = fs.readFileSync(file, 'utf8');
  const before = source;
  source = source.replace(/style=\{webModuleStyle\(([\s\S]*?)\)\}\}/g, 'style={webModuleStyle($1)}');
  if (source !== before) {
    fs.writeFileSync(file, source);
    fixed++;
    console.log(path.relative(srcRoot, file));
  }
}
console.log(`Fixed ${fixed} files.`);
