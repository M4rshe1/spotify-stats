import { createTRPCRouter, protectedProcedure } from "../trpc";
import type { PeriodGrouping } from "@/lib/consts/periods";
import { getPeriods } from "@/lib/periods";
import { periodSchema } from "@/server/api/lib";
import { getSelectedPeriodSql } from "@/server/api/sql-snippets";
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

const DAY_OF_WEEK_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const TRACK_LENGTH_BUCKETS = [
  "Under 2 min",
  "2–4 min",
  "4–6 min",
  "6+ min",
] as const;

type DistributionRow = {
  name: string;
  count: number;
  duration: number;
};

function toDistributionResponse(rows: DistributionRow[]) {
  return rows.map((row) => ({
    name: row.name,
    value: row.count,
    duration: row.duration,
  }));
}

function collapseTopDistribution(
  rows: DistributionRow[],
  limit: number,
  otherLabel = "Other",
) {
  const sorted = [...rows].sort((a, b) => b.duration - a.duration);
  if (sorted.length <= limit) return sorted;
  const top = sorted.slice(0, limit);
  const rest = sorted.slice(limit);
  top.push({
    name: otherLabel,
    count: rest.reduce((sum, row) => sum + row.count, 0),
    duration: rest.reduce((sum, row) => sum + row.duration, 0),
  });
  return top;
}

function orderDistributionRows(
  rows: DistributionRow[],
  order: readonly string[],
) {
  const byName = new Map(rows.map((row) => [row.name, row]));
  return order
    .map((name) => byName.get(name))
    .filter((row): row is DistributionRow => row != null);
}

function getTrackReleaseYearJoinSql() {
  return Prisma.sql`
    LEFT JOIN album ON track."albumId" = album."id"
    LEFT JOIN LATERAL (
      SELECT
        CASE
          WHEN album."releaseDate" ~ '^[0-9]{4}'
            THEN SUBSTRING(album."releaseDate" FROM 1 FOR 4)::int
          WHEN track."releaseDate" ~ '^[0-9]{4}'
            THEN SUBSTRING(track."releaseDate" FROM 1 FOR 4)::int
          ELSE NULL
        END AS year
    ) AS release_year ON TRUE
  `;
}

type TimeListenedPrismaRow = {
  duration: number;
  date: string;
  count: number;
};

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
  data: { date: string; duration: number; count: number }[],
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
        count: result?.count ?? 0,
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
      return {
        date: day,
        duration: result?.duration ?? 0,
        count: result?.count ?? 0,
      };
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
      return {
        date: month,
        duration: result?.duration ?? 0,
        count: result?.count ?? 0,
      };
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
      return {
        date: year,
        duration: result?.duration ?? 0,
        count: result?.count ?? 0,
      };
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

const playlistPeriodSchema = periodSchema.extend({
  playlistId: z.number(),
});

const trackPeriodSchema = periodSchema.extend({
  trackId: z.number(),
});

