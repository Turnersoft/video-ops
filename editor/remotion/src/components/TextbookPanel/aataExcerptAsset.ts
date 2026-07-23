import { videoOpsSharedReferencePath } from '../../lib/videoOpsPaths';

const AATA_EXCERPT_EXTENSIONS = ['png', 'jpg', 'webp'] as const;

/** Static path under `projects/…/shared/reference/aata/`. */
export function aataExcerptStaticPaths(excerptId: string): string[] {
    const clean = excerptId.replace(/^\/+/, '').replace(/\.(png|jpe?g|webp)$/i, '');
    return AATA_EXCERPT_EXTENSIONS.map((ext) =>
        videoOpsSharedReferencePath(`aata/${clean}.${ext}`),
    );
}

export function humanizeAataExcerptId(excerptId: string): string {
    return excerptId
        .replace(/^sets-v2-/, '')
        .replace(/-/g, ' ')
        .replace(/\bp(\d+)\b/gi, 'p.$1')
        .replace(/\b\w/g, (char) => char.toUpperCase());
}
