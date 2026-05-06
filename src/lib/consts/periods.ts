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

export const periods = {
  today: {
    label: "Today",
    start: () => startOfDay(new Date()),
    end: () => endOfDay(new Date()),
    previous: () => startOfDay(subDays(new Date(), 1)),
    grouping: "hour",
  },
  yesterday: {
    label: "Yesterday",
    start: () => startOfDay(subDays(new Date(), 1)),
    end: () => endOfDay(subDays(new Date(), 1)),
    previous: () => startOfDay(subDays(new Date(), 2)),
    grouping: "hour",
  },
  last_7_days: {
    label: "Last 7 Days",
    start: () => startOfDay(subDays(new Date(), 6)),
    end: () => endOfDay(new Date()),
    previous: () => startOfDay(subDays(new Date(), 7)),
    grouping: "day",
  },
  last_30_days: {
    label: "Last 30 Days",
    start: () => startOfDay(subDays(new Date(), 29)),
    end: () => endOfDay(new Date()),
    previous: () => startOfDay(subDays(new Date(), 30)),
    grouping: "day",
  },
  last_90_days: {
    label: "Last 90 Days",
    start: () => startOfDay(subDays(new Date(), 89)),
    end: () => endOfDay(new Date()),
    previous: () => startOfDay(subDays(new Date(), 90)),
    grouping: "day",
  },
  this_week: {
    label: "This Week",
    start: () => startOfISOWeek(new Date()),
    end: () => endOfISOWeek(new Date()),
    previous: () => startOfISOWeek(subWeeks(new Date(), 1)),
    grouping: "day",
  },
  previous_week: {
    label: "Previous Week",
    start: () => startOfISOWeek(subWeeks(new Date(), 1)),
    end: () => endOfISOWeek(subWeeks(new Date(), 1)),
    previous: () => startOfISOWeek(subWeeks(new Date(), 2)),
    grouping: "day",
  },
  this_month: {
    label: "This Month",
    start: () => startOfMonth(new Date()),
    end: () => endOfMonth(new Date()),
    previous: () => startOfMonth(subMonths(new Date(), 1)),
    grouping: "day",
  },
  previous_month: {
    label: "Previous Month",
    start: () => startOfMonth(subMonths(new Date(), 1)),
    end: () => endOfMonth(subMonths(new Date(), 1)),
    previous: () => startOfMonth(subMonths(new Date(), 2)),
    grouping: "day",
  },
  this_year: {
    label: "This Year",
    start: () => startOfYear(new Date()),
    end: () => endOfYear(new Date()),
    previous: () => startOfYear(subYears(new Date(), 1)),
    grouping: "month",
  },
  previous_year: {
    label: "Previous Year",
    start: () => startOfYear(subYears(new Date(), 1)),
    end: () => endOfYear(subYears(new Date(), 1)),
    previous: () => startOfYear(subYears(new Date(), 2)),
    grouping: "month",
  },
  last_180_days: {
    label: "Last 180 Days",
    start: () => startOfDay(subDays(new Date(), 179)),
    end: () => endOfDay(new Date()),
    previous: () => startOfDay(subDays(new Date(), 180)),
    grouping: "month",
  },
  last_365_days: {
    label: "Last 365 Days",
    start: () => startOfDay(subDays(new Date(), 364)),
    end: () => endOfDay(new Date()),
    previous: () => startOfDay(subDays(new Date(), 365)),
    grouping: "month",
  },
  all_time: {
    label: "All Time",
    start: () => startOfDay(new Date(1970, 0, 1)),
    end: () => endOfDay(new Date()),
    previous: () => startOfDay(new Date(1970, 0, 1)),
    grouping: "year",
  },
  last_10_years: {
    label: "Last 10 Years",
    start: () => startOfYear(subYears(new Date(), 10)),
    end: () => endOfYear(new Date()),
    previous: () => startOfYear(subYears(new Date(), 11)),
    grouping: "year",
  },
  last_3_years: {
    label: "Last 3 Years",
    start: () => startOfYear(subYears(new Date(), 3)),
    end: () => endOfYear(new Date()),
    previous: () => startOfYear(subYears(new Date(), 4)),
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
