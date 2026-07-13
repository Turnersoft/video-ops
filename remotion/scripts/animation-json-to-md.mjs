#!/usr/bin/env node
/**
 * Convert animation.json → animation.md (unified authoring style).
 * Usage: node scripts/animation-json-to-md.mjs [--force] [scriptId...]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const videoOpsRoot = path.resolve(__dirname, '..', '..');
const force = process.argv.includes('--force');
const onlyIds = process.argv.slice(2).filter((arg) => !arg.startsWith('-'));

function teleprompterTitleFromScriptId(scriptId) {
  const setsMatch = scriptId.match(/^sets-v2-(\d+)-(.*)$/);
  if (setsMatch) {
    return `${setsMatch[1]}_${setsMatch[2].replace(/-/g, '_')}`;
  }
  return scriptId.replace(/-/g, '_');
}

function escapeFence(code) {
  return String(code ?? '').replace(/\n+$/, '');
}

function isAsBefore(code) {
  return typeof code === 'string' && /^as\s+before$/i.test(code.trim());
}

function isUsableCode(code) {
  return typeof code === 'string' && code.trim().length > 0;
}

function highlightLines(needles) {
  if (!Array.isArray(needles) || needles.length === 0) {
    return '';
  }
  return `Highlights:\n\n${needles.map((needle) => `- \`${needle}\``).join('\n')}\n`;
}

function listLines(label, needles) {
  if (!Array.isArray(needles) || needles.length === 0) {
    return '';
  }
  return `${label}:\n\n${needles.map((needle) => `- \`${needle}\``).join('\n')}\n`;
}

function paneSection(heading, lang, pane, previousCode) {
  if (!pane) {
    return { markdown: '', nextCode: previousCode };
  }
  let code = pane.code;
  if (isAsBefore(code)) {
    if (!previousCode) {
      return { markdown: '', nextCode: previousCode };
    }
    code = 'as before';
  } else if (!isUsableCode(code)) {
    return { markdown: '', nextCode: previousCode };
  } else {
    previousCode = code;
  }

  const resolvedForHighlights = isAsBefore(code) ? previousCode : code;
  const highlights = (pane.highlights ?? []).filter(
    (needle) => typeof needle === 'string' && resolvedForHighlights.includes(needle),
  );
  const goal = (pane.goal ?? []).filter((needle) => typeof needle === 'string' && needle.trim());
  const knowledge = (pane.knowledge ?? []).filter(
    (needle) => typeof needle === 'string' && needle.trim(),
  );

  let markdown = `### ${heading}\n\n\`\`\`${lang}\n${escapeFence(code)}\n\`\`\`\n\n`;
  markdown += highlightLines(highlights);
  if (lang === 'lean') {
    markdown += listLines('Goal', goal);
  } else {
    markdown += listLines('Knowledge', knowledge);
  }
  return { markdown, nextCode: isAsBefore(code) ? previousCode : code };
}

function sceneDirectives(scene) {
  const pace = scene.teleprompter?.pace ?? {};
  const display = scene.compare?.display ?? {};
  const lines = [
    `layout: ${scene.layout ?? 'dual-panel'}`,
    `burn-captions: ${scene.burnCaptions === false ? 'false' : 'true'}`,
    scene.visualNotes ? `visual-notes: ${String(scene.visualNotes).replace(/\n/g, ' ')}` : null,
    `teleprompter.position: ${scene.teleprompter?.position ?? 'below-canvas'}`,
    `pace.syllables-per-second: ${pace.syllablesPerSecond ?? 3.6}`,
    `pace.pause-after-beat: ${pace.pauseAfterBeat ?? 0.4}`,
    `pace.min-beat-seconds: ${pace.minBeatSeconds ?? 4}`,
    `pace.pace-factor: ${pace.paceFactor ?? 1.25}`,
  ];
  if (display.editorFontScale) {
    lines.push(`display.editor-font-scale: ${display.editorFontScale}`);
  }
  if (display.leanEditorFontScale) {
    lines.push(`display.lean-editor-font-scale: ${display.leanEditorFontScale}`);
  }
  if (display.renderFontScale) {
    lines.push(`display.render-font-scale: ${display.renderFontScale}`);
  }
  return lines.filter(Boolean).join('\n');
}

function overlayBlocks(overlays) {
  if (!overlays || typeof overlays !== 'object') {
    return '';
  }
  let out = '';
  for (const [name, def] of Object.entries(overlays)) {
    if (!def || typeof def !== 'object') {
      continue;
    }
    const lines = [`type: ${def.type ?? 'textbook'}`];
    if (def.aataExcerpt) {
      lines.push(`aata-excerpt: ${def.aataExcerpt}`);
    }
    if (def.placement) {
      lines.push(`placement: ${def.placement}`);
    }
    if (def.src) {
      lines.push(`src: ${def.src}`);
    }
    if (def.objectFit) {
      lines.push(`object-fit: ${def.objectFit}`);
    }
    if (def.label) {
      lines.push(`label: ${def.label}`);
    }
    out += `\n## Overlay: ${name}\n\n<!--\n${lines.join('\n')}\n-->\n`;
  }
  return out;
}

function beatDirectives(beat) {
  const lines = [];
  if (beat.overlay) {
    lines.push(`overlay: ${beat.overlay}`);
  }
  if (beat.focus) {
    lines.push(`focus: ${beat.focus}`);
  }
  if (beat.presenter) {
    lines.push(`presenter: ${beat.presenter}`);
  }
  if (typeof beat.durationSeconds === 'number') {
    lines.push(`duration: ${beat.durationSeconds}`);
  }
  if (beat.fontScales?.editorFontScale) {
    lines.push(`font.editor: ${beat.fontScales.editorFontScale}`);
  }
  if (beat.fontScales?.leanEditorFontScale) {
    lines.push(`font.lean: ${beat.fontScales.leanEditorFontScale}`);
  }
  if (beat.fontScales?.renderFontScale) {
    lines.push(`font.render: ${beat.fontScales.renderFontScale}`);
  }
  lines.push('allow-script-change: false');
  return lines.join('\n');
}

function convertV4Scene(scene) {
  const beats = scene.compare?.beats ?? [];
  let previousLean = '';
  let previousTurn = '';
  let body = `\n# Scene ${scene.index}: ${scene.title ?? `Scene ${scene.index}`}\n\n<!--\n${sceneDirectives(scene)}\n-->\n`;
  body += overlayBlocks(scene.compare?.overlays);

  beats.forEach((beat, index) => {
    const title =
      beat.visualNotes?.split(/[.\n]/)[0]?.trim().slice(0, 80) || `Beat ${index + 1}`;
    body += `\n## Beat ${index + 1}: ${title}\n\n<!--\n${beatDirectives(beat)}\n-->\n\n`;
    body += `${String(beat.say ?? '').trim()}\n\n`;

    const lean = paneSection('Lean', 'lean', beat.lean, previousLean);
    previousLean = lean.nextCode;
    body += lean.markdown;

    const turn = paneSection('Turn', 'turn', beat.turn, previousTurn);
    previousTurn = turn.nextCode;
    body += turn.markdown;

    if (beat.sayZh?.trim()) {
      body += `### Chinese\n\n${beat.sayZh.trim()}\n\n`;
    }
    if (beat.visualNotes?.trim()) {
      body += `### Visual notes\n\n${beat.visualNotes.trim()}\n\n`;
    }
  });

  return body;
}

function describeLayer(layer) {
  if (!layer || typeof layer !== 'object') {
    return [];
  }
  if (layer.type === 'math-board') {
    const lines = [`math-board: ${layer.heading ?? ''}`.trim()];
    for (const beat of layer.beats ?? []) {
      lines.push(`- ${beat.label ?? ''}: ${beat.detail ?? ''}`.trim());
    }
    return lines;
  }
  if (layer.type === 'screen-text') {
    return [`screen-text: ${layer.source}`];
  }
  if (layer.type === 'turn-ide') {
    return [`turn-ide track: ${layer.track}`];
  }
  if (layer.type === 'compare') {
    return [
      layer.leanTrack ? `compare leanTrack: ${layer.leanTrack}` : null,
      layer.turnTrack ? `compare turnTrack: ${layer.turnTrack}` : null,
    ].filter(Boolean);
  }
  return [`layer: ${layer.type}`];
}

function convertV2Scene(scene) {
  const sayLines = Array.isArray(scene.director?.say)
    ? scene.director.say
    : scene.director?.say
      ? [scene.director.say]
      : [''];
  const layerNotes = (scene.layers ?? []).flatMap(describeLayer);
  const visualBase = [scene.visualNotes, ...layerNotes].filter(Boolean).join('\n');

  let body = `\n# Scene ${scene.index}: ${scene.title ?? `Scene ${scene.index}`}\n\n<!--\n${sceneDirectives({
    ...scene,
    teleprompter: scene.director?.teleprompter ?? scene.teleprompter,
  })}\n-->\n`;

  sayLines.forEach((say, index) => {
    body += `\n## Beat ${index + 1}\n\n<!--\nallow-script-change: false\n-->\n\n`;
    body += `${String(say).trim()}\n\n`;
    if (index === 0 && visualBase.trim()) {
      body += `### Visual notes\n\n${visualBase.trim()}\n\n`;
    }
  });

  return body;
}

function animationToMarkdown(animation, scriptId) {
  const title = teleprompterTitleFromScriptId(scriptId);
  const composition = animation.composition ?? {};
  let md = `---
videoOps: 1
scriptId: ${scriptId}
title: ${title}
format: ${composition.format ?? 'landscape'}
fps: ${composition.fps ?? 30}
width: ${composition.width ?? 1920}
height: ${composition.height ?? 1080}
---
`;

  for (const scene of animation.scenes ?? []) {
    if (animation.version === 4 || scene.compare?.beats?.length) {
      md += convertV4Scene(scene);
    } else {
      md += convertV2Scene(scene);
    }
  }
  return md.replace(/\n{3,}/g, '\n\n').trimEnd() + '\n';
}

function listEpisodeDirs() {
  const scriptsRoot = path.join(videoOpsRoot, 'scripts');
  const out = [];
  for (const series of fs.readdirSync(scriptsRoot, { withFileTypes: true })) {
    if (!series.isDirectory() || series.name.startsWith('.') || series.name.startsWith('_')) {
      continue;
    }
    const seriesDir = path.join(scriptsRoot, series.name);
    for (const episode of fs.readdirSync(seriesDir, { withFileTypes: true })) {
      if (!episode.isDirectory() || episode.name === 'shared') {
        continue;
      }
      out.push({
        scriptId: episode.name,
        dir: path.join(seriesDir, episode.name),
      });
    }
  }
  return out;
}

const targets = listEpisodeDirs().filter((entry) =>
  onlyIds.length === 0 ? true : onlyIds.includes(entry.scriptId),
);

let wrote = 0;
for (const entry of targets) {
  const mdPath = path.join(entry.dir, 'animation.md');
  const jsonPath = path.join(entry.dir, 'animation.json');
  if (!fs.existsSync(jsonPath)) {
    continue;
  }
  if (fs.existsSync(mdPath) && !force) {
    // Still rewrite title-only unify when force not set? skip existing
    continue;
  }
  const animation = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const markdown = animationToMarkdown(animation, entry.scriptId);
  fs.writeFileSync(mdPath, markdown, 'utf8');
  wrote += 1;
  console.log(`wrote ${path.relative(videoOpsRoot, mdPath)}`);
}

console.log(`Wrote ${wrote} animation.md file(s).`);
