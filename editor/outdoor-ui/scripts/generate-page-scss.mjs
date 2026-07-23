#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pagesDir = path.join(__dirname, '../src/pages');

const COLOR_MAP = {
  bg: '$bg',
  text: '$text',
  muted: '$muted',
  muted2: '$muted2',
  orange: '$orange',
  orangeText: '$orange-text',
  card: '$card',
  cardBorder: '$card-border',
  pill: '$pill',
  badgePending: '$badge-pending',
  badgeFilmed: '$badge-filmed',
  badgeFilmedText: '$badge-filmed-text',
  section: '$section',
  online: '$online',
  offline: '$offline',
  danger: '$danger',
  code: '$code',
  videoBg: '$video-bg',
  black: '$black',
  white: '$white',
  headerBg: '$header-bg',
  runChipActiveBg: '$run-chip-active-bg',
  runChipActiveText: '$run-chip-active-text',
  bannerOnlineBg: '$banner-online-bg',
  bannerOfflineBg: '$banner-offline-bg',
};

const SPACING_MAP = {
  xs: '$space-xs',
  sm: '$space-sm',
  md: '$space-md',
  lg: '$space-lg',
  xl: '$space-xl',
  xxl: '$space-xxl',
};

const RADII_MAP = {
  sm: '$radius-sm',
  md: '$radius-md',
  pill: '$radius-pill',
};

const TYPO_MAP = {
  body: '$font-body',
  bodyLineHeight: '$font-body-line-height',
  small: '$font-small',
  tiny: '$font-tiny',
  title: '$font-title',
  cardTitle: '$font-card-title',
  section: '$font-section',
};

const PROP_MAP = {
  flexDirection: 'flex-direction',
  alignItems: 'align-items',
  alignSelf: 'align-self',
  justifyContent: 'justify-content',
  flexWrap: 'flex-wrap',
  flexGrow: 'flex-grow',
  flexShrink: 'flex-shrink',
  flexBasis: 'flex-basis',
  minWidth: 'min-width',
  maxWidth: 'max-width',
  minHeight: 'min-height',
  maxHeight: 'max-height',
  paddingHorizontal: 'padding-inline',
  paddingVertical: 'padding-block',
  marginHorizontal: 'margin-inline',
  marginVertical: 'margin-block',
  marginTop: 'margin-top',
  marginBottom: 'margin-bottom',
  borderWidth: 'border-width',
  borderColor: 'border-color',
  borderRadius: 'border-radius',
  borderTopWidth: 'border-top-width',
  borderTopColor: 'border-top-color',
  borderBottomWidth: 'border-bottom-width',
  borderBottomColor: 'border-bottom-color',
  backgroundColor: 'background-color',
  fontSize: 'font-size',
  fontWeight: 'font-weight',
  fontFamily: 'font-family',
  lineHeight: 'line-height',
  letterSpacing: 'letter-spacing',
  textTransform: 'text-transform',
  zIndex: 'z-index',
  shadowColor: null,
  shadowOpacity: null,
  shadowRadius: null,
  shadowOffset: null,
  elevation: null,
};

const UNITLESS_PROPS = new Set([
  'flex',
  'flex-grow',
  'flex-shrink',
  'opacity',
  'z-index',
  'font-weight',
  'line-height',
]);

