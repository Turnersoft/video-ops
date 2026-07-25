export const AATA_BOOK_TITLE = 'Abstract Algebra: Theory and Applications';
export const AATA_BOOK_AUTHOR = 'Thomas W. Judson';

export function humanizeAataExcerptId(excerptId: string): string {
    return excerptId
        .replace(/^sets-v2-/, '')
        .replace(/-/g, ' ')
        .replace(/\bp(\d+)\b/gi, 'p.$1')
        .replace(/\b\w/g, (char) => char.toUpperCase());
}
