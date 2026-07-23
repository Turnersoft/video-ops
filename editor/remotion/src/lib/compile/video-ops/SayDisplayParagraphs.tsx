// /Users/johndoe/Documents/company/basic_ui/src/pages/VideoOpsPage/SayDisplayParagraphs.tsx
import type { CSSProperties } from 'react';

import { sayParagraphsForDisplay } from './parseVideoOpsMarkdown';

type SayDisplayParagraphsProps = {
    text: string;
    className?: string;
    style?: CSSProperties;
    paragraphStyle?: CSSProperties;
};

/** One beat of narration — each sentence or author newline on its own row. */
export function SayDisplayParagraphs({
    text,
    className,
    style,
    paragraphStyle,
}: SayDisplayParagraphsProps) {
    const rows = sayParagraphsForDisplay(text);
    if (rows.length === 0) {
        return null;
    }

    return (
        <div className={className} style={style}>
            {rows.map((row, index) => (
                <div
                    key={`${index}-${row.slice(0, 24)}`}
                    style={{
                        ...paragraphStyle,
                        ...(index > 0 ? { marginTop: '0.35em' } : undefined),
                    }}
                >
                    {row}
                </div>
            ))}
        </div>
    );
}
