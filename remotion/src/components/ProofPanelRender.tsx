// /Users/johndoe/Documents/company/basic_ui/video_ops/remotion/src/components/ProofPanelRender.tsx
import { useCurrentFrame, useVideoConfig } from 'remotion';

import { TurnVideoProofPanel, activeProofStepIndexFromTrack } from '@turn-video-shared/panels/TurnVideoProofPanel';
import type { IdeTrack } from '../lib/ideTrackTypes';
import { useCompositionScale } from '../lib/useCompositionScale';

export type { ProofPanelExport, ProofPanelStepExport } from '@turn-video-shared/panels/panelExportTypes';

type ProofPanelRenderProps = {
    heading?: string;
    inlineExport?: import('@turn-video-shared/panels/panelExportTypes').ProofPanelExport | null;
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
