export type TextbookPanelLayout = {
    /** Panel anchor (% of composition width). */
    xPct: number;
    /** Panel anchor (% of composition height). */
    yPct: number;
    /** Panel width (% of composition width). */
    wPct: number;
};

export function textbookPanelStorageKey(scriptId: string, sceneIndex: number): string {
    return `video-ops:textbook-panel:${scriptId}:${sceneIndex}`;
}

export function defaultTextbookPanelLayout(
    placement: 'top' | 'center' = 'center',
): TextbookPanelLayout {
    if (placement === 'top') {
        return { xPct: 50, yPct: 14, wPct: 40 };
    }
    return { xPct: 50, yPct: 46, wPct: 62 };
}

export function readTextbookPanelLayoutFromStorage(key: string): TextbookPanelLayout | null {
    if (typeof window === 'undefined') {
        return null;
    }
    try {
        const raw = window.localStorage.getItem(key);
        if (!raw) {
            return null;
        }
        const parsed = JSON.parse(raw) as TextbookPanelLayout;
        if (
            typeof parsed.xPct !== 'number' ||
            typeof parsed.yPct !== 'number' ||
            typeof parsed.wPct !== 'number'
        ) {
            return null;
        }
        return parsed;
    } catch {
        return null;
    }
}

export function writeTextbookPanelLayoutToStorage(key: string, layout: TextbookPanelLayout): void {
    if (typeof window === 'undefined') {
        return;
    }
    window.localStorage.setItem(key, JSON.stringify(layout));
}
