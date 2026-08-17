function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Skip bare operators — otherwise `=` matches every editor and ties wrongly favor Turn. */
function isWeakScoreToken(token: string): boolean {
  const trimmed = token.trim();
  return trimmed.length <= 1 || trimmed === '=' || trimmed === '↔' || trimmed === '∈';
}

/** True when a `code` token from narration appears in the displayed editor code. */
export function tokenInCode(token: string, code: string): boolean {
  const trimmed = token.trim();
  if (!trimmed) {
    return false;
  }
  if (/^[@A-Za-z_][\w@.']*$/.test(trimmed)) {
    return new RegExp(`(?<![\\w@.])${escapeRegExp(trimmed)}(?![\\w.])`).test(code);
  }
  return code.includes(trimmed);
}

function dialectTokenScore(sentences: string[], code: string): number {
  if (!code.trim()) {
    return 0;
  }
  let score = 0;
  for (const sentence of sentences) {
    for (const match of sentence.matchAll(/`([^`]+)`/g)) {
      const token = match[1];
      if (isWeakScoreToken(token)) {
        continue;
      }
      if (tokenInCode(token, code)) {
        score += 1;
      }
    }
  }
  return score;
}

function mentionsTurnLang(text: string): boolean {
  return /\bTurn-Lang\b|SetEq|FuncEq|@notation|forall x in X|Function</i.test(text);
}

/** Pick Lean vs Turn-Lang pane so card copy matches the code on the poster. */
export function pickPrimaryEditor(params: {
  sentences: string[];
  leanCode: string;
  turnCode: string;
  leanLines: number;
  turnLines: number;
}): 'lean' | 'turn' {
  const { sentences, leanCode, turnCode, leanLines, turnLines } = params;
  const hasLean = leanLines > 0;
  const hasTurn = turnLines > 0;
  if (hasLean && !hasTurn) {
    return 'lean';
  }
  if (hasTurn && !hasLean) {
    return 'turn';
  }
  const leanScore = dialectTokenScore(sentences, leanCode);
  const turnScore = dialectTokenScore(sentences, turnCode);
  if (leanScore !== turnScore) {
    return leanScore > turnScore ? 'lean' : 'turn';
  }
  const scoringText = sentences.join(' ');
  if (mentionsTurnLang(scoringText)) {
    return 'turn';
  }
  return 'lean';
}
