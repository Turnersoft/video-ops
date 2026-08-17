const LEAN_KEYWORDS = new Set([
  'theorem', 'def', 'lemma', 'example', 'axiom', 'inductive', 'structure', 'class',
  'instance', 'abbrev', 'namespace', 'section', 'variable', 'import', 'open',
  'universe', 'where', 'match', 'with', 'fun', 'let', 'in', 'if', 'then', 'else',
  'do', 'by', 'have', 'show', 'from', 'partial', 'mutual', 'opaque', 'private',
  'protected', 'public', 'scoped', 'meta', 'attribute', 'deriving', 'extends',
  'infix', 'prefix', 'postfix', 'noncomputable',
]);

const LEAN_TACTICS = new Set([
  'apply', 'exact', 'intro', 'intros', 'rw', 'simp', 'rfl', 'sorry', 'cases',
  'constructor', 'split', 'left', 'right', 'use', 'refine', 'calc', 'assumption',
  'contradiction', 'trivial', 'ring', 'linarith', 'norm_num', 'decide', 'ext',
  'congr', 'obtain', 'rcases', 'induction',
]);

const LEAN_OPERATORS = new Set(['=>', ':=', '→', '∀', '∃', '|']);

const TURN_STRUCTURE = new Set([
  'theorem', 'relation', 'proof', 'struct', 'enum', 'namespace', 'module', 'import',
  'use', 'notation', 'def', 'infix', 'prefix', 'postfix', 'variable', 'where',
  'match', 'let', 'if', 'then', 'else',
]);

const TURN_KEYWORDS = new Set([
  'Prop', 'Any', 'Set', 'Subset', 'Func', 'Group', 'Iso', 'true', 'false',
]);

const TURN_TACTICS = new Set([
  'proof', 'by', 'have', 'show', 'calc', 'simp', 'rw', 'apply', 'exact', 'intro',
  'intros', 'cases', 'split', 'left', 'right', 'use', 'refine', 'ring', 'linarith',
]);

const TURN_OPERATORS = new Set(['|-', '=>', ':=', '~', '|', '->']);

export type HighlightToken = {
  text: string;
  kind:
    | 'plain'
    | 'keyword'
    | 'tactic'
    | 'type'
    | 'structure'
    | 'operator'
    | 'string'
    | 'comment'
    | 'decorator';
};

export function trimCodeLines(code: string, maxLines = 8): string[] {
  return code
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.replace(/\s+$/g, ''))
    .filter((line, index, all) => line.trim() || all.slice(index + 1).some((next) => next.trim()))
    .slice(0, maxLines);
}

export function fitCodeLines(
  code: string,
  maxLines: number,
): { lines: string[]; usedLines: number } {
  const source = trimCodeLines(code, 24);
  const trimmed = source.slice(0, Math.max(6, maxLines));
  return { lines: trimmed, usedLines: trimmed.length };
}

function splitCodeParts(content: string): string[] {
  return content
    .split(/(\s+|[{}()[\],:;]|"[^"]*"|@[A-Za-z_][A-Za-z0-9_]*|=>|:=|\|-)/g)
    .filter((part) => part.length > 0);
}

function highlightLeanLine(line: string): HighlightToken[] {
  const leadingWhitespace = line.match(/^(\s+)/)?.[1] ?? '';
  const content = line.slice(leadingWhitespace.length);

  if (content.trimStart().startsWith('--') || content.trimStart().startsWith('/-')) {
    return [{ text: line, kind: 'comment' }];
  }

  const tokens: HighlightToken[] = [];
  if (leadingWhitespace) {
    tokens.push({ text: leadingWhitespace, kind: 'plain' });
  }

  let codePart = content;
  let commentPart = '';
  const commentIdx = content.indexOf('--');
  if (commentIdx >= 0 && !content.slice(0, commentIdx).includes('"')) {
    codePart = content.slice(0, commentIdx);
    commentPart = content.slice(commentIdx);
  }

  for (const part of splitCodeParts(codePart)) {
    if (/^\s+$/.test(part)) {
      tokens.push({ text: part, kind: 'plain' });
      continue;
    }
    if (part.startsWith('"') && part.endsWith('"')) {
      tokens.push({ text: part, kind: 'string' });
      continue;
    }
    if (LEAN_OPERATORS.has(part)) {
      tokens.push({ text: part, kind: 'operator' });
      continue;
    }
    if (LEAN_TACTICS.has(part)) {
      tokens.push({ text: part, kind: 'tactic' });
      continue;
    }
    if (LEAN_KEYWORDS.has(part)) {
      tokens.push({ text: part, kind: 'keyword' });
      continue;
    }
    if (/^[A-Z][A-Za-z0-9_'.]*$/.test(part)) {
      tokens.push({ text: part, kind: 'type' });
      continue;
    }
    tokens.push({ text: part, kind: 'plain' });
  }

  if (commentPart) {
    tokens.push({ text: commentPart, kind: 'comment' });
  }
  return tokens.length ? tokens : [{ text: line, kind: 'plain' }];
}

function highlightTurnLine(line: string): HighlightToken[] {
  const leadingWhitespace = line.match(/^(\s+)/)?.[1] ?? '';
  const content = line.slice(leadingWhitespace.length);

  if (content.trimStart().startsWith('//')) {
    return [{ text: line, kind: 'comment' }];
  }

  const tokens: HighlightToken[] = [];
  if (leadingWhitespace) {
    tokens.push({ text: leadingWhitespace, kind: 'plain' });
  }

  for (const part of splitCodeParts(content)) {
    if (/^\s+$/.test(part)) {
      tokens.push({ text: part, kind: 'plain' });
      continue;
    }
    if (part.startsWith('@')) {
      tokens.push({ text: part, kind: 'decorator' });
      continue;
    }
    if (part.startsWith('"') && part.endsWith('"')) {
      tokens.push({ text: part, kind: 'string' });
      continue;
    }
    if (TURN_OPERATORS.has(part)) {
      tokens.push({ text: part, kind: 'operator' });
      continue;
    }
    if (TURN_STRUCTURE.has(part)) {
      tokens.push({ text: part, kind: 'structure' });
      continue;
    }
    if (TURN_TACTICS.has(part)) {
      tokens.push({ text: part, kind: 'tactic' });
      continue;
    }
    if (TURN_KEYWORDS.has(part)) {
      tokens.push({ text: part, kind: 'keyword' });
      continue;
    }
    if (/^[A-Z][A-Za-z0-9_]*$/.test(part)) {
      tokens.push({ text: part, kind: 'keyword' });
      continue;
    }
    tokens.push({ text: part, kind: 'plain' });
  }

  return tokens.length ? tokens : [{ text: line, kind: 'plain' }];
}

export function highlightCodeLines(
  code: string,
  dialect: 'lean' | 'turn',
  maxLines = 8,
): HighlightToken[][] {
  const lines = trimCodeLines(code, maxLines);
  return lines.map((line) =>
    dialect === 'lean' ? highlightLeanLine(line) : highlightTurnLine(line),
  );
}
