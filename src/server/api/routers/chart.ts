import { createTRPCRouter, protectedProcedure } from "../trpc";
import type { PeriodGrouping } from "@/lib/consts/periods";
import { getPeriods } from "@/lib/periods";
import { periodSchema } from "@/server/api/lib";
import { tryCatch } from "@/lib/try-catch";
import { TRPCError } from "@trpc/server";
import { Prisma } from "generated/prisma";
import { z } from "zod";
import {
  addDays,
  addMonths,
  addYears,
  format,
  differenceInDays,
  startOfDay,
  startOfMonth,
  startOfYear,
  differenceInMonths,
  differenceInYears,
} from "date-fns";

function getSQLPlayedAt(timezone: string) {
  return `("playedAt" AT TIME ZONE 'UTC' AT TIME ZONE '${timezone}')`;
}

function getSQLGroupingString(grouping: PeriodGrouping, timezone: string) {
  const column = getSQLPlayedAt(timezone);
  let sql = "";
  switch (grouping) {
    case "hour":
      sql = `TO_CHAR(${column}, 'HH24')`;
      break;
    case "day":
      sql = `TO_CHAR(${column}, 'YYYY-MM-DD')`;
      break;
    case "month":
      sql = `TO_CHAR(${column}, 'YYYY-MM')`;
      break;
    case "year":
      sql = `TO_CHAR(${column}, 'YYYY')`;
      break;
    default:
      sql = `DATE_TRUNC('hour', ${column})`;
      break;
  }
  return Prisma.raw(sql);
}

function fillUpGrouping(
  grouping: PeriodGrouping,
  data: { date: string; duration: number }[],
) {
  if (grouping === "hour") {
    const lowestHour = Math.min(...data.map((r) => parseInt(r.date, 10)));
    const highestHour = Math.max(...data.map((r) => parseInt(r.date, 10)));
    const hours = Array.from({ length: highestHour - lowestHour + 1 }, (_, i) =>
      String(lowestHour + i).padStart(2, "0"),
    );
    return hours.map((hour) => {
      const result = data.find((r) => r.date === hour);
      return {
        date: hour.padStart(2, "0"),
        duration: result?.duration ?? 0,
      };
    });
  } else if (grouping === "day") {
    const lowestDay = Math.min(...data.map((r) => new Date(r.date).getTime()));
    const highestDay = Math.max(...data.map((r) => new Date(r.date).getTime()));
    const days = Array.from(
      {
        length:
          differenceInDays(
            startOfDay(new Date(highestDay)),
            startOfDay(new Date(lowestDay)),
          ) + 1,
      },
      (_, i) =>
        format(addDays(startOfDay(new Date(lowestDay)), i), "yyyy-MM-dd"),
    );
    return days.map((day) => {
      const result = data.find((r) => r.date === day);
      return { date: day, duration: result?.duration ?? 0 };
    });
  } else if (grouping === "month") {
    const lowestMonth = Math.min(
      ...data.map((r) => new Date(r.date).getTime()),
    );
    const highestMonth = Math.max(
      ...data.map((r) => new Date(r.date).getTime()),
    );
    const months = Array.from(
      {
        length:
          differenceInMonths(
            startOfMonth(new Date(highestMonth)),
            startOfMonth(new Date(lowestMonth)),
          ) + 1,
      },
      (_, i) =>
        format(addMonths(startOfMonth(new Date(lowestMonth)), i), "yyyy-MM"),
    );
    return months.map((month) => {
      const result = data.find((r) => r.date === month);
      return { date: month, duration: result?.duration ?? 0 };
    });
  } else if (grouping === "year") {
    const lowestYear = Math.min(...data.map((r) => new Date(r.date).getTime()));
    const highestYear = Math.max(
      ...data.map((r) => new Date(r.date).getTime()),
    );
    const years = Array.from(
      {
        length:
          differenceInYears(
            startOfYear(new Date(highestYear)),
            startOfYear(new Date(lowestYear)),
          ) + 1,
      },
      (_, i) => format(addYears(startOfYear(new Date(lowestYear)), i), "yyyy"),
    );
    return years.map((year) => {
      const result = data.find((r) => r.date === year);
      return { date: year, duration: result?.duration ?? 0 };
    });
  }
  return data;
}

const artistPeriodSchema = periodSchema.extend({
  artistId: z.number(),
});

const albumPeriodSchema = periodSchema.extend({
  albumId: z.number(),
});

const trackPeriodSchema = periodSchema.extend({
  trackId: z.number(),
});

