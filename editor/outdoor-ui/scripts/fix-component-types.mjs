#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = path.join(import.meta.dirname, '..', 'src', 'components');

const typeImportMap = {
  StyleKit: "../../types",
  LiveBeat: "../../types",
  PipelineStageSnapshot: "../../types",
  CutReviewPayload: "../../types",
  AlignReviewPayload: "../../types",
  OutdoorJob: "../../types",
  StageResultPreview: "../../types",
  CoversListResponse: "../../types",
  PublishRecord: "../../types",
  PublishState: "../../types",
  SocialPosts: "../../types",
  LocalTakeView: "../../types",
  TakeDeliveryStep: "../../types",
  InboxFileSighting: "../../types",
  VideoOpsCatalogTake: "../../types",
  InboxStatusSnapshot: "../../types",
  ButtonProps: "../Button/Button.types",
  RemotionCompositionPath: "../../api/urls",
};

function extractExportTypes(source) {
  const results = [];
  const lines = source.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.startsWith('export type ') && !line.startsWith('export interface ')) continue;
    let chunk = line.replace(/^export /, '');
    let depth =
      (chunk.match(/\{/g) ?? []).length - (chunk.match(/\}/g) ?? []).length;
    while (depth > 0 && i + 1 < lines.length) {
      i += 1;
      chunk += `\n${lines[i]}`;
      depth +=
        (lines[i].match(/\{/g) ?? []).length - (lines[i].match(/\}/g) ?? []).length;
    }
    results.push(chunk.trim());
  }
  return results;
}

function neededImports(typeSource) {
  const imports = [];
  for (const [symbol, from] of Object.entries(typeImportMap)) {
    if (typeSource.includes(symbol)) {
      imports.push(`import type { ${symbol} } from '${from}';`);
    }
  }
  return [...new Set(imports)];
}

function patchComponent(filePath, dirName, types) {
  let source = fs.readFileSync(filePath, 'utf8');
  for (const block of types) {
    source = source.replace(`export ${block}`, '');
  }
  source = source.replace(/\n{3,}/g, '\n\n');

  if (!source.includes(`${dirName}.types`)) {
    source = source.replace(
      /^import /m,
      `import type { ${types
        .map((t) => t.match(/^(?:type|interface)\s+(\w+)/)?.[1])
        .filter(Boolean)
        .join(', ')} } from './${dirName}.types';\nimport `,
    );
  }

  if (!source.includes('.module.scss')) {
    source = source.replace(
      /^import /m,
      `import classes from './${dirName}.module.scss';\nimport { webClassName } from '../../utils/webClassName';\nimport `,
    );
  }

  if (!source.includes(`export type`) && !source.includes('export {')) {
    const names = types
      .map((t) => t.match(/^(?:type|interface)\s+(\w+)/)?.[1])
      .filter(Boolean);
    if (names.length) {
      const exportLine = `export type { ${names.join(', ')} } from './${dirName}.types';\n\n`;
      source = exportLine + source;
    }
  }

  fs.writeFileSync(filePath, source);
}

for (const dir of fs.readdirSync(root, { withFileTypes: true }).filter((d) => d.isDirectory())) {
  const dirName = dir.name;
  if (dirName === 'kitThemes') continue;
  const file =
    ['tsx', 'web.tsx']
      .map((ext) => path.join(root, dirName, `${dirName}.${ext}`))
      .find((p) => fs.existsSync(p));
  if (!file) continue;

  const source = fs.readFileSync(file, 'utf8');
  const types = extractExportTypes(source);
  if (types.length === 0) continue;

  const body = types.join('\n\n');
  const imports = neededImports(body);
  const typesPath = path.join(root, dirName, `${dirName}.types.ts`);
  fs.writeFileSync(
    typesPath,
    [`/** Types for ${dirName}. */`, ...imports, '', body, ''].join('\n'),
  );

  const scssPath = path.join(root, dirName, `${dirName}.module.scss`);
  if (!fs.existsSync(scssPath) || fs.readFileSync(scssPath, 'utf8').includes('tokens.$1')) {
    fs.writeFileSync(
      scssPath,
      `@use '../../app' as *;\n\n.root {\n  /* Web layout hooks for ${dirName} */\n}\n`,
    );
  }

  patchComponent(file, dirName, types);
  console.log(`fixed ${dirName}`);
}

console.log('done');
