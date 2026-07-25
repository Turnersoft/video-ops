/**
 * Migrate all animation.md files under projects/ to dedicated highlight sections.
 * Usage: npx tsx scripts/migrate-animation-highlights.ts [optional-path]
 */

import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

import { migrateInlinePaneHighlightsInMarkdown } from "../src/beatVariants.ts";

function collectAnimationMarkdownFiles(root: string): string[] {
  const out: string[] = [];
  let entries: string[] = [];
  try {
    entries = readdirSync(root);
  } catch {
    return out;
  }
  for (const entry of entries) {
    const fullPath = path.join(root, entry);
    let stat;
    try {
      stat = statSync(fullPath);
    } catch {
      continue;
    }
    if (stat.isDirectory()) {
      out.push(...collectAnimationMarkdownFiles(fullPath));
      continue;
    }
    if (entry === "animation.md") {
      out.push(fullPath);
    }
  }
  return out.sort();
}

const targetArg = process.argv[2];
const roots = targetArg
  ? [path.resolve(targetArg)]
  : [path.resolve("projects")];

let changed = 0;
let scanned = 0;

for (const root of roots) {
  const files = statSync(root).isDirectory()
    ? collectAnimationMarkdownFiles(root)
    : [root];

  for (const filePath of files) {
    scanned += 1;
    const before = readFileSync(filePath, "utf8");
    const after = migrateInlinePaneHighlightsInMarkdown(before);
    if (after !== before) {
      writeFileSync(filePath, after, "utf8");
      changed += 1;
      console.log(`Updated ${path.relative(process.cwd(), filePath)}`);
    }
  }
}

console.log(`Scanned ${scanned} animation.md file(s); updated ${changed}.`);
