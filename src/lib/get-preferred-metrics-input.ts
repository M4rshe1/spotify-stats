import "server-only";

import type { PeriodQueryInput } from "@/server/api/lib";
import { api } from "@/trpc/server";
import { type Period } from "@/lib/consts/periods";

export async function getPreferredMetricsInput(): Promise<PeriodQueryInput> {
  const { period, customStart, customEnd } =
    await api.user.getPreferredPeriod();
  return {
    period: period as unknown as Period,
    from: customStart ? new Date(customStart as string) : undefined,
    to: customEnd ? new Date(customEnd as string) : undefined,
  };
}
