import type { BeatTemplateConfig, BeatTemplateKind } from '../../types/beatStudio';

export type TemplateConfigPanelProps = {
  scriptId: string;
  template: BeatTemplateKind;
  templateConfig: BeatTemplateConfig;
  onChange: (config: BeatTemplateConfig) => void;
};
