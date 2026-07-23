import fs from 'node:fs';

const suppressedWrites = new Map<
    string,
    {
        content: string;
        expiresAt: number;
    }
>();

/** Mark an API-originated source write so its fs event does not trigger a compile loop. */
export function suppressAnimationMarkdownWatch(
    filePath: string,
    content: string,
): void {
    suppressedWrites.set(filePath, {
        content,
        expiresAt: Date.now() + 1500,
    });
}

/** Suppress only while the file still contains the exact API-authored content. */
export function isAnimationMarkdownWatchSuppressed(filePath: string): boolean {
    const entry = suppressedWrites.get(filePath);
    if (!entry) {
        return false;
    }
    if (Date.now() > entry.expiresAt) {
        suppressedWrites.delete(filePath);
        return false;
    }
    try {
        if (fs.readFileSync(filePath, 'utf8') === entry.content) {
            return true;
        }
    } catch {
        // Let the watcher handle a missing or unreadable file normally.
    }
    suppressedWrites.delete(filePath);
    return false;
}
