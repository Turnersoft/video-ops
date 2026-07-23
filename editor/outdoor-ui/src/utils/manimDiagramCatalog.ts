/** Math-board diagram presets used by ManimMotionBeat (Remotion MathBoard). */
export const MANIM_DIAGRAM_IDS = [
  'equivalence-bucket',
  'set-builder',
  'set-container',
  'membership-biconditional',
  'representative',
  'textbook-set',
  'turn-structure',
  'lean-setoid',
] as const;

export type ManimDiagramId = (typeof MANIM_DIAGRAM_IDS)[number];
