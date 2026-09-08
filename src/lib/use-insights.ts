import { useMemo } from "react";
import { useBabyBond } from "./babybond-store";
import { buildInsights, type Insight } from "./babybond-insights";

/** Derived locally from the already-loaded, cloud-synced store data. */
export function useInsights(): Insight[] {
  const { entries, medicines, vaccines, now, settings } = useBabyBond();
  // bucket "now" per minute so insights don't recompute on every tick
  const nowMinute = Math.floor(now / 60000);
  return useMemo(
    () =>
      buildInsights({
        entries,
        medicines,
        vaccines,
        now: nowMinute * 60000,
        breastMlPerMinute: settings.breastMlPerMinute,
      }),
    [entries, medicines, vaccines, nowMinute, settings.breastMlPerMinute],
  );
}
