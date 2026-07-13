// /Users/johndoe/Documents/company/basic_ui/video_ops/remotion/src/lib/useCompositionScale.ts
import { useVideoConfig } from 'remotion';

import { useOutdoorLayout } from './outdoorLayoutContext';

const BASE_WIDTH = 1920;
const BASE_HEIGHT = 1080;

/** Scale UI tokens from the 1920×1080 design baseline. */
export function useCompositionScale() {
    const { width, height } = useVideoConfig();
    const outdoorFormat = useOutdoorLayout();
    const scale = Math.min(width / BASE_WIDTH, height / BASE_HEIGHT);

    return {
        scale,
        width,
        height,
        px: (value: number) => Math.round(value * scale),
        codeFontSize: Math.round(24 * scale),
        codeFontSizeMin: Math.round(14 * scale),
        codeViewportHeight: Math.round(520 * scale),
        /**
         * Code editor body height inside compare columns — scene inset, column title,
         * 50/50 code+render split, code header, and teleprompter overlap reserve.
         */
        compareCodePaneHeight: (() => {
            const sceneInset = outdoorFormat ? 0 : 80 * scale;
            const teleprompterReserve = outdoorFormat === 'landscape'
                ? 100 * scale
                : outdoorFormat === 'portrait'
                  ? 0
                  : 240 * scale;
            const columnTitle = 56 * scale;
            const cardGap = 10 * scale;
            const codeHeader = 32 * scale;
            const columnBody = height - sceneInset - teleprompterReserve;
            const cardBody = columnBody - columnTitle - cardGap;
            return Math.max(Math.round(72 * scale), Math.round(cardBody * 0.5 - codeHeader));
        })(),
        /** @deprecated Use compareCodePaneHeight for compare code editors. */
        comparePaneHeight: Math.round((height - 96 * scale) / 2),
        uiFontSize: Math.round(18 * scale),
        bodyFontSize: Math.round(24 * scale),
        headlineFontSize: Math.round(52 * scale),
        tabFontSize: Math.round(14 * scale),
        titleFontSize: Math.round(13 * scale),
        activityBarWidth: Math.round(56 * scale),
        sidebarWidth: Math.round(260 * scale),
        proofPanelWidth: Math.round(380 * scale),
        titleBarHeight: Math.round(52 * scale),
        tabBarHeight: Math.round(44 * scale),
        statusBarHeight: Math.round(36 * scale),
    };
}
