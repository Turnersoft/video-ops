import {
    videoOpsSeriesSharedFolder,
    videoOpsScriptSeries,
} from '../../lib/videoOpsPaths';
import type { CoverConceptId } from './videoOpsCover';

/** Shared cover art under `video_ops/projects/<series>/shared/`. */
export function coverSharedPath(series: ReturnType<typeof videoOpsScriptSeries>, fileName: string): string {
    return `${videoOpsSeriesSharedFolder(series)}/${fileName}`;
}

const COMPARE_SHARED = videoOpsSeriesSharedFolder('compare');

/** Concept diagram SVG under `projects/compare/shared/cover/components/concepts/`. */
export function coverConceptSvgPath(conceptId: CoverConceptId): string {
    return `${COMPARE_SHARED}/cover/components/concepts/concept-${conceptId}.svg`;
}

export const COVER_SHARED_SERIES_TITLE = coverSharedPath(
    'abstract_algebra_in_proof_assistant',
    'abstrac_algbra_in_proof_assistant.svg',
);
export const COVER_SHARED_BACKGROUND = coverSharedPath(
    'abstract_algebra_in_proof_assistant',
    'background.png',
);
export const COVER_SHARED_FIREWORKS = coverSharedPath(
    'abstract_algebra_in_proof_assistant',
    'firewors.svg',
);
export const COVER_SHARED_LEAN = coverSharedPath('abstract_algebra_in_proof_assistant', 'lean.svg');
export const COVER_SHARED_TURN = coverSharedPath(
    'abstract_algebra_in_proof_assistant',
    'turn-lang_with_link.svg',
);

export const COVER_TITLE_FONT_FAMILY_HEAVY = 'Heading Now 98 Heavy';
export const COVER_TITLE_FONT_FAMILY_BOLD = 'Heading Now 96 Bold';
export const COVER_TITLE_FONT_98_HEAVY = `${COMPARE_SHARED}/cover/fonts/HeadingNow-98Heavy.otf`;
export const COVER_TITLE_FONT_96_BOLD = `${COMPARE_SHARED}/cover/fonts/HeadingNow-96Bold.otf`;
