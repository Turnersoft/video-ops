/** Opening title card before the first scene in every VideoOps export. */
export const VIDEO_OPS_COVER_SECONDS = 4;

export type CoverConceptId =
    | 'set'
    | 'subset'
    | 'proper-subset'
    | 'set-equality'
    | 'empty-set'
    | 'union'
    | 'intersection'
    | 'disjoint'
    | 'complement'
    | 'difference'
    | 'partition'
    | 'equivalence'
    | 'relation'
    | 'function'
    | 'proof'
    | 'syntax'
    | 'pitfall'
    | 'default';

export type VideoOpsCoverSpec = {
    episodeNumber: string;
    episodeLabel: string;
    /** Full on-screen line, e.g. "3 PROPER". */
    episodeTitle: string;
    titleColor: string;
    titleStroke: string;
    conceptId: CoverConceptId;
};

import type { CoverLayerBox, CoverLayerId } from './coverLayout';

export type VideoOpsCoverEpisodeTitleStyle = {
    /** SVG stroke width for arched episode title (default ~14 landscape). */
    strokeWidth?: number;
    titleColor?: string;
    titleStroke?: string;
    /** Base font size in SVG user units (auto-scales with line length when omitted). */
    fontSize?: number;
};

export type VideoOpsCoverOverride = {
    episodeLabel?: string;
    episodeTitle?: string;
    titleColor?: string;
    titleStroke?: string;
    concept?: CoverConceptId;
    /** Per-layer bounding boxes (% of frame) — saved from Remotion Studio cover editor. */
    layers?: Partial<Record<CoverLayerId, CoverLayerBox>>;
    episodeTitleStyle?: VideoOpsCoverEpisodeTitleStyle;
};

const CONCEPT_COLORS: Record<CoverConceptId, { titleColor: string; titleStroke: string }> = {
    set: { titleColor: '#58c4dd', titleStroke: '#0b3d6e' },
    subset: { titleColor: '#f7c948', titleStroke: '#1a4fd8' },
    'proper-subset': { titleColor: '#b8ff2e', titleStroke: '#1a4fd8' },
    'set-equality': { titleColor: '#e8a0ff', titleStroke: '#4a148c' },
    'empty-set': { titleColor: '#c8d6e5', titleStroke: '#334155' },
    union: { titleColor: '#7dd3fc', titleStroke: '#0369a1' },
    intersection: { titleColor: '#86efac', titleStroke: '#166534' },
    disjoint: { titleColor: '#fda4af', titleStroke: '#9f1239' },
    complement: { titleColor: '#c4b5fd', titleStroke: '#5b21b6' },
    difference: { titleColor: '#fcd34d', titleStroke: '#92400e' },
    partition: { titleColor: '#fbbf24', titleStroke: '#b45309' },
    equivalence: { titleColor: '#a5f3fc', titleStroke: '#0e7490' },
    relation: { titleColor: '#93c5fd', titleStroke: '#1d4ed8' },
    function: { titleColor: '#6ee7b7', titleStroke: '#047857' },
    proof: { titleColor: '#fca5a5', titleStroke: '#991b1b' },
    syntax: { titleColor: '#e879f9', titleStroke: '#86198f' },
    pitfall: { titleColor: '#fb7185', titleStroke: '#be123c' },
    default: { titleColor: '#e8e6e3', titleStroke: '#1a4fd8' },
};

const SCRIPT_CONCEPT: Partial<Record<string, CoverConceptId>> = {
    'sets-v2-01-set': 'set',
    'sets-v2-02-subset': 'subset',
    'sets-v2-03-proper-subset': 'proper-subset',
    'sets-v2-04-set-equality': 'set-equality',
    'sets-v2-05-empty-set': 'empty-set',
    'sets-v2-06-empty-subset-theorem': 'empty-set',
    'sets-v2-07-union': 'union',
    'sets-v2-08-intersection': 'intersection',
    'sets-v2-09-disjoint': 'disjoint',
    'sets-v2-10-complement': 'complement',
    'sets-v2-11-difference': 'difference',
    'sets-v2-12-union-idempotent': 'union',
    'algebra-01-spread-classes-into-partition': 'partition',
    'algebra-02-invertible-bijective-proof': 'function',
    'algebra-03-functions-relations-equivalence': 'equivalence',
    'algebra-04-partition-cutting-the-cake': 'partition',
    'algebra-05-equivalence-weaker-than-equality': 'equivalence',
    'algebra-06-relations-bag-of-pairs': 'relation',
    'algebra-07-theorem-125-what-formed-means': 'partition',
    'pitfalls-01-surjective-quantifier-order': 'pitfall',
    'pitfalls-02-witness-is-unpack-not-provide': 'pitfall',
    'pitfalls-03-reject-a-false-premise': 'pitfall',
    'pitfalls-04-well-defined-one-input-two-outputs': 'pitfall',
    'pitfalls-05-exists-on-structure-is-a-claim': 'pitfall',
    'syntax-01-trial-is-not-continuation': 'syntax',
    'syntax-02-theorem-is-a-folder': 'syntax',
    'syntax-03-export-proof-as-tree': 'syntax',
    'syntax-04-close-and-split-at-once': 'syntax',
    'syntax-05-outline-to-proof-slide-breadcrumb': 'syntax',
    'syntax-06-tactic-status-during-replay': 'syntax',
    'syntax-07-function-refines-well-defined-relation': 'function',
    'syntax-08-composition-pipeline-a-to-c': 'function',
    'syntax-09-function-properties-as-adjectives': 'function',
    'syntax-10-round-brackets-bundle-properties': 'syntax',
    'syntax-11-laws-vs-properties-inside-structures': 'syntax',
    'syntax-12-composition-theorem-four-leaves': 'proof',
    'why-need-01-cauchy-where-bundle': 'proof',
    'why-need-02-side-conditions-you-can-name': 'proof',
    'why-need-03-witness-you-cannot-compute': 'proof',
    'why-need-05-keep-or-reject-before-ai-edits': 'proof',
    'why-need-06-partition-obligations-named-from-structure': 'partition',
};

