// /Users/johndoe/Documents/company/basic_ui/src/shared/turn-video/bridge/createVideoVisualizationHost.ts
import {
    createEmbeddedHost,
    type EmbeddedVisualizationHost,
} from '@turn-user/language_server/vscode_extension/src/visualization/ast/vscode';

/**
 * No-op host for embedded proof/knowledge panels inside Remotion.
 * Matches AppPage `EmbeddedVisualizationHost` without Monaco or LSP wiring.
 */
export function createVideoVisualizationHost(): EmbeddedVisualizationHost {
    return createEmbeddedHost(() => {});
}
