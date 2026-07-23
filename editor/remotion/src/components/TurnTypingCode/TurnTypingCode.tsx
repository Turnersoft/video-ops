// /Users/johndoe/Documents/company/basic_ui/video_ops/remotion/src/components/TurnTypingCode.tsx
import { getRemotionEnvironment, useCurrentFrame, useVideoConfig } from 'remotion';

import { TurnTypingCode as SharedTurnTypingCode } from './TurnTypingCodeEditor';
import { TURN_SLIDE_EDITOR_THEME, TURN_VIDEO_THEME } from '../../lib/layout/turnVideoTheme';
import { useCompositionScale } from '../../lib/layout/useCompositionScale';

type TurnTypingCodeProps = {
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
    /** `dark` matches knowledge-panel slide focus. */
    appearance?: 'light' | 'dark';
};

export function TurnTypingCode(props: TurnTypingCodeProps) {
    const { appearance = 'light', ...rest } = props;
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    const s = useCompositionScale();
    const remotionEnv = getRemotionEnvironment();
    const interactiveScroll =
        !remotionEnv.isRendering && (remotionEnv.isStudio || remotionEnv.isPlayer);
    const theme =
        appearance === 'dark'
            ? TURN_SLIDE_EDITOR_THEME
            : {
                  ide: TURN_VIDEO_THEME.ide,
                  syntax: TURN_VIDEO_THEME.syntax,
                  mathBoard: TURN_VIDEO_THEME.mathBoard,
              };

    return (
        <SharedTurnTypingCode
            {...rest}
            frame={frame}
            fps={fps}
            interactiveScroll={interactiveScroll}
            theme={theme}
            scale={{
                codeFontSize: props.fontSize ?? s.codeFontSize,
                codeFontSizeMin: props.minFontSize ?? s.codeFontSizeMin,
                codeViewportHeight: props.viewportHeight ?? s.codeViewportHeight,
            }}
        />
    );
}
