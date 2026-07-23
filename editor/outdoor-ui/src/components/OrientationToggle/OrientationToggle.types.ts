import type { OutdoorPreviewFormat } from '../../utils/animationMdFormat';

export type OrientationToggleProps = {
  value: OutdoorPreviewFormat;
  onChange: (format: OutdoorPreviewFormat) => void;
  disabled?: boolean;
};
