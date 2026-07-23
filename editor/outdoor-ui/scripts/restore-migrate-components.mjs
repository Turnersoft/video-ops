#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const componentsDir = path.join(__dirname, '../src/components');
const originalsDir = '/tmp/outdoor-ui-originals';

const FILE_MAP = {
  'AlignFilmedClipControls.tsx': 'AlignFilmedClipControls/AlignFilmedClipControls.tsx',
  'AlignReviewPanel.tsx': 'AlignReviewPanel/AlignReviewPanel.tsx',
  'BeatOverviewStrip.tsx': 'BeatOverviewStrip/BeatOverviewStrip.tsx',
  'BeatThumbnailCard.tsx': 'BeatThumbnailCard/BeatThumbnailCard.tsx',
  'CompositeBlock.tsx': 'CompositeBlock/CompositeBlock.tsx',
  'CoverLibraryPanel.tsx': 'CoverLibraryPanel/CoverLibraryPanel.tsx',
  'CutReviewPanel.tsx': 'CutReviewPanel/CutReviewPanel.tsx',
  'InboxBanner.tsx': 'InboxBanner/InboxBanner.tsx',
  'LocalTakeCard.tsx': 'LocalTakeCard/LocalTakeCard.tsx',
  'PipelineStagesPanel.tsx': 'PipelineStagesPanel/PipelineStagesPanel.tsx',
  'PipelineVideo.web.tsx': 'PipelineVideo/PipelineVideo.web.tsx',
  'RemotionEmbed.web.tsx': 'RemotionEmbed/RemotionEmbed.web.tsx',
  'ScriptLibrarySidebar.tsx': 'ScriptLibrarySidebar/ScriptLibrarySidebar.tsx',
  'ScriptRemotionPreview.tsx': 'ScriptRemotionPreview/ScriptRemotionPreview.tsx',
  'SocialSetupPanel.tsx': 'SocialSetupPanel/SocialSetupPanel.tsx',
  'StabilizePanel.tsx': 'StabilizePanel/StabilizePanel.tsx',
  'TakeCard.tsx': 'TakeCard/TakeCard.tsx',
  'TakeResults.tsx': 'TakeResults/TakeResults.tsx',
  'TakeStepstones.tsx': 'TakeStepstones/TakeStepstones.tsx',
};

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
  fontStyle: 'font-style',
  lineHeight: 'line-height',
  letterSpacing: 'letter-spacing',
  textTransform: 'text-transform',
  zIndex: 'z-index',
  overflow: 'overflow',
  shadowColor: null,
  shadowOpacity: null,
  shadowRadius: null,
  shadowOffset: null,
  elevation: null,
  objectFit: 'object-fit',
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
  if (v.startsWith('...sharedStyles.')) return null;
  v = v.replace(/colors\.(\w+)/g, (_, key) => COLOR_MAP[key] ?? `$${camelToKebab(key)}`);
  v = v.replace(/spacing\.(\w+)/g, (_, key) => SPACING_MAP[key] ?? `$space-${key}`);
  v = v.replace(/radii\.(\w+)/g, (_, key) => RADII_MAP[key] ?? `$radius-${key}`);
  v = v.replace(/typography\.(\w+)/g, (_, key) => TYPO_MAP[key] ?? `$font-${camelToKebab(key)}`);
  v = v.replace(/StyleSheet\.hairlineWidth/g, '1px');
  if (/^['"](.*)['"]$/.test(v)) return v.slice(1, -1);
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
  if (start === -1) return { start: -1, end: -1, body: null };
  let depth = 0;
  let i = source.indexOf('{', start);
  const bodyStart = i + 1;
  for (; i < source.length; i += 1) {
    if (source[i] === '{') depth += 1;
    if (source[i] === '}') {
      depth -= 1;
      if (depth === 0) {
        let end = i + 1;
        while (end < source.length && (source[end] === ')' || source[end] === ';')) {
          end += 1;
        }
        return { start, end, body: source.slice(bodyStart, i) };
      }
    }
  }
  return { start: -1, end: -1, body: null };
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
    if (line.startsWith('...')) continue;
    const propMatch = line.match(/^(\w+):\s*(.+?),?$/);
    if (!propMatch) continue;
    const cssLine = convertProperty(propMatch[1], propMatch[2]);
    if (cssLine) props.push(cssLine);
  }
  if (props.length === 0) return null;
  return `.${name} {\n${props.join('\n')}\n}`;
}

