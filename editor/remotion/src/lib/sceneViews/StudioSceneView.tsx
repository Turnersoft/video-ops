import type { ReactNode } from 'react';

import { useCompositionScale } from '../layout/useCompositionScale';

type StudioSceneViewProps = {
    mainContent: ReactNode;
};

/** Studio preview: beat content fills the scene frame. */
export function StudioSceneView({ mainContent }: StudioSceneViewProps) {
    const s = useCompositionScale();
    return (
        <div
            style={{
                position: 'absolute',
                inset: s.px(40),
                display: 'flex',
                flexDirection: 'column',
                boxSizing: 'border-box',
            }}
        >
            <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                {mainContent}
            </div>
        </div>
    );
}
