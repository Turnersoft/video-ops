/** Shared VoxCPM quality knobs (env overrides). */

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function readEnvNumber(name: string, fallback: number): number {
  const raw = Deno.env.get(name);
  if (!raw?.trim()) {
    return fallback;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/** Diffusion steps — 10 is the original editor default (4–30). */
export const VOXCPM_INFERENCE_TIMESTEPS = clampNumber(
  readEnvNumber('VOXCPM_INFERENCE_TIMESTEPS', readEnvNumber('VOXCPM_EDITOR_TIMESTEPS', 10)),
  4,
  30,
);

/** Classifier-free guidance — 2.0 was the original clone default. */
export const VOXCPM_CFG_VALUE = clampNumber(readEnvNumber('VOXCPM_CFG_VALUE', 2.0), 1.0, 3.0);

/** Reference voice clip length sent to the model (seconds). 0 = use full reference (no trim). */
export const VOXCPM_REFERENCE_MAX_SECONDS = clampNumber(
  readEnvNumber('VOXCPM_REFERENCE_MAX_SECONDS', 0),
  0,
  120,
);

/** Split longer lines before each /clone call. 0 = send full line in one request. */
export const VOXCPM_TEXT_CHUNK_MAX_CHARS = clampNumber(
  readEnvNumber('VOXCPM_TEXT_CHUNK_MAX_CHARS', 0),
  0,
  400,
);
