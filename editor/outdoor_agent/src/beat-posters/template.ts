import type { BeatPosterCoverSpec, BeatPosterLang, BeatPosterSpec } from './types.ts';
import { highlightLeanCodeHtml, highlightTurnCodeHtml } from './code-highlight.ts';
import { VIDEO_OPS_ROOT } from '../paths.ts';
import {
  BEAT_POSTER_PREVIEW_FONT_SCALE,
  MIN_EDITOR_FONT_SIZE,
} from '../../../../src/beatPosterLayout.ts';
import path from 'node:path';

/** Same brand files the React preview uses — do not recolor; light-blue stroke vanishes on the card. */
const LEAN_LOGO_PATH = path.join(
  VIDEO_OPS_ROOT,
  'editor',
  'outdoor-ui',
  'src',
  'assets',
  'brand',
  'lean.svg',
);
const TURN_LOGO_PATH = path.join(
  VIDEO_OPS_ROOT,
  'editor',
  'outdoor-ui',
  'src',
  'assets',
  'brand',
  'turn-lang-logo.png',
);
const COVER_HEADER_EN_PATH = path.join(
  VIDEO_OPS_ROOT,
  'editor',
  'outdoor-ui',
  'src',
  'assets',
  'cover',
  'series-header-en.png',
);
const COVER_HEADER_ZH_PATH = path.join(
  VIDEO_OPS_ROOT,
  'editor',
  'outdoor-ui',
  'src',
  'assets',
  'cover',
  'series-header-zh.png',
);
const COVER_VS_BADGE_PATH = path.join(
  VIDEO_OPS_ROOT,
  'editor',
  'outdoor-ui',
  'src',
  'assets',
  'cover',
  'vs-badge.png',
);
const COVER_AVATAR_PATH = path.join(
  VIDEO_OPS_ROOT,
  'editor',
  'outdoor-ui',
  'src',
  'assets',
  'cover',
  'avatar.png',
);

function svgLogoDataUri(filePath: string, forceColor?: string): string {
  try {
    let svg = Deno.readTextFileSync(filePath);
    if (forceColor) {
      svg = svg.replaceAll('stroke="#686868"', `stroke="${forceColor}"`);
    }
    return `data:image/svg+xml;base64,${btoa(svg)}`;
  } catch {
    return '';
  }
}

function pngLogoDataUri(filePath: string): string {
  try {
    const bytes = Deno.readFileSync(filePath);
    let bin = '';
    for (const b of bytes) bin += String.fromCharCode(b);
    return `data:image/png;base64,${btoa(bin)}`;
  } catch {
    return '';
  }
}

const LEAN_LOGO_URI = svgLogoDataUri(LEAN_LOGO_PATH);
const TURN_LOGO_URI = pngLogoDataUri(TURN_LOGO_PATH);
const COVER_HEADER_EN_URI = pngLogoDataUri(COVER_HEADER_EN_PATH);
const COVER_HEADER_ZH_URI = pngLogoDataUri(COVER_HEADER_ZH_PATH);
const COVER_VS_BADGE_URI = pngLogoDataUri(COVER_VS_BADGE_PATH);
const COVER_AVATAR_URI = pngLogoDataUri(COVER_AVATAR_PATH);

/** React preview is a 420px frame; layout font sizes are for 1080 and then * 0.42. */
const PREVIEW_FRAME_WIDTH = 420;

function previewScale(width: number): number {
  return width / PREVIEW_FRAME_WIDTH;
}

