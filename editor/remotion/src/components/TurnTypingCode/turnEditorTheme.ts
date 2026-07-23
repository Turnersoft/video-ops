// /Users/johndoe/Documents/company/basic_ui/src/shared/turn-video/editor/turnEditorTheme.ts
/** Syntax + IDE colors for the shared Turn typing editor (matches /app Monaco palette). */
export type TurnEditorTheme = {
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
        structure: string;
        tactic: string;
        operator: string;
        string: string;
        comment: string;
        cursor: string;
    };
    mathBoard: {
        accentGold: string;
    };
};

export const DEFAULT_TURN_EDITOR_THEME: TurnEditorTheme = {
    ide: {
        gutter: '#F7F4EF',
        gutterText: '#9A9488',
        windowBorder: '#E3DED4',
        lineHighlight: 'rgba(217, 119, 87, 0.08)',
        codeBg: '#FCFBF8',
    },
    syntax: {
        plain: '#2B2A27',
        keyword: '#0550AE',
        structure: '#8250DF',
        tactic: '#953800',
        operator: '#CF222E',
        string: '#0A3069',
        comment: '#6B6860',
        cursor: '#D97757',
    },
    mathBoard: {
        accentGold: '#f7c948',
    },
};

export type TurnEditorScale = {
    codeFontSize: number;
    codeFontSizeMin: number;
    codeViewportHeight: number;
};

export const DEFAULT_TURN_EDITOR_SCALE: TurnEditorScale = {
    codeFontSize: 22,
    codeFontSizeMin: 14,
    codeViewportHeight: 520,
};
