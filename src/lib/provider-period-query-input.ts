import type { ProviderPeriod } from "@/lib/consts/periods";
import type { PeriodQueryInput } from "@/server/api/lib";

export type StatsScope = "user" | "all";

export type PeriodChartProps = {
  period: ProviderPeriod;
  scope?: StatsScope;
};

export function providerPeriodToQueryInput(
  period: ProviderPeriod,
  scope?: StatsScope,
): PeriodQueryInput & { scope?: StatsScope } {
  const base: PeriodQueryInput =
    period.type === "custom"
      ? {
          period: "custom",
          from: period.from,
          to: period.end,
        }
      : { period: period.type };
  if (scope === "all") return { ...base, scope };
  return base;
}
