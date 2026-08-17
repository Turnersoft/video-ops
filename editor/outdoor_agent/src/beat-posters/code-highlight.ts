function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

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

function wrap(className: string, text: string): string {
  return `<span class="${className}">${escapeHtml(text)}</span>`;
}

function splitCodeParts(content: string): string[] {
  return content
    .split(/(\s+|[{}()[\],:;]|"[^"]*"|@[A-Za-z_][A-Za-z0-9_]*|=>|:=|\|-)/g)
    .filter((part) => part.length > 0);
}

function highlightLeanLine(line: string): string {
  const leadingWhitespace = line.match(/^(\s+)/)?.[1] ?? '';
  const content = line.slice(leadingWhitespace.length);

  if (!content.trim()) {
    return leadingWhitespace ? escapeHtml(leadingWhitespace) : '&nbsp;';
  }
  if (content.trimStart().startsWith('--') || content.trimStart().startsWith('/-')) {
    return wrap('cm', line);
  }

  let out = leadingWhitespace ? escapeHtml(leadingWhitespace) : '';
  let codePart = content;
  let commentPart = '';
  const commentIdx = content.indexOf('--');
  if (commentIdx >= 0 && !content.slice(0, commentIdx).includes('"')) {
    codePart = content.slice(0, commentIdx);
    commentPart = content.slice(commentIdx);
  }

  for (const part of splitCodeParts(codePart)) {
    if (/^\s+$/.test(part)) {
      out += escapeHtml(part);
      continue;
    }
    if (part.startsWith('"') && part.endsWith('"')) {
      out += wrap('st', part);
      continue;
    }
    if (LEAN_OPERATORS.has(part)) {
      out += wrap('op', part);
      continue;
    }
    if (LEAN_TACTICS.has(part)) {
      out += wrap('ta', part);
      continue;
    }
    if (LEAN_KEYWORDS.has(part)) {
      out += wrap('kw', part);
      continue;
    }
    if (/^[A-Z][A-Za-z0-9_'.]*$/.test(part)) {
      out += wrap('ty', part);
      continue;
    }
    out += wrap('pl', part);
  }

  if (commentPart) {
    out += wrap('cm', commentPart);
  }
  return out;
}

function highlightTurnLine(line: string): string {
  const leadingWhitespace = line.match(/^(\s+)/)?.[1] ?? '';
  const content = line.slice(leadingWhitespace.length);

  if (!content.trim()) {
    return leadingWhitespace ? escapeHtml(leadingWhitespace) : '&nbsp;';
  }
  if (content.trimStart().startsWith('//')) {
    return wrap('cm', line);
  }

  let out = leadingWhitespace ? escapeHtml(leadingWhitespace) : '';

  for (const part of splitCodeParts(content)) {
    if (/^\s+$/.test(part)) {
      out += escapeHtml(part);
      continue;
    }
    if (part.startsWith('@')) {
      out += wrap('dc', part);
      continue;
    }
    if (part.startsWith('"') && part.endsWith('"')) {
      out += wrap('st', part);
      continue;
    }
    if (TURN_OPERATORS.has(part)) {
      out += wrap('op', part);
      continue;
    }
    if (TURN_STRUCTURE.has(part)) {
      out += wrap('sr', part);
      continue;
    }
    if (TURN_TACTICS.has(part)) {
      out += wrap('ta', part);
      continue;
    }
    if (TURN_KEYWORDS.has(part)) {
      out += wrap('kw', part);
      continue;
    }
    if (/^[A-Z][A-Za-z0-9_]*$/.test(part)) {
      out += wrap('kw', part);
      continue;
    }
    out += wrap('pl', part);
  }
  return out;
}

export function trimCodeLines(code: string, maxLines = 9): string[] {
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

export function highlightLeanCodeHtml(code: string, maxLines = 9): string {
  const lines = trimCodeLines(code, maxLines);
  return lines
    .map((line, index) => {
      const num = String(index + 1).padStart(2, ' ');
      return `<div class="code-line"><span class="ln">${num}</span><span class="tx">${highlightLeanLine(line)}</span></div>`;
    })
    .join('');
}

export function highlightTurnCodeHtml(code: string, maxLines = 9): string {
  const lines = trimCodeLines(code, maxLines);
  return lines
    .map((line, index) => {
      const num = String(index + 1).padStart(2, ' ');
      return `<div class="code-line"><span class="ln">${num}</span><span class="tx">${highlightTurnLine(line)}</span></div>`;
    })
    .join('');
}
