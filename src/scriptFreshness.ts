/** Human-readable freshness for script idea files (animation.md / script.md). */

export type ScriptFreshness = {
  ideaUpdatedAt: string | null;
  freshnessLabel: string;
  freshnessDaysAgo: number | null;
};

export function freshnessLabelFromIso(iso: string | null | undefined): ScriptFreshness {
  if (!iso) {
    return {
      ideaUpdatedAt: null,
      freshnessLabel: 'unknown',
      freshnessDaysAgo: null,
    };
  }

  const updated = new Date(iso);
  if (Number.isNaN(updated.getTime())) {
    return {
      ideaUpdatedAt: iso,
      freshnessLabel: 'unknown',
      freshnessDaysAgo: null,
    };
  }

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfUpdated = new Date(
    updated.getFullYear(),
    updated.getMonth(),
    updated.getDate(),
  );
  const daysAgo = Math.floor(
    (startOfToday.getTime() - startOfUpdated.getTime()) / 86_400_000,
  );

  if (daysAgo <= 0) {
    return { ideaUpdatedAt: iso, freshnessLabel: 'today', freshnessDaysAgo: 0 };
  }
  if (daysAgo === 1) {
    return { ideaUpdatedAt: iso, freshnessLabel: 'yesterday', freshnessDaysAgo: 1 };
  }
  return {
    ideaUpdatedAt: iso,
    freshnessLabel: `${daysAgo} days ago`,
    freshnessDaysAgo: daysAgo,
  };
}
