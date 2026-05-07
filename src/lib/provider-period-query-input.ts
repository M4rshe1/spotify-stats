import type { ProviderPeriod } from "@/lib/consts/periods";
import type { PeriodQueryInput } from "@/server/api/lib";

export function providerPeriodToQueryInput(
  period: ProviderPeriod,
): PeriodQueryInput {
  if (period.type === "custom") {
    return {
      period: "custom",
      from: period.from,
      to: period.end,
    };
  }
  return { period: period.type };
}
