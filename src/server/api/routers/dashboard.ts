import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";
import z from "zod";
import { periods, type Period } from "@/lib/consts/periods";
import { TRPCError } from "@trpc/server";
import { getPeriods } from "@/lib/periods";
import { tryCatch } from "@/lib/try-catch";
import { Prisma } from "generated/prisma";

export const dashboardRouter = createTRPCRouter({
  getKeyMetrics: protectedProcedure
    .input(
      z.object({
        period: z.enum(Object.keys(periods) as [Period, Period]),
        from: z.date().optional(),
        to: z.date().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { start, end, previousStart } = getPeriods(
        input.period,
        input.from,
        input.to,
      );
      const timezone = ctx.session.user.timezone;
      const userId = ctx.session.user.id;

      const [period, previousPeriod, artists, previousArtists] =
        await Promise.all([
          tryCatch(
            ctx.db.$queryRaw<
              { duration: number | null; tracks: bigint }[]
            >(Prisma.sql`
              SELECT
                SUM(duration)::float8 AS duration,
                COUNT(*)::bigint AS tracks
              FROM playback
              WHERE "userId" = ${userId}
                AND timezone(${timezone}, "playedAt") >= timezone(${timezone}, ${start})
                AND timezone(${timezone}, "playedAt") <= timezone(${timezone}, ${end})
            `),
          ),
          tryCatch(
            ctx.db.$queryRaw<
              { duration: number | null; tracks: bigint }[]
            >(Prisma.sql`
              SELECT
                SUM(duration)::float8 AS duration,
                COUNT(*)::bigint AS tracks
              FROM playback
              WHERE "userId" = ${userId}
                AND timezone(${timezone}, "playedAt") >= timezone(${timezone}, ${previousStart})
                AND timezone(${timezone}, "playedAt") < timezone(${timezone}, ${start})
            `),
          ),
          tryCatch(
            ctx.db.$queryRaw<{ artists: bigint }[]>(Prisma.sql`
              SELECT COUNT(DISTINCT "artistId")::bigint AS artists
              FROM playback
              WHERE "userId" = ${userId}
                AND timezone(${timezone}, "playedAt") >= timezone(${timezone}, ${start})
                AND timezone(${timezone}, "playedAt") <= timezone(${timezone}, ${end})
            `),
          ),
          tryCatch(
            ctx.db.$queryRaw<{ artists: bigint }[]>(Prisma.sql`
              SELECT COUNT(DISTINCT "artistId")::bigint AS artists
              FROM playback
              WHERE "userId" = ${userId}
                AND timezone(${timezone}, "playedAt") >= timezone(${timezone}, ${previousStart})
                AND timezone(${timezone}, "playedAt") < timezone(${timezone}, ${start})
            `),
          ),
        ]);
      if (period.error || previousPeriod.error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get tracks listened",
        });
      }
      const currentMetrics = period.data?.[0];
      const previousMetrics = previousPeriod.data?.[0];
      const currentArtists = artists.data?.[0];
      const previousArtistsMetrics = previousArtists.data?.[0];
      return {
        duration: currentMetrics?.duration ?? 0,
        tracks: Number(currentMetrics?.tracks ?? 0n),
        previousDuration: previousMetrics?.duration ?? 0,
        previousTracks: Number(previousMetrics?.tracks ?? 0n),
        artists: Number(currentArtists?.artists ?? 0n),
        previousArtists: Number(previousArtistsMetrics?.artists ?? 0n),
      };
    }),
  getTopTrack: protectedProcedure
    .input(
      z.object({
        period: z.enum(Object.keys(periods) as [Period, string]),
        from: z.date().optional(),
        to: z.date().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { start, end } = getPeriods(
        input.period as Period,
        input.from,
        input.to,
      );
      const timezone = ctx.session.user.timezone;
      const userId = ctx.session.user.id;
      const topTrack = await tryCatch(
        ctx.db.$queryRaw<{ trackId: string; duration: number; tracks: bigint }[]>(
          Prisma.sql`
            SELECT
              "trackId",
              SUM(duration)::float8 AS duration,
              COUNT(*)::bigint AS tracks
            FROM playback
            WHERE "userId" = ${userId}
              AND timezone(${timezone}, "playedAt") >= timezone(${timezone}, ${start})
              AND timezone(${timezone}, "playedAt") <= timezone(${timezone}, ${end})
            GROUP BY "trackId"
            ORDER BY SUM(duration) DESC
            LIMIT 1
          `,
        ),
      );
      if (topTrack.error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get top track",
        });
      }
      const track = await tryCatch(
        ctx.db.track.findUnique({
          where: {
            id: topTrack.data?.[0]?.trackId,
          },
        }),
      );
      if (track.error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get track",
        });
      }
      return {
        track: track.data,
        duration: topTrack.data?.[0]?.duration ?? 0,
        tracks: Number(topTrack.data?.[0]?.tracks ?? 0n),
      };
    }),
  getTopArtist: protectedProcedure
    .input(
      z.object({
        period: z.enum(Object.keys(periods) as [Period, string]),
        from: z.date().optional(),
        to: z.date().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { start, end } = getPeriods(
        input.period as Period,
        input.from,
        input.to,
      );
      const timezone = ctx.session.user.timezone;
      const userId = ctx.session.user.id;
      const groupResult = await tryCatch(
        ctx.db.$queryRaw<{ artistId: string; tracks: bigint; duration: number }[]>(
          Prisma.sql`
            SELECT
              "artistId",
              COUNT(*)::bigint AS tracks,
              SUM(duration)::float8 AS duration
            FROM playback
            WHERE "userId" = ${userId}
              AND timezone(${timezone}, "playedAt") >= timezone(${timezone}, ${start})
              AND timezone(${timezone}, "playedAt") <= timezone(${timezone}, ${end})
            GROUP BY "artistId"
            ORDER BY SUM(duration) DESC
            LIMIT 1
          `,
        ),
      );
      if (groupResult.error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to group playbacks",
        });
      }
      const topTrackGroup = await tryCatch(
        ctx.db.$queryRaw<{ differentTracks: bigint }[]>(Prisma.sql`
          SELECT COUNT(DISTINCT "trackId")::bigint AS "differentTracks"
          FROM playback
          WHERE "userId" = ${userId}
            AND "artistId" = ${groupResult.data?.[0]?.artistId ?? ""}
            AND timezone(${timezone}, "playedAt") >= timezone(${timezone}, ${start})
            AND timezone(${timezone}, "playedAt") <= timezone(${timezone}, ${end})
        `),
      );
      if (topTrackGroup.error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to group playbacks",
        });
      }
      const artist = await tryCatch(
        ctx.db.artist.findFirst({
          where: {
            spotifyId: groupResult.data?.[0]?.artistId,
          },
        }),
      );
      if (artist.error || !artist.data) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get artist for top track",
        });
      }
      return {
        artist: {
          ...artist.data,
        },
        differentTracks: Number(topTrackGroup.data?.[0]?.differentTracks ?? 0n),
        tracks: Number(groupResult.data?.[0]?.tracks ?? 0n),
        duration: groupResult.data?.[0]?.duration ?? 0,
      };
    }),
});
