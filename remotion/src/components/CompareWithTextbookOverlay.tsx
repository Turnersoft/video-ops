// /Users/johndoe/Documents/company/basic_ui/video_ops/remotion/src/components/CompareWithTextbookOverlay.tsx
import type { ReactNode } from 'react';

import { TextbookPaperOverlay, type TextbookPaperOverlayProps } from './TextbookPaperOverlay';

type CompareWithTextbookOverlayProps = {
    children: ReactNode;
    textbook: TextbookPaperOverlayProps;
};

/** Lean vs Turn compare with AATA paper quote on top. */
export function CompareWithTextbookOverlay({ children, textbook }: CompareWithTextbookOverlayProps) {
    return (
        <div
            style={{
                position: 'relative',
                flex: 1,
                minHeight: 0,
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            {children}
            <TextbookPaperOverlay {...textbook} />
        </div>
    );
}
