/** Code + render body panels relative to column chrome. */
export const COMPARE_BODY_RELATIVE_SCALE = 0.5;

/** Compare scene panel font scale (code + render panels). */
export const COMPARE_PANEL_FONT_SCALE = 0.72 * 2 * 0.75 * 2 * COMPARE_BODY_RELATIVE_SCALE;

/** Column chrome labels (Code, Render, vs). */
export const COMPARE_CHROME_FONT_SCALE = 2 * 0.75 * 2;

/** Language column title row only (logo + Lean 4 / Turn-Lang). */
export const COMPARE_LANGUAGE_TITLE_SCALE = 1;

/**
 * panel.css sets `.doc` body to `calc(0.8rem × --doc-typeset-scale)`.
 * Compare knowledge needs the larger app-like reader size after the code body shrink.
 */
export const COMPARE_KNOWLEDGE_DOC_TYPESET_SCALE = 2.5;

/** Unified body font size for compare code, goals, and knowledge reader. */
export function compareBodyFontSize(baseCodeFontSize: number): number {
    return Math.round(baseCodeFontSize * COMPARE_PANEL_FONT_SCALE);
}

export function compareBodyFontSizeMin(baseMinFontSize: number): number {
    return Math.round(baseMinFontSize * COMPARE_PANEL_FONT_SCALE);
}
