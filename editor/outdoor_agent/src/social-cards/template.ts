import type { SocialCardSpec } from './types.ts';

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

const FORMAT_LAYOUT: Record<
  SocialCardSpec['format'],
  { titleSize: number; hookSize: number; pad: number; badgeSize: number }
> = {
  portrait: { titleSize: 58, hookSize: 34, pad: 72, badgeSize: 26 },
  landscape: { titleSize: 46, hookSize: 28, pad: 56, badgeSize: 22 },
  square: { titleSize: 52, hookSize: 32, pad: 64, badgeSize: 24 },
};

/** Self-contained HTML card — rendered to PNG via headless Chrome. */
export function buildSocialCardHtml(spec: SocialCardSpec): string {
  const layout = FORMAT_LAYOUT[spec.format];
  const title = escapeHtml(spec.title);
  const hook = escapeHtml(spec.hook);
  const episode = escapeHtml(spec.episodeLabel);
  const series = escapeHtml(spec.seriesLabel);
  const cta = escapeHtml(spec.cta);

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
      font-family: "SF Pro Display", "Segoe UI", system-ui, -apple-system, sans-serif;
      color: #f8fafc;
      background:
        radial-gradient(1200px 800px at 10% 0%, rgba(56, 189, 248, 0.22), transparent 55%),
        radial-gradient(900px 700px at 100% 100%, rgba(167, 139, 250, 0.18), transparent 50%),
        linear-gradient(145deg, #0b1220 0%, #111827 38%, #1e293b 100%);
      display: flex;
      flex-direction: column;
      padding: ${layout.pad}px;
    }
    .top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 28px;
    }
    .badge {
      font-size: ${layout.badgeSize}px;
      font-weight: 600;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: #7dd3fc;
      background: rgba(14, 165, 233, 0.12);
      border: 1px solid rgba(125, 211, 252, 0.35);
      border-radius: 999px;
      padding: 10px 18px;
      white-space: nowrap;
    }
    .series {
      font-size: ${Math.max(18, layout.badgeSize - 2)}px;
      color: #94a3b8;
      text-align: right;
      line-height: 1.3;
      max-width: 42%;
    }
    .main {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 28px;
      min-height: 0;
    }
    h1 {
      font-size: ${layout.titleSize}px;
      line-height: 1.08;
      font-weight: 700;
      letter-spacing: -0.02em;
      text-wrap: balance;
      max-height: ${Math.round(spec.height * 0.42)}px;
      overflow: hidden;
    }
    .hook {
      font-size: ${layout.hookSize}px;
      line-height: 1.45;
      color: #cbd5e1;
      max-width: 95%;
      text-wrap: pretty;
      max-height: ${Math.round(spec.height * 0.28)}px;
      overflow: hidden;
    }
    .footer {
      margin-top: auto;
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      gap: 20px;
      padding-top: 24px;
      border-top: 1px solid rgba(148, 163, 184, 0.25);
    }
    .cta {
      font-size: ${Math.max(20, layout.badgeSize)}px;
      font-weight: 600;
      color: #e2e8f0;
      max-width: 70%;
      line-height: 1.35;
    }
    .brand {
      font-size: ${Math.max(18, layout.badgeSize - 2)}px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #64748b;
      white-space: nowrap;
    }
    .accent {
      width: 72px;
      height: 6px;
      border-radius: 999px;
      background: linear-gradient(90deg, #38bdf8, #a78bfa);
      margin-bottom: 18px;
    }
  </style>
</head>
<body>
  <div class="top">
    <div class="badge">${episode}</div>
    <div class="series">${series}</div>
  </div>
  <div class="main">
    <div class="accent"></div>
    <h1>${title}</h1>
    <p class="hook">${hook}</p>
  </div>
  <div class="footer">
    <div class="cta">${cta}</div>
    <div class="brand">Turn-Lang</div>
  </div>
</body>
</html>`;
}

export function cardDimensions(format: SocialCardSpec['format']): {
  width: number;
  height: number;
} {
  switch (format) {
    case 'portrait':
      return { width: 1080, height: 1350 };
    case 'landscape':
      return { width: 1200, height: 630 };
    case 'square':
      return { width: 1080, height: 1080 };
    default: {
      const _exhaustive: never = format;
      throw new Error(`Unknown card format: ${_exhaustive}`);
    }
  }
}

export function extractHook(body: string, maxLen = 260): string {
  const withoutTags = body.replace(/#[^\s#]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!withoutTags) {
    return '';
  }
  const firstBlock = withoutTags.split(/\n\n+/)[0]?.trim() ?? withoutTags;
  const sentenceMatch = firstBlock.match(/^[^.!?。！？]+[.!?。！？]?/u);
  const sentence = (sentenceMatch?.[0] ?? firstBlock).trim();
  if (sentence.length <= maxLen) {
    return sentence;
  }
  return `${sentence.slice(0, maxLen - 1).trim()}…`;
}

export function episodeLabelFromTitle(title: string): string {
  const numbered = title.match(/^(\d+)\s*[.．、]/);
  if (numbered) {
    return `Episode ${numbered[1]}`;
  }
  return 'Episode';
}