const SHORT_LABELS: Partial<Record<string, string>> = {
    'proper-subset': 'PROPER SUBSET',
    'set-equality': 'EQUALITY',
    'empty-set': 'EMPTY SET',
    'empty-subset-theorem': '∅ ⊆ S',
    'union-idempotent': 'UNION',
    'spread-classes-into-partition': 'PARTITION',
    'invertible-bijective-proof': 'BIJECTION',
    'functions-relations-equivalence': 'EQUIV',
    'partition-cutting-the-cake': 'PARTITION',
    'equivalence-weaker-than-equality': 'EQUIV',
    'relations-bag-of-pairs': 'RELATIONS',
    'theorem-125-what-formed-means': 'PARTITION',
    'surjective-quantifier-order': 'ONTO',
    'witness-is-unpack-not-provide': 'WITNESS',
    'reject-a-false-premise': 'REJECT',
    'well-defined-one-input-two-outputs': 'WELL-DEF',
    'exists-on-structure-is-a-claim': 'EXISTS',
    'trial-is-not-continuation': 'TRIAL',
    'theorem-is-a-folder': 'THEOREM',
    'export-proof-as-tree': 'EXPORT',
    'close-and-split-at-once': 'SPLIT',
    'outline-to-proof-slide-breadcrumb': 'OUTLINE',
    'tactic-status-during-replay': 'REPLAY',
    'function-refines-well-defined-relation': 'FUNCTION',
    'composition-pipeline-a-to-c': 'COMPOSE',
    'function-properties-as-adjectives': 'PROPERTIES',
    'round-brackets-bundle-properties': 'BUNDLE',
    'laws-vs-properties-inside-structures': 'LAWS',
    'composition-theorem-four-leaves': 'COMPOSE',
    'cauchy-where-bundle': 'CAUCHY',
    'side-conditions-you-can-name': 'CONFIRM',
    'witness-you-cannot-compute': 'WITNESS',
    'keep-or-reject-before-ai-edits': 'KEEP/REJECT',
    'partition-obligations-named-from-structure': 'PARTITION',
    set: 'SET',
    subset: 'SUBSET',
};

function episodeNumberFromScriptId(scriptId: string): string {
    const match = scriptId.match(/^(?:sets-v2|algebra|pitfalls|syntax|why-need)-(\d+)/);
    if (!match) {
        return '';
    }
    return String(parseInt(match[1], 10));
}

function slugTail(scriptId: string): string {
    const parts = scriptId.split('-');
    const numericIdx = parts.findIndex((part) => /^\d+$/.test(part));
    if (numericIdx >= 0 && numericIdx < parts.length - 1) {
        return parts.slice(numericIdx + 1).join('-');
    }
    return parts[parts.length - 1] ?? scriptId;
}

function inferConceptId(scriptId: string): CoverConceptId {
    if (SCRIPT_CONCEPT[scriptId]) {
        return SCRIPT_CONCEPT[scriptId]!;
    }
    if (scriptId.startsWith('pitfalls-')) {
        return 'pitfall';
    }
    if (scriptId.startsWith('syntax-')) {
        return 'syntax';
    }
    if (scriptId.includes('partition')) {
        return 'partition';
    }
    if (scriptId.includes('equivalence') || scriptId.includes('equivalent')) {
        return 'equivalence';
    }
    if (scriptId.includes('function') || scriptId.includes('bijective') || scriptId.includes('surjective')) {
        return 'function';
    }
    if (scriptId.includes('relation')) {
        return 'relation';
    }
    if (scriptId.includes('proof') || scriptId.startsWith('why-need-')) {
        return 'proof';
    }
    return 'default';
}

function episodeLabelFromScriptId(scriptId: string, conceptId: CoverConceptId): string {
    const tail = slugTail(scriptId);
    if (SHORT_LABELS[tail]) {
        return SHORT_LABELS[tail]!;
    }
    if (SHORT_LABELS[conceptId]) {
        return SHORT_LABELS[conceptId]!;
    }
    return tail
        .split('-')
        .filter(Boolean)
        .map((word) => word.toUpperCase())
        .join(' ');
}

export function resolveVideoOpsCover(
    scriptId: string,
    override?: VideoOpsCoverOverride,
): VideoOpsCoverSpec {
    const conceptId = override?.concept ?? inferConceptId(scriptId);
    const colors = CONCEPT_COLORS[conceptId];
    const episodeNumber = episodeNumberFromScriptId(scriptId);
    const episodeLabel = override?.episodeLabel ?? episodeLabelFromScriptId(scriptId, conceptId);
    const episodeTitle =
        override?.episodeTitle ??
        (episodeNumber ? `${episodeNumber} ${episodeLabel}` : episodeLabel);
    const style = override?.episodeTitleStyle;

    return {
        episodeNumber,
        episodeLabel,
        episodeTitle,
        titleColor: style?.titleColor ?? override?.titleColor ?? colors.titleColor,
        titleStroke: style?.titleStroke ?? override?.titleStroke ?? colors.titleStroke,
        conceptId,
    };
}

export function mergeVideoOpsCoverOverride(
    base: VideoOpsCoverOverride | undefined,
    patch: VideoOpsCoverOverride,
): VideoOpsCoverOverride {
    return {
        ...base,
        ...patch,
        layers: { ...base?.layers, ...patch.layers },
        episodeTitleStyle: { ...base?.episodeTitleStyle, ...patch.episodeTitleStyle },
    };
}
