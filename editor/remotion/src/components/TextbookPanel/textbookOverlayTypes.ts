export type TextbookOverlayConfig = {
    aataExcerpt?: string;
    section?: string;
    definitionLabel?: string;
    body?: string;
    latex?: string;
    source?: string;
    bookTitle?: string;
    bookAuthor?: string;
    revealAtSeconds?: number;
    hideAtSeconds?: number;
    placement?: 'top' | 'center';
    fontScale?: number;
};

export function textbookOverlayVisibleAt(
    overlay: TextbookOverlayConfig,
    sceneSeconds: number,
): boolean {
    const revealAt = overlay.revealAtSeconds ?? 0;
    if (sceneSeconds < revealAt) {
        return false;
    }
    if (overlay.hideAtSeconds !== undefined && sceneSeconds >= overlay.hideAtSeconds) {
        return false;
    }
    return Boolean(
        overlay.aataExcerpt ||
            overlay.body ||
            overlay.latex ||
            overlay.definitionLabel ||
            overlay.section,
    );
}