function previewToExportPx(previewPx: number, width: number): number {
  return Math.round(previewPx * previewScale(width));
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function renderRichInline(text: string): string {
  const parts = text.split(/(`[^`]+`)/g);
  return parts
    .map((part) => {
      if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
        return `<code class="inline-code">${escapeHtml(part.slice(1, -1))}</code>`;
      }
      return escapeHtml(part);
    })
    .join('');
}

function renderCoverTaglineHtml(text: string): string {
  return escapeHtml(text).replaceAll('=', '<span class="tagline-equals">=</span>');
}

function nextLeadCard(spec: BeatPosterSpec): string {
  if (!spec.nextLead.trim()) {
    return '';
  }
  const label = spec.lang === 'zh' ? '下一篇' : 'Up next';
  const fontSize = previewToExportPx(Math.max(spec.layout.paragraphFontSize * 0.3, 11), spec.width);
  return `<article class="next-lead-card" style="flex:0 0 auto; transform:rotate(${spec.decorations.cardTilt * 0.25}deg); font-size:${fontSize}px">
    <p class="next-lead-label">${label}</p>
    <p class="next-lead-text">${renderRichInline(spec.nextLead)}</p>
  </article>`;
}

function paragraphCards(spec: BeatPosterSpec): string {
  const spacious = spec.layout.codeCardAutoHeight ? ' text-card-spacious' : '';
  return spec.paragraphs
    .map((paragraph) => {
      const fontSize = previewToExportPx(Math.max(spec.layout.paragraphFontSize * 0.42, 13), spec.width);
      return `<article class="card text-card${spacious}" style="flex:0 0 auto; font-size:${fontSize}px"><p>${renderRichInline(paragraph)}</p></article>`;
    })
    .join('');
}

function editorBlock(spec: BeatPosterSpec, kind: 'lean' | 'turn', autoHeight = false): string {
  const code = kind === 'lean' ? spec.leanCode : spec.turnCode;
  if (!code.trim()) {
    return '';
  }
  const lines = kind === 'lean' ? spec.layout.leanLines : spec.layout.turnLines;
  const label = kind === 'lean' ? 'Lean 4' : 'Turn-Lang';
  const logoUri = kind === 'lean' ? LEAN_LOGO_URI : TURN_LOGO_URI;
  const logoImg = logoUri
    ? `<img class="editor-title-logo ${kind}-title-logo" src="${logoUri}" alt="${label}" />`
    : `<span class="logo-chip ${kind}-chip">${kind === 'lean' ? 'λ' : 'T'}</span>`;
  const html = kind === 'lean'
    ? highlightLeanCodeHtml(code, 64)
    : highlightTurnCodeHtml(code, 64);
  const bodyClass = autoHeight ? 'editor-body' : 'editor-body editor-body-expand';
  const sectionClass = kind === 'lean' ? 'code-section dark' : 'code-section light';
  const headerClass = kind === 'lean' ? 'pane-header dark' : 'pane-header light';
  const editorPx = previewToExportPx(
    Math.max(spec.layout.editorFontSize, MIN_EDITOR_FONT_SIZE) * BEAT_POSTER_PREVIEW_FONT_SCALE,
    spec.width,
  );
  return `<div class="editor-wrap ${kind}" style="font-size:${editorPx}px">
    <div class="editor-title-row">${logoImg}<span class="editor-title-label">${label}</span></div>
    <div class="editor-shell">
      <div class="${sectionClass}">
        <div class="${headerClass}">
          <span class="pane-header-label">Code</span>
          <span class="pane-header-meta">${lines} lines</span>
        </div>
        <div class="${bodyClass}">${html}</div>
      </div>
    </div>
  </div>`;
}

function codeSection(spec: BeatPosterSpec): string {
  const code = spec.layout.primaryEditor === 'lean' ? spec.leanCode : spec.turnCode;
  if (!code.trim()) {
    return '';
  }
  return `<article class="card code-card code-card-auto" style="flex:0 0 auto">
    <div class="editors single">${editorBlock(spec, spec.layout.primaryEditor, true)}</div>
  </article>`;
}

/** Scrapbook-style poster — tilted cards + code editors (4:3 portrait). */
export function buildBeatPosterHtml(spec: BeatPosterSpec): string {
  const beatTitle = escapeHtml(spec.beatTitle);
  const titlePx = previewToExportPx(Math.max(spec.layout.titleFontSize * 0.42, 22), spec.width);
  const logoH = previewToExportPx(32, spec.width);
  const logoMaxW = previewToExportPx(160, spec.width);
  const editorLabelPx = previewToExportPx(26, spec.width);
  const sparklePx = previewToExportPx(20, spec.width);
  const sparkleInset = previewToExportPx(12, spec.width);
  const gridPx = previewToExportPx(28, spec.width);
  const footerPx = previewToExportPx(12, spec.width);
  const titleEmojiPx = previewToExportPx(16, spec.width);
  const titleEmojiSm = previewToExportPx(14, spec.width);
  const titleEmojiNudge = previewToExportPx(10, spec.width);
  const isTurnPoster = spec.layout.primaryEditor === 'turn';
  const posterTone = isTurnPoster ? 'poster-turn' : 'poster-lean';
  const sparkle = isTurnPoster && spec.decorations.sparkle
    ? '<div class="sparkle s1">✨</div><div class="sparkle s2">🔥</div>'
    : isTurnPoster
    ? '<div class="sparkle s1">✧</div>'
    : '<div class="sparkle s1">✧</div>';

  return `<!DOCTYPE html>
<html lang="${spec.lang === 'zh' ? 'zh-CN' : 'en'}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=${spec.width}, height=${spec.height}" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      width: ${spec.width}px;
      height: ${spec.height}px;
      overflow: hidden;
    }
    body {
      font-family: "PingFang SC", "SF Pro Display", "Segoe UI", system-ui, sans-serif;
      color: #0f172a;
      display: flex;
      flex-direction: column;
      padding: 5%;
      gap: 2%;
      position: relative;
      border: 2px solid #0f172a;
    }
    body.poster-turn {
      background:
        radial-gradient(circle at 12% 10%, rgba(232, 160, 255, 0.22) 0 12%, transparent 13%),
        radial-gradient(circle at 88% 8%, rgba(125, 211, 252, 0.28) 0 16%, transparent 17%),
        radial-gradient(circle at 8% 92%, rgba(255, 228, 230, 0.55) 0 16%, transparent 17%),
        linear-gradient(180deg, #eef2ff 0%, #dbeafe 46%, #fff7ed 100%);
    }
    body.poster-lean {
      background:
        radial-gradient(circle at 14% 12%, rgba(148, 163, 184, 0.14) 0 12%, transparent 13%),
        radial-gradient(circle at 86% 10%, rgba(100, 116, 139, 0.1) 0 14%, transparent 15%),
        linear-gradient(180deg, #f8fafc 0%, #f1f5f9 52%, #e2e8f0 100%);
    }
    body.poster-turn::before {
      content: '';
      position: absolute;
      inset: 0;
      background-image:
        linear-gradient(rgba(37, 99, 235, 0.08) 1px, transparent 1px),
        linear-gradient(90deg, rgba(37, 99, 235, 0.08) 1px, transparent 1px);
      background-size: ${gridPx}px ${gridPx}px;
      pointer-events: none;
    }
    body.poster-lean::before {
      content: '';
      position: absolute;
      inset: 0;
      background-image:
        linear-gradient(rgba(100, 116, 139, 0.06) 1px, transparent 1px),
        linear-gradient(90deg, rgba(100, 116, 139, 0.06) 1px, transparent 1px);
      background-size: ${gridPx}px ${gridPx}px;
      pointer-events: none;
    }
    .header {
      display: flex;
      flex-direction: column;
      gap: 8px;
      position: relative;
      z-index: 1;
      flex-shrink: 0;
    }
    .title-paper {
      transform: rotate(${spec.decorations.titleTilt}deg);
      position: relative;
      border-radius: 22px;
      padding: 16px 18px 14px;
      overflow: visible;
    }
    body.poster-turn .title-paper {
      background: linear-gradient(180deg, #fffefb 0%, #fff1f5 52%, #ffe8ef 100%);
      border: 3px solid #ff2442;
      box-shadow:
        5px 5px 0 rgba(255, 36, 66, 0.28),
        0 14px 28px rgba(255, 36, 66, 0.16);
    }
    body.poster-lean .title-paper {
      background: linear-gradient(180deg, #ffffff 0%, #f8fafc 58%, #f1f5f9 100%);
      border: 3px solid #334155;
      box-shadow:
        3px 3px 0 rgba(100, 116, 139, 0.16),
        0 10px 22px rgba(15, 23, 42, 0.08);
    }
    body.poster-turn .title-paper::before {
      content: '✨';
      position: absolute;
      top: -${titleEmojiNudge}px;
      left: ${titleEmojiNudge}px;
      font-size: ${titleEmojiPx}px;
      line-height: 1;
      transform: rotate(-14deg);
      filter: drop-shadow(0 2px 2px rgba(15, 23, 42, 0.15));
    }
    body.poster-turn .title-paper::after {
      content: '🔥';
      position: absolute;
      top: -${previewToExportPx(8, spec.width)}px;
      right: ${titleEmojiNudge}px;
      font-size: ${titleEmojiSm}px;
      line-height: 1;
      transform: rotate(10deg);
      filter: drop-shadow(0 2px 2px rgba(15, 23, 42, 0.15));
    }
    body.poster-lean .title-paper::before,
    body.poster-lean .title-paper::after {
      content: none;
    }
    h1 {
      font-size: ${titlePx}px;
      line-height: 1.22;
      font-weight: 900;
      letter-spacing: 0.01em;
      text-wrap: balance;
    }
    body.poster-turn h1 { color: #111827; }
    body.poster-lean h1 { color: #334155; font-weight: 800; }
    .cards {
      flex: 1 1 0;
      display: flex;
      flex-direction: column;
      gap: 10px;
      min-height: 0;
      overflow: hidden;
      position: relative;
      z-index: 1;
      justify-content: flex-start;
    }
    .card {
      border-radius: 20px;
      padding: 14px 16px;
    }
    body.poster-turn .card {
      background: linear-gradient(180deg, #ffffff 0%, #fff8fb 100%);
      border: 2px solid rgba(255, 36, 66, 0.2);
      box-shadow:
        4px 4px 0 rgba(255, 36, 66, 0.12),
        0 10px 24px rgba(255, 36, 66, 0.08);
    }
    body.poster-lean .card {
      background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
      border: 2px solid rgba(148, 163, 184, 0.28);
      box-shadow:
        2px 2px 0 rgba(100, 116, 139, 0.1),
        0 8px 18px rgba(15, 23, 42, 0.06);
    }
    .text-card {
      flex: 0 0 auto;
      overflow: hidden;
      transform: rotate(${spec.decorations.cardTilt * -0.8}deg);
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
    }
    .text-card-spacious {
      padding: 18px 20px;
    }
    .text-card p {
      line-height: 1.45;
      text-wrap: pretty;
    }
    body.poster-turn .text-card p { color: #1f2937; font-weight: 750; }
    body.poster-lean .text-card p { color: #475569; font-weight: 650; }
    .inline-code {
      font-family: "SF Mono", "JetBrains Mono", "Menlo", monospace;
      font-size: 0.9em;
      font-weight: 700;
      border-radius: 8px;
      padding: 1px 6px;
      white-space: pre-wrap;
    }
    body.poster-turn .inline-code {
      background: #ffe566;
      border: 1px solid rgba(255, 36, 66, 0.35);
      color: #111827;
    }
    body.poster-lean .inline-code {
      background: #e2e8f0;
      border: 1px solid rgba(100, 116, 139, 0.35);
      color: #334155;
      font-weight: 650;
    }
    .next-lead-card {
      flex: 0 0 auto;
      margin-top: auto;
      background: rgba(255, 255, 255, 0.72);
      border: 1px solid rgba(148, 163, 184, 0.45);
      border-radius: 12px;
      padding: 10px 12px;
      box-shadow: 0 2px 8px rgba(15, 23, 42, 0.06);
    }
    .next-lead-label {
      display: inline-block;
      font-size: 0.58em;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: #94a3b8;
      margin-bottom: 4px;
      padding: 0;
      background: transparent;
    }
    .next-lead-text {
      line-height: 1.38;
      color: #64748b;
      font-weight: 600;
      font-style: normal;
      text-wrap: pretty;
    }
    .code-card {
      padding: 0;
      flex: 0 0 auto;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      background: transparent;
      border: none;
      box-shadow: none;
      border-top-left-radius: 0;
    }
    .code-card-auto {
      flex: 0 0 auto;
    }
    .editors {
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: 8px;
      flex: 0 0 auto;
    }
    .editors.single {
      flex: 0 0 auto;
      overflow: visible;
    }
    .editor-wrap {
      display: flex;
      flex-direction: column;
      gap: 8px;
      width: 100%;
      flex: 0 0 auto;
      overflow: visible;
    }
    .editor-title-row {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 4px 4px 6px;
      overflow: visible;
    }
    .editor-title-logo {
      display: block;
      height: ${logoH}px;
      width: auto;
      max-width: ${logoMaxW}px;
      object-fit: contain;
      object-position: center;
      flex-shrink: 0;
    }
    .turn-title-logo {
      width: ${logoH}px;
      height: ${logoH}px;
      max-width: none;
    }
    .editor-title-label {
      font-size: ${editorLabelPx}px;
      line-height: 1;
      font-weight: 800;
      letter-spacing: 0.02em;
      color: #2b2a27;
    }
    .editor-shell {
      border-radius: 18px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    body.poster-turn .editor-shell {
      border: 2px solid rgba(255, 36, 66, 0.32);
      background: rgba(255, 255, 255, 0.94);
      box-shadow:
        4px 4px 0 rgba(255, 36, 66, 0.14),
        0 12px 32px rgba(15, 23, 42, 0.1);
    }
    body.poster-lean .editor-shell {
      border: 2px solid rgba(100, 116, 139, 0.28);
      background: rgba(248, 250, 252, 0.96);
      box-shadow:
        2px 2px 0 rgba(100, 116, 139, 0.12),
        0 8px 22px rgba(15, 23, 42, 0.08);
    }
    .code-section {
      display: flex;
      flex-direction: column;
      flex: 0 0 auto;
    }
    .code-section.dark { background: #1e1e1e; }
    .code-section.light { background: #faf9f5; }
    .pane-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 8px 12px;
      flex-shrink: 0;
    }
    .pane-header-label {
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .pane-header-meta {
      font-size: 12px;
      font-weight: 700;
      opacity: 0.78;
    }
    .pane-header.dark .pane-header-label,
    .pane-header.dark .pane-header-meta { color: #858585; }
    .pane-header.light .pane-header-label,
    .pane-header.light .pane-header-meta { color: #6b6860; }
    .logo-chip {
      width: 24px;
      height: 24px;
      border-radius: 7px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      font-weight: 900;
      line-height: 1;
      border: 1px solid #111827;
    }
    .lean-chip { background: #111827; color: #93c5fd; }
    .turn-chip { background: #f7c948; color: #111827; }
    .editor-body {
      overflow: visible;
      font-family: "SF Mono", "JetBrains Mono", "Menlo", monospace;
      font-size: 1em;
      line-height: 1.2;
      padding: 8px 0 10px;
      flex: 0 0 auto;
    }
    .editor-body-expand {
      flex: 1;
      min-height: 0;
    }
    .code-line {
      display: grid;
      grid-template-columns: 2.25em 1fr;
      column-gap: 0.6em;
      align-items: start;
      padding: 0 10px;
      line-height: 1.2;
    }
    .ln {
      width: auto;
      text-align: right;
      white-space: nowrap;
      line-height: 1.2;
      user-select: none;
    }
    .code-section.dark .ln { color: #858585; }
    .code-section.light .ln { color: #9a9488; }
    .tx {
      min-width: 0;
      white-space: pre-wrap;
      overflow-wrap: break-word;
      line-height: 1.2;
      tab-size: 2;
    }
    .code-section.dark .kw { color: #569cd6; }
    .code-section.dark .ta { color: #c586c0; }
    .code-section.dark .ty { color: #4ec9b0; }
    .code-section.dark .op { color: #d4d4d4; }
    .code-section.dark .st { color: #ce9178; }
    .code-section.dark .cm { color: #6a9955; }
    .code-section.dark .pl { color: #d4d4d4; }
    .code-section.light .sr { color: #8250df; font-weight: 600; }
    .code-section.light .kw { color: #0550ae; font-weight: 600; }
    .code-section.light .ta { color: #953800; font-weight: 600; }
    .code-section.light .op { color: #cf222e; }
    .code-section.light .dc { color: #0550ae; font-weight: 600; }
    .code-section.light .st { color: #0a3069; }
    .code-section.light .cm { color: #6b6860; }
    .code-section.light .pl { color: #2b2a27; }
    .footer {
      display: flex;
      align-items: center;
      justify-content: flex-start;
      gap: ${previewToExportPx(8, spec.width)}px;
      position: relative;
      z-index: 1;
      font-size: ${footerPx}px;
      font-weight: 900;
      letter-spacing: 0.04em;
      flex-shrink: 0;
    }
    body.poster-turn .footer { color: #1d4ed8; }
    body.poster-lean .footer { color: #64748b; font-weight: 800; }
    .footer .vs {
      flex-shrink: 0;
    }
    .sparkle {
      position: absolute;
      font-size: ${sparklePx}px;
      line-height: 1;
      z-index: 0;
      filter: drop-shadow(0 2px 2px rgba(15, 23, 42, 0.12));
    }
    .s1 { top: ${sparkleInset}px; right: ${sparkleInset}px; transform: rotate(-10deg); }
    .s2 { bottom: ${sparkleInset}px; left: ${sparkleInset}px; transform: rotate(12deg); }
  </style>
</head>
<body class="${posterTone}">
  ${sparkle}
  <header class="header">
    <div class="title-paper">
      <h1>${beatTitle}</h1>
    </div>
  </header>
  <section class="cards">
    ${paragraphCards(spec)}
    ${codeSection(spec)}
    ${nextLeadCard(spec)}
  </section>
  <footer class="footer">
    <span class="vs">Lean 4 vs Turn-Lang</span>
  </footer>
</body>
</html>`;
}

/** Album cover — series + episode title, tagline, beat count. */
export function buildBeatPosterCoverHtml(spec: BeatPosterCoverSpec): string {
  const coverHeadline = escapeHtml(spec.coverHeadline);
  const tagline = renderCoverTaglineHtml(spec.tagline);
  const beatCountLabel = escapeHtml(spec.beatCountLabel);
  const swipeHint = escapeHtml(spec.swipeHint);
  const seriesHeaderUri = spec.lang === 'zh' ? COVER_HEADER_ZH_URI : COVER_HEADER_EN_URI;
  const seriesHeaderAlt = spec.lang === 'zh' ? '抽象代数系列' : 'Abstract Algebra in Proof Assistants';
  const seriesHeaderBlock = seriesHeaderUri
    ? `<img class="cover-series-header" src="${seriesHeaderUri}" alt="${escapeHtml(seriesHeaderAlt)}" />`
    : '';
  const vsStripBlock = COVER_VS_BADGE_URI
    ? `<img class="cover-vs-strip" src="${COVER_VS_BADGE_URI}" alt="Lean vs Turn-Lang" />`
    : '';
  const avatarBlock = COVER_AVATAR_URI
    ? `<img class="cover-avatar" src="${COVER_AVATAR_URI}" alt="" aria-hidden="true" />`
    : '';
  const backgroundCodeBlock = `<div class="code-backdrop" aria-hidden="true">
    <pre class="code-panel lean">${escapeHtml(spec.backgroundLeanCode.trim())}</pre>
    <pre class="code-panel turn">${escapeHtml(spec.backgroundTurnCode.trim())}</pre>
  </div>`;
  const sparkle = spec.decorations.sparkle
    ? '<div class="sparkle s1">✦</div><div class="sparkle s2">✧</div>'
    : '<div class="sparkle s1">✧</div>';
  const heroTitleBlock = `<article class="cover-hero-title" style="transform:rotate(${spec.decorations.cardTilt * -0.65}deg)">
      <p class="cover-hero-kicker">${coverHeadline}</p>
      <p class="cover-hero-hook">${tagline}</p>
    </article>`;
  const w = spec.width;
  const sparklePx = previewToExportPx(18, w);
  const sparkleInset = previewToExportPx(12, w);
  const gridPx = previewToExportPx(28, w);
  const swipeHintPx = previewToExportPx(13, w);
  const frameBorderPx = previewToExportPx(2, w);
  const bodyGapPx = previewToExportPx(8, w);
  const bodyPadTopPx = previewToExportPx(8, w);
  const heroBorderPx = previewToExportPx(3, w);
  const heroRadiusPx = previewToExportPx(22, w);
  const heroPadX = previewToExportPx(16, w);
  const heroPadTop = previewToExportPx(16, w);
  const heroPadBottom = previewToExportPx(14, w);
  const heroGapPx = previewToExportPx(8, w);
  const heroShadowHard = previewToExportPx(5, w);
  const heroShadowBlur = previewToExportPx(14, w);
  const heroShadowSpread = previewToExportPx(28, w);
  const heroEmojiL = previewToExportPx(20, w);
  const heroEmojiS = previewToExportPx(18, w);
  const heroEmojiTopL = previewToExportPx(12, w);
  const heroEmojiTopR = previewToExportPx(10, w);
  const heroEmojiInsetL = previewToExportPx(10, w);
  const heroEmojiInsetR = previewToExportPx(12, w);
  const kickerPx = previewToExportPx(28, w);
  const kickerPadX = previewToExportPx(6, w);
  const kickerPadY = previewToExportPx(2, w);
  const taglinePx = previewToExportPx(22, w);
  const equalsRadius = previewToExportPx(8, w);
  const equalsPadX = previewToExportPx(5, w);
  const equalsShadow = previewToExportPx(2, w);
  const badgeBorderPx = previewToExportPx(2, w);
  const badgePadY = previewToExportPx(5, w);
  const badgePadX = previewToExportPx(12, w);
  const badgeShadow = previewToExportPx(4, w);
  const badgePx = previewToExportPx(12, w);
  const codePadY = previewToExportPx(8, w);
  const codePadX = previewToExportPx(10, w);
  const codeRadius = previewToExportPx(10, w);
  const codePx = previewToExportPx(10, w);
  const codeShadowY = previewToExportPx(6, w);
  const codeShadowBlur = previewToExportPx(18, w);
  const avatarShadowY = previewToExportPx(10, w);
  const avatarShadowBlur = previewToExportPx(18, w);

  return `<!DOCTYPE html>
<html lang="${spec.lang === 'zh' ? 'zh-CN' : 'en'}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=${spec.width}, height=${spec.height}" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      width: ${spec.width}px;
      height: ${spec.height}px;
      overflow: hidden;
    }
    body {
      font-family: "PingFang SC", "SF Pro Display", "Segoe UI", system-ui, sans-serif;
      color: #0f172a;
      background:
        radial-gradient(circle at 12% 10%, rgba(232, 160, 255, 0.22) 0 14%, transparent 15%),
        radial-gradient(circle at 88% 8%, rgba(125, 211, 252, 0.28) 0 16%, transparent 17%),
        radial-gradient(circle at 6% 92%, rgba(255, 228, 230, 0.55) 0 15%, transparent 16%),
        linear-gradient(180deg, #eef2ff 0%, #dbeafe 46%, #fff7ed 100%);
      display: flex;
      flex-direction: column;
      padding: 4%;
      gap: 2%;
      position: relative;
      border: ${frameBorderPx}px solid #0f172a;
    }
    body::before {
      content: '';
      position: absolute;
      inset: 0;
      background-image:
        linear-gradient(rgba(37, 99, 235, 0.08) 1px, transparent 1px),
        linear-gradient(90deg, rgba(37, 99, 235, 0.08) 1px, transparent 1px);
      background-size: ${gridPx}px ${gridPx}px;
      pointer-events: none;
    }
    .code-backdrop {
      position: absolute;
      inset: 0;
      z-index: 0;
      pointer-events: none;
      overflow: hidden;
    }
    .code-panel {
      position: absolute;
      margin: 0;
      padding: ${codePadY}px ${codePadX}px;
      border: 1px solid rgba(15, 23, 42, 0.1);
      border-radius: ${codeRadius}px;
      background: rgba(255, 255, 255, 0.48);
      font-family: "SF Mono", "JetBrains Mono", "Menlo", monospace;
      font-size: ${codePx}px;
      line-height: 1.38;
      white-space: pre;
      color: rgba(15, 23, 42, 0.38);
      max-width: 62%;
      overflow: hidden;
      user-select: none;
      box-shadow: 0 ${codeShadowY}px ${codeShadowBlur}px rgba(15, 23, 42, 0.06);
    }
    .code-panel.lean {
      left: -2%;
      top: 18%;
      transform: rotate(-13deg);
    }
    .code-panel.turn {
      right: -4%;
      top: 48%;
      transform: rotate(9deg);
      color: rgba(30, 41, 59, 0.4);
      background: rgba(255, 251, 235, 0.52);
    }
    .body {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: stretch;
      justify-content: flex-start;
      gap: ${bodyGapPx}px;
      padding-top: ${bodyPadTopPx}px;
      position: relative;
      z-index: 1;
      min-height: 0;
      overflow: hidden;
    }
    .cover-series-header {
      display: block;
      width: 125%;
      max-width: 125%;
      max-height: 32.5%;
      height: auto;
      object-fit: contain;
      align-self: center;
      background: transparent;
      flex-shrink: 1;
      min-height: 0;
    }
    .cover-vs-strip {
      display: block;
      width: 100%;
      max-width: 100%;
      max-height: 33%;
      height: auto;
      object-fit: contain;
      align-self: center;
      background: transparent;
      flex-shrink: 1;
      min-height: 0;
    }
    .cover-avatar {
      position: absolute;
      right: -2%;
      bottom: 6%;
      width: 34%;
      height: auto;
      object-fit: contain;
      z-index: 0;
      pointer-events: none;
      transform: rotate(8deg);
      filter: drop-shadow(0 ${avatarShadowY}px ${avatarShadowBlur}px rgba(15, 23, 42, 0.18));
    }
    .cover-hero-title {
      position: relative;
      background: linear-gradient(180deg, #fffefb 0%, #fff1f5 52%, #ffe8ef 100%);
      border: ${heroBorderPx}px solid #ff2442;
      border-radius: ${heroRadiusPx}px;
      box-shadow:
        ${heroShadowHard}px ${heroShadowHard}px 0 rgba(255, 36, 66, 0.28),
        0 ${heroShadowBlur}px ${heroShadowSpread}px rgba(255, 36, 66, 0.16);
      padding: ${heroPadTop}px ${heroPadX}px ${heroPadBottom}px;
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: ${heroGapPx}px;
      overflow: visible;
    }
    .cover-hero-title::before {
      content: '✨';
      position: absolute;
      top: -${heroEmojiTopL}px;
      left: ${heroEmojiInsetL}px;
      font-size: ${heroEmojiL}px;
      line-height: 1;
      transform: rotate(-14deg);
      filter: drop-shadow(0 2px 2px rgba(15, 23, 42, 0.15));
    }
    .cover-hero-title::after {
      content: '🔥';
      position: absolute;
      top: -${heroEmojiTopR}px;
      right: ${heroEmojiInsetR}px;
      font-size: ${heroEmojiS}px;
      line-height: 1;
      transform: rotate(10deg);
      filter: drop-shadow(0 2px 2px rgba(15, 23, 42, 0.15));
    }
    .cover-hero-kicker {
      margin: 0;
      padding: 0 ${kickerPadX}px ${kickerPadY}px;
      font-family: "PingFang SC", "SF Pro Display", "Helvetica Neue", sans-serif;
      font-size: ${kickerPx}px;
      font-weight: 900;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      text-align: center;
      line-height: 1.1;
      color: #ff2442;
      background: linear-gradient(transparent 58%, #ffe566 58%);
      box-decoration-break: clone;
      -webkit-box-decoration-break: clone;
    }
    .cover-hero-hook {
      margin: 0;
      font-family: "PingFang SC", "SF Pro Display", "Helvetica Neue", sans-serif;
      font-size: ${taglinePx}px;
      line-height: 1.3;
      font-weight: 800;
      font-style: normal;
      color: #111827;
      text-align: center;
      letter-spacing: 0.01em;
      text-wrap: pretty;
      max-width: 96%;
    }
    .tagline-equals {
      display: inline-block;
      font-family: Impact, "Arial Black", sans-serif;
      font-style: normal;
      font-weight: 900;
      color: #ff2442;
      background: #ffe566;
      border-radius: ${equalsRadius}px;
      font-size: 1.08em;
      margin: 0 0.1em;
      padding: 0 ${equalsPadX}px;
      transform: rotate(-4deg);
      box-shadow: 0 ${equalsShadow}px 0 rgba(255, 36, 66, 0.25);
    }
    .beat-badge {
      align-self: center;
      transform: rotate(${spec.decorations.cardTilt * 0.45}deg);
      background: #2563eb;
      border: ${badgeBorderPx}px solid #0f172a;
      border-radius: 999px;
      padding: ${badgePadY}px ${badgePadX}px;
      flex-shrink: 0;
      max-width: 92%;
      box-shadow: 0 ${badgeShadow}px 0 rgba(15, 23, 42, 0.22);
    }
    .beat-badge span {
      font-size: ${badgePx}px;
      font-weight: 900;
      letter-spacing: 0.04em;
      color: #eff6ff;
      text-transform: none;
      text-align: center;
    }
    .footer {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      position: relative;
      z-index: 1;
      flex-shrink: 0;
    }
    .swipe-hint {
      font-size: ${swipeHintPx}px;
      font-weight: 900;
      color: #1d4ed8;
      letter-spacing: 0.04em;
    }
    .sparkle {
      position: absolute;
      color: rgba(15, 23, 42, 0.55);
      font-size: ${sparklePx}px;
      z-index: 0;
    }
    .s1 { top: ${sparkleInset}px; right: ${sparkleInset}px; transform: rotate(-10deg); }
    .s2 { bottom: ${sparkleInset}px; left: ${sparkleInset}px; transform: rotate(12deg); }
  </style>
</head>
<body>
  ${backgroundCodeBlock}
  ${avatarBlock}
  ${sparkle}
  <div class="body">
    ${seriesHeaderBlock}
    ${heroTitleBlock}
    ${vsStripBlock}
    <div class="beat-badge"><span>${beatCountLabel}</span></div>
  </div>
  <footer class="footer">
    <p class="swipe-hint">${swipeHint}</p>
  </footer>
</body>
</html>`;
}
