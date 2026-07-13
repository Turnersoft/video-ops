// /Users/johndoe/Documents/company/basic_ui/video_ops/remotion/src/components/TurnAppShell.tsx
import type { ReactNode } from 'react';

import { TURN_VIDEO_THEME } from '../lib/turnVideoTheme';
import { useCompositionScale } from '../lib/useCompositionScale';

export type EditorTab = {
    id: string;
    label: string;
    modified?: boolean;
};

type TurnAppShellProps = {
    scriptId: string;
    sceneTitle?: string;
    tabs: EditorTab[];
    activeTabId: string;
    sidebarFiles: string[];
    activeFile?: string;
    rightPanel?: ReactNode;
    children: ReactNode;
};

const ACTIVITY_ICONS = ['Files', 'Search', 'Proof', 'Graph'];

export function TurnAppShell({
    scriptId,
    sceneTitle,
    tabs,
    activeTabId,
    sidebarFiles,
    activeFile,
    rightPanel,
    children,
}: TurnAppShellProps) {
    const t = TURN_VIDEO_THEME;
    const s = useCompositionScale();

    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                flex: 1,
                minHeight: 0,
                height: '100%',
                borderRadius: s.px(18),
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
                    gap: s.px(12),
                    padding: `${s.px(14)}px ${s.px(20)}px`,
                    background: t.ide.titleBar,
                    borderBottom: `1px solid ${t.ide.windowBorder}`,
                    flexShrink: 0,
                }}
            >
                <div style={{ display: 'flex', gap: s.px(8) }}>
                    {['#E8A598', '#E8C89A', '#9BC89B'].map((color) => (
                        <span
                            key={color}
                            style={{
                                width: s.px(14),
                                height: s.px(14),
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
                            fontSize: s.px(16),
                            fontWeight: 600,
                            color: t.ide.titleText,
                        }}
                    >
                        Turn — {scriptId}
                    </div>
                    {sceneTitle ? (
                        <div style={{ fontSize: s.px(13), color: t.proofPanel.goal, marginTop: 2 }}>
                            {sceneTitle}
                        </div>
                    ) : null}
                </div>
                <div
                    style={{
                        fontSize: s.px(11),
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        color: t.accent.claude,
                        fontWeight: 700,
                        padding: `${s.px(5)}px ${s.px(12)}px`,
                        borderRadius: 999,
                        background: 'rgba(217, 119, 87, 0.1)',
                        border: `1px solid ${t.accent.ring}`,
                    }}
                >
                    Turn
                </div>
            </div>

            <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
                <div
                    style={{
                        width: s.activityBarWidth,
                        flexShrink: 0,
                        background: t.ide.titleBar,
                        borderRight: `1px solid ${t.ide.windowBorder}`,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        paddingTop: s.px(12),
                        gap: s.px(16),
                    }}
                >
                    {ACTIVITY_ICONS.map((icon, index) => (
                        <div
                            key={icon}
                            style={{
                                width: s.px(36),
                                height: s.px(36),
                                borderRadius: s.px(10),
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: s.px(10),
                                fontWeight: 700,
                                color: index === 0 ? t.accent.claude : t.proofPanel.goal,
                                background: index === 0 ? 'rgba(217, 119, 87, 0.12)' : 'transparent',
                                border: index === 0 ? `1px solid ${t.accent.ring}` : '1px solid transparent',
                            }}
                        >
                            {icon.slice(0, 1)}
                        </div>
                    ))}
                </div>

                <div
                    style={{
                        width: s.sidebarWidth,
                        flexShrink: 0,
                        background: t.ide.gutter,
                        borderRight: `1px solid ${t.ide.windowBorder}`,
                        padding: `${s.px(14)}px ${s.px(12)}px`,
                        boxSizing: 'border-box',
                        overflow: 'hidden',
                    }}
                >
                    <div
                        style={{
                            fontSize: s.px(11),
                            fontWeight: 700,
                            letterSpacing: '0.08em',
                            textTransform: 'uppercase',
                            color: t.proofPanel.goal,
                            marginBottom: s.px(12),
                        }}
                    >
                        Explorer
                    </div>
                    {sidebarFiles.map((file) => {
                        const isActive = file === activeFile;
                        return (
                            <div
                                key={file}
                                style={{
                                    padding: `${s.px(8)}px ${s.px(10)}px`,
                                    borderRadius: s.px(8),
                                    fontSize: s.px(14),
                                    fontFamily: 'monospace',
                                    color: isActive ? t.syntax.plain : t.proofPanel.goal,
                                    background: isActive ? t.ide.tabActive : 'transparent',
                                    fontWeight: isActive ? 600 : 400,
                                    marginBottom: s.px(4),
                                }}
                            >
                                {file}
                            </div>
                        );
                    })}
                </div>

                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'flex-end',
                            gap: s.px(4),
                            padding: `${s.px(8)}px ${s.px(10)}px 0`,
                            background: t.ide.titleBar,
                            borderBottom: `1px solid ${t.ide.windowBorder}`,
                            flexShrink: 0,
                            minHeight: s.tabBarHeight,
                            boxSizing: 'border-box',
                        }}
                    >
                        {tabs.map((tab) => {
                            const isActive = tab.id === activeTabId;
                            return (
                                <div
                                    key={tab.id}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: s.px(6),
                                        padding: `${s.px(10)}px ${s.px(18)}px`,
                                        borderRadius: `${s.px(10)}px ${s.px(10)}px 0 0`,
                                        background: isActive ? t.ide.tabActive : t.ide.tabInactive,
                                        border: `1px solid ${t.ide.windowBorder}`,
                                        borderBottom: isActive ? `1px solid ${t.ide.tabActive}` : undefined,
                                        marginBottom: isActive ? -1 : 0,
                                        fontSize: s.tabFontSize,
                                        fontFamily: 'monospace',
                                        color: isActive ? t.syntax.plain : t.proofPanel.goal,
                                        fontWeight: isActive ? 600 : 500,
                                        maxWidth: s.px(280),
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                    }}
                                >
                                    {tab.label}
                                    {tab.modified ? (
                                        <span style={{ color: t.accent.claude, fontSize: s.px(18), lineHeight: 1 }}>
                                            ●
                                        </span>
                                    ) : null}
                                </div>
                            );
                        })}
                    </div>

                    <div style={{ flex: 1, minHeight: 0, display: 'flex', background: t.ide.codeBg }}>
                        <div style={{ flex: 1, minWidth: 0, minHeight: 0 }}>{children}</div>
                        {rightPanel ? (
                            <div style={{ width: s.proofPanelWidth, flexShrink: 0, minHeight: 0 }}>{rightPanel}</div>
                        ) : null}
                    </div>
                </div>
            </div>

            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: `${s.px(8)}px ${s.px(20)}px`,
                    background: t.ide.titleBar,
                    borderTop: `1px solid ${t.ide.windowBorder}`,
                    fontSize: s.px(13),
                    color: t.proofPanel.goal,
                    flexShrink: 0,
                }}
            >
                <span>Turn-Lang · LSP connected</span>
                <span>UTF-8 · turn-lang</span>
            </div>
        </div>
    );
}
