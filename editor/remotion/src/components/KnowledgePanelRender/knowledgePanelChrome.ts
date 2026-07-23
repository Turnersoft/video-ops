/** Panel chrome theme for Remotion-rendered knowledge panels. */
export const KNOWLEDGE_PANEL_CHROME = 'light' as const;

export function knowledgePanelThemeClass(): string {
    return `knowledge-panel-theme-${KNOWLEDGE_PANEL_CHROME}`;
}
