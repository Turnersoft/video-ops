/** Curved series title for beat poster cover — matches video cover arched headline feel. */

export type CoverSeriesArcOptions = {
  width?: number;
  height?: number;
  fontSize?: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  idSuffix?: string;
};

function escapeSvgText(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export function buildCoverSeriesArcSvg(
  title: string,
  options: CoverSeriesArcOptions = {},
): string {
  const width = options.width ?? 360;
  const height = options.height ?? 72;
  const fontSize = options.fontSize ?? 22;
  const fill = options.fill ?? '#64748b';
  const stroke = options.stroke ?? '#1a4fd8';
  const strokeWidth = options.strokeWidth ?? 2.2;
  const idSuffix = options.idSuffix ?? 'default';
  const pathId = `cover-series-arc-${idSuffix}`;
  const text = escapeSvgText(title.toUpperCase());
  const arcY = Math.round(height * 0.78);
  const arcControlY = Math.round(height * 0.08);
  const margin = 12;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="100%" height="100%" role="img" aria-label="${text}">
  <defs>
    <path id="${pathId}" d="M ${margin} ${arcY} Q ${width / 2} ${arcControlY} ${width - margin} ${arcY}" fill="none" />
  </defs>
  <text
    font-family="Impact, 'Arial Black', 'Helvetica Neue', sans-serif"
    font-size="${fontSize}"
    font-weight="900"
    letter-spacing="0.1em"
    fill="${fill}"
    stroke="${stroke}"
    stroke-width="${strokeWidth}"
    paint-order="stroke fill"
    text-anchor="middle"
  >
    <textPath href="#${pathId}" startOffset="50%">${text}</textPath>
  </text>
</svg>`;
}

export function fitCoverSeriesArcFontSize(title: string, width: number): number {
  const units = title.length;
  if (units <= 28) return Math.round(width * 0.072);
  if (units <= 38) return Math.round(width * 0.062);
  if (units <= 48) return Math.round(width * 0.054);
  return Math.round(width * 0.048);
}
