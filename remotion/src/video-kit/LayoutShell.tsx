// /Users/johndoe/Documents/company/basic_ui/video_ops/remotion/src/video-kit/LayoutShell.tsx
import type { ReactNode } from 'react';

import { useCompositionScale } from '../lib/useCompositionScale';
import type { LayoutPreset } from './types';

type LayoutShellProps = {
    layout: LayoutPreset;
    children: ReactNode;
    presenterColumn?: ReactNode;
};

export function LayoutShell({ layout, children, presenterColumn }: LayoutShellProps) {
    const s = useCompositionScale();

    const fullBleed = layout === 'title-full' || layout === 'math-focus' || layout === 'beat-focus';

    return (
        <div
            style={{
                flex: 1,
                minWidth: 0,
                minHeight: 0,
                display: 'flex',
                gap: s.px(24),
            }}
        >
            <div
                style={{
                    flex: 1,
                    minWidth: 0,
                    minHeight: 0,
                    display: 'flex',
                    alignSelf: 'stretch',
                    borderRadius: fullBleed ? 0 : s.px(20),
                    overflow: 'hidden',
                }}
            >
                {children}
            </div>
            {presenterColumn ? (
                <div style={{ width: s.px(380), flexShrink: 0, alignSelf: 'stretch' }}>{presenterColumn}</div>
            ) : null}
        </div>
    );
}
