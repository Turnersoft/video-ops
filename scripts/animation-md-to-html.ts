/**
 * One-way export: animation.md → animation.html (structured beat document).
 * Headings (h1/h2/h3) drive VS Code outline; vo-* tags hold beat payload.
 * Usage: npx tsx scripts/animation-md-to-html.ts <path-to-animation.md>
 */

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  parseBeatVariantsBlock,
  splitAnimationBeatSections,
} from "../src/beatVariants.ts";

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function parseFrontmatter(markdown: string): {
  meta: Record<string, string>;
  body: string;
} {
  const trimmed = markdown.replace(/^\uFEFF/, "");
  if (!trimmed.startsWith("---")) {
    return { meta: {}, body: trimmed };
  }
  const end = trimmed.indexOf("\n---", 3);
  if (end < 0) {
    return { meta: {}, body: trimmed };
  }
  const meta: Record<string, string> = {};
  for (const line of trimmed.slice(3, end).split("\n")) {
    const match = line.match(/^([^:]+):\s*(.*)$/);
    if (match) {
      meta[match[1].trim()] = match[2].trim().replace(/^"|"$/g, "");
    }
  }
  return { meta, body: trimmed.slice(end + 4).replace(/^\n/, "") };
}

function parseDirectiveComment(block: string): Record<string, string> {
  const directives: Record<string, string> = {};
  for (const line of block.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("<!--") || trimmed.startsWith("-->")) {
      continue;
    }
    const match = trimmed.match(/^([a-z][a-z0-9.-]*):\s*(.*)$/i);
    if (match) {
      directives[match[1]] = match[2];
    }
  }
  return directives;
}

function extractHtmlCommentBody(
  section: string,
  opener: string,
): string | null {
  const pattern = new RegExp(`<!--\\s*${opener}\\s*([\\s\\S]*?)\\s*-->`, "i");
  const match = section.match(pattern);
  return match?.[1]?.trim() ?? null;
}

function extractBeatDirectives(section: string): Record<string, string> {
  const match = section.match(/<!--\s*([\s\S]*?)\s*-->/);
  if (!match) {
    return {};
  }
  const body = match[1].trim();
  if (/^beat-(variants|studio):/i.test(body)) {
    return {};
  }
  return parseDirectiveComment(body);
}

function paneBody(section: string, heading: string): string {
  const pattern = new RegExp(
    `### ${heading}\\s*\\n([\\s\\S]*?)(?=\\n### |\\n## |$)`,
    "i",
  );
  return section.match(pattern)?.[1]?.trim() ?? "";
}

function fencedCode(section: string, lang: "lean" | "turn"): string {
  const pattern = new RegExp(`\`\`\`${lang}\\s*\\n([\\s\\S]*?)\\n\`\`\``, "i");
  return section.match(pattern)?.[1]?.replace(/\n+$/, "") ?? "";
}

