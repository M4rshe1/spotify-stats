import { createTRPCRouter, protectedProcedure } from "../trpc";
import type { PeriodGrouping } from "@/lib/consts/periods";
import { getPeriods } from "@/lib/periods";
import { periodSchema } from "@/server/api/lib";
import { tryCatch } from "@/lib/try-catch";
import { TRPCError } from "@trpc/server";
import { Prisma } from "generated/prisma";

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

      let filledData: { date: string; duration: number }[] = playbacks.data;

      if (grouping === "hour") {
        const lowestHour = Math.min(
          ...playbacks.data.map((r) => parseInt(r.date, 10)),
        );
        const highestHour = Math.max(
          ...playbacks.data.map((r) => parseInt(r.date, 10)),
        );
        const hours = Array.from(
          { length: highestHour - lowestHour + 1 },
          (_, i) => String(lowestHour + i).padStart(2, "0"),
        );
        filledData = hours.map((hour) => {
          const result = playbacks.data.find((r) => r.date === hour);
          return { date: hour, duration: result?.duration ?? 0 };
        });
      }

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
});
