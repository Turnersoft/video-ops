// /Users/johndoe/Documents/company/basic_ui/video_ops/remotion/src/components/KnowledgeSidePanel.tsx
import { TURN_VIDEO_THEME } from '../lib/turnVideoTheme';
import { useCompositionScale } from '../lib/useCompositionScale';

type KnowledgeSidePanelProps = {
    items: string[];
    activeIndex?: number;
    heading?: string;
};

export function KnowledgeSidePanel({
    items,
    activeIndex = 0,
    heading = 'Focus',
}: KnowledgeSidePanelProps) {
    const t = TURN_VIDEO_THEME;
    const s = useCompositionScale();

    return (
        <div
            style={{
                flex: 1,
                padding: s.px(32),
                boxSizing: 'border-box',
                display: 'flex',
                flexDirection: 'column',
                gap: s.px(20),
            }}
        >
            <div
                style={{
                    fontSize: s.px(20),
                    fontWeight: 700,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    color: t.proofPanel.goal,
                }}
            >
                {heading}
            </div>
            {items.map((item, index) => {
                const isActive = index === activeIndex;
                return (
                    <div
                        key={item}
                        style={{
                            padding: `${s.px(22)}px ${s.px(26)}px`,
                            borderRadius: s.px(16),
                            fontSize: s.px(26),
                            fontWeight: isActive ? 700 : 550,
                            color: t.syntax.plain,
                            background: isActive ? t.proofPanel.stepActiveBg : t.ide.codeBg,
                            border: `2px solid ${isActive ? t.proofPanel.stepActiveBorder : t.ide.windowBorder}`,
                            lineHeight: 1.25,
                        }}
                    >
                        {item}
                    </div>
                );
            })}
        </div>
    );
}