function parseHighlights(pane: string): string[] {
  const match = pane.match(/Highlights:\s*\n([\s\S]*?)(?=\n(?:### |## )|$)/i);
  if (!match) {
    return [];
  }
  return match[1]
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- "))
    .map((line) => line.replace(/^-\s+/, "").replace(/^`|`$/g, ""));
}

function renderDirectives(
  directives: Record<string, string>,
  indent: string,
): string {
  if (Object.keys(directives).length === 0) {
    return "";
  }
  const lines = Object.entries(directives).map(
    ([key, value]) =>
      `${indent}  <vo-directive name="${escapeXml(key)}">${escapeXml(value)}</vo-directive>`,
  );
  return `${indent}<vo-directives>\n${lines.join("\n")}\n${indent}</vo-directives>\n`;
}

function paneHeading(beatIndex: number, label: string, indent: string): string {
  return `${indent}<h3 id="beat-${beatIndex}-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}">Beat ${beatIndex} · ${label}</h3>\n`;
}

function renderCodePane(
  beatIndex: number,
  tag: "lean" | "turn",
  section: string,
  indent: string,
): string {
  const pane = paneBody(section, tag === "lean" ? "Lean" : "Turn");
  const code = fencedCode(section, tag);
  const highlights = parseHighlights(pane);
  const label = tag === "lean" ? "Lean" : "Turn";
  const tagName = tag === "lean" ? "vo-lean" : "vo-turn";
  let out = paneHeading(beatIndex, label, indent);
  out += `${indent}<${tagName}>\n`;
  out += `${indent}  <pre><code><![CDATA[\n${code}\n]]></code></pre>\n`;
  if (highlights.length > 0) {
    out += `${indent}  <vo-highlights>\n`;
    for (const item of highlights) {
      out += `${indent}    <vo-highlight>${escapeXml(item)}</vo-highlight>\n`;
    }
    out += `${indent}  </vo-highlights>\n`;
  }
  out += `${indent}</${tagName}>\n`;
  return out;
}

function renderHint(beatIndex: number, section: string, indent: string): string {
  const pane = paneBody(section, "Hint");
  if (!pane.trim()) {
    return "";
  }
  const target = extractHtmlCommentBody(pane, "target:");
  const needle = extractHtmlCommentBody(pane, "needle:");
  const position = extractHtmlCommentBody(pane, "position:");
  const text = pane
    .replace(/<!--[\s\S]*?-->/g, "")
    .trim()
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join(" ");
  const attrs = [
    target ? ` target="${escapeXml(target)}"` : "",
    needle ? ` needle="${escapeXml(needle)}"` : "",
    position ? ` position="${escapeXml(position)}"` : "",
  ].join("");
  let out = paneHeading(beatIndex, "Hint", indent);
  out += `${indent}<vo-hint${attrs}>${escapeXml(text)}</vo-hint>\n`;
  return out;
}

function renderVisualNotes(
  beatIndex: number,
  section: string,
  indent: string,
): string {
  const pane = paneBody(section, "Visual notes");
  if (!pane.trim()) {
    return "";
  }
  const studio = pane
    .match(/<!--\s*beat-studio:\s*([\s\S]*?)\s*-->/i)?.[1]
    ?.trim();
  const notes = pane.replace(/<!--[\s\S]*?-->/g, "").trim();
  let out = paneHeading(beatIndex, "Visual notes", indent);
  out += `${indent}<vo-visual-notes>\n`;
  if (studio) {
    out += `${indent}  <vo-beat-studio><![CDATA[${studio}]]></vo-beat-studio>\n`;
  }
  if (notes) {
    out += `${indent}  <pre><![CDATA[\n${notes}\n]]></pre>\n`;
  }
  out += `${indent}</vo-visual-notes>\n`;
  return out;
}

function parseSay(section: string): string {
  const lines = section.split("\n");
  let i = 1;
  while (i < lines.length) {
    const line = lines[i]?.trim() ?? "";
    if (!line) {
      i += 1;
      continue;
    }
    if (line.startsWith("<!--") || line.startsWith("```")) {
      if (line.startsWith("<!--")) {
        while (i < lines.length && !lines[i]?.includes("-->")) {
          i += 1;
        }
      }
      if (line.startsWith("```")) {
        while (i < lines.length && lines[i]?.trim() !== "```") {
          i += 1;
        }
      }
      i += 1;
      continue;
    }
    if (line.startsWith("### ") || line.startsWith("## ")) {
      break;
    }
    break;
  }
  const sayStart = i;
  let j = sayStart;
  while (
    j < lines.length &&
    !/^###\s/.test(lines[j] ?? "") &&
    !/^##\s/.test(lines[j] ?? "")
  ) {
    j += 1;
  }
  return lines.slice(sayStart, j).join("\n").trim();
}

function renderBeat(section: string, beatIndex: number): string {
  const titleMatch = section.match(/^## Beat\s+\d+:\s*(.*)$/m);
  const title = titleMatch?.[1]?.trim() ?? `Beat ${beatIndex + 1}`;
  const directives = extractBeatDirectives(section);
  const variants = parseBeatVariantsBlock(section);
  const say = parseSay(section);
  const chinese = paneBody(section, "Chinese");
  const indent = "    ";
  const beatNumber = beatIndex + 1;

  let out = `${indent}<section class="vo-beat" data-index="${beatNumber}">\n`;
  out += `${indent}  <h2 id="beat-${beatNumber}" class="vo-beat-title">Beat ${beatNumber}: ${escapeXml(title)}</h2>\n`;
  out += renderDirectives(directives, indent + "  ");
  if (variants) {
    out += paneHeading(beatNumber, "Variants", indent + "  ");
    out += `${indent}  <script type="application/json" class="vo-variants"><![CDATA[\n${JSON.stringify(variants, null, 2)}\n]]></script>\n`;
  }
  if (say) {
    out += paneHeading(beatNumber, "Spoken", indent + "  ");
    out += `${indent}  <vo-say><![CDATA[\n${say}\n]]></vo-say>\n`;
  }
  out += renderCodePane(beatNumber, "lean", section, indent + "  ");
  out += renderCodePane(beatNumber, "turn", section, indent + "  ");
  out += renderHint(beatNumber, section, indent + "  ");
  if (chinese) {
    out += paneHeading(beatNumber, "Chinese", indent + "  ");
    out += `${indent}  <vo-chinese><![CDATA[\n${chinese}\n]]></vo-chinese>\n`;
  }
  out += renderVisualNotes(beatNumber, section, indent + "  ");
  out += `${indent}</section>\n`;
  return out;
}

function convert(markdown: string): string {
  const { meta, body } = parseFrontmatter(markdown);
  const sceneMatch = body.match(/^#\s+(.+)$/m);
  const sceneTitle = sceneMatch?.[1]?.trim() ?? "";
  const sceneDirectivesMatch = body.match(
    /#\s+[^\n]+\n\n<!--\s*([\s\S]*?)\s*-->/,
  );
  const sceneDirectives = sceneDirectivesMatch
    ? parseDirectiveComment(sceneDirectivesMatch[1])
    : {};

  const overlayMatch = body.match(/^## Overlay:\s*(.+)$/m);
  const overlayId = overlayMatch?.[1]?.trim() ?? "";
  const overlaySection = overlayMatch
    ? body.slice(body.indexOf(overlayMatch[0])).split(/^## Beat\s/m)[0]
    : "";
  const overlayDirectives = extractBeatDirectives(overlaySection);

  const { sections } = splitAnimationBeatSections(body);
  const metaAttrs = Object.entries(meta)
    .map(
      ([key, value]) =>
        ` data-${key.replace(/([A-Z])/g, "-$1").toLowerCase()}="${escapeXml(value)}"`,
    )
    .join("");

  let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="generator" content="video_ops animation-md-to-html" />
  <title>${escapeXml(meta.title ?? meta.scriptId ?? "animation")}</title>
</head>
<body>
  <article class="vo-episode"${metaAttrs}>
    <h1 id="scene-1">${escapeXml(sceneTitle)}</h1>
`;
  html += renderDirectives(sceneDirectives, "    ");
  if (overlayId) {
    html += `    <h2 id="overlay-${escapeXml(overlayId)}">Overlay: ${escapeXml(overlayId)}</h2>\n`;
    html += `    <section class="vo-overlay" data-id="${escapeXml(overlayId)}">\n`;
    html += renderDirectives(overlayDirectives, "      ");
    html += "    </section>\n";
  }
  for (let i = 0; i < sections.length; i += 1) {
    html += renderBeat(sections[i], i);
  }
  html += `  </article>
</body>
</html>
`;
  return html;
}

const inputPath = process.argv[2];
if (!inputPath) {
  console.error(
    "Usage: npx tsx scripts/animation-md-to-html.ts <animation.md>",
  );
  process.exit(1);
}

const markdown = readFileSync(inputPath, "utf8");
const html = convert(markdown);
const outputPath = path.join(path.dirname(inputPath), "animation.html");
writeFileSync(outputPath, html, "utf8");
console.log(`Wrote ${outputPath}`);
