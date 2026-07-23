// /Users/johndoe/Documents/company/basic_ui/src/pages/VideoOpsPage/animationDocumentFingerprint.ts
/** Fingerprint animation.json text for dev hot-reload polling. */
export function animationDocumentFingerprint(raw: string): string {
    let hash = 0;
    for (let index = 0; index < raw.length; index += 1) {
        hash = (hash * 31 + raw.charCodeAt(index)) | 0;
    }
    return String(hash);
}
