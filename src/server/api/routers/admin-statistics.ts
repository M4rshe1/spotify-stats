import { TRPCError } from "@trpc/server";
import { Prisma, type PrismaClient } from "generated/prisma";
import { z } from "zod";

import { getPeriods } from "@/lib/periods";
import { tryCatch } from "@/lib/try-catch";
import { periodSchema, rowToArtists } from "../lib";
import {
  getSelectedPeriodSql,
  getTrackArtistsLateralSql,
} from "../sql-snippets";
import type { TopTrackRow } from "../types/sql-rows";
import { adminProcedure, createTRPCRouter } from "../trpc";

const rankedSchema = periodSchema.extend({
  limit: z.number().int().min(1).max(20).default(10),
});

type PlaybackTotals = {
  plays: number;
  duration: number;
  listeners: number;
};

async function playbackTotals(
  db: PrismaClient,
  timezone: string,
  start: Date | null,
  end: Date | null,
) {
  const result = await tryCatch(
    db.$queryRaw<PlaybackTotals[]>(Prisma.sql`
      SELECT
        COUNT(*)::float8 AS plays,
        COALESCE(SUM(playback."duration"), 0)::float8 AS duration,
        COUNT(DISTINCT playback."userId")::float8 AS listeners
      FROM playback
      WHERE ${getSelectedPeriodSql(timezone, start, end)}
    `),
  );
  if (result.error) {
    console.error(result.error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to get listening totals",
    });
  }
  return (
    result.data[0] ?? {
      plays: 0,
      duration: 0,
      listeners: 0,
    }
  );
}

export const adminStatisticsRouter = createTRPCRouter({
  getOverview: adminProcedure
    .input(periodSchema)
    .query(async ({ ctx, input }) => {
      const { start, end, previousStart } = getPeriods(
        input.period,
        input.from,
        input.to,
      );
      const timezone = ctx.session.user.timezone;
      const [accounts, current, previous] = await Promise.all([
        ctx.db.user.count(),
        playbackTotals(ctx.db, timezone, start, end),
        playbackTotals(ctx.db, timezone, previousStart, start),
      ]);

      return {
        accounts,
        listeners: current.listeners,
        previousListeners: previous.listeners,
        plays: current.plays,
        previousPlays: previous.plays,
        duration: current.duration,
        previousDuration: previous.duration,
      };
    }),

  getListeningByUser: adminProcedure
    .input(periodSchema)
    .query(async ({ ctx, input }) => {
      const { start, end } = getPeriods(input.period, input.from, input.to);
      const timezone = ctx.session.user.timezone;
      const result = await tryCatch(
        ctx.db.$queryRaw<
          {
            id: string;
            name: string;
            email: string;
            image: string | null;
            banned: boolean | null;
            count: number;
            duration: number;
          }[]
        >(Prisma.sql`
          SELECT
            u."id" AS id,
            u."name" AS name,
            u."email" AS email,
            u."image" AS image,
            u."banned" AS banned,
            COUNT(playback."id")::float8 AS count,
            COALESCE(SUM(playback."duration"), 0)::float8 AS duration
          FROM "user" u
          LEFT JOIN playback ON playback."userId" = u."id"
            AND ${getSelectedPeriodSql(timezone, start, end)}
          GROUP BY u."id", u."name", u."email", u."image", u."banned"
          ORDER BY duration DESC, count DESC, u."name" ASC
        `),
      );

      if (result.error) {
        console.error(result.error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get listening by user",
        });
      }

      return result.data;
    }),

  getTopTracks: adminProcedure
    .input(rankedSchema)
    .query(async ({ ctx, input }) => {
      const { start, end } = getPeriods(input.period, input.from, input.to);
      const timezone = ctx.session.user.timezone;
      const totals = await playbackTotals(ctx.db, timezone, start, end);
      const rows = await tryCatch(
        ctx.db.$queryRaw<TopTrackRow[]>(Prisma.sql`
          WITH ranked AS (
            SELECT
              track."id",
              track."name",
              track."image",
              SUM(playback."duration")::float8 AS duration,
              COUNT(*)::float8 AS count
            FROM playback
            JOIN track ON playback."trackId" = track."id"
            WHERE ${getSelectedPeriodSql(timezone, start, end)}
            GROUP BY track."id", track."name", track."image"
            ORDER BY SUM(playback."duration") DESC, track."id" ASC
            LIMIT ${input.limit}
          )
          SELECT
            ranked."id",
            ranked."name",
            ranked."image",
            ranked."duration",
            ranked."count",
            artists."names" AS "artistNames",
            artists."ids" AS "artistIds",
            artists."roles" AS "artistRoles"
          FROM ranked
          ${getTrackArtistsLateralSql(Prisma.sql`ranked."id"`)}
          ORDER BY ranked."duration" DESC, ranked."id" ASC
        `),
      );

      if (rows.error) {
        console.error(rows.error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get top tracks",
        });
      }

      return {
        items: rows.data.map((row) => ({
          id: row.id,
          name: row.name,
          image: row.image,
          artists: rowToArtists(row),
          duration: row.duration,
          count: row.count,
        })),
        totalCount: totals.plays,
        totalDuration: totals.duration,
      };
    }),

  getTopArtists: adminProcedure
    .input(rankedSchema)
    .query(async ({ ctx, input }) => {
      const { start, end } = getPeriods(input.period, input.from, input.to);
      const timezone = ctx.session.user.timezone;
      const periodSql = getSelectedPeriodSql(timezone, start, end);
      const totals = await tryCatch(
        ctx.db.$queryRaw<{ totalCount: number; totalDuration: number }[]>(
          Prisma.sql`
            SELECT
              COUNT(*)::float8 AS "totalCount",
              COALESCE(SUM(playback."duration"), 0)::float8 AS "totalDuration"
            FROM playback
            JOIN track ON playback."trackId" = track."id"
            JOIN artist_track ON track."id" = artist_track."trackId"
              AND artist_track."role" = 'primary'
            WHERE ${periodSql}
          `,
        ),
      );
      if (totals.error) {
        console.error(totals.error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get top artist totals",
        });
      }

      const rows = await tryCatch(
        ctx.db.$queryRaw<
          {
            id: number;
            name: string;
            image: string | null;
            duration: number;
            count: number;
          }[]
        >(Prisma.sql`
          SELECT
            artist."id",
            artist."name",
            artist."image",
            SUM(playback."duration")::float8 AS duration,
            COUNT(*)::float8 AS count
          FROM playback
          JOIN track ON playback."trackId" = track."id"
          JOIN artist_track ON track."id" = artist_track."trackId"
            AND artist_track."role" = 'primary'
          JOIN artist ON artist_track."artistId" = artist."id"
          WHERE ${periodSql}
          GROUP BY artist."id", artist."name", artist."image"
          ORDER BY SUM(playback."duration") DESC, artist."id" ASC
          LIMIT ${input.limit}
        `),
      );

      if (rows.error) {
        console.error(rows.error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get top artists",
        });
      }

      const total = totals.data[0] ?? { totalCount: 0, totalDuration: 0 };
      return {
        items: rows.data.map((row) => ({
          id: row.id,
          name: row.name,
          image: row.image,
          duration: row.duration,
          count: row.count,
        })),
        totalCount: total.totalCount,
        totalDuration: total.totalDuration,
      };
    }),
});
