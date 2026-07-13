// /Users/johndoe/Documents/company/basic_ui/video_ops/remotion/src/components/universal/TerminalPanel.tsx
import { useMemo } from 'react';

import { TURN_VIDEO_THEME } from '../../lib/turnVideoTheme';
import { useCompositionScale } from '../../lib/useCompositionScale';
import { useSceneClock } from '../../video-kit/useSceneClock';

type TerminalPanelProps = {
    lines: string[];
    prompt?: string;
    charsPerSecond?: number;
};

export function TerminalPanel({ lines, prompt = '$', charsPerSecond = 32 }: TerminalPanelProps) {
    const t = TURN_VIDEO_THEME;
    const s = useCompositionScale();
    const { frame, fps } = useSceneClock();

    const fullText = lines.join('\n');
    const visibleChars = Math.min(fullText.length, Math.floor((frame / fps) * charsPerSecond));
    const visible = fullText.slice(0, visibleChars);

    const renderedLines = useMemo(() => visible.split('\n'), [visible]);

    return (
        <div
            style={{
                flex: 1,
                minHeight: 0,
                display: 'flex',
                flexDirection: 'column',
                background: t.terminal.bg,
                borderRadius: s.px(16),
                overflow: 'hidden',
                fontFamily: '"SF Mono", "Cascadia Code", Menlo, monospace',
            }}
        >
            <div
                style={{
                    padding: `${s.px(12)}px ${s.px(18)}px`,
                    background: t.terminal.header,
                    fontSize: s.px(14),
                    color: t.mathBoard.muted,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                }}
            >
                Terminal
            </div>
            <div
                style={{
                    flex: 1,
                    padding: s.px(24),
                    fontSize: s.px(20),
                    lineHeight: 1.45,
                    color: t.terminal.text,
                    whiteSpace: 'pre-wrap',
                }}
            >
                {renderedLines.map((line, index) => (
                    <div key={`term-${index}`}>
                        {index === 0 ? (
                            <span style={{ color: t.terminal.prompt }}>{prompt} </span>
                        ) : null}
                        {line}
                    </div>
                ))}
                <span style={{ color: t.syntax.cursor, opacity: frame % 30 < 15 ? 1 : 0 }}>▍</span>
            </div>
        </div>
    );
}
