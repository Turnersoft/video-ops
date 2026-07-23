// /Users/johndoe/Documents/company/basic_ui/src/shared/turn-video/editor/leanEditorTheme.ts
/** Lean 4 editor colors — VS Code–inspired palette for Remotion (no Monaco). */
export type LeanEditorTheme = {
    ide: {
        gutter: string;
        gutterText: string;
        windowBorder: string;
        lineHighlight: string;
        codeBg: string;
    };
    syntax: {
        plain: string;
        keyword: string;
        tactic: string;
        type: string;
        operator: string;
        string: string;
        comment: string;
        cursor: string;
    };
    goalPanel: {
        accent: string;
    };
};

export const DEFAULT_LEAN_EDITOR_THEME: LeanEditorTheme = {
    ide: {
        gutter: '#252526',
        gutterText: '#858585',
        windowBorder: '#3c3c3c',
        lineHighlight: 'rgba(155, 155, 155, 0.08)',
        codeBg: '#1e1e1e',
    },
    syntax: {
        plain: '#d4d4d4',
        keyword: '#569cd6',
        tactic: '#c586c0',
        type: '#4ec9b0',
        operator: '#d4d4d4',
        string: '#ce9178',
        comment: '#6a9955',
        cursor: '#aeafad',
    },
    goalPanel: {
        accent: '#569cd6',
    },
};

export type LeanEditorScale = {
    codeFontSize: number;
    codeFontSizeMin: number;
    codeViewportHeight: number;
};

export const DEFAULT_LEAN_EDITOR_SCALE: LeanEditorScale = {
    codeFontSize: 22,
    codeFontSizeMin: 14,
    codeViewportHeight: 520,
};
