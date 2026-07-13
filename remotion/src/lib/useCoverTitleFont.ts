// /Users/johndoe/Documents/company/basic_ui/video_ops/remotion/src/lib/useCoverTitleFont.ts
import {
    COVER_TITLE_FONT_FAMILY_HEAVY,
    COVER_TITLE_FONT_98_HEAVY,
} from '@turn-video-shared/coverAssetPaths';
import { continueRender, delayRender, staticFile } from 'remotion';
import { useEffect, useState } from 'react';

let fontLoadPromise: Promise<void> | null = null;

/** Load Heading Now 98 Heavy once for SVG cover episode titles. */
export function ensureCoverTitleFontLoaded(): Promise<void> {
    if (fontLoadPromise) {
        return fontLoadPromise;
    }

    fontLoadPromise = (async () => {
        if (typeof document === 'undefined') {
            return;
        }

        const family = COVER_TITLE_FONT_FAMILY_HEAVY;
        const alreadyLoaded = [...document.fonts].some((face) => face.family === family);
        if (alreadyLoaded) {
            return;
        }

        const url = staticFile(COVER_TITLE_FONT_98_HEAVY);
        const font = new FontFace(family, `url(${url}) format('opentype')`);
        await font.load();
        document.fonts.add(font);
    })();

    return fontLoadPromise;
}

export function useCoverTitleFont(): boolean {
    const [ready, setReady] = useState(false);
    const [handle] = useState(() => delayRender('cover-title-font'));

    useEffect(() => {
        void ensureCoverTitleFontLoaded().then(() => {
            setReady(true);
            continueRender(handle);
        });
    }, [handle]);

    return ready;
}

export { COVER_TITLE_FONT_FAMILY_HEAVY as COVER_EPISODE_TITLE_FONT_FAMILY };
