// /Users/johndoe/Documents/company/basic_ui/video_ops/remotion/src/components/TurnTypingCode.tsx
import { getRemotionEnvironment, useCurrentFrame, useVideoConfig } from 'remotion';

import { TurnTypingCode as SharedTurnTypingCode } from '@turn-video-shared/editor/TurnTypingCode';
import { TURN_VIDEO_THEME } from '../lib/turnVideoTheme';
import { useCompositionScale } from '../lib/useCompositionScale';

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
};

export function TurnTypingCode(props: TurnTypingCodeProps) {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    const s = useCompositionScale();
    const t = TURN_VIDEO_THEME;
    const remotionEnv = getRemotionEnvironment();
    const interactiveScroll =
        !remotionEnv.isRendering && (remotionEnv.isStudio || remotionEnv.isPlayer);

    return (
        <SharedTurnTypingCode
            {...props}
            frame={frame}
            fps={fps}
            interactiveScroll={interactiveScroll}
            theme={{
                ide: t.ide,
                syntax: t.syntax,
                mathBoard: t.mathBoard,
            }}
            scale={{
                codeFontSize: props.fontSize ?? s.codeFontSize,
                codeFontSizeMin: props.minFontSize ?? s.codeFontSizeMin,
                codeViewportHeight: props.viewportHeight ?? s.codeViewportHeight,
            }}
        />
    );
}
