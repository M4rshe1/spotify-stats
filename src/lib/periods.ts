import { differenceInDays, startOfDay, subDays } from "date-fns";
import type { Period, PeriodGrouping } from "./consts/periods";
import { periods } from "./consts/periods";
import { TRPCError } from "@trpc/server";

export const getGrouping = (start: Date, end: Date): PeriodGrouping => {
  const diffInDays = differenceInDays(end, start);
  if (diffInDays < 7) {
    return "hour";
  } else if (diffInDays < 30) {
    return "day";
  } else if (diffInDays < 365) {
    return "month";
  } else {
    return "year";
  }
};

export const getPreviousPeriod = (start: Date, end: Date) => {
  const difference = differenceInDays(end, start);
  return startOfDay(subDays(start, difference));
};

export function getPeriods(
  period: Period,
  from: Date | null | undefined,
  to: Date | null | undefined,
) {
  let start = periods[period as Period].start();
  let end = periods[period as Period].end();
  let previousStart = periods[period as Period].previous();
  let previousEnd = start;
  if (period == "custom") {
    if (!from || !to) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "From and to dates are required for custom period",
      });
    }
    start = from;
    end = to;
    previousStart = getPreviousPeriod(start, end);
    previousEnd = start;
  }
  return {
    start,
    end,
    previousStart,
    previousEnd,
    grouping: getGrouping(start as Date, end as Date),
  };
}
