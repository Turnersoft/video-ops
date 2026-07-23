// /Users/johndoe/Documents/company/basic_ui/src/shared/turn-video/panels/tokenizeMathFormula.ts

const MATH_SYMBOLS = new Set(['∈', '↔', '~', '∀', '∃', '⊢', '|', '=']);
const BRACKETS = new Set(['{', '}', '[', ']', '(', ')']);

/** Split a formula line into animatable tokens (words, symbols, whitespace). */
export function tokenizeMathFormula(text: string): string[] {
    const pattern =
        /\s+|[∈↔~∀∃⊢]|—|–|\{|\}|\[|\]|\||=|,|\(|\)|[A-Za-zα-ωΑ-Ω][A-Za-zα-ωΑ-Ω0-9_.']*|\S/gu;
    const tokens: string[] = [];
    let match: RegExpExecArray | null;
    const re = new RegExp(pattern.source, pattern.flags);
    while ((match = re.exec(text)) !== null) {
        tokens.push(match[0]);
    }
    return tokens.length > 0 ? tokens : [text];
}

export function isMathSymbolToken(token: string): boolean {
    return MATH_SYMBOLS.has(token.trim());
}

export function isBracketToken(token: string): boolean {
    return BRACKETS.has(token);
}

export function isWhitespaceToken(token: string): boolean {
    return token.trim().length === 0;
}

/** Default pulse targets when beat omits `emphasis`. */
export function defaultEmphasisTokens(tokens: string[]): string[] {
    const out: string[] = [];
    for (const token of tokens) {
        if (isMathSymbolToken(token)) {
            out.push(token);
        }
    }
    return out;
}

export function tokenMatchesEmphasis(token: string, emphasis: string[]): boolean {
    const trimmed = token.trim();
    if (!trimmed) {
        return false;
    }
    return emphasis.some((needle) => {
        const n = needle.trim();
        if (!n) {
            return false;
        }
        return n === trimmed || n.includes(trimmed) || trimmed.includes(n);
    });
}
