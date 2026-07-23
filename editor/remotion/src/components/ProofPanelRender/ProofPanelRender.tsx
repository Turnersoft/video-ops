// /Users/johndoe/Documents/company/basic_ui/video_ops/remotion/src/components/ProofPanelRender.tsx
import { useCurrentFrame, useVideoConfig } from 'remotion';

import { TurnVideoProofPanel, activeProofStepIndexFromTrack } from './TurnVideoProofPanel';
import type { IdeTrack } from '../../lib/types/ideTrackTypes';
import { useCompositionScale } from '../../lib/layout/useCompositionScale';

export type { ProofPanelExport, ProofPanelStepExport } from '../../lib/panels/panelExportTypes';

type ProofPanelRenderProps = {
    heading?: string;
    inlineExport?: import('../../lib/panels/panelExportTypes').ProofPanelExport | null;
    track?: IdeTrack | null;
    fallbackSteps?: Array<{ label: string; goal?: string }>;
};

export function ProofPanelRender({
    heading = 'Proof',
    inlineExport = null,
    track = null,
    fallbackSteps = [],
}: ProofPanelRenderProps) {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    const s = useCompositionScale();

    return (
        <TurnVideoProofPanel
            heading={heading}
            inlineExport={inlineExport}
            track={track}
            fallbackSteps={fallbackSteps}
            activeStepIndex={activeProofStepIndexFromTrack(track, frame / fps)}
            scale={{
                px: s.px,
                codeFontSize: s.codeFontSize,
                tabFontSize: s.tabFontSize,
            }}
        />
    );
}
