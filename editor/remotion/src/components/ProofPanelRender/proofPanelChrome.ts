/** Panel chrome theme for Remotion-rendered proof panels. */
export const PROOF_PANEL_CHROME = 'dark' as const;

export function proofPanelThemeClass(): string {
    return `proof-panel-theme-${PROOF_PANEL_CHROME}`;
}
