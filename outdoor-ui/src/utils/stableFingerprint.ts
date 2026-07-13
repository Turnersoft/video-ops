/** Stable string fingerprint for avoiding React setState churn / flicker. */
export function stableFingerprint(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
