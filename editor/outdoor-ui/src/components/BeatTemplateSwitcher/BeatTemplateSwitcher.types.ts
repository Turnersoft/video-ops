import type { BeatTemplateKind } from '../../types/beatStudio';

export type BeatTemplateSwitcherProps = {
  value: BeatTemplateKind;
  onChange: (kind: BeatTemplateKind) => void;
};
