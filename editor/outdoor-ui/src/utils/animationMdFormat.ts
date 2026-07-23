/** Portrait / landscape dimensions for outdoor animation.md frontmatter. */
export type OutdoorPreviewFormat = 'portrait' | 'landscape';

export const OUTDOOR_PREVIEW_DIMENSIONS: Record<
  OutdoorPreviewFormat,
  { width: number; height: number; format: 'short' | 'landscape' }
> = {
  portrait: { width: 1080, height: 1920, format: 'short' },
  landscape: { width: 1920, height: 1080, format: 'landscape' },
};

const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;

function parseFrontmatterLine(
  lines: string[],
  key: string,
): string | undefined {
  const prefix = `${key}:`;
  const line = lines.find((entry) => entry.startsWith(prefix));
  if (!line) {
    return undefined;
  }
  return line.slice(prefix.length).trim();
}

function parsePositiveInt(raw: string | undefined): number | undefined {
  if (!raw) {
    return undefined;
  }
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? Math.round(value) : undefined;
}

/** Infer preview orientation from animation.md YAML frontmatter (width/height). */
export function inferFormatFromAnimationMd(markdown: string): OutdoorPreviewFormat {
  const match = markdown.match(FRONTMATTER_RE);
  if (!match) {
    return 'landscape';
  }
  const lines = match[1].split('\n');
  const width = parsePositiveInt(parseFrontmatterLine(lines, 'width'));
  const height = parsePositiveInt(parseFrontmatterLine(lines, 'height'));
  if (width && height) {
    return height > width ? 'portrait' : 'landscape';
  }
  const format = parseFrontmatterLine(lines, 'format');
  if (format === 'short') {
    return 'portrait';
  }
  return 'landscape';
}

/** Rewrite frontmatter width/height/format for the chosen outdoor preview orientation. */
export function applyFormatToAnimationMd(
  markdown: string,
  nextFormat: OutdoorPreviewFormat,
): string {
  const dims = OUTDOOR_PREVIEW_DIMENSIONS[nextFormat];
  const match = markdown.match(FRONTMATTER_RE);
  if (!match) {
    return markdown;
  }
  const lines = match[1].split('\n');
  const body = match[2];
  const keys = new Set(['width', 'height', 'format']);
  const kept = lines.filter((line) => {
    const keyMatch = line.match(/^([A-Za-z][\w-]*):/);
    return !(keyMatch && keys.has(keyMatch[1]));
  });
  kept.push(`format: ${dims.format}`);
  kept.push(`width: ${dims.width}`);
  kept.push(`height: ${dims.height}`);
  return `---\n${kept.join('\n')}\n---\n${body}`;
}
