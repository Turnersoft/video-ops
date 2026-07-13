// /Users/johndoe/Documents/company/basic_ui/video_ops/remotion/src/components/TextbookPaperOverlay.tsx
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

import { AataTextbookMathBody } from '@turn-video-shared/panels/AataTextbookMathBody';
import {
    aataTextbookExcerpt,
    type AataTextbookExcerpt,
} from '@turn-video-shared/panels/aataTextbookExcerpts';
import { useCompositionScale } from '../lib/useCompositionScale';

/** Default typography scale for AATA paper overlay (body, labels, attribution). */
const TEXTBOOK_OVERLAY_FONT_SCALE = 1.3;

export type TextbookPaperOverlayProps = {
    /** Lookup in `aataTextbookExcerpts.ts` (exact sets.xml prose). */
    aataExcerpt?: string;
    section?: string;
    definitionLabel?: string;
    body?: string;
    source?: string;
    revealAtSeconds?: number;
    hideAtSeconds?: number;
    /** `top` slides up from bottom (wrap-up). `center` fades in over compare — one editor column wide. */
    placement?: 'top' | 'center';
    /** Multiplier on overlay typography (default 1.3). */
    fontScale?: number;
};

function excerptFromProps(props: TextbookPaperOverlayProps): AataTextbookExcerpt | null {
    if (props.aataExcerpt) {
        return aataTextbookExcerpt(props.aataExcerpt) ?? null;
    }
    return null;
}

/** AATA paper card over compare — slides up from bottom, or centers over dual-panel. */
export function TextbookPaperOverlay(props: TextbookPaperOverlayProps) {
    const {
        section,
        definitionLabel = 'Definition.',
        body,
        source,
        revealAtSeconds = 0,
        hideAtSeconds,
        placement = 'top',
        fontScale = TEXTBOOK_OVERLAY_FONT_SCALE,
    } = props;

    const excerpt = excerptFromProps(props);
    const frame = useCurrentFrame();
    const { fps, height, width } = useVideoConfig();
    const s = useCompositionScale();
    const isPortrait = height > width;
    const resolvedFontScale = fontScale * (isPortrait ? 1.55 : 1);
    const fs = (px: number) => s.px(px * resolvedFontScale);
    const localFrame = Math.max(0, frame - Math.round(revealAtSeconds * fps));

    const entrance = spring({
        frame: localFrame,
        fps,
        config: { damping: 24, stiffness: 72, mass: 1.05 },
    });

    const centered = placement === 'center';
    /** One compare column ≈ half canvas minus layout padding and gap. */
    const cardWidth = centered
        ? Math.round((width - s.px(80) - s.px(24)) / 2)
        : isPortrait
          ? Math.round(width * 0.96)
          : s.px(1040);

    const startTop = height + s.px(48);
    const finalTopSlide = Math.round(height * (isPortrait ? 0.1 : 0.25));
    const topPx = centered ? undefined : interpolate(entrance, [0, 1], [startTop, finalTopSlide]);
    const revealOpacity = centered
        ? interpolate(entrance, [0, 0.4, 1], [0, 1, 1])
        : interpolate(entrance, [0, 0.35, 1], [0, 1, 1]);
    const hideOpacity =
        hideAtSeconds === undefined
            ? 1
            : interpolate(frame / fps, [hideAtSeconds, hideAtSeconds + 0.45], [1, 0], {
                  extrapolateLeft: 'clamp',
                  extrapolateRight: 'clamp',
              });
    const opacity = revealOpacity * hideOpacity;
    const scale = centered ? interpolate(entrance, [0, 1], [0.94, 1]) : 1;

    const sectionLabel = excerpt
        ? `${excerpt.subsectionTitle}`
        : (section ?? '1.2 Sets');
    const attribution = excerpt?.attribution ?? source ?? 'Judson, Abstract Algebra (AATA), §1.2';
    const bodyFontSize = centered
        ? fs(isPortrait ? 28 : 22)
        : fs(isPortrait ? 40 : 28);

    return (
        <div
            style={{
                position: 'absolute',
                ...(centered
                    ? {
                          top: '50%',
                          left: '50%',
                          transform: `translate(-50%, -50%) scale(${scale})`,
                      }
                    : {
                          top: topPx,
                          left: '50%',
                          transform: 'translateX(-50%)',
                      }),
                opacity,
                zIndex: 50,
                width: cardWidth,
                maxWidth: centered ? '48%' : isPortrait ? '98%' : '94%',
                maxHeight: centered
                    ? Math.round(height * (isPortrait ? 0.62 : 0.55))
                    : Math.round(height * (isPortrait ? 0.82 : 0.68)),
                pointerEvents: 'none',
            }}
        >
            <div
                style={{
                    background: 'linear-gradient(180deg, #FFFEF9 0%, #F7F3EA 100%)',
                    border: '1px solid rgba(60, 54, 45, 0.14)',
                    borderRadius: s.px(6),
                    boxShadow: `0 ${s.px(18)}px ${s.px(48)}px rgba(40, 36, 30, 0.22), inset 0 1px 0 rgba(255,255,255,0.9)`,
                    padding: isPortrait
                        ? `${s.px(28)}px ${s.px(28)}px ${s.px(24)}px`
                        : `${s.px(22)}px ${s.px(32)}px ${s.px(20)}px`,
                    boxSizing: 'border-box',
                }}
            >
                {excerpt ? (
                    <div
                        style={{
                            fontSize: fs(12),
                            letterSpacing: '0.08em',
                            textTransform: 'uppercase',
                            color: '#6B6560',
                            marginBottom: s.px(6),
                            fontFamily: 'Georgia, "Times New Roman", serif',
                        }}
                    >
                        {excerpt.sectionTitle}
                    </div>
                ) : null}
                <div
                    style={{
                        fontSize: fs(13),
                        letterSpacing: '0.12em',
                        textTransform: 'uppercase',
                        color: '#6B6560',
                        marginBottom: s.px(12),
                        fontFamily: 'Georgia, "Times New Roman", serif',
                    }}
                >
                    {sectionLabel}
                </div>
                {excerpt ? (
                    <AataTextbookMathBody
                        segments={excerpt.segments}
                        style={{
                            fontSize: bodyFontSize,
                            lineHeight: 1.62,
                            color: '#1E1C18',
                            fontFamily: 'Georgia, "Times New Roman", serif',
                        }}
                    />
                ) : (
                    <div
                        style={{
                            fontSize: bodyFontSize,
                            lineHeight: 1.62,
                            color: '#1E1C18',
                            fontFamily: 'Georgia, "Times New Roman", serif',
                            overflowWrap: 'break-word',
                            wordBreak: 'break-word',
                        }}
                    >
                        {definitionLabel ? (
                            <span style={{ fontWeight: 700 }}>{definitionLabel}</span>
                        ) : null}{' '}
                        {body}
                    </div>
                )}
                <div
                    style={{
                        marginTop: s.px(14),
                        fontSize: fs(12),
                        color: '#8A847C',
                        fontStyle: 'italic',
                        fontFamily: 'Georgia, "Times New Roman", serif',
                    }}
                >
                    {attribution}
                </div>
            </div>
        </div>
    );
}
