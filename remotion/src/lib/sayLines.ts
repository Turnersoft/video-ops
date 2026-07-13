// /Users/johndoe/Documents/company/basic_ui/video_ops/remotion/src/lib/sayLines.ts
// Mirrors Video Ops teleprompter sentence splitting (parseVideoOpsMarkdown.ts).

function plainText(value: string): string {
    return value
        .replace(/```[\s\S]*?```/g, ' ')
        .split('\n')
        .map((line) => line.replace(/^>\s?/, '').trim())
        .filter(Boolean)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function isSentenceTerminator(char: string): boolean {
    return /[.!?。！？]/.test(char);
}

function isDecimalPoint(text: string, index: number): boolean {
    if (text[index] !== '.') {
        return false;
    }
    const prev = text[index - 1] ?? '';
    const next = text[index + 1] ?? '';
    return /\d/.test(prev) && /\d/.test(next);
}

function splitIntoSentences(value: string): string[] {
    const cleaned = plainText(value);
    if (!cleaned) {
        return [];
    }

    const sentences: string[] = [];
    let current = '';

    for (let index = 0; index < cleaned.length; index += 1) {
        const char = cleaned[index];
        current += char;

        if (!isSentenceTerminator(char) || isDecimalPoint(cleaned, index)) {
            continue;
        }

        const next = cleaned[index + 1] ?? '';
        if (next !== '' && !/\s/.test(next)) {
            continue;
        }

        const sentence = current.trim();
        if (sentence) {
            sentences.push(sentence);
        }
        current = '';

        while (index + 1 < cleaned.length && /\s/.test(cleaned[index + 1])) {
            index += 1;
        }
    }

    const trailing = current.trim();
    if (trailing) {
        sentences.push(trailing);
    }

    return sentences;
}

export function sayLinesFromScriptBlock(value: string): string[] {
    return splitIntoSentences(value);
}

export function normalizeSayLines(say: string[] | string): string[] {
    if (Array.isArray(say)) {
        return say.length > 0 ? say : [];
    }
    return sayLinesFromScriptBlock(say);
}
