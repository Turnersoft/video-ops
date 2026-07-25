/** Types for AlignReviewPanel. */

export type AlignReviewPanelProps = {
  jobId: string;
  scriptId: string;
  takeId: string;
  compositeLandscapeUrl?: string | null;
  onPipelineChange?: () => void;
};
