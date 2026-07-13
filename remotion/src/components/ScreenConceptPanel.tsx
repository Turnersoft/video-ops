// /Users/johndoe/Documents/company/basic_ui/video_ops/remotion/src/components/ScreenConceptPanel.tsx
import { TURN_VIDEO_THEME } from '../lib/turnVideoTheme';
import { useCompositionScale } from '../lib/useCompositionScale';

type ScreenConceptPanelProps = {
    source: string;
};

const CHECKLIST_ITEMS = [
    { label: 'Nonempty', detail: 'Every piece has at least one element.' },
    { label: 'Subset', detail: 'Each piece sits inside the original set.' },
    { label: 'Cover', detail: 'The pieces together cover everything.' },
    { label: 'Disjoint', detail: 'Pieces do not overlap.' },
];

function extractClassesHint(source: string): string | null {
    const match = source.match(/`([^`]+)`/g);
    if (!match) {
        return null;
    }
    return match.map((token) => token.replace(/`/g, '')).join(', ');
}

export function ScreenConceptPanel({ source }: ScreenConceptPanelProps) {
    const t = TURN_VIDEO_THEME;
    const s = useCompositionScale();
    const classesHint = extractClassesHint(source);

    return (
        <div
            style={{
                flex: 1,
                padding: s.px(32),
                boxSizing: 'border-box',
                display: 'flex',
                flexDirection: 'column',
                gap: s.px(24),
                overflow: 'hidden',
            }}
        >
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                    gap: s.px(20),
                    flex: 1,
                }}
            >
                {CHECKLIST_ITEMS.map((item, index) => (
                    <div
                        key={item.label}
                        style={{
                            padding: s.px(26),
                            borderRadius: s.px(16),
                            background: t.ide.codeBg,
                            border: `1px solid ${t.ide.windowBorder}`,
                        }}
                    >
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: s.px(12),
                                marginBottom: s.px(12),
                            }}
                        >
                            <span
                                style={{
                                    width: s.px(36),
                                    height: s.px(36),
                                    borderRadius: '50%',
                                    background: 'rgba(217, 119, 87, 0.14)',
                                    color: t.accent.claude,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: 800,
                                    fontSize: s.px(18),
                                }}
                            >
                                {index + 1}
                            </span>
                            <span style={{ fontSize: s.px(30), fontWeight: 750, color: t.syntax.plain }}>
                                {item.label}
                            </span>
                        </div>
                        <div style={{ fontSize: s.px(22), lineHeight: 1.4, color: t.proofPanel.goal }}>
                            {item.detail}
                        </div>
                    </div>
                ))}
            </div>

            {classesHint ? (
                <div
                    style={{
                        padding: s.px(28),
                        borderRadius: s.px(18),
                        background: t.proofPanel.stepActiveBg,
                        border: `2px solid ${t.proofPanel.stepActiveBorder}`,
                        flexShrink: 0,
                    }}
                >
                    <div style={{ fontSize: s.px(32), fontWeight: 700, color: t.syntax.plain, lineHeight: 1.25 }}>
                        Next: show{' '}
                        <span
                            style={{
                                fontFamily: 'monospace',
                                color: t.accent.claude,
                            }}
                        >
                            {classesHint}
                        </span>{' '}
                        as a stack of cards
                    </div>
                </div>
            ) : null}
        </div>
    );
}
