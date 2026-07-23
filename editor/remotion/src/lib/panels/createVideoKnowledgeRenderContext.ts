// /Users/johndoe/Documents/company/basic_ui/src/shared/turn-video/bridge/createVideoKnowledgeRenderContext.ts
import type { RenderContext } from '@turn-user/language_server/vscode_extension/src/visualization/knowledge/render/context';
import type { KnowledgeUiPhrases } from '@turn-user/language_server/vscode_extension/src/visualization/knowledge/types';

/** Non-interactive knowledge math context for video export frames. */
export function createVideoKnowledgeRenderContext(
    sources: RenderContext['sources'] = null,
    uiPhrases: KnowledgeUiPhrases | null = null,
): RenderContext {
    return {
        sources,
        selectedId: null,
        onPickNode: () => {},
        onHoverNode: () => {},
        uiPhrases: uiPhrases ?? undefined,
        declarationKind: null,
    };
}
