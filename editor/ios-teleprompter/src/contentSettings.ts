import { loadAgentBaseUrl } from './agentSettings';

/** Mac content API — outdoor agent serves `video_ops/projects/` as catalog + artifacts. */
export async function loadContentBaseUrl(): Promise<string> {
  return loadAgentBaseUrl();
}
