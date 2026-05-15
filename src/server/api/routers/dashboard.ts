import { createTRPCRouter, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { getPeriods } from "@/lib/periods";
import { tryCatch } from "@/lib/try-catch";
import { Prisma } from "generated/prisma";
import { periodSchema, rowToArtists } from "@/server/api/lib";
import { getSelectedPeriodSql } from "@/server/api/sql-snippets";
import z from "zod";
import type { PlaybackRow } from "../types/sql-rows";

export const dashboardRouter = createTRPCRouter({
  getTracksMetric: protectedProcedure
    .input(periodSchema)
    .query(async ({ ctx, input }) => {
      const { start, end, previousStart } = getPeriods(
        input.period,
        input.from,
        input.to,
      );
      const userId = ctx.session.user.id;
      const timezone = ctx.session.user.timezone;

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
                AND ${getSelectedPeriodSql(timezone, start, end)}
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
                AND ${getSelectedPeriodSql(timezone, previousStart, start)}
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
      const userId = ctx.session.user.id;
      const timezone = ctx.session.user.timezone;

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
                AND ${getSelectedPeriodSql(timezone, start, end)}
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
                AND ${getSelectedPeriodSql(timezone, previousStart, start)}
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
      const userId = ctx.session.user.id;
      const timezone = ctx.session.user.timezone;

      const [artists, previousArtists] = await Promise.all([
        tryCatch(
          ctx.db.$queryRaw<{ artists: bigint }[]>(Prisma.sql`
              SELECT COUNT(DISTINCT artist_track."artistId")::bigint AS artists
              FROM playback
              JOIN track ON playback."trackId" = track."id"
              JOIN artist_track ON track."id" = artist_track."trackId" and artist_track."role" = 'primary'
              JOIN artist ON artist_track."artistId" = artist."id"
              WHERE playback."userId" = ${userId}
                AND ${getSelectedPeriodSql(timezone, start, end)}
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
                AND ${getSelectedPeriodSql(timezone, previousStart, start)}
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
      const userId = ctx.session.user.id;
      const timezone = ctx.session.user.timezone;
      const topTrack = await tryCatch(
        ctx.db.$queryRaw<
          { trackId: number; duration: number; tracks: bigint }[]
        >(
          Prisma.sql`
            SELECT
              "trackId",
              SUM(duration)::float8 AS duration,
              COUNT(*)::bigint AS tracks
            FROM playback
            WHERE "userId" = ${userId}
              AND ${getSelectedPeriodSql(timezone, start, end)}
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
      const topRow = topTrack.data?.[0];
      if (topRow?.trackId == null) {
        return null;
      }
      const track = await tryCatch(
        ctx.db.track.findUnique({
          where: {
            id: topRow.trackId,
          },
          include: {
            artists: {
              where: { role: "primary" },
              take: 1,
              include: { artist: true },
            },
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
        duration: topRow.duration ?? 0,
        tracks: Number(topRow.tracks ?? 0n),
      };
    }),
  getTopArtist: protectedProcedure
    .input(periodSchema)
    .query(async ({ ctx, input }) => {
      const { start, end } = getPeriods(input.period, input.from, input.to);
      const userId = ctx.session.user.id;
      const timezone = ctx.session.user.timezone;
      const groupResult = await tryCatch(
        ctx.db.$queryRaw<
          { artistId: number; tracks: bigint; duration: number }[]
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
              AND ${getSelectedPeriodSql(timezone, start, end)}
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
      const topArtistRow = groupResult.data?.[0];
      if (topArtistRow?.artistId == null) {
        return null;
      }
      const topTrackGroup = await tryCatch(
        ctx.db.$queryRaw<{ differentTracks: bigint }[]>(Prisma.sql`
          SELECT COUNT(DISTINCT playback."trackId")::bigint AS "differentTracks"
          FROM playback
          JOIN track ON playback."trackId" = track."id"
          JOIN artist_track ON track."id" = artist_track."trackId" and artist_track."role" = 'primary'
          WHERE playback."userId" = ${userId}
            AND artist_track."artistId" = ${topArtistRow.artistId}
            AND ${getSelectedPeriodSql(timezone, start, end)}
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
            id: topArtistRow.artistId,
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
        tracks: Number(topArtistRow.tracks ?? 0n),
        duration: topArtistRow.duration ?? 0,
      };
    }),
  getRecentlyPlayed: protectedProcedure
    .input(
      periodSchema.extend({
        limit: z.number().int().min(1).max(50).default(20),
        cursorPlayedAt: z.date().optional(),
        cursorId: z.number().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { start, end } = getPeriods(input.period, input.from, input.to);
      const userId = ctx.session.user.id;
      const timezone = ctx.session.user.timezone;
      const limit = input.limit;

      const cursorCondition =
        input.cursorPlayedAt && input.cursorId
          ? Prisma.sql`
            AND (
              playback."playedAt" < ${input.cursorPlayedAt}
              OR (playback."playedAt" = ${input.cursorPlayedAt} AND playback."id" < ${input.cursorId})
            )
          `
          : Prisma.empty;

      const rows = await tryCatch(
        ctx.db.$queryRaw<PlaybackRow[]>(
          Prisma.sql`
            SELECT
              playback."id",
              track."id" AS "trackId",
              track."name" AS "trackName",
              track."image" AS "trackImage",
              playback."duration"::float8 AS "duration",
              playback."playedAt",
              album."id" AS "albumId",
              album."name" AS "albumName",
              COALESCE(
                ARRAY_AGG(artist."name" ORDER BY artist_track."artistId") FILTER (WHERE artist."name" IS NOT NULL),
                ARRAY[]::text[]
              ) AS "artistNames",
              COALESCE(
                ARRAY_AGG(artist."id" ORDER BY artist_track."artistId") FILTER (WHERE artist."id" IS NOT NULL),
                ARRAY[]::integer[]
              ) AS "artistIds",
              COALESCE(
                ARRAY_AGG(artist_track."role" ORDER BY artist_track."artistId") FILTER (WHERE artist_track."role" IS NOT NULL),
                ARRAY[]::text[]
              ) AS "artistRoles",
              playlist."id" AS "playlistId",
              playlist."name" AS "playlistName",
              playlist."image" AS "playlistImage"
            FROM playback
            JOIN track ON playback."trackId" = track."id"
            LEFT JOIN album ON track."albumId" = album."id"
            LEFT JOIN artist_track ON track."id" = artist_track."trackId" AND artist_track."role" = 'primary'
            LEFT JOIN artist ON artist_track."artistId" = artist."id"
            LEFT JOIN playlist ON playback."contextId" = playlist."spotifyId" AND playback."context" IN ('playlist', 'collection')
            WHERE playback."userId" = ${userId}
              AND ${getSelectedPeriodSql(timezone, start, end)}
              ${cursorCondition}
            GROUP BY playback."id", track."id", track."name", track."image", playback."duration", playback."playedAt", album."id", album."name", playlist."id", playlist."name", playlist."image"
            ORDER BY playback."playedAt" DESC, playback."id" DESC
            LIMIT ${limit + 1}
          `,
        ),
      );

      if (rows.error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get recently played tracks",
        });
      }

      const hasMore = rows.data.length > limit;
      const items = hasMore ? rows.data.slice(0, limit) : rows.data;
      const last = items[items.length - 1];

      return {
        items: items.map((row) => ({
          id: row.id,
          trackId: row.trackId,
          image: row.trackImage,
          title: row.trackName,
          artists: rowToArtists(row),
          duration: row.duration,
          playedAt: row.playedAt,
          album: {
            id: row.albumId ?? 0,
            name: row.albumName ?? "Unknown Album",
          },
          playlist: {
            id: row.playlistId,
            name: row.playlistName,
            image: row.playlistImage,
          },
        })),
        nextCursor:
          hasMore && last
            ? {
                cursorPlayedAt: last.playedAt,
                cursorId: last.id,
              }
            : null,
      };
    }),
});
