// /Users/johndoe/Documents/company/basic_ui/video_ops/remotion/src/components/IdeWindowChrome.tsx
import type { ReactNode } from 'react';

import { TURN_VIDEO_THEME } from '../lib/turnVideoTheme';

type IdeWindowChromeProps = {
    title: string;
    subtitle?: string;
    children: ReactNode;
    fill?: boolean;
};

export function IdeWindowChrome({ title, subtitle, children, fill = true }: IdeWindowChromeProps) {
    const t = TURN_VIDEO_THEME;

    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                height: fill ? '100%' : 'auto',
                borderRadius: 16,
                overflow: 'hidden',
                border: `1px solid ${t.ide.windowBorder}`,
                background: t.ide.windowBg,
                boxShadow: t.ide.windowShadow,
            }}
        >
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '12px 16px',
                    background: t.ide.titleBar,
                    borderBottom: `1px solid ${t.ide.windowBorder}`,
                }}
            >
                <div style={{ display: 'flex', gap: 7 }}>
                    {['#E8A598', '#E8C89A', '#9BC89B'].map((color) => (
                        <span
                            key={color}
                            style={{
                                width: 11,
                                height: 11,
                                borderRadius: '50%',
                                background: color,
                                border: '1px solid rgba(0,0,0,0.06)',
                            }}
                        />
                    ))}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                        style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: t.ide.titleText,
                            fontFamily: 'Inter, system-ui, sans-serif',
                        }}
                    >
                        {title}
                    </div>
                    {subtitle ? (
                        <div style={{ fontSize: 11, color: t.proofPanel.goal, marginTop: 2 }}>{subtitle}</div>
                    ) : null}
                </div>
                <div
                    style={{
                        fontSize: 10,
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        color: t.accent.claude,
                        fontWeight: 700,
                        padding: '4px 8px',
                        borderRadius: 999,
                        background: 'rgba(217, 119, 87, 0.1)',
                        border: `1px solid ${t.accent.ring}`,
                    }}
                >
                    Turn
                </div>
            </div>
            <div style={{ flex: 1, minHeight: 0, background: t.ide.codeBg }}>{children}</div>
        </div>
    );
}
