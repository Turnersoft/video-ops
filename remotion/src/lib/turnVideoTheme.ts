// /Users/johndoe/Documents/company/basic_ui/video_ops/remotion/src/lib/turnVideoTheme.ts
/** Claude / VS Code rice-white palette for product-launch renders. */
export const TURN_VIDEO_THEME = {
    canvas: {
        bg: '#F5F2EB',
        bgGradientTop: '#FAF8F3',
        bgGradientBottom: '#EDE8DF',
        vignette: 'rgba(120, 113, 98, 0.06)',
    },
    ide: {
        windowBg: '#FFFFFF',
        windowBorder: '#E3DED4',
        windowShadow: '0 28px 80px rgba(60, 54, 45, 0.14), 0 8px 24px rgba(60, 54, 45, 0.08)',
        titleBar: '#F3F1EB',
        titleText: '#5C574F',
        tabActive: '#FFFFFF',
        tabInactive: '#ECE8E0',
        gutter: '#F7F4EF',
        gutterText: '#9A9488',
        codeBg: '#FCFBF8',
        lineHighlight: 'rgba(217, 119, 87, 0.08)',
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
    proofPanel: {
        bg: '#FAF9F5',
        border: '#E3DED4',
        title: '#3D3A34',
        stepBg: '#FFFFFF',
        stepActiveBg: '#FFF6F1',
        stepActiveBorder: '#D97757',
        goal: '#6B6860',
    },
    accent: {
        claude: '#D97757',
        ring: 'rgba(217, 119, 87, 0.35)',
    },
    director: {
        scrim: 'linear-gradient(transparent, rgba(35, 32, 28, 0.78) 42%)',
        label: 'rgba(255, 255, 255, 0.55)',
        line: '#FAF8F3',
    },
    /** 3Blue1Brown-style math board (dark, high contrast). */
    mathBoard: {
        bg: '#0f1117',
        bgGradient:
            'radial-gradient(120% 80% at 50% 0%, rgba(88, 196, 221, 0.12) 0%, transparent 55%), radial-gradient(80% 60% at 80% 100%, rgba(247, 201, 72, 0.08) 0%, transparent 50%), #0f1117',
        text: '#e8e6e3',
        muted: 'rgba(232, 230, 227, 0.62)',
        accentBlue: '#58c4dd',
        accentGold: '#f7c948',
        cardBorder: 'rgba(88, 196, 221, 0.22)',
    },
    terminal: {
        bg: '#1a1b22',
        header: '#2a2b33',
        text: '#d6d3cd',
        prompt: '#58c4dd',
        success: '#7fd99a',
        error: '#f07178',
    },
} as const;

export const DEFAULT_COMPOSITION = {
    format: 'landscape' as const,
    fps: 30,
    width: 1920,
    height: 1080,
};
