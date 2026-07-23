// /Users/johndoe/Documents/company/basic_ui/video_ops/remotion/src/components/KnowledgePanelRender.tsx
import { TurnVideoKnowledgePanel } from './TurnVideoKnowledgePanel';
import { useCompositionScale } from '../../lib/layout/useCompositionScale';

export type {
    KnowledgePanelExport,
    KnowledgePanelItemExport,
    KnowledgeSectionExport,
} from '../../lib/panels/panelExportTypes';

type KnowledgePanelRenderProps = {
    scriptId?: string;
    heading?: string;
    exportPath?: string;
    inlineExport?: import('../../lib/panels/panelExportTypes').KnowledgePanelExport | null;
    items?: import('../../lib/panels/panelExportTypes').KnowledgePanelItemExport[];
    activeIndex?: number;
    visibleSource?: string;
    typingComplete?: boolean;
    revealFromSource?: boolean;
};

export function KnowledgePanelRender({
    heading = 'Knowledge',
    inlineExport = null,
    items = [],
    activeIndex = -1,
    visibleSource = '',
    typingComplete = true,
    revealFromSource = false,
}: KnowledgePanelRenderProps) {
    const s = useCompositionScale();

    return (
        <TurnVideoKnowledgePanel
            heading={heading}
            inlineExport={inlineExport}
            items={items}
            activeIndex={activeIndex}
            visibleSource={visibleSource}
            typingComplete={typingComplete}
            revealFromSource={revealFromSource}
            scale={{
                px: s.px,
                codeFontSize: s.codeFontSize,
                tabFontSize: s.tabFontSize,
            }}
        />
    );
}
