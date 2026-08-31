import {
  BEAT_POSTER_PREVIEW_FONT_SCALE,
  MIN_EDITOR_FONT_SIZE,
  estimateTextUnits,
  fitBeatPosterCardLayout,
} from './beatPosterLayout.ts';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

const crowdedParagraphs = [
  'The aim is the classroom empty set, so Lean still wants the glyph `∅` on the page.',
  'It does not invent a type `EmptySet`. It keeps `Set α`, then attaches `∅` through a typeclass.',
  'That typeclass is `EmptyCollection`, from Lean core in `Init/Core.lean`. One field, `emptyCollection : α`, and `∅` is its notation.',
];

const beat3Code = `-- lean4/src/Init/Core.lean
class EmptyCollection (α : Type u) where
  emptyCollection : α

notation "∅" => EmptyCollection.emptyCollection`;

const beat4Code = `-- lean4/src/Init/Core.lean
notation "∅" => EmptyCollection.emptyCollection

-- mathlib4/Mathlib/Data/Set/Defs.lean
def Set (α : Type u) := α → Prop
instance : EmptyCollection (Set α) := ⟨fun _ ↦ False⟩`;

Deno.test('crowded poster code stays at or above the readable floor', () => {
  for (const [name, code] of [['beat3', beat3Code], ['beat4', beat4Code]] as const) {
    const layout = fitBeatPosterCardLayout({
      paragraphs: crowdedParagraphs,
      codeLines: code.split('\n').length,
      hasCode: true,
      hasNextLead: true,
      titleUnits: estimateTextUnits('Lean hangs ∅ on the empty set'),
      codeText: code,
    });
    assert(
      layout.editorFontSize >= MIN_EDITOR_FONT_SIZE,
      `${name} editorFontSize ${layout.editorFontSize} < ${MIN_EDITOR_FONT_SIZE}`,
    );
    const previewPx = layout.editorFontSize * BEAT_POSTER_PREVIEW_FONT_SCALE;
    assert(
      previewPx >= MIN_EDITOR_FONT_SIZE * BEAT_POSTER_PREVIEW_FONT_SCALE,
      `${name} preview ${previewPx}px is below the floor`,
    );
  }
});

Deno.test('short snippets can still grow above the floor', () => {
  const layout = fitBeatPosterCardLayout({
    paragraphs: ['A set is a yes-or-no question.'],
    codeLines: 1,
    hasCode: true,
    hasNextLead: true,
    titleUnits: 20,
    codeText: 'def Set (α : Type u) := α → Prop',
  });
  assert(
    layout.editorFontSize > MIN_EDITOR_FONT_SIZE,
    `short snippet stayed at the floor (${layout.editorFontSize})`,
  );
});

Deno.test('a very long line wraps instead of shrinking below the floor', () => {
  const longLine = 'instance : EmptyCollection (Set α) := ⟨fun _ ↦ False⟩  '.repeat(4).trim();
  const layout = fitBeatPosterCardLayout({
    paragraphs: crowdedParagraphs,
    codeLines: 1,
    hasCode: true,
    hasNextLead: true,
    titleUnits: 20,
    codeText: longLine,
  });
  assert(
    layout.editorFontSize >= MIN_EDITOR_FONT_SIZE,
    `long line editorFontSize ${layout.editorFontSize} < ${MIN_EDITOR_FONT_SIZE}`,
  );
});
