// /Users/johndoe/Documents/company/basic_ui/video_ops/remotion/src/lib/knowledgePanelFromCode.ts
export type KnowledgePanelItem = {
    label: string;
    detail?: string;
};

export function defaultKnowledgeItems(visibleCode: string): KnowledgePanelItem[] {
    const lower = visibleCode.toLowerCase();

    if (lower.includes('partition')) {
        return [
            { label: 'Partition shape', detail: 'Nonempty · subset · cover · disjoint' },
            { label: 'disjoint law', detail: 'Pieces do not overlap' },
            { label: 'cover law', detail: 'Pieces cover the whole set' },
        ];
    }

    if (lower.includes('equivalencerelation') || lower.includes('equivalence')) {
        return [
            { label: 'Reflexive', detail: 'Every element relates to itself' },
            { label: 'Symmetric', detail: 'Swap both sides' },
            { label: 'Transitive', detail: 'Chain through a middle' },
        ];
    }

    if (lower.includes('relation')) {
        return [
            { label: 'Carrier set', detail: 'Where pairs live' },
            { label: 'Well-defined', detail: 'One input, one output' },
            { label: 'Bag of pairs', detail: 'Graph-style data' },
        ];
    }

    return [
        { label: 'Structure laws', detail: 'Named obligations on the shape' },
        { label: 'Fields & where', detail: 'Data bundled into the block' },
        { label: 'Reuse definition', detail: 'Plug data into the structure' },
    ];
}

export function knowledgeActiveIndex(visibleCode: string, items: KnowledgePanelItem[]): number {
    const lower = visibleCode.toLowerCase();

    if (lower.includes('cover')) {
        return 3;
    }
    if (lower.includes('disjoint')) {
        return 2;
    }
    if (lower.includes('subset')) {
        return 1;
    }
    if (lower.includes('nonempty') || lower.includes('emptyset') || lower.includes('!=')) {
        return 0;
    }

    for (let index = items.length - 1; index >= 0; index -= 1) {
        const label = items[index].label.toLowerCase();
        if (label.includes('cover') && lower.includes('cover')) {
            return index;
        }
        if (label.includes('disjoint') && lower.includes('disjoint')) {
            return index;
        }
        if (label.includes('spread') && (lower.includes('[..') || lower.includes('classes'))) {
            return index;
        }
        if (label.includes('reflex') && lower.includes('reflex')) {
            return index;
        }
        if (label.includes('symmet') && lower.includes('symmet')) {
            return index;
        }
        if (label.includes('transit') && lower.includes('transit')) {
            return index;
        }
        if (label.includes('well-defined') && lower.includes('well-defined')) {
            return index;
        }
    }

    return 0;
}
