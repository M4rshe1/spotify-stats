import { TZDate } from "@date-fns/tz/date";
import {
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  startOfISOWeek,
  endOfISOWeek,
  subWeeks,
  endOfDay,
  startOfDay,
  subDays,
  subMonths,
  subYears,
} from "date-fns";

/**
 * Instant used as the calendar anchor for preset periods.
 * In the browser this is local time; on the server it follows `TZ` so boundaries
 * match the deployment timezone (see `src/env.js`).
 */
function periodAnchorDate(): Date {
  if (typeof window !== "undefined") {
    return new Date();
  }
  const tz = process.env.TZ;
  if (!tz) {
    return new Date();
  }
  return new TZDate(Date.now(), tz);
}

export const periods = {
  today: {
    label: "Today",
    start: () => startOfDay(periodAnchorDate()),
    end: () => endOfDay(periodAnchorDate()),
    previous: () => startOfDay(subDays(periodAnchorDate(), 1)),
    grouping: "hour",
  },
  yesterday: {
    label: "Yesterday",
    start: () => startOfDay(subDays(periodAnchorDate(), 1)),
    end: () => endOfDay(subDays(periodAnchorDate(), 1)),
    previous: () => startOfDay(subDays(periodAnchorDate(), 2)),
    grouping: "hour",
  },
  last_7_days: {
    label: "Last 7 Days",
    start: () => startOfDay(subDays(periodAnchorDate(), 6)),
    end: () => endOfDay(periodAnchorDate()),
    previous: () => startOfDay(subDays(periodAnchorDate(), 13)),
    grouping: "day",
  },
  last_30_days: {
    label: "Last 30 Days",
    start: () => startOfDay(subDays(periodAnchorDate(), 29)),
    end: () => endOfDay(periodAnchorDate()),
    previous: () => startOfDay(subDays(periodAnchorDate(), 60)),
    grouping: "day",
  },
  last_90_days: {
    label: "Last 90 Days",
    start: () => startOfDay(subDays(periodAnchorDate(), 89)),
    end: () => endOfDay(periodAnchorDate()),
    previous: () => startOfDay(subDays(periodAnchorDate(), 180)),
    grouping: "day",
  },
  this_week: {
    label: "This Week",
    start: () => startOfISOWeek(periodAnchorDate()),
    end: () => endOfISOWeek(periodAnchorDate()),
    previous: () => startOfISOWeek(subWeeks(periodAnchorDate(), 1)),
    grouping: "day",
  },
  previous_week: {
    label: "Previous Week",
    start: () => startOfISOWeek(subWeeks(periodAnchorDate(), 1)),
    end: () => endOfISOWeek(subWeeks(periodAnchorDate(), 1)),
    previous: () => startOfISOWeek(subWeeks(periodAnchorDate(), 2)),
    grouping: "day",
  },
  this_month: {
    label: "This Month",
    start: () => startOfMonth(periodAnchorDate()),
    end: () => endOfMonth(periodAnchorDate()),
    previous: () => startOfMonth(subMonths(periodAnchorDate(), 1)),
    grouping: "day",
  },
  previous_month: {
    label: "Previous Month",
    start: () => startOfMonth(subMonths(periodAnchorDate(), 1)),
    end: () => endOfMonth(subMonths(periodAnchorDate(), 1)),
    previous: () => startOfMonth(subMonths(periodAnchorDate(), 2)),
    grouping: "day",
  },
  this_year: {
    label: "This Year",
    start: () => startOfYear(periodAnchorDate()),
    end: () => endOfYear(periodAnchorDate()),
    previous: () => startOfYear(subYears(periodAnchorDate(), 1)),
    grouping: "month",
  },
  previous_year: {
    label: "Previous Year",
    start: () => startOfYear(subYears(periodAnchorDate(), 1)),
    end: () => endOfYear(subYears(periodAnchorDate(), 1)),
    previous: () => startOfYear(subYears(periodAnchorDate(), 2)),
    grouping: "month",
  },
  last_180_days: {
    label: "Last 180 Days",
    start: () => startOfDay(subDays(periodAnchorDate(), 179)),
    end: () => endOfDay(periodAnchorDate()),
    previous: () => startOfDay(subDays(periodAnchorDate(), 360)),
    grouping: "month",
  },
  last_365_days: {
    label: "Last 365 Days",
    start: () => startOfDay(subDays(periodAnchorDate(), 364)),
    end: () => endOfDay(periodAnchorDate()),
    previous: () => startOfDay(subDays(periodAnchorDate(), 730)),
    grouping: "month",
  },
  last_3_years: {
    label: "Last 3 Years",
    start: () => startOfYear(subYears(periodAnchorDate(), 3)),
    end: () => endOfYear(periodAnchorDate()),
    previous: () => startOfYear(subYears(periodAnchorDate(), 4)),
    grouping: "year",
  },
  last_10_years: {
    label: "Last 10 Years",
    start: () => startOfYear(subYears(periodAnchorDate(), 10)),
    end: () => endOfYear(periodAnchorDate()),
    previous: () => startOfYear(subYears(periodAnchorDate(), 11)),
    grouping: "year",
  },
  all_time: {
    label: "All Time",
    start: () => startOfDay(new Date(1970, 0, 1)),
    end: () => endOfDay(periodAnchorDate()),
    previous: () => startOfDay(new Date(1970, 0, 1)),
    grouping: "year",
  },
  custom: {
    label: "Custom",
    start: () => null,
    end: () => null,
    previous: () => null,
    grouping: null,
  },
} as const;

export type Period = keyof typeof periods;
export type PeriodLabel = (typeof periods)[Period]["label"];
export type PeriodStart = (typeof periods)[Period]["start"];
export type PeriodEnd = (typeof periods)[Period]["end"];
export type PeriodPrevious = (typeof periods)[Period]["previous"];
export type PeriodGrouping = (typeof periods)[Period]["grouping"];
export type ProviderPeriod =
  | {
      type: "custom";
      from: Date;
      end: Date;
    }
  | {
      type: Exclude<Period, "custom">;
    };
