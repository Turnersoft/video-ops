// /Users/johndoe/Documents/company/basic_ui/src/shared/turn-video/ide/turnSourceRegistry.ts

const TURN_USER_PREFIX = '@turn-user/';
const TURN_USER_PUBLIC_PREFIX = 'turn-user/';

/** Resolve canonical repo aliases to static paths under Remotion publicDir (`projects/`). */
export function turnSourceStaticPath(sourceFile: string | undefined): string | null {
    if (!sourceFile?.startsWith(TURN_USER_PREFIX)) {
        return null;
    }
    return sourceFile.replace(TURN_USER_PREFIX, TURN_USER_PUBLIC_PREFIX);
}

/** Compatibility for already-open Remotion hot bundles; canonical files are fetched statically now. */
export function registeredTurnSource(_sourceFile: string | undefined): string | null {
    return null;
}

/** Stable-ish file path used by the WASM workspace snapshot. */
export function turnSourceSnapshotPath(sourceFile: string | undefined): string {
    return sourceFile?.replace(/^@turn-user\//, 'turn-user/') ?? 'video-snippet.turn';
}
