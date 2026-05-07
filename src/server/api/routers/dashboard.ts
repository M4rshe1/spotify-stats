import { createTRPCRouter, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { getPeriods } from "@/lib/periods";
import { tryCatch } from "@/lib/try-catch";
import { Prisma } from "generated/prisma";
import { periodSchema } from "@/server/api/lib";

export const dashboardRouter = createTRPCRouter({
  getTracksMetric: protectedProcedure
    .input(periodSchema)
    .query(async ({ ctx, input }) => {
      const { start, end, previousStart } = getPeriods(
        input.period,
        input.from,
        input.to,
      );
      const timezone = ctx.session.user.timezone;
      const userId = ctx.session.user.id;

      const [period, previousPeriod] = await Promise.all([
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
      ]);
      if (period.error || previousPeriod.error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get tracks listened",
        });
      }
      const currentMetrics = period.data?.[0];
      const previousMetrics = previousPeriod.data?.[0];
      return {
        tracks: Number(currentMetrics?.tracks ?? 0n),
        previousTracks: Number(previousMetrics?.tracks ?? 0n),
      };
    }),
  getDurationMetric: protectedProcedure
    .input(periodSchema)
    .query(async ({ ctx, input }) => {
      const { start, end, previousStart } = getPeriods(
        input.period,
        input.from,
        input.to,
      );
      const timezone = ctx.session.user.timezone;
      const userId = ctx.session.user.id;

      const [period, previousPeriod] = await Promise.all([
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
      ]);
      if (period.error || previousPeriod.error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get duration listened",
        });
      }
      const currentMetrics = period.data?.[0];
      const previousMetrics = previousPeriod.data?.[0];
      return {
        duration: currentMetrics?.duration ?? 0,
        previousDuration: previousMetrics?.duration ?? 0,
      };
    }),
  getArtistsMetric: protectedProcedure
    .input(periodSchema)
    .query(async ({ ctx, input }) => {
      const { start, end, previousStart } = getPeriods(
        input.period,
        input.from,
        input.to,
      );
      const timezone = ctx.session.user.timezone;
      const userId = ctx.session.user.id;

      const [artists, previousArtists] = await Promise.all([
        tryCatch(
          ctx.db.$queryRaw<{ artists: bigint }[]>(Prisma.sql`
              SELECT COUNT(DISTINCT artist_track."artistId")::bigint AS artists
              FROM playback
              JOIN track ON playback."trackId" = track."id"
              JOIN artist_track ON track."id" = artist_track."trackId" and artist_track."role" = 'primary'
              JOIN artist ON artist_track."artistId" = artist."id"
              WHERE playback."userId" = ${userId}
                AND timezone(${timezone}, "playedAt") >= timezone(${timezone}, ${start})
                AND timezone(${timezone}, "playedAt") <= timezone(${timezone}, ${end})
            `),
        ),
        tryCatch(
          ctx.db.$queryRaw<{ artists: bigint }[]>(Prisma.sql`
              SELECT COUNT(DISTINCT artist_track."artistId")::bigint AS artists
              FROM playback
              JOIN track ON playback."trackId" = track."id"
              JOIN artist_track ON track."id" = artist_track."trackId" and artist_track."role" = 'primary'
              JOIN artist ON artist_track."artistId" = artist."id"
              WHERE playback."userId" = ${userId}
                AND timezone(${timezone}, "playedAt") >= timezone(${timezone}, ${previousStart})
                AND timezone(${timezone}, "playedAt") < timezone(${timezone}, ${start})
            `),
        ),
      ]);
      if (artists.error || previousArtists.error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get artists listened",
        });
      }
      const currentArtists = artists.data?.[0];
      const previousArtistsMetrics = previousArtists.data?.[0];
      return {
        artists: Number(currentArtists?.artists ?? 0n),
        previousArtists: Number(previousArtistsMetrics?.artists ?? 0n),
      };
    }),
  getTopTrack: protectedProcedure
    .input(periodSchema)
    .query(async ({ ctx, input }) => {
      const { start, end } = getPeriods(input.period, input.from, input.to);
      const timezone = ctx.session.user.timezone;
      const userId = ctx.session.user.id;
      const topTrack = await tryCatch(
        ctx.db.$queryRaw<
          { trackId: string; duration: number; tracks: bigint }[]
        >(
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
    .input(periodSchema)
    .query(async ({ ctx, input }) => {
      const { start, end } = getPeriods(input.period, input.from, input.to);
      const timezone = ctx.session.user.timezone;
      const userId = ctx.session.user.id;
      const groupResult = await tryCatch(
        ctx.db.$queryRaw<
          { artistId: string; tracks: bigint; duration: number }[]
        >(
          Prisma.sql`
            SELECT
              artist_track."artistId",
              COUNT(*)::bigint AS "tracks",
              SUM(playback."duration")::float8 AS duration
            FROM playback
            JOIN track ON playback."trackId" = track."id"
            JOIN artist_track ON track."id" = artist_track."trackId" and artist_track."role" = 'primary'
            WHERE playback."userId" = ${userId}
              AND timezone(${timezone}, "playedAt") >= timezone(${timezone}, ${start})
              AND timezone(${timezone}, "playedAt") <= timezone(${timezone}, ${end})
            GROUP BY artist_track."artistId"
            ORDER BY SUM(playback."duration") DESC
            LIMIT 1
          `,
        ),
      );
      if (groupResult.error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get top artist",
        });
      }
      const topTrackGroup = await tryCatch(
        ctx.db.$queryRaw<{ differentTracks: bigint }[]>(Prisma.sql`
          SELECT COUNT(DISTINCT playback."trackId")::bigint AS "differentTracks"
          FROM playback
          JOIN track ON playback."trackId" = track."id"
          JOIN artist_track ON track."id" = artist_track."trackId" and artist_track."role" = 'primary'
          WHERE playback."userId" = ${userId}
            AND artist_track."artistId" = ${groupResult.data?.[0]?.artistId ?? ""}
            AND timezone(${timezone}, "playedAt") >= timezone(${timezone}, ${start})
            AND timezone(${timezone}, "playedAt") <= timezone(${timezone}, ${end})
        `),
      );
      if (topTrackGroup.error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get top artist",
        });
      }
      const artist = await tryCatch(
        ctx.db.artist.findFirst({
          where: {
            id: groupResult.data?.[0]?.artistId,
          },
        }),
      );

      if (artist.error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get artist for top track",
        });
      }
      if (!artist.data) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Artist for top track not found",
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
