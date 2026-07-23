// /Users/johndoe/Documents/company/basic_ui/src/shared/turn-video/panels/panelExportTypes.ts
import type { KnowledgeUiPhrases } from '@turn-user/language_server/vscode_extension/src/visualization/knowledge/types';
import type { ProofPanelGoal, RenderContext } from './turnKnowledgeBridge';

export type KnowledgeSectionExport = {
    id?: string;
    title?: { segments?: Array<{ Text?: string; Math?: unknown }> };
    metadata?: Array<[string, string]>;
    content?: {
        Math?: unknown;
        RichText?: { segments?: Array<{ Text?: string; Math?: unknown }> };
    };
};

export type KnowledgePanelItemExport = {
    label: string;
    detail?: string;
    section?: KnowledgeSectionExport;
    mathNode?: unknown;
};

export type KnowledgePanelExport = {
    version?: number;
    sections?: KnowledgeSectionExport[];
    file?: {
        document?: unknown;
    };
    sources?: RenderContext['sources'];
    ui_phrases?: KnowledgeUiPhrases | null;
    items?: KnowledgePanelItemExport[];
};

export type ProofPanelStepExport = {
    label: string;
    goal: ProofPanelGoal;
};

export type ProofPanelExport = {
    version?: number;
    theorem?: string;
    source_turn_file?: string;
    steps?: ProofPanelStepExport[];
    sources?: RenderContext['sources'];
    math_ui_phrases?: KnowledgeUiPhrases | null;
    /** Inline full LSP visualization payload (optional; prefer visualizationDataPath on track). */
    visualizationData?: unknown;
};

export type KnowledgeDataExport = KnowledgePanelExport & {
    /** When present, `EmbeddedKnowledgePanel` can render the same tree as /app. */
    file?: {
        document?: unknown;
    };
};
