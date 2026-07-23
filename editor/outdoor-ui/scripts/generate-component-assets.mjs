#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const componentsRoot = path.join(import.meta.dirname, '..', 'src', 'components');

function walkComponentDirs() {
  return fs
    .readdirSync(componentsRoot, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name !== 'kitThemes')
    .map((d) => d.name);
}

function mainFile(dirName) {
  const dir = path.join(componentsRoot, dirName);
  const candidates = [
    `${dirName}.tsx`,
    `${dirName}.web.tsx`,
  ];
  for (const file of candidates) {
    const full = path.join(dir, file);
    if (fs.existsSync(full)) return full;
  }
  return null;
}

function extractTypes(source, dirName) {
  const lines = source.split('\n');
  const typeLines = [];
  let collecting = false;
  let depth = 0;

  for (const line of lines) {
    if (/^export type /.test(line) || /^export interface /.test(line)) {
      collecting = true;
      depth += (line.match(/[{]/g) ?? []).length;
      depth -= (line.match(/[}]/g) ?? []).length;
      typeLines.push(line.replace(/^export /, ''));
      if (depth <= 0 && line.includes(';')) collecting = false;
      continue;
    }
    if (collecting) {
      depth += (line.match(/[{]/g) ?? []).length;
      depth -= (line.match(/[}]/g) ?? []).length;
      typeLines.push(line);
      if (depth <= 0) collecting = false;
    }
  }

  if (typeLines.length === 0) return null;
  const body = typeLines.join('\n').trim();
  const imports = new Set();
  if (body.includes('ButtonProps')) imports.add("import type { ButtonProps } from '../Button/Button.types';");
  if (body.includes('StyleKit')) imports.add("import type { StyleKit } from '../../types';");
  if (body.includes('RemotionCompositionPath')) imports.add("import type { RemotionCompositionPath } from '../../api/urls';");
  if (body.includes('PipelineStageSnapshot')) imports.add("import type { PipelineStageSnapshot } from '../../types';");

  const header = [`/** Types for ${dirName}. */`, ...imports, ''].filter(Boolean).join('\n');
  return `${header}${body}\n`;
}

function styleBlockToScss(source) {
  const match = source.match(/const styles = StyleSheet\.create\(\{([\s\S]*?)\}\);/);
  if (!match) return `@use '../../app' as *;\n\n.root {\n}\n`;

  const block = match[1];
  const rules = [];
  let current = null;
  let depth = 0;
  let body = [];

  for (const line of block.split('\n')) {
    const keyMatch = line.match(/^\s{2}(\w+):\s*\{/);
    if (keyMatch && depth === 0) {
      if (current) rules.push({ name: current, body });
      current = keyMatch[1].replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '');
      body = [];
      depth = 1;
      continue;
    }
    if (current) {
      depth += (line.match(/\{/g) ?? []).length;
      depth -= (line.match(/\}/g) ?? []).length;
      if (depth <= 0) {
        rules.push({ name: current, body });
        current = null;
        body = [];
        continue;
      }
      body.push(line);
    }
  }

  const cssLines = ["@use '../../app' as *;", ''];
  for (const rule of rules) {
    cssLines.push(`.${rule.name} {`);
    for (const raw of rule.body) {
      const line = raw.trim().replace(/,$/, '');
      if (!line || line === '{' || line === '}') continue;
      const prop = line
        .replace(/^(\w+):/, (_, k) => `${k.replace(/([A-Z])/g, '-$1').toLowerCase()}:`)
        .replace(/colors\.(\w+)/g, 'tokens.$$1')
        .replace(/spacing\.(\w+)/g, 'tokens.$space-$1')
        .replace(/radii\.(\w+)/g, 'tokens.$radius-$1')
        .replace(/typography\.(\w+)/g, 'tokens.$font-$1')
        .replace(/StyleSheet\.hairlineWidth/, '1px');
      cssLines.push(`  ${prop}`);
    }
    cssLines.push('}', '');
  }
  if (cssLines.length <= 2) cssLines.push('.root {}', '');
  return cssLines.join('\n');
}

function stripExportedTypes(source) {
  return source
    .split('\n')
    .filter((line) => !/^export type /.test(line) && !/^export interface /.test(line))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n');
}

for (const dirName of walkComponentDirs()) {
  const file = mainFile(dirName);
  if (!file) continue;
  const source = fs.readFileSync(file, 'utf8');
  const dir = path.dirname(file);
  const typesPath = path.join(dir, `${dirName}.types.ts`);
  const scssPath = path.join(dir, `${dirName}.module.scss`);

  if (!fs.existsSync(typesPath) && !source.includes(`${dirName}.types`)) {
    const types = extractTypes(source, dirName);
    if (types) {
      fs.writeFileSync(typesPath, types);
      console.log(`types: ${dirName}`);
    } else if (source.includes('Props')) {
      fs.writeFileSync(typesPath, `/** Types for ${dirName}. */\nexport type ${dirName}Props = Record<string, never>;\n`);
      console.log(`types stub: ${dirName}`);
    }
  }

  if (!fs.existsSync(scssPath)) {
    fs.writeFileSync(scssPath, styleBlockToScss(source));
    console.log(`scss: ${dirName}`);
  }
}

console.log('generated types/scss');
