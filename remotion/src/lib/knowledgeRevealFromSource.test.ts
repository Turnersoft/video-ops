import { describe, expect, it } from 'vitest';

import { revealedKnowledgeBlockCount, revealedKnowledgeSections } from './knowledgeRevealFromSource';

const partitionSections = [
    { id: 'partition-nonempty', title: { segments: [{ Text: 'Nonempty' }] } },
    { id: 'partition-subset', title: { segments: [{ Text: 'Subset' }] } },
    { id: 'partition-disjoint', title: { segments: [{ Text: 'Disjoint' }] } },
    { id: 'partition-cover', title: { segments: [{ Text: 'Cover' }] } },
];

describe('revealedKnowledgeBlockCount', () => {
    it('counts one block for a finished first sequent only', () => {
        const source = `structure[
    C: Set<Any> where {
        |- C != EmptySet;
        |- Subset(C`;
        expect(revealedKnowledgeBlockCount(source)).toBe(1);
    });
});

describe('revealedKnowledgeSections', () => {
    it('reveals laws from prose intro text in order', () => {
        const source = `Every piece is nonempty.
Every piece sits inside the original set.`;
        expect(revealedKnowledgeSections(partitionSections, source)).toHaveLength(2);
    });

    it('reveals one card per completed Turn source block', () => {
        const source = `        |- C != EmptySet;
        |- Subset(C`;
        expect(revealedKnowledgeSections(partitionSections, source)).toHaveLength(1);
    });
});
