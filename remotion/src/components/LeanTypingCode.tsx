// /Users/johndoe/Documents/company/basic_ui/video_ops/remotion/src/components/LeanTypingCode.tsx
import { getRemotionEnvironment, useCurrentFrame, useVideoConfig } from 'remotion';

import { LeanTypingCode as SharedLeanTypingCode } from '@turn-video-shared/editor/LeanTypingCode';
import { DEFAULT_LEAN_EDITOR_THEME } from '@turn-video-shared/editor/leanEditorTheme';
import { useCompositionScale } from '../lib/useCompositionScale';

type LeanTypingCodeProps = {
    renderSource?: string;
    typingSnippet?: string;
    source?: string;
    charsPerSecond?: number;
    showLineNumbers?: boolean;
    fontSize?: number;
    minFontSize?: number;
    viewportHeight?: number;
    wrapLines?: boolean;
    highlights?: Array<{ text: string; atSeconds?: number }>;
    staticHighlights?: string[];
    gutterLineNumbers?: (number | null)[];
};

export function LeanTypingCode(props: LeanTypingCodeProps) {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    const s = useCompositionScale();
    const theme = DEFAULT_LEAN_EDITOR_THEME;
    const remotionEnv = getRemotionEnvironment();
    const interactiveScroll =
        !remotionEnv.isRendering && (remotionEnv.isStudio || remotionEnv.isPlayer);

    return (
        <SharedLeanTypingCode
            {...props}
            frame={frame}
            fps={fps}
            theme={theme}
            interactiveScroll={interactiveScroll}
            scale={{
                codeFontSize: props.fontSize ?? s.codeFontSize,
                codeFontSizeMin: props.minFontSize ?? s.codeFontSizeMin,
                codeViewportHeight: props.viewportHeight ?? s.codeViewportHeight,
            }}
        />
    );
}