export const chartRouter = createTRPCRouter({
  getTimeListened: protectedProcedure
    .input(periodSchema)
    .query(async ({ ctx, input }) => {
      const { start, end, grouping } = getPeriods(
        input.period,
        input.from,
        input.to,
      );

      const groupSql = getSQLGroupingString(
        grouping,
        ctx.session.user.timezone,
      );
      const playbacks = await tryCatch(
        ctx.db.$queryRaw<{ duration: number; date: string }[]>(
          Prisma.sql`
            SELECT 
              COALESCE(SUM(duration), 0)::float8 AS duration, 
              ${groupSql} as "date"
            FROM playback
            WHERE "playedAt" >= ${start} AND "playedAt" <= ${end}
              AND "userId" = ${ctx.session.user.id}
            GROUP BY ${groupSql}
            ORDER BY "date" ASC
          `,
        ),
      );
      if (playbacks.error) {
        console.error(playbacks.error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get playbacks",
        });
      }

      const filledData: { date: string; duration: number }[] = fillUpGrouping(
        grouping,
        playbacks.data,
      );

      return {
        data: filledData,
        grouping,
      };
    }),
  getArtistTimeListened: protectedProcedure
    .input(artistPeriodSchema)
    .query(async ({ ctx, input }) => {
      const { start, end, grouping } = getPeriods(
        input.period,
        input.from,
        input.to,
      );

      const groupSql = getSQLGroupingString(
        grouping,
        ctx.session.user.timezone,
      );
      const playbacks = await tryCatch(
        ctx.db.$queryRaw<{ duration: number; date: string }[]>(
          Prisma.sql`
            SELECT 
              COALESCE(SUM(playback.duration), 0)::float8 AS duration, 
              ${groupSql} AS "date"
            FROM playback
            JOIN track ON playback."trackId" = track."id"
            JOIN artist_track ON track."id" = artist_track."trackId"
              AND artist_track."role" = 'primary'
            WHERE playback."playedAt" >= ${start}
              AND playback."playedAt" <= ${end}
              AND playback."userId" = ${ctx.session.user.id}
              AND artist_track."artistId" = ${input.artistId}
            GROUP BY ${groupSql}
            ORDER BY "date" ASC
          `,
        ),
      );
      if (playbacks.error) {
        console.error(playbacks.error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get artist playbacks",
        });
      }

      const filledData: { date: string; duration: number }[] = fillUpGrouping(
        grouping,
        playbacks.data,
      );

      return {
        data: filledData,
        grouping,
      };
    }),
  getTimeDistribution: protectedProcedure
    .input(periodSchema)
    .query(async ({ ctx, input }) => {
      const { start, end } = getPeriods(input.period, input.from, input.to);
      const groupSql = getSQLGroupingString("hour", ctx.session.user.timezone);
      const playbacks = await tryCatch(
        ctx.db.$queryRaw<{ duration: number; date: string }[]>(
          Prisma.sql`
          SELECT
            COALESCE(SUM(duration), 0)::float8 AS duration,
            ${groupSql} AS "date",
            COUNT(*)::float8 AS count
          FROM playback
          WHERE "playedAt" >= ${start} AND "playedAt" <= ${end}
            AND "userId" = ${ctx.session.user.id}
          GROUP BY ${groupSql}
          ORDER BY "date" ASC
        `,
        ),
      );
      if (playbacks.error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get playbacks",
        });
      }

      const rows = playbacks.data as {
        duration: number;
        date: string;
        count: number;
      }[];
      const totalDuration = rows.reduce((acc, r) => acc + r.duration, 0);
      const totalCount = rows.reduce((acc, r) => acc + r.count, 0);

      const byHour = new Map(rows.map((r) => [r.date, r.duration]));
      const byCount = new Map(rows.map((r) => [r.date, r.count]));
      const data = Array.from({ length: 24 }, (_, h) => {
        const key = String(h).padStart(2, "0");
        return {
          date: key,
          duration: byHour.get(key) ?? 0,
          count: byCount.get(key) ?? 0,
          percentage: ((byHour.get(key) ?? 0) / totalDuration) * 100,
        };
      });

      return { data, totalDuration, totalCount };
    }),
  getArtistTimeDistribution: protectedProcedure
    .input(artistPeriodSchema)
    .query(async ({ ctx, input }) => {
      const { start, end } = getPeriods(input.period, input.from, input.to);
      const groupSql = getSQLGroupingString("hour", ctx.session.user.timezone);
      const playbacks = await tryCatch(
        ctx.db.$queryRaw<{ duration: number; date: string; count: number }[]>(
          Prisma.sql`
          SELECT
            COALESCE(SUM(playback.duration), 0)::float8 AS duration,
            ${groupSql} AS "date",
            COUNT(*)::float8 AS count
          FROM playback
          JOIN track ON playback."trackId" = track."id"
          JOIN artist_track ON track."id" = artist_track."trackId"
            AND artist_track."role" = 'primary'
          WHERE playback."playedAt" >= ${start}
            AND playback."playedAt" <= ${end}
            AND playback."userId" = ${ctx.session.user.id}
            AND artist_track."artistId" = ${input.artistId}
          GROUP BY ${groupSql}
          ORDER BY "date" ASC
        `,
        ),
      );
      if (playbacks.error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get artist playbacks",
        });
      }

      const rows = playbacks.data;
      const totalDuration = rows.reduce((acc, r) => acc + r.duration, 0);
      const totalCount = rows.reduce((acc, r) => acc + r.count, 0);

      const byHour = new Map(rows.map((r) => [r.date, r.duration]));
      const byCount = new Map(rows.map((r) => [r.date, r.count]));
      const data = Array.from({ length: 24 }, (_, h) => {
        const key = String(h).padStart(2, "0");
        const duration = byHour.get(key) ?? 0;
        return {
          date: key,
          duration,
          count: byCount.get(key) ?? 0,
          percentage:
            totalDuration > 0 ? (duration / totalDuration) * 100 : 0,
        };
      });

      return { data, totalDuration, totalCount };
    }),
  getAlbumTimeListened: protectedProcedure
    .input(albumPeriodSchema)
    .query(async ({ ctx, input }) => {
      const { start, end, grouping } = getPeriods(
        input.period,
        input.from,
        input.to,
      );

      const groupSql = getSQLGroupingString(
        grouping,
        ctx.session.user.timezone,
      );
      const playbacks = await tryCatch(
        ctx.db.$queryRaw<{ duration: number; date: string }[]>(
          Prisma.sql`
            SELECT
              COALESCE(SUM(playback.duration), 0)::float8 AS duration,
              ${groupSql} AS "date"
            FROM playback
            JOIN track ON playback."trackId" = track."id"
            WHERE playback."playedAt" >= ${start}
              AND playback."playedAt" <= ${end}
              AND playback."userId" = ${ctx.session.user.id}
              AND track."albumId" = ${input.albumId}
            GROUP BY ${groupSql}
            ORDER BY "date" ASC
          `,
        ),
      );
      if (playbacks.error) {
        console.error(playbacks.error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get album playbacks",
        });
      }

      const filledData: { date: string; duration: number }[] = fillUpGrouping(
        grouping,
        playbacks.data,
      );

      return {
        data: filledData,
        grouping,
      };
    }),
  getAlbumTimeDistribution: protectedProcedure
    .input(albumPeriodSchema)
    .query(async ({ ctx, input }) => {
      const { start, end } = getPeriods(input.period, input.from, input.to);
      const groupSql = getSQLGroupingString("hour", ctx.session.user.timezone);
      const playbacks = await tryCatch(
        ctx.db.$queryRaw<{ duration: number; date: string; count: number }[]>(
          Prisma.sql`
          SELECT
            COALESCE(SUM(playback.duration), 0)::float8 AS duration,
            ${groupSql} AS "date",
            COUNT(*)::float8 AS count
          FROM playback
          JOIN track ON playback."trackId" = track."id"
          WHERE playback."playedAt" >= ${start}
            AND playback."playedAt" <= ${end}
            AND playback."userId" = ${ctx.session.user.id}
            AND track."albumId" = ${input.albumId}
          GROUP BY ${groupSql}
          ORDER BY "date" ASC
        `,
        ),
      );
      if (playbacks.error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get album playbacks",
        });
      }

      const rows = playbacks.data;
      const totalDuration = rows.reduce((acc, r) => acc + r.duration, 0);
      const totalCount = rows.reduce((acc, r) => acc + r.count, 0);

      const byHour = new Map(rows.map((r) => [r.date, r.duration]));
      const byCount = new Map(rows.map((r) => [r.date, r.count]));
      const data = Array.from({ length: 24 }, (_, h) => {
        const key = String(h).padStart(2, "0");
        const duration = byHour.get(key) ?? 0;
        return {
          date: key,
          duration,
          count: byCount.get(key) ?? 0,
          percentage:
            totalDuration > 0 ? (duration / totalDuration) * 100 : 0,
        };
      });

      return { data, totalDuration, totalCount };
    }),
  getTrackTimeListened: protectedProcedure
    .input(trackPeriodSchema)
    .query(async ({ ctx, input }) => {
      const { start, end, grouping } = getPeriods(
        input.period,
        input.from,
        input.to,
      );

      const groupSql = getSQLGroupingString(
        grouping,
        ctx.session.user.timezone,
      );
      const playbacks = await tryCatch(
        ctx.db.$queryRaw<{ duration: number; date: string }[]>(
          Prisma.sql`
            SELECT
              COALESCE(SUM(playback.duration), 0)::float8 AS duration,
              ${groupSql} AS "date"
            FROM playback
            WHERE playback."playedAt" >= ${start}
              AND playback."playedAt" <= ${end}
              AND playback."userId" = ${ctx.session.user.id}
              AND playback."trackId" = ${input.trackId}
            GROUP BY ${groupSql}
            ORDER BY "date" ASC
          `,
        ),
      );
      if (playbacks.error) {
        console.error(playbacks.error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get track playbacks",
        });
      }

      const filledData: { date: string; duration: number }[] = fillUpGrouping(
        grouping,
        playbacks.data,
      );

      return {
        data: filledData,
        grouping,
      };
    }),
  getTrackTimeDistribution: protectedProcedure
    .input(trackPeriodSchema)
    .query(async ({ ctx, input }) => {
      const { start, end } = getPeriods(input.period, input.from, input.to);
      const groupSql = getSQLGroupingString("hour", ctx.session.user.timezone);
      const playbacks = await tryCatch(
        ctx.db.$queryRaw<{ duration: number; date: string; count: number }[]>(
          Prisma.sql`
          SELECT
            COALESCE(SUM(playback.duration), 0)::float8 AS duration,
            ${groupSql} AS "date",
            COUNT(*)::float8 AS count
          FROM playback
          WHERE playback."playedAt" >= ${start}
            AND playback."playedAt" <= ${end}
            AND playback."userId" = ${ctx.session.user.id}
            AND playback."trackId" = ${input.trackId}
          GROUP BY ${groupSql}
          ORDER BY "date" ASC
        `,
        ),
      );
      if (playbacks.error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get track playbacks",
        });
      }

      const rows = playbacks.data;
      const totalDuration = rows.reduce((acc, r) => acc + r.duration, 0);
      const totalCount = rows.reduce((acc, r) => acc + r.count, 0);

      const byHour = new Map(rows.map((r) => [r.date, r.duration]));
      const byCount = new Map(rows.map((r) => [r.date, r.count]));
      const data = Array.from({ length: 24 }, (_, h) => {
        const key = String(h).padStart(2, "0");
        const duration = byHour.get(key) ?? 0;
        return {
          date: key,
          duration,
          count: byCount.get(key) ?? 0,
          percentage:
            totalDuration > 0 ? (duration / totalDuration) * 100 : 0,
        };
      });

      return { data, totalDuration, totalCount };
    }),
  getPlatformDistribution: protectedProcedure
    .input(periodSchema)
    .query(async ({ ctx, input }) => {
      const { start, end } = getPeriods(input.period, input.from, input.to);
      const result = await tryCatch(
        ctx.db.$queryRaw<
          { platform: string | null; count: number; duration: number }[]
        >(
          Prisma.sql`
            SELECT
              NULLIF(TRIM(playback."platform"), '') AS "platform",
              COUNT(*)::float8 AS "count",
              COALESCE(SUM(playback."duration"), 0)::float8 AS "duration"
            FROM playback
            WHERE playback."playedAt" >= ${start}
              AND playback."playedAt" <= ${end}
              AND playback."userId" = ${ctx.session.user.id}
            GROUP BY NULLIF(TRIM(playback."platform"), '')
            ORDER BY "count" DESC
          `,
        ),
      );

      if (result.error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get platform distribution",
        });
      }

      return result.data.map((row) => ({
        name: row.platform ?? "Unknown",
        value: row.count,
        duration: row.duration,
      }));
    }),
  getDeviceDistribution: protectedProcedure
    .input(periodSchema)
    .query(async ({ ctx, input }) => {
      const { start, end } = getPeriods(input.period, input.from, input.to);
      const result = await tryCatch(
        ctx.db.$queryRaw<
          { device: string | null; count: number; duration: number }[]
        >(
          Prisma.sql`
            SELECT
              NULLIF(TRIM(playback."device"), '') AS "device",
              COUNT(*)::float8 AS "count",
              COALESCE(SUM(playback."duration"), 0)::float8 AS "duration"
            FROM playback
            WHERE playback."playedAt" >= ${start}
              AND playback."playedAt" <= ${end}
              AND playback."userId" = ${ctx.session.user.id}
            GROUP BY NULLIF(TRIM(playback."device"), '')
            ORDER BY "count" DESC
          `,
        ),
      );

      if (result.error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get device distribution",
        });
      }

      return result.data.map((row) => ({
        name: row.device ?? "Unknown",
        value: row.count,
        duration: row.duration,
      }));
    }),
});
