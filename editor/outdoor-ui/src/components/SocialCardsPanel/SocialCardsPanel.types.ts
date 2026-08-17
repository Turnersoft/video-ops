export type SocialCardsPanelProps = {
  jobId: string;
  publish?: import('../../types').PublishState | null;
  onPublishChange?: () => void;
};
