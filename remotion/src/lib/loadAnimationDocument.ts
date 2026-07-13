// /Users/johndoe/Documents/company/basic_ui/video_ops/remotion/src/lib/loadAnimationDocument.ts
import {
    animationToRenderProps,
    normalizeAnimationJson,
} from '../../../../basic_ui/src/pages/VideoOpsPage/videoOpsAnimation';
import { animationDocumentFingerprint } from '../../../../basic_ui/src/pages/VideoOpsPage/animationDocumentFingerprint';

import type { VideoFromScriptRenderProps } from './renderProps';

export { animationDocumentFingerprint };

export function parseAnimationDocumentRaw(
    raw: string,
    scriptId: string,
    options?: { contentRevision?: number; showDirector?: boolean },
): VideoFromScriptRenderProps {
    const animation = normalizeAnimationJson(JSON.parse(raw), scriptId);
    return animationToRenderProps(animation, {
        showDirector: options?.showDirector ?? false,
        contentRevision: options?.contentRevision,
    });
}