const genrePeriodSchema = periodSchema.extend({
  genreId: z.number(),
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
        ctx.db.$queryRaw<TimeListenedPrismaRow[]>(
          Prisma.sql`
            SELECT 
              COALESCE(SUM(duration), 0)::float8 AS duration, 
              COUNT(*)::float8 AS count,
              ${groupSql} as "date"
            FROM playback
            WHERE ${getSelectedPeriodSql(ctx.session.user.timezone, start, end)}
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

      const filledData: TimeListenedPrismaRow[] = fillUpGrouping(
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
        ctx.db.$queryRaw<TimeListenedPrismaRow[]>(
          Prisma.sql`
            SELECT 
              COALESCE(SUM(playback.duration), 0)::float8 AS duration, 
              ${groupSql} AS "date"
            FROM playback
            JOIN track ON playback."trackId" = track."id"
            JOIN artist_track ON track."id" = artist_track."trackId"
              AND artist_track."role" = 'primary'
            WHERE ${getSelectedPeriodSql(ctx.session.user.timezone, start, end)}
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

      const filledData: TimeListenedPrismaRow[] = fillUpGrouping(
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
        ctx.db.$queryRaw<TimeListenedPrismaRow[]>(
          Prisma.sql`
          SELECT
            COALESCE(SUM(duration), 0)::float8 AS duration,
            ${groupSql} AS "date",
            COUNT(*)::float8 AS count
          FROM playback
          WHERE ${getSelectedPeriodSql(ctx.session.user.timezone, start, end)}
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

      const rows = playbacks.data;
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
        ctx.db.$queryRaw<TimeListenedPrismaRow[]>(
          Prisma.sql`
          SELECT
            COALESCE(SUM(playback.duration), 0)::float8 AS duration,
            ${groupSql} AS "date",
            COUNT(*)::float8 AS count
          FROM playback
          JOIN track ON playback."trackId" = track."id"
          JOIN artist_track ON track."id" = artist_track."trackId"
            AND artist_track."role" = 'primary'
          WHERE ${getSelectedPeriodSql(ctx.session.user.timezone, start, end)}
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
          percentage: totalDuration > 0 ? (duration / totalDuration) * 100 : 0,
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
        ctx.db.$queryRaw<TimeListenedPrismaRow[]>(
          Prisma.sql`
            SELECT
              COALESCE(SUM(playback.duration), 0)::float8 AS duration,
              COUNT(*)::float8 AS count,
              ${groupSql} AS "date"
            FROM playback
            JOIN track ON playback."trackId" = track."id"
            WHERE ${getSelectedPeriodSql(ctx.session.user.timezone, start, end)}
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

      const filledData: TimeListenedPrismaRow[] = fillUpGrouping(
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
        ctx.db.$queryRaw<TimeListenedPrismaRow[]>(
          Prisma.sql`
          SELECT
            COALESCE(SUM(playback.duration), 0)::float8 AS duration,
            ${groupSql} AS "date",
            COUNT(*)::float8 AS count
          FROM playback
          JOIN track ON playback."trackId" = track."id"
          WHERE ${getSelectedPeriodSql(ctx.session.user.timezone, start, end)}
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
          percentage: totalDuration > 0 ? (duration / totalDuration) * 100 : 0,
        };
      });

      return { data, totalDuration, totalCount };
    }),
  getPlaylistTimeListened: protectedProcedure
    .input(playlistPeriodSchema)
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
        ctx.db.$queryRaw<TimeListenedPrismaRow[]>(
          Prisma.sql`
            SELECT
              COALESCE(SUM(playback.duration), 0)::float8 AS duration,
              COUNT(*)::float8 AS count,
              ${groupSql} AS "date"
            FROM playback
            JOIN track ON playback."trackId" = track."id"
            JOIN playlist ON playback."contextId" = playlist."spotifyId"
              AND playback."context" IN ('playlist', 'collection')
            WHERE ${getSelectedPeriodSql(ctx.session.user.timezone, start, end)}
              AND playback."userId" = ${ctx.session.user.id}
              AND playlist."id" = ${input.playlistId}
            GROUP BY ${groupSql}
            ORDER BY "date" ASC
          `,
        ),
      );
      if (playbacks.error) {
        console.error(playbacks.error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get playlist playbacks",
        });
      }

      const filledData: TimeListenedPrismaRow[] = fillUpGrouping(
        grouping,
        playbacks.data,
      );

      return {
        data: filledData,
        grouping,
      };
    }),
  getPlaylistTimeDistribution: protectedProcedure
    .input(playlistPeriodSchema)
    .query(async ({ ctx, input }) => {
      const { start, end } = getPeriods(input.period, input.from, input.to);
      const groupSql = getSQLGroupingString("hour", ctx.session.user.timezone);
      const playbacks = await tryCatch(
        ctx.db.$queryRaw<TimeListenedPrismaRow[]>(
          Prisma.sql`
          SELECT
            COALESCE(SUM(playback.duration), 0)::float8 AS duration,
            ${groupSql} AS "date",
            COUNT(*)::float8 AS count
          FROM playback
          JOIN track ON playback."trackId" = track."id"
          JOIN playlist ON playback."contextId" = playlist."spotifyId"
            AND playback."context" IN ('playlist', 'collection')
          WHERE ${getSelectedPeriodSql(ctx.session.user.timezone, start, end)}
            AND playback."userId" = ${ctx.session.user.id}
            AND playlist."id" = ${input.playlistId}
          GROUP BY ${groupSql}
          ORDER BY "date" ASC
        `,
        ),
      );
      if (playbacks.error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get playlist playbacks",
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
          percentage: totalDuration > 0 ? (duration / totalDuration) * 100 : 0,
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
        ctx.db.$queryRaw<TimeListenedPrismaRow[]>(
          Prisma.sql`
            SELECT
              COALESCE(SUM(playback.duration), 0)::float8 AS duration,
              COUNT(*)::float8 AS count,
              ${groupSql} AS "date"
            FROM playback
            WHERE ${getSelectedPeriodSql(ctx.session.user.timezone, start, end)}
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

      const filledData: TimeListenedPrismaRow[] = fillUpGrouping(
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
        ctx.db.$queryRaw<TimeListenedPrismaRow[]>(
          Prisma.sql`
          SELECT
            COALESCE(SUM(playback.duration), 0)::float8 AS duration,
            ${groupSql} AS "date",
            COUNT(*)::float8 AS count
          FROM playback
          WHERE ${getSelectedPeriodSql(ctx.session.user.timezone, start, end)}
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
          percentage: totalDuration > 0 ? (duration / totalDuration) * 100 : 0,
        };
      });

      return { data, totalDuration, totalCount };
    }),
  getGenreTimeListened: protectedProcedure
    .input(genrePeriodSchema)
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
        ctx.db.$queryRaw<TimeListenedPrismaRow[]>(
          Prisma.sql`
            SELECT
              COALESCE(SUM(playback.duration), 0)::float8 AS duration,
              ${groupSql} AS "date"
            FROM playback
            JOIN track ON playback."trackId" = track."id"
            JOIN artist_track ON track."id" = artist_track."trackId"
              AND artist_track."role" = 'primary'
            JOIN artist_genre ON artist_genre."artistId" = artist_track."artistId"
              AND artist_genre."genreId" = ${input.genreId}
            WHERE ${getSelectedPeriodSql(ctx.session.user.timezone, start, end)}
              AND playback."userId" = ${ctx.session.user.id}
            GROUP BY ${groupSql}
            ORDER BY "date" ASC
          `,
        ),
      );
      if (playbacks.error) {
        console.error(playbacks.error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get genre playbacks",
        });
      }

      const filledData: TimeListenedPrismaRow[] = fillUpGrouping(
        grouping,
        playbacks.data,
      );

      return {
        data: filledData,
        grouping,
      };
    }),
  getGenreTimeDistribution: protectedProcedure
    .input(genrePeriodSchema)
    .query(async ({ ctx, input }) => {
      const { start, end } = getPeriods(input.period, input.from, input.to);
      const groupSql = getSQLGroupingString("hour", ctx.session.user.timezone);
      const playbacks = await tryCatch(
        ctx.db.$queryRaw<TimeListenedPrismaRow[]>(
          Prisma.sql`
          SELECT
            COALESCE(SUM(playback.duration), 0)::float8 AS duration,
            ${groupSql} AS "date",
            COUNT(*)::float8 AS count
          FROM playback
          JOIN track ON playback."trackId" = track."id"
          JOIN artist_track ON track."id" = artist_track."trackId"
            AND artist_track."role" = 'primary'
          JOIN artist_genre ON artist_genre."artistId" = artist_track."artistId"
            AND artist_genre."genreId" = ${input.genreId}
          WHERE ${getSelectedPeriodSql(ctx.session.user.timezone, start, end)}
            AND playback."userId" = ${ctx.session.user.id}
          GROUP BY ${groupSql}
          ORDER BY "date" ASC
        `,
        ),
      );
      if (playbacks.error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get genre playbacks",
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
          percentage: totalDuration > 0 ? (duration / totalDuration) * 100 : 0,
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
            WHERE ${getSelectedPeriodSql(ctx.session.user.timezone, start, end)}
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
            WHERE ${getSelectedPeriodSql(ctx.session.user.timezone, start, end)}
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
  getContextDistribution: protectedProcedure
    .input(periodSchema)
    .query(async ({ ctx, input }) => {
      const { start, end } = getPeriods(input.period, input.from, input.to);
      const result = await tryCatch(
        ctx.db.$queryRaw<
          { context: string | null; count: number; duration: number }[]
        >(
          Prisma.sql`
            SELECT
              NULLIF(TRIM(playback."context"), '') AS "context",
              COUNT(*)::float8 AS "count",
              COALESCE(SUM(playback."duration"), 0)::float8 AS "duration"
            FROM playback
            WHERE ${getSelectedPeriodSql(ctx.session.user.timezone, start, end)}
              AND playback."userId" = ${ctx.session.user.id}
            GROUP BY NULLIF(TRIM(playback."context"), '')
            ORDER BY "count" DESC
          `,
        ),
      );

      if (result.error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get context distribution",
        });
      }

      return result.data.map((row) => ({
        name: row.context ?? "Unknown",
        value: row.count,
        duration: row.duration,
      }));
    }),
  getArtistCountDistribution: protectedProcedure
    .input(periodSchema)
    .query(async ({ ctx, input }) => {
      const { start, end } = getPeriods(input.period, input.from, input.to);
      const result = await tryCatch(
        ctx.db.$queryRaw<
          { artists: number; count: number; duration: number }[]
        >(
          Prisma.sql`
            SELECT
              sub."count" AS artists,
              COUNT(sub."count")::float8 AS count,
              SUM(sub."duration")::float8 AS "duration"
            FROM (
              SELECT
                COUNT(*)::int AS "count",
                COALESCE(SUM(playback."duration"), 0)::float8 AS "duration"
              FROM playback
              JOIN track ON track."id" = playback."trackId"
              JOIN artist_track ON artist_track."trackId" = track."id"
              WHERE ${getSelectedPeriodSql(ctx.session.user.timezone, start, end)}
                AND playback."userId" = ${ctx.session.user.id}
              GROUP BY playback."id"
            ) AS sub
            GROUP BY sub."count"
            ORDER BY sub."count" DESC
          `,
        ),
      );

      if (result.error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get context distribution",
        });
      }

      return result.data.map((row) => ({
        name: `${row.artists} ${row.artists > 1 ? "Artists" : "Artist"}`,
        value: row.count,
        duration: row.duration,
      }));
    }),
  getDayOfWeekDistribution: protectedProcedure
    .input(periodSchema)
    .query(async ({ ctx, input }) => {
      const { start, end } = getPeriods(input.period, input.from, input.to);
      const timezone = ctx.session.user.timezone;
      const playedAt = Prisma.raw(getSQLPlayedAt(timezone));
      const result = await tryCatch(
        ctx.db.$queryRaw<
          { day: number; count: number; duration: number }[]
        >(
          Prisma.sql`
            SELECT
              EXTRACT(ISODOW FROM ${playedAt})::int AS day,
              COUNT(*)::float8 AS count,
              COALESCE(SUM(playback."duration"), 0)::float8 AS duration
            FROM playback
            WHERE ${getSelectedPeriodSql(timezone, start, end)}
              AND playback."userId" = ${ctx.session.user.id}
            GROUP BY EXTRACT(ISODOW FROM ${playedAt})::int
            ORDER BY day ASC
          `,
        ),
      );

      if (result.error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get day of week distribution",
        });
      }

      const rows = result.data;
      const totalDuration = rows.reduce((acc, row) => acc + row.duration, 0);
      const totalCount = rows.reduce((acc, row) => acc + row.count, 0);
      const byDay = new Map(rows.map((row) => [row.day, row]));

      const data = DAY_OF_WEEK_LABELS.map((label, index) => {
        const day = index + 1;
        const row = byDay.get(day);
        const duration = row?.duration ?? 0;
        return {
          date: label,
          duration,
          count: row?.count ?? 0,
          percentage: totalDuration > 0 ? (duration / totalDuration) * 100 : 0,
        };
      });

      return { data, totalDuration, totalCount };
    }),
  getGenreDistribution: protectedProcedure
    .input(periodSchema)
    .query(async ({ ctx, input }) => {
      const { start, end } = getPeriods(input.period, input.from, input.to);
      const result = await tryCatch(
        ctx.db.$queryRaw<DistributionRow[]>(
          Prisma.sql`
            SELECT
              genre."name" AS name,
              COUNT(*)::float8 AS count,
              COALESCE(SUM(playback."duration"), 0)::float8 AS duration
            FROM playback
            JOIN track ON playback."trackId" = track."id"
            JOIN artist_track ON track."id" = artist_track."trackId"
              AND artist_track."role" = 'primary'
            JOIN artist_genre ON artist_genre."artistId" = artist_track."artistId"
            JOIN genre ON genre."id" = artist_genre."genreId"
            WHERE ${getSelectedPeriodSql(ctx.session.user.timezone, start, end)}
              AND playback."userId" = ${ctx.session.user.id}
            GROUP BY genre."id", genre."name"
            ORDER BY duration DESC
          `,
        ),
      );

      if (result.error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get genre distribution",
        });
      }

      return toDistributionResponse(
        collapseTopDistribution(result.data, 8),
      );
    }),
  getExplicitDistribution: protectedProcedure
    .input(periodSchema)
    .query(async ({ ctx, input }) => {
      const { start, end } = getPeriods(input.period, input.from, input.to);
      const result = await tryCatch(
        ctx.db.$queryRaw<DistributionRow[]>(
          Prisma.sql`
            SELECT
              CASE
                WHEN track."explicit" THEN 'Explicit'
                ELSE 'Clean'
              END AS name,
              COUNT(*)::float8 AS count,
              COALESCE(SUM(playback."duration"), 0)::float8 AS duration
            FROM playback
            JOIN track ON playback."trackId" = track."id"
            WHERE ${getSelectedPeriodSql(ctx.session.user.timezone, start, end)}
              AND playback."userId" = ${ctx.session.user.id}
            GROUP BY track."explicit"
            ORDER BY duration DESC
          `,
        ),
      );

      if (result.error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get explicit distribution",
        });
      }

      return toDistributionResponse(
        orderDistributionRows(result.data, ["Clean", "Explicit"]),
      );
    }),
  getTrackLengthDistribution: protectedProcedure
    .input(periodSchema)
    .query(async ({ ctx, input }) => {
      const { start, end } = getPeriods(input.period, input.from, input.to);
      const result = await tryCatch(
        ctx.db.$queryRaw<DistributionRow[]>(
          Prisma.sql`
            SELECT
              CASE
                WHEN track."duration" < 120000 THEN 'Under 2 min'
                WHEN track."duration" < 240000 THEN '2–4 min'
                WHEN track."duration" < 360000 THEN '4–6 min'
                ELSE '6+ min'
              END AS name,
              COUNT(*)::float8 AS count,
              COALESCE(SUM(playback."duration"), 0)::float8 AS duration
            FROM playback
            JOIN track ON playback."trackId" = track."id"
            WHERE ${getSelectedPeriodSql(ctx.session.user.timezone, start, end)}
              AND playback."userId" = ${ctx.session.user.id}
            GROUP BY
              CASE
                WHEN track."duration" < 120000 THEN 'Under 2 min'
                WHEN track."duration" < 240000 THEN '2–4 min'
                WHEN track."duration" < 360000 THEN '4–6 min'
                ELSE '6+ min'
              END
          `,
        ),
      );

      if (result.error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get track length distribution",
        });
      }

      return toDistributionResponse(
        orderDistributionRows(result.data, TRACK_LENGTH_BUCKETS),
      );
    }),
  getReleaseDecadeDistribution: protectedProcedure
    .input(periodSchema)
    .query(async ({ ctx, input }) => {
      const { start, end } = getPeriods(input.period, input.from, input.to);
      const result = await tryCatch(
        ctx.db.$queryRaw<DistributionRow[]>(
          Prisma.sql`
            SELECT
              CASE
                WHEN release_year.year IS NULL THEN 'Unknown'
                ELSE CONCAT(((release_year.year / 10) * 10)::text, 's')
              END AS name,
              COUNT(*)::float8 AS count,
              COALESCE(SUM(playback."duration"), 0)::float8 AS duration
            FROM playback
            JOIN track ON playback."trackId" = track."id"
            ${getTrackReleaseYearJoinSql()}
            WHERE ${getSelectedPeriodSql(ctx.session.user.timezone, start, end)}
              AND playback."userId" = ${ctx.session.user.id}
            GROUP BY
              CASE
                WHEN release_year.year IS NULL THEN 'Unknown'
                ELSE CONCAT(((release_year.year / 10) * 10)::text, 's')
              END
            ORDER BY duration DESC
          `,
        ),
      );

      if (result.error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get release decade distribution",
        });
      }

      const known = result.data
        .filter((row) => row.name !== "Unknown")
        .sort((a, b) => a.name.localeCompare(b.name));
      const unknown = result.data.filter((row) => row.name === "Unknown");

      return toDistributionResponse([...known, ...unknown]);
    }),
  getReleaseYearDistribution: protectedProcedure
    .input(periodSchema)
    .query(async ({ ctx, input }) => {
      const { start, end } = getPeriods(input.period, input.from, input.to);
      const result = await tryCatch(
        ctx.db.$queryRaw<
          { year: number; count: number; duration: number }[]
        >(
          Prisma.sql`
            SELECT
              release_year.year AS year,
              COUNT(*)::float8 AS count,
              COALESCE(SUM(playback."duration"), 0)::float8 AS duration
            FROM playback
            JOIN track ON playback."trackId" = track."id"
            ${getTrackReleaseYearJoinSql()}
            WHERE ${getSelectedPeriodSql(ctx.session.user.timezone, start, end)}
              AND playback."userId" = ${ctx.session.user.id}
              AND release_year.year IS NOT NULL
            GROUP BY release_year.year
            ORDER BY release_year.year ASC
          `,
        ),
      );

      if (result.error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get release year distribution",
        });
      }

      const rows = result.data;
      const totalDuration = rows.reduce((acc, row) => acc + row.duration, 0);
      const totalCount = rows.reduce((acc, row) => acc + row.count, 0);

      const data = rows.map((row) => ({
        year: String(row.year),
        duration: row.duration,
        count: row.count,
        percentage:
          totalDuration > 0 ? (row.duration / totalDuration) * 100 : 0,
      }));

      return { data, totalDuration, totalCount };
    }),
});
