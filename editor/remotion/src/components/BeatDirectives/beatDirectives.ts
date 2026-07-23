/** Parse `key: value` lines from animation.md visual notes and beat HTML comments. */

const DIRECTIVE_LINE_RE = /^\s*([a-z][a-z0-9-]*)\s*:\s*(.+?)\s*$/i;

export function parseVisualNotesDirective(
    visualNotes: string | undefined,
    key: string,
): string | undefined {
    if (!visualNotes?.trim()) {
        return undefined;
    }
    const normalizedKey = key.toLowerCase();
    for (const line of visualNotes.split('\n')) {
        const trimmed = line.trim();
        const match = trimmed.match(DIRECTIVE_LINE_RE);
        if (match && match[1].toLowerCase() === normalizedKey) {
            const value = match[2].trim();
            return value || undefined;
        }
    }
    return undefined;
}

export function parseBeatCommentDirectives(
    visualNotes: string | undefined,
): Record<string, string> {
    const directives: Record<string, string> = {};
    if (!visualNotes?.trim()) {
        return directives;
    }
    const commentBlocks = visualNotes.matchAll(/<!--([\s\S]*?)-->/g);
    for (const block of commentBlocks) {
        for (const line of block[1].split('\n')) {
            const match = line.trim().match(DIRECTIVE_LINE_RE);
            if (match) {
                directives[match[1].toLowerCase()] = match[2].trim();
            }
        }
    }
    for (const line of visualNotes.split('\n')) {
        const match = line.trim().match(DIRECTIVE_LINE_RE);
        if (match) {
            directives[match[1].toLowerCase()] = match[2].trim();
        }
    }
    return directives;
}
