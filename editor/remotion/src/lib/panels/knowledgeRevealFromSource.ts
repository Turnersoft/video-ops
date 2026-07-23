// /Users/johndoe/Documents/company/basic_ui/src/shared/turn-video/panels/knowledgeRevealFromSource.ts
import type { KnowledgeSectionExport } from './panelExportTypes';

/** Keywords in visible source that unlock a knowledge section (in export order). */
function revealKeywordsForSection(section: KnowledgeSectionExport): string[] {
    const fromMeta = section.metadata?.find(([key]) => key === 'reveal')?.[1];
    if (fromMeta) {
        return fromMeta
            .split('|')
            .map((part) => part.trim())
            .filter(Boolean);
    }

    const id = section.id?.toLowerCase() ?? '';
    const title =
        section.title?.segments
            ?.map((segment) => segment.Text ?? '')
            .join('')
            .toLowerCase() ?? '';

    if (id.includes('nonempty') || title.includes('nonempty')) {
        return ['nonempty', 'emptyset', '!=', 'at least one element'];
    }
    if (id.includes('subset') || title.includes('subset')) {
        return ['subset(', 'inside the original', 'sits inside'];
    }
    if (id.includes('disjoint') || title.includes('disjoint')) {
        return ['disjoint {', 'do not overlap', 'not overlap'];
    }
    if (id.includes('cover') || title.includes('cover')) {
        return ['cover {', 'cover everything', 'cover the whole'];
    }

    return [];
}

function sectionIsRevealed(section: KnowledgeSectionExport, visibleSource: string): boolean {
    const keywords = revealKeywordsForSection(section);
    if (keywords.length === 0) {
        return true;
    }
    const lower = visibleSource.toLowerCase();
    return keywords.some((keyword) => lower.includes(keyword.toLowerCase()));
}

/** Count Turn-Lang structure/law blocks fully present in the typed source excerpt. */
export function revealedKnowledgeBlockCount(visibleSource: string): number {
    if (!visibleSource.trim()) {
        return 0;
    }

    let count = 0;
    for (const line of visibleSource.split('\n')) {
        const trimmed = line.trim();
        if (trimmed.startsWith('|-') && trimmed.endsWith(';')) {
            count += 1;
        }
    }

    const lower = visibleSource.toLowerCase();
    if (/\bdisjoint\s*\{/.test(lower)) {
        count += 1;
    }
    if (/\bcover\s*\{/.test(lower)) {
        count += 1;
    }

    return count;
}

/** Knowledge cards revealed in export order. */
export function revealedKnowledgeSections<T extends KnowledgeSectionExport>(
    sections: T[],
    visibleSource: string,
): T[] {
    const blockCount = revealedKnowledgeBlockCount(visibleSource);
    if (blockCount > 0) {
        return sections.slice(0, blockCount);
    }

    const revealed: T[] = [];
    for (const section of sections) {
        if (!sectionIsRevealed(section, visibleSource)) {
            break;
        }
        revealed.push(section);
    }
    return revealed;
}
