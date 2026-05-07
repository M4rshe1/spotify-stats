import "server-only";

import type { PeriodQueryInput } from "@/server/api/lib";
import { api } from "@/trpc/server";

/** User's preferred range for SSR prefetch of dashboard / chart queries. */
export async function getPreferredMetricsInput(): Promise<PeriodQueryInput> {
  const { period, customStart, customEnd } =
    await api.user.getPreferredPeriod();
  return {
    period,
    from: customStart ?? undefined,
    to: customEnd ?? undefined,
  };
}
