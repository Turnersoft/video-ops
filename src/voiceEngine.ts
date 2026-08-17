export const VOICE_ENGINE_IDS = ["voxcpm", "indextts"] as const;

export type VoiceEngineId = (typeof VOICE_ENGINE_IDS)[number];

export const VOICE_ENGINE_LABELS: Record<VoiceEngineId, string> = {
  voxcpm: "VoxCPM",
  indextts: "IndexTTS",
};

export function defaultVoiceEngine(): VoiceEngineId {
  return "voxcpm";
}

export function parseVoiceEngine(value: unknown): VoiceEngineId {
  if (value === "indextts" || value === "voxcpm") {
    return value;
  }
  return "voxcpm";
}

export function isVoiceEngineId(value: string): value is VoiceEngineId {
  return VOICE_ENGINE_IDS.includes(value as VoiceEngineId);
}
