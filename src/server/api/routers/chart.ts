import { createTRPCRouter, protectedProcedure } from "../trpc";
import type { PeriodGrouping } from "@/lib/consts/periods";
import { getPeriods } from "@/lib/periods";
import { periodSchema } from "@/server/api/lib";
import { tryCatch } from "@/lib/try-catch";
import { TRPCError } from "@trpc/server";
import { Prisma } from "generated/prisma";

function getSQLGroupingString(grouping: PeriodGrouping) {
  switch (grouping) {
    case "hour":
      return `TO_CHAR("playedAt", 'HH24')`;
    case "day":
      return `TO_CHAR("playedAt", 'YYYY-MM-DD')`;
    case "month":
      return `TO_CHAR("playedAt", 'YYYY-MM')`;
    case "year":
      return `TO_CHAR("playedAt", 'YYYY')`;
    default:
      return `DATE_TRUNC('hour', "playedAt")`;
  }
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

      const groupSql = Prisma.raw(getSQLGroupingString(grouping));

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
      console.log(JSON.stringify(playbacks.data, null, 2));
      if (playbacks.error) {
        console.error(playbacks.error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get playbacks",
        });
      }

      return {
        data: playbacks.data,
        grouping,
      };
    }),
  getTimeDistribution: protectedProcedure
    .input(periodSchema)
    .query(async ({ ctx, input }) => {
      const { start, end } = getPeriods(input.period, input.from, input.to);
      const playbacks = await tryCatch(
        ctx.db.$queryRaw`
        SELECT 
          COALESCE(SUM(duration), 0)::float8 AS duration,
          TO_CHAR("playedAt", 'HH24') AS "date"
        FROM playback
        WHERE "playedAt" >= ${start} AND "playedAt" <= ${end}
          AND "userId" = ${ctx.session.user.id}
        GROUP BY TO_CHAR("playedAt", 'HH24')
        ORDER BY "date"
      `,
      );
      if (playbacks.error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get playbacks",
        });
      }

      const rows = playbacks.data as { duration: number; date: string }[];

      const byHour = new Map(rows.map((r) => [r.date, r.duration]));
      const data = Array.from({ length: 24 }, (_, h) => {
        const key = String(h).padStart(2, "0");
        return { date: key, duration: byHour.get(key) ?? 0 };
      });

      return { data };
    }),
});