function splitTopLevelCommaList(input) {
  const parts = [];
  let depth = 0;
  let current = '';
  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];
    if (ch === '(' || ch === '{' || ch === '[') depth += 1;
    if (ch === ')' || ch === '}' || ch === ']') depth -= 1;
    if (ch === ',' && depth === 0) {
      parts.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

function usesLocalStyles(expr) {
  return /\bclasses\.\w+/.test(expr);
}

function styleRefToClass(expr) {
  return expr;
}

function convertStyleExpression(expr) {
  const trimmed = expr.trim();
  if (!usesLocalStyles(trimmed)) {
    return { style: trimmed };
  }

  if (trimmed.startsWith('[')) {
    const inner = trimmed.slice(1, -1);
    const elements = splitTopLevelCommaList(inner);
    const classParts = [];
    const styleParts = [];

    for (const element of elements) {
      const part = element.trim();
      if (!part || part === 'null') continue;
      if (usesLocalStyles(part)) {
        classParts.push(styleRefToClass(part));
      } else {
        styleParts.push(part);
      }
    }

    const attrs = {};
    if (classParts.length) {
      attrs.className = `webClassName(${classParts.join(', ')})`;
    }
    if (styleParts.length) {
      attrs.style =
        styleParts.length === 1 ? styleParts[0] : `[${styleParts.join(', ')}]`;
    }
    return attrs;
  }

  return { className: `webClassName(${styleRefToClass(trimmed)})` };
}

function renderStyleAttrs(attrs) {
  const chunks = [];
  if (attrs.className) chunks.push(`className={${attrs.className}}`);
  if (attrs.style) chunks.push(`style={${attrs.style}}`);
  return chunks.join(' ');
}

function migrateTsx(source, componentName) {
  const { start, end, body } = extractStyleSheet(source);
  if (!body) {
    throw new Error(`No StyleSheet block in ${componentName}`);
  }

  let next = source;
  if (start >= 0) {
    next = next.slice(0, start) + next.slice(end);
  }

  const baseName = componentName.replace(/\.(web|native)$/, '');
  if (!next.includes(`${baseName}.module.scss`)) {
    next = next.replace(
      /^(export type[^\n]*\n)?/,
      (m) =>
        `${m}import classes from './${baseName}.module.scss';\nimport { webClassName } from '../../utils/webClassName';\n`,
    );
  }

  next = next.replace(
    /\bstyle=\{\(\{ pressed \}\) => \[\s*styles\.(\w+),\s*pressed \? styles\.(\w+) : null,\s*([^\]]+) \]\}/g,
    'className={webClassName(classes.$1, $3.trim().replace(/\\bstyles\\./g, \'classes.\'))} style={({ pressed }) => (pressed ? { opacity: 0.85 } : undefined)}',
  );

  next = next.replace(/\bstyles\.(\w+)/g, 'classes.$1');
  next = next.replace(/\bstyle=\{(\[[\s\S]*?\])\}/g, (full, expr) => {
    if (!usesLocalStyles(expr)) return full;
    return renderStyleAttrs(convertStyleExpression(expr.trim()));
  });

  next = next.replace(/\bstyle=\{(classes\.\w+)\}/g, 'className={webClassName($1)}');

  next = next.replace(
    /className=\{webClassName\((classes\.\w+)\)\} style=\{(lineStyleForKind|textStyleForKind)\(([^)]+)\)\}/g,
    'className={webClassName($1, $2($3))}',
  );

  next = next.replace(/\binputStyle=\{(classes\.\w+)\}/g, 'inputClassName={webClassName($1)}');
  next = next.replace(
    /\bcontentContainerStyle=\{(\[[\s\S]*?\])\}/g,
    (full, expr) => {
      if (!usesLocalStyles(expr)) return full;
      const attrs = convertStyleExpression(expr);
      return attrs.className
        ? `contentContainerClassName={${attrs.className}}`
        : full;
    },
  );
  next = next.replace(
    /\bcontentContainerStyle=\{(classes\.\w+)\}/g,
    'contentContainerClassName={webClassName($1)}',
  );

  next = next.replace(
    /style:\s*videoStyle,/g,
    `className: webClassName(tall ? classes.webVideoTall : classes.webVideo),
          style: tall ? { height: tallHeight, minHeight: tallHeight } : undefined,`,
  );
  next = next.replace(
    /const videoStyle = tall[\s\S]*?;\n\n/,
    '',
  );

  next = next.replace(
    /style:\s*classes\.(\w+),/g,
    'className: webClassName(classes.$1),',
  );

  next = next.replace(/,\s*StyleSheet\b|\bStyleSheet,\s*/g, '');
  next = next.replace(/\{\s*StyleSheet,\s*/g, '{ ');
  next = next.replace(/,\s*StyleSheet\s*\}/g, ' }');

  next = next.replace(
    /className=\{webClassName\(classes\.panel\)\}\s*\n\s*contentContainerClassName/,
    'className={webClassName(classes.scroll)}\n          contentContainerClassName',
  );

  next = next.replace(/\}\n\n\);\s*$/g, '}\n');
  next = next.replace(/\}\);\n\n\);\s*$/g, '});\n');
  next = next.replace(/\n{3,}/g, '\n\n');
  return next.trimEnd() + '\n';
}

for (const [originalName, destRel] of Object.entries(FILE_MAP)) {
  const originalPath = path.join(originalsDir, originalName);
  const destPath = path.join(componentsDir, destRel);
  const dirName = path.basename(path.dirname(destRel));
  const componentFileName = path.basename(destRel, '.tsx');

  const source = fs.readFileSync(originalPath, 'utf8');
  const { body } = extractStyleSheet(source);
  if (!body) {
    console.error(`skip ${originalName}: no StyleSheet`);
    continue;
  }

  const scssPath = path.join(componentsDir, dirName, `${dirName}.module.scss`);
  const blocks = parseStyleBlocks(body);
  const scssBlocks = blocks.map((b) => blockToScss(b.name, b.content)).filter(Boolean);
  fs.writeFileSync(scssPath, [`@use '../../app' as *;`, '', ...scssBlocks, ''].join('\n'), 'utf8');

  const migrated = migrateTsx(source, componentFileName);
  fs.writeFileSync(destPath, migrated, 'utf8');
  console.log(`migrated ${destRel} (${scssBlocks.length} classes)`);
}

console.log('done');