function camelToKebab(name) {
  return name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

function convertJsValue(value) {
  let v = value.trim().replace(/,$/, '');
  if (v.startsWith('...sharedStyles.')) {
    return null;
  }
  v = v.replace(/colors\.(\w+)/g, (_, key) => COLOR_MAP[key] ?? `$${camelToKebab(key)}`);
  v = v.replace(/spacing\.(\w+)/g, (_, key) => SPACING_MAP[key] ?? `$space-${key}`);
  v = v.replace(/radii\.(\w+)/g, (_, key) => RADII_MAP[key] ?? `$radius-${key}`);
  v = v.replace(/typography\.(\w+)/g, (_, key) => TYPO_MAP[key] ?? `$font-${camelToKebab(key)}`);
  v = v.replace(/StyleSheet\.hairlineWidth/g, '1px');
  v = v.replace(/Platform\.OS === ["']web["'] \? ["']fixed["'] : ["']absolute["']/g, 'fixed');
  v = v.replace(/Platform\.select\(\{[^}]+\}\)/g, 'Menlo, monospace');
  if (/^['"](.*)['"]$/.test(v)) {
    return v.slice(1, -1);
  }
  return v;
}

function formatCSSValue(prop, value) {
  if (value == null || value === '') return null;
  if (value.startsWith('$')) return value;
  if (value === 'true' || value === 'false') return value;
  if (/^[\d.]+(%|px|em|rem|vh|vw)?$/.test(value)) return value;
  if (value.startsWith('rgba') || value.startsWith('#')) return value;
  if (value.includes(',')) return value;
  if (UNITLESS_PROPS.has(prop) && /^[\d.]+$/.test(value)) return value;
  if (/^[\d.]+$/.test(value)) return `${value}px`;
  return value;
}

function convertProperty(prop, value) {
  const cssProp = PROP_MAP[prop] ?? camelToKebab(prop);
  if (cssProp === null) return null;
  const converted = convertJsValue(value);
  if (converted === null) return null;
  const cssValue = formatCSSValue(cssProp, converted);
  if (cssValue == null) return null;
  return `  ${cssProp}: ${cssValue};`;
}

function extractStyleSheet(source) {
  const start = source.indexOf('const styles = StyleSheet.create({');
  if (start === -1) return null;
  let depth = 0;
  let i = source.indexOf('{', start);
  const bodyStart = i + 1;
  for (; i < source.length; i += 1) {
    if (source[i] === '{') depth += 1;
    if (source[i] === '}') {
      depth -= 1;
      if (depth === 0) {
        return source.slice(bodyStart, i);
      }
    }
  }
  return null;
}

function parseStyleBlocks(body) {
  const blocks = [];
  const re = /(\w+):\s*\{/g;
  let match;
  while ((match = re.exec(body)) !== null) {
    const name = match[1];
    let depth = 0;
    let i = match.index + match[0].length - 1;
    const start = i + 1;
    for (; i < body.length; i += 1) {
      if (body[i] === '{') depth += 1;
      if (body[i] === '}') {
        depth -= 1;
        if (depth === 0) {
          blocks.push({ name, content: body.slice(start, i) });
          break;
        }
      }
    }
  }
  return blocks;
}

function blockToScss(name, content) {
  const lines = content
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const props = [];
  for (const line of lines) {
    const propMatch = line.match(/^(\w+):\s*(.+?),?$/);
    if (!propMatch) continue;
    const cssLine = convertProperty(propMatch[1], propMatch[2]);
    if (cssLine) props.push(cssLine);
  }

  if (props.length === 0) return null;
  return `.${name} {\n${props.join('\n')}\n}`;
}

function generateForPage(pageName) {
  const pageDir = path.join(pagesDir, pageName);
  const tsxPath = path.join(pageDir, `${pageName}.tsx`);
  const webPath = path.join(pageDir, `${pageName}.web.tsx`);
  const scssPath = path.join(pageDir, `${pageName}.module.scss`);

  const sources = [tsxPath, webPath].filter((p) => fs.existsSync(p));
  const blocks = [];
  for (const sourcePath of sources) {
    const body = extractStyleSheet(fs.readFileSync(sourcePath, 'utf8'));
    if (!body) continue;
    blocks.push(...parseStyleBlocks(body));
  }

  const unique = new Map();
  for (const block of blocks) unique.set(block.name, block);

  const scssBlocks = [...unique.values()]
    .map((b) => blockToScss(b.name, b.content))
    .filter(Boolean);
  const output = [`@use '../../app' as *;`, '', ...scssBlocks, ''].join('\n');
  fs.writeFileSync(scssPath, output, 'utf8');
  console.log(`Wrote ${path.relative(pagesDir, scssPath)} (${scssBlocks.length} classes)`);
}

for (const entry of fs.readdirSync(pagesDir, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  generateForPage(entry.name);
}
