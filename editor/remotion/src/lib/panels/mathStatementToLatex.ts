// /Users/johndoe/Documents/company/basic_ui/src/shared/turn-video/panels/mathStatementToLatex.ts
const HL_START = '\uE000HLSTART\uE000';
const HL_END = '\uE000HLEND\uE000';

const UNICODE_TO_LATEX: Record<string, string> = {
    '↔': '\\leftrightarrow',
    '→': '\\to',
    '∈': '\\in',
    '∀': '\\forall ',
    '∃': '\\exists ',
    '⊢': '\\vdash',
    '~': '\\sim ',
    '×': '\\times ',
    '∧': '\\land ',
    '∨': '\\lor ',
    '≠': '\\neq ',
    '≤': '\\le ',
    '≥': '\\ge ',
    '∅': '\\emptyset ',
    'λ': '\\lambda ',
    '·': '\\cdot ',
};

const GREEK_TO_LATEX: Record<string, string> = {
    α: '\\alpha',
    β: '\\beta',
    γ: '\\gamma',
    δ: '\\delta',
    ε: '\\epsilon',
    ζ: '\\zeta',
    η: '\\eta',
    θ: '\\theta',
    ι: '\\iota',
    κ: '\\kappa',
    λ: '\\lambda',
    μ: '\\mu',
    ν: '\\nu',
    ξ: '\\xi',
    π: '\\pi',
    ρ: '\\rho',
    σ: '\\sigma',
    τ: '\\tau',
    υ: '\\upsilon',
    φ: '\\phi',
    χ: '\\chi',
    ψ: '\\psi',
    ω: '\\omega',
};

/** Wrap matched needles before LaTeX conversion (caption-synced glow). */
export function markMathHighlights(source: string, needles: string[]): string {
    if (needles.length === 0) {
        return source;
    }
    let marked = source;
    for (const needle of needles) {
        const term = needle.trim();
        if (!term || !marked.includes(term)) {
            continue;
        }
        marked = marked.replace(term, `${HL_START}${term}${HL_END}`);
    }
    return marked;
}

function escapeLatexText(text: string): string {
    return text
        .replace(/\\/g, '\\textbackslash{}')
        .replace(/_/g, '\\_')
        .replace(/#/g, '\\#')
        .replace(/%/g, '\\%')
        .replace(/&/g, '\\&');
}

function replaceUnicodeMath(input: string): string {
    let out = '';
    for (const char of input) {
        if (GREEK_TO_LATEX[char]) {
            out += GREEK_TO_LATEX[char];
            continue;
        }
        if (UNICODE_TO_LATEX[char]) {
            out += UNICODE_TO_LATEX[char];
            continue;
        }
        out += char;
    }
    return out;
}

/** Turn `{ y | x ~ y }` into `\{ y \mid x \sim y \}`. */
function normalizeSetBuilder(input: string): string {
    return input
        .replace(/\{\s*/g, '\\{ ')
        .replace(/\s*\}/g, ' \\}')
        .replace(/\|\s*/g, '\\mid ');
}

/** Lean identifiers like `eqvClass`, `Setoid`, `Prop`, `Type`. */
function formatIdentifiers(input: string): string {
    return input.replace(/\b([A-Za-z][A-Za-z0-9_.']*)\b/g, (token) => {
        if (token === 'mid' || token === 'in' || token === 'to') {
            return token;
        }
        if (/^(x|y|z|a|b|c|s|R|E|X|C|h|w)$/u.test(token)) {
            return token;
        }
        if (token.includes('.')) {
            const parts = token.split('.');
            return parts
                .map((part, index) => (index === 0 ? part : `\\mathit{${escapeLatexText(part)}}`))
                .join('.');
        }
        if (/^[A-Z]/.test(token)) {
            return `\\mathit{${escapeLatexText(token)}}`;
        }
        return token;
    });
}

function unwrapHighlights(latexBody: string): string {
    return latexBody
        .split(HL_START)
        .map((chunk, index) => {
            if (index === 0) {
                return chunk;
            }
            const end = chunk.indexOf(HL_END);
            if (end < 0) {
                return chunk;
            }
            const inner = chunk.slice(0, end);
            const rest = chunk.slice(end + HL_END.length);
            return `\\textcolor{#569cd6}{${inner}}${rest}`;
        })
        .join('');
}

/** Convert Lean goal lines or math-board strings into inline LaTeX for MathJax. */
export function mathStatementToLatex(source: string, highlights: string[] = []): string {
    const marked = markMathHighlights(source.trim(), highlights);
    let latex = marked;
    latex = normalizeSetBuilder(latex);
    latex = replaceUnicodeMath(latex);
    latex = latex.replace(/\bType\*/g, '\\mathit{Type}^{*}');
    latex = formatIdentifiers(latex);
    latex = latex.replace(/\s+/g, ' ').trim();
    latex = unwrapHighlights(latex);
    return latex;
}
