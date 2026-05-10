import type { inferRouterOutputs } from "@trpc/server";

import type { Period, ProviderPeriod } from "@/lib/consts/periods";
import { periods } from "@/lib/consts/periods";
import { userSettings } from "@/lib/consts/settings";
import type { AppRouter } from "@/server/api/root";

export type PreferredPeriodSnapshot =
  inferRouterOutputs<AppRouter>["user"]["getPreferredPeriod"];

const periodOrder = Object.keys(periods) as Period[];

const periodSet = new Set<Period>(periodOrder);

export const selectablePeriods = periodOrder.filter(
  (period): period is Exclude<Period, "custom"> => period !== "custom",
);

export const periodRank = new Map(
  periodOrder.map((period, index) => [period, index]),
);

const defaultPresetPeriod = userSettings.PREFERRED_PERIOD
  .defaultValue as Exclude<Period, "custom">;

export function isPeriod(value: unknown): value is Period {
  return typeof value === "string" && periodSet.has(value as Period);
}

export function snapshotToProviderPeriod(
  data: PreferredPeriodSnapshot,
): ProviderPeriod | null {
  const { period: nextPeriod, customStart, customEnd } = data;
  if (!isPeriod(nextPeriod)) return null;

  if (nextPeriod === "custom") {
    if (customStart && customEnd) {
      return {
        type: "custom",
        from: new Date(customStart as string),
        end: new Date(customEnd as string),
      };
    }
    return null;
  }

  return { type: nextPeriod };
}

export function defaultProviderPeriod(): ProviderPeriod {
  return { type: defaultPresetPeriod };
}

export function preferredSnapshotBase(
  cached: PreferredPeriodSnapshot | undefined,
  initialFromLayout: PreferredPeriodSnapshot | undefined,
): PreferredPeriodSnapshot {
  return (
    cached ??
    initialFromLayout ?? {
      period: userSettings.PREFERRED_PERIOD.defaultValue as Period,
      customStart: null,
      customEnd: null,
      favoritePeriods: [],
    }
  );
}
