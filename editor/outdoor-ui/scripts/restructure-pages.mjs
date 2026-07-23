#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const src = path.join(__dirname, '../src');
const screensDir = path.join(src, 'screens');
const pagesDir = path.join(src, 'pages');

const PAGE_GROUPS = [
  { name: 'LibraryScreen', files: ['LibraryScreen.tsx'] },
  { name: 'PlatformsScreen', files: ['PlatformsScreen.tsx'] },
  { name: 'TakePipelineScreen', files: ['TakePipelineScreen.tsx'] },
  { name: 'ScriptDetailScreen', files: ['ScriptDetailScreen.tsx'] },
  { name: 'AnimationEditorScreen', files: ['AnimationEditorScreen.tsx'] },
  {
    name: 'FilmScreen',
    files: ['FilmScreen.tsx', 'FilmScreen.web.tsx'],
  },
];

function fixPageImports(content) {
  return content
    .replaceAll('from "../api/', 'from "../../api/')
    .replaceAll("from '../api/", "from '../../api/")
    .replaceAll('from "../components/', 'from "../../components/')
    .replaceAll("from '../components/", "from '../../components/")
    .replaceAll('from "../context/', 'from "../../context/')
    .replaceAll("from '../context/", "from '../../context/")
    .replaceAll('from "../hooks/', 'from "../../hooks/')
    .replaceAll("from '../hooks/", "from '../../hooks/")
    .replaceAll('from "../theme"', 'from "../../theme"')
    .replaceAll("from '../theme'", "from '../../theme'")
    .replaceAll('from "../layout"', 'from "../../layout"')
    .replaceAll("from '../layout'", "from '../../layout'")
    .replaceAll('from "../types"', 'from "../../types"')
    .replaceAll("from '../types'", "from '../../types'")
    .replaceAll('from "../utils/', 'from "../../utils/')
    .replaceAll("from '../utils/", "from '../../utils/")
    .replaceAll("from './", "from '../");
}

function ensureModuleScss(pageDir, pageName) {
  const scssPath = path.join(pageDir, `${pageName}.module.scss`);
  if (fs.existsSync(scssPath)) return;
  fs.writeFileSync(
    scssPath,
    `@use '../../app' as *;\n\n.root {\n  flex: 1;\n}\n`,
    'utf8',
  );
}

function ensureIndex(pageDir, pageName, hasProps) {
  const indexPath = path.join(pageDir, 'index.ts');
  const propsExport = `${pageName}Props`;
  const exportLine = hasProps
    ? `export { ${pageName}, type ${propsExport} } from './${pageName}';`
    : `export { ${pageName} } from './${pageName}';`;
  fs.writeFileSync(indexPath, `${exportLine}\n`, 'utf8');
}

function wireModuleImport(content, pageName) {
  if (content.includes(`${pageName}.module.scss`)) return content;
  const importLine = `import classes from './${pageName}.module.scss';\n`;
  const lastImport = content.lastIndexOf('\nimport ');
  if (lastImport === -1) return importLine + content;
  const end = content.indexOf('\n', lastImport + 1);
  return content.slice(0, end + 1) + importLine + content.slice(end + 1);
}

if (!fs.existsSync(screensDir)) {
  console.log('screens/ already migrated');
  process.exit(0);
}

fs.mkdirSync(pagesDir, { recursive: true });

for (const group of PAGE_GROUPS) {
  const pageDir = path.join(pagesDir, group.name);
  fs.mkdirSync(pageDir, { recursive: true });

  for (const file of group.files) {
    const from = path.join(screensDir, file);
    if (!fs.existsSync(from)) continue;
    const base = path.basename(file);
    const to = path.join(pageDir, base);
    let content = fs.readFileSync(from, 'utf8');
    content = fixPageImports(content);
    if (base === `${group.name}.tsx` || base === `${group.name}.web.tsx`) {
      content = wireModuleImport(content, group.name);
    }
    fs.writeFileSync(to, content, 'utf8');
  }

  ensureModuleScss(pageDir, group.name);

  const mainTsx = path.join(pageDir, `${group.name}.tsx`);
  const propsExport = `${group.name}Props`;
  const hasProps =
    fs.existsSync(mainTsx) &&
    fs.readFileSync(mainTsx, 'utf8').includes(`export type ${propsExport}`);
  ensureIndex(pageDir, group.name, hasProps);
}

const pagesIndex = path.join(pagesDir, 'index.ts');
const barrel = PAGE_GROUPS.map((g) => `export * from './${g.name}';`).join('\n');
fs.writeFileSync(pagesIndex, `${barrel}\n`, 'utf8');

for (const file of fs.readdirSync(screensDir)) {
  fs.unlinkSync(path.join(screensDir, file));
}
fs.rmdirSync(screensDir);

console.log('Restructured screens → pages/');
