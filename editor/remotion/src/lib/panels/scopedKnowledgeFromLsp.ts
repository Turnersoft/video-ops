// /Users/johndoe/Documents/company/basic_ui/src/shared/turn-video/panels/scopedKnowledgeFromLsp.ts
import type { KnowledgeData } from '@turn-user/language_server/vscode_extension/src/visualization/knowledge/types';
import type { RenderContext } from './turnKnowledgeBridge';
import type { IdeTrack } from '../tracks/ideTrackTypes';
import type { KnowledgePanelExport, KnowledgeSectionExport } from './panelExportTypes';

type SourceSpan = {
    start_line: number;
    start_col: number;
    end_line: number;
    end_col: number;
};

/** Same shape as KnowledgeApp `getBodySections`. */
function getBodySections(documentModel: unknown): KnowledgeSectionExport[] {
    const contentType = (documentModel as { content_type?: Record<string, unknown> })?.content_type;
    if (!contentType || typeof contentType !== 'object') {
        return [];
    }
    for (const value of Object.values(contentType)) {
        const body = (value as { structure?: { body?: unknown[] } })?.structure?.body;
        if (Array.isArray(body)) {
            return body as KnowledgeSectionExport[];
        }
    }
    return [];
}

/** Smallest source-map node containing the cursor line (mirrors KnowledgeApp).
 *  When `col` is omitted, any node whose span covers the line qualifies
 *  (matches AppPage `bestNodeAtLine` behaviour for line-only cursor queries). */
function bestNodeAtLine(
    sources: RenderContext['sources'],
    line: number,
    col?: number,
): string | null {
    if (!sources) {
        return null;
    }
    const hasCol = typeof col === 'number' && col > 0;
    let bestId: string | null = null;
    let bestScore = Number.POSITIVE_INFINITY;
    for (const [id, refs] of Object.entries(sources)) {
        for (const ref of refs as Array<{ span?: SourceSpan }>) {
            const span = ref?.span;
            if (!span) {
                continue;
            }
            const lineCovers = span.start_line <= line && span.end_line >= line;
            if (!lineCovers) {
                continue;
            }
            if (hasCol) {
                const colCovers =
                    (span.start_line < line || span.start_col <= (col as number)) &&
                    (span.end_line > line || span.end_col >= (col as number));
                if (!colCovers) {
                    continue;
                }
            }
            const score =
                (span.end_line - span.start_line) * 10000 + (span.end_col - span.start_col);
            if (score < bestScore) {
                bestScore = score;
                bestId = id;
            }
        }
    }
    return bestId;
}

function normalizeDeclarationNodeId(nodeId: string): string {
    return nodeId.replace(/::op$/, '');
}

/** Find the section whose own source span covers `line`, preferring the smallest such span. */
function sectionForLine(
    body: KnowledgeSectionExport[],
    sources: RenderContext['sources'],
    line: number,
): KnowledgeSectionExport | null {
    if (!sources || body.length === 0) {
        return null;
    }
    let best: KnowledgeSectionExport | null = null;
    let bestScore = Number.POSITIVE_INFINITY;
    for (const section of body) {
        const sectionId = section?.id;
        if (typeof sectionId !== 'string') {
            continue;
        }
        const refs = sources[sectionId] as Array<{ span?: SourceSpan }> | undefined;
        const span = refs?.find((r) => r?.span)?.span;
        if (!span) {
            continue;
        }
        if (span.start_line <= line && span.end_line >= line) {
            const score =
                (span.end_line - span.start_line) * 10000 + (span.end_col - span.start_col);
            if (score < bestScore) {
                bestScore = score;
                best = section;
            }
        }
    }
    return best;
}

function sectionForNodeId(
    body: KnowledgeSectionExport[],
    nodeId: string,
): KnowledgeSectionExport | null {
    const baseId = normalizeDeclarationNodeId(nodeId);
    const direct = body.find((section) => section?.id === baseId);
    if (direct) {
        return direct;
    }
    return body.find((section) => typeof section?.id === 'string' && section.id.startsWith(baseId)) ?? null;
}

function focusLineFromTrack(track: IdeTrack | null | undefined): number | null {
    const fromPanel = track?.knowledgePanel?.focusLine;
    if (fromPanel != null && fromPanel > 0) {
        return fromPanel;
    }
    const fromRange = track?.sourceRange?.startLine;
    if (fromRange != null && fromRange > 0) {
        return fromRange;
    }
    return null;
}

/**
 * Build a scoped knowledge export for the declaration under the IDE track's source range —
 * one top-level section (e.g. Partition + nested laws), not the whole chapter document.
 */
export function scopedKnowledgePanelExport(
    knowledgeData: KnowledgeData | null | undefined,
    track: IdeTrack | null | undefined,
): KnowledgePanelExport | null {
    if (!knowledgeData?.file?.document) {
        return null;
    }
    if (track?.knowledgePanel?.scopedToSource === false) {
        return null;
    }

    const focusLine = focusLineFromTrack(track);
    if (focusLine == null) {
        return null;
    }

    const body = getBodySections(knowledgeData.file.document);
    if (body.length === 0) {
        return null;
    }

    const sources = (knowledgeData.sources as RenderContext['sources']) ?? null;

    // Prefer a section whose own source span covers the focus line — this matches
    // AppPage's "declaration under cursor" behaviour even when the LSP reports
    // many nested expression spans on the same line.
    const section = sectionForLine(body, sources, focusLine);
    if (section) {
        return {
            version: 1,
            sections: [section],
            sources: sources ?? undefined,
            ui_phrases: knowledgeData.ui_phrases ?? null,
        };
    }

    // Fallback: smallest source-mapped node, then look up its enclosing section.
    const nodeId = bestNodeAtLine(sources, focusLine);
    if (nodeId) {
        const sectionByNode = sectionForNodeId(body, nodeId);
        if (sectionByNode) {
            return {
                version: 1,
                sections: [sectionByNode],
                sources: sources ?? undefined,
                ui_phrases: knowledgeData.ui_phrases ?? null,
            };
        }
    }

    // v4 compare beats ship inline snippets — when scoping misses, show the sole section.
    if (body.length === 1) {
        return {
            version: 1,
            sections: [body[0]],
            sources: sources ?? undefined,
            ui_phrases: knowledgeData.ui_phrases ?? null,
        };
    }

    return null;
}
