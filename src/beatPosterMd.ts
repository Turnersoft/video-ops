/**
 * Parser for `beat-posters.md` — human-authored copy for the beat poster album.
 *
 * Optional album-cover hook:
 *
 *   ## Cover
 *   ### English
 *   The empty set is not a tiny bag.
 *   ### Chinese
 *   空集（empty set）不是很小的一袋子。
 *
 * Format (per beat, matched by beat number):
 *
 *   ## Beat 1: Textbook rule and how `=` is wired
 *
 *   ### Title zh
 *   课本公式里，等号是怎么接线的
 *
 *   ### English
 *   The `=` sign is wired into Lean's kernel...
 *
 *   ### Chinese
 *   等号焊在 Lean 内核里……
 *
 *   ### Next en
 *   What does `=` ask us to prove?
 *
 *   ### Next zh
 *   写下 `=` 后，Lean 到底要你证明什么？
 *
 * Optional `### Lean` / `### Turn-Lang` fenced code blocks override the code
 * shown on the poster (default: the beat's code from animation.md).
 * Optional `### Editor` (`lean` or `turn`) pins which pane to show when copy
 * names both dialects but one side should lead the card.
 * Any field left out falls back to the auto-derived copy.
 */

export type BeatPosterPrimaryEditor = 'lean' | 'turn';

export type BeatPosterMdEntry = {
  beat: number;
  titleEn?: string;
  titleZh?: string;
  bodyEn?: string;
  bodyZh?: string;
  nextEn?: string;
  nextZh?: string;
  leanCode?: string;
  turnCode?: string;
  primaryEditor?: BeatPosterPrimaryEditor;
};

export type BeatPosterMdCover = {
  bodyEn?: string;
  bodyZh?: string;
};

export type BeatPosterMdDocument = {
  cover: BeatPosterMdCover;
  beats: Record<number, BeatPosterMdEntry>;
};

type EntryTextKey = Exclude<keyof BeatPosterMdEntry, 'beat'>;

const SECTION_KEYS: Record<string, EntryTextKey> = {
  title: 'titleEn',
  'title en': 'titleEn',
  'title zh': 'titleZh',
  english: 'bodyEn',
  'body en': 'bodyEn',
  chinese: 'bodyZh',
  'body zh': 'bodyZh',
  'next en': 'nextEn',
  'next zh': 'nextZh',
  lean: 'leanCode',
  turn: 'turnCode',
  'turn-lang': 'turnCode',
  editor: 'primaryEditor',
  'editor en': 'primaryEditor',
  'editor zh': 'primaryEditor',
};

function normalizePrimaryEditor(value: string): BeatPosterPrimaryEditor | undefined {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'lean' || normalized === 'turn' || normalized === 'turn-lang') {
    return normalized === 'turn-lang' ? 'turn' : normalized;
  }
  return undefined;
}

function stripCodeFence(value: string): string {
  const lines = value.split('\n');
  if (lines[0]?.trim().startsWith('```')) {
    lines.shift();
    if (lines.length && lines[lines.length - 1].trim() === '```') {
      lines.pop();
    }
  }
  return lines.join('\n').trim();
}

export function parseBeatPosterMd(markdown: string): BeatPosterMdDocument {
  const beats: Record<number, BeatPosterMdEntry> = {};
  const cover: BeatPosterMdCover = {};
  let current: BeatPosterMdEntry | null = null;
  let editingCover = false;
  let section: EntryTextKey | null = null;
  let buffer: string[] = [];

  const flushSection = () => {
    const raw = buffer.join('\n').trim();
    buffer = [];
    if (!section) {
      return;
    }
    const value =
      section === 'leanCode' || section === 'turnCode' ? stripCodeFence(raw) : raw;
    if (editingCover) {
      if (section === 'bodyEn' && value) {
        cover.bodyEn = value;
      } else if (section === 'bodyZh' && value) {
        cover.bodyZh = value;
      }
      return;
    }
    if (!current) {
      return;
    }
    if (section === 'primaryEditor') {
      const editor = normalizePrimaryEditor(value);
      if (editor) {
        current.primaryEditor = editor;
      }
    } else if (value) {
      current[section] = value;
    }
  };
  const flushBlock = () => {
    flushSection();
    if (current) {
      beats[current.beat] = current;
    }
    current = null;
    editingCover = false;
    section = null;
  };

  for (const line of markdown.replace(/\r\n/g, '\n').split('\n')) {
    if (/^##\s+Cover\b/i.test(line)) {
      flushBlock();
      editingCover = true;
      continue;
    }
    const beatMatch = line.match(/^##\s+Beat\s+(\d+)\s*:\s*(.+)$/i);
    if (beatMatch) {
      flushBlock();
      current = { beat: Number(beatMatch[1]), titleEn: beatMatch[2].trim() };
      continue;
    }
    const sectionMatch = line.match(/^###\s+(.+?)\s*$/);
    if (sectionMatch && (current || editingCover)) {
      flushSection();
      section = SECTION_KEYS[sectionMatch[1].trim().toLowerCase()] ?? null;
      continue;
    }
    if ((current || editingCover) && section) {
      buffer.push(line);
    }
  }
  flushBlock();
  return { cover, beats };
}

/** Cover hook from beat-posters.md, if authored. */
export function beatPosterMdCoverCopy(
  doc: BeatPosterMdDocument | null | undefined,
  lang: 'en' | 'zh',
): string {
  if (lang === 'zh') {
    return doc?.cover.bodyZh?.trim() || doc?.cover.bodyEn?.trim() || '';
  }
  return doc?.cover.bodyEn?.trim() || '';
}

/** Look up authored copy for a 0-based beat index. */
export function beatPosterMdEntryFor(
  doc: BeatPosterMdDocument | null | undefined,
  beatIndex: number,
): BeatPosterMdEntry | null {
  return doc?.beats[beatIndex + 1] ?? null;
}
