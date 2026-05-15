import { createTRPCRouter, protectedProcedure } from "../trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { tryCatch } from "@/lib/try-catch";
import { getPeriods } from "@/lib/periods";
import { periodSchema, rowToArtists } from "@/server/api/lib";
import type {
  PlaybackRow,
  TopAlbumRow,
  TopTrackRow,
  FirstLastPlayed,
} from "@/server/api/types/sql-rows";
import { Prisma } from "generated/prisma";
import {
  getAlbumArtistsLateralSql,
  getSelectedPeriodSql,
  getTrackArtistsLateralSql,
} from "../sql-snippets";

const artistTopSortSchema = z.enum(["count", "duration"]);

const artistTopInputSchema = periodSchema.extend({
  id: z.number(),
  sortBy: artistTopSortSchema.default("duration"),
});

type ArtistMetrics = {
  albums: number;
  tracks: number;
  duration: number;
  plays: number;
};

export const artistRouter = createTRPCRouter({
  get: protectedProcedure
    .input(periodSchema.extend({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const { start, end } = getPeriods(input.period, input.from, input.to);
      const timezone = ctx.session.user.timezone;
      const [artist, metrics] = await Promise.all([
        tryCatch(
          ctx.db.artist.findUnique({
            where: {
              id: input.id,
            },
            include: {
              genres: {
                include: {
                  genre: true,
                },
              },
            },
          }),
        ),
        tryCatch(
          ctx.db.$queryRaw<ArtistMetrics[]>(Prisma.sql`
            SELECT 
                COUNT(DISTINCT track."albumId")::float8 AS "albums",
                COUNT(DISTINCT track."id")::float8 AS "tracks",
                SUM(playback."duration")::float8 AS "duration",
                COUNT(*)::float8 AS "plays"
            FROM playback
            JOIN track ON playback."trackId" = track."id"
            JOIN artist_track ON track."id" = artist_track."trackId" AND artist_track."role" = 'primary'
            WHERE artist_track."artistId" = ${input.id}
              AND playback."userId" = ${ctx.session.user.id}
              AND ${getSelectedPeriodSql(timezone, start, end)}
          `),
        ),
      ]);
      if (artist.error || metrics.error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get artist",
        });
      }
      if (!artist.data) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Artist not found" });
      }
      return {
        ...artist.data,
        metrics: metrics.data?.[0] ?? {
          albums: 0,
          tracks: 0,
          duration: 0,
          plays: 0,
        },
      };
    }),
  getTopTracks: protectedProcedure
    .input(artistTopInputSchema)
    .query(async ({ ctx, input }) => {
      const { start, end } = getPeriods(input.period, input.from, input.to);
      const timezone = ctx.session.user.timezone;
      const userId = ctx.session.user.id;
      const sortColumn =
        input.sortBy === "count"
          ? Prisma.sql`COUNT(*)::float8`
          : Prisma.sql`SUM(playback."duration")::float8`;
      const rankedOrderColumn =
        input.sortBy === "count"
          ? Prisma.sql`ranked."count"`
          : Prisma.sql`ranked."duration"`;

      const totalsResult = await tryCatch(
        ctx.db.$queryRaw<{ totalCount: number; totalDuration: number }[]>(
          Prisma.sql`
            SELECT
              COUNT(*)::float8 AS "totalCount",
              COALESCE(SUM(playback."duration"), 0)::float8 AS "totalDuration"
            FROM playback
            JOIN track ON playback."trackId" = track."id"
            JOIN artist_track ON track."id" = artist_track."trackId" AND artist_track."role" = 'primary'
            WHERE artist_track."artistId" = ${input.id}
              AND playback."userId" = ${userId}
              AND ${getSelectedPeriodSql(timezone, start, end)}
          `,
        ),
      );

      const tracks = await tryCatch(
        ctx.db.$queryRaw<TopTrackRow[]>(Prisma.sql`
          WITH ranked_tracks AS (
            SELECT
              COUNT(*)::float8 AS "count",
              SUM(playback."duration")::float8 AS "duration",
              track."id",
              track."name",
              track."image"
            FROM playback
            JOIN track ON playback."trackId" = track."id"
            JOIN artist_track AS filter_at ON track."id" = filter_at."trackId" AND filter_at."role" = 'primary'
            WHERE filter_at."artistId" = ${input.id}
              AND playback."userId" = ${userId}
              AND ${getSelectedPeriodSql(timezone, start, end)}
            GROUP BY track."id", track."name", track."image"
            ORDER BY ${sortColumn} DESC
            LIMIT 10
          )
          SELECT
            ranked."count",
            ranked."duration",
            ranked."id",
            ranked."name",
            ranked."image",
            artists."names" AS "artistNames",
            artists."ids" AS "artistIds",
            artists."roles" AS "artistRoles"
          FROM ranked_tracks ranked
          ${getTrackArtistsLateralSql(Prisma.sql`ranked."id"`)}
          ORDER BY ${rankedOrderColumn} DESC
        `),
      );

      if (totalsResult.error || tracks.error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get top tracks",
        });
      }

      const totals = totalsResult.data?.[0] ?? {
        totalCount: 0,
        totalDuration: 0,
      };

      return {
        items: (tracks.data ?? []).map((row) => ({
          id: row.id,
          name: row.name,
          image: row.image,
          duration: row.duration,
          count: row.count,
          artists: rowToArtists(row),
        })),
        totalCount: totals.totalCount,
        totalDuration: totals.totalDuration,
      };
    }),
  getTopAlbums: protectedProcedure
    .input(artistTopInputSchema)
    .query(async ({ ctx, input }) => {
      const { start, end } = getPeriods(input.period, input.from, input.to);
      const timezone = ctx.session.user.timezone;
      const userId = ctx.session.user.id;
      const sortColumn =
        input.sortBy === "count"
          ? Prisma.sql`COUNT(*)::float8`
          : Prisma.sql`SUM(playback."duration")::float8`;
      const rankedOrderColumn =
        input.sortBy === "count"
          ? Prisma.sql`ranked."count"`
          : Prisma.sql`ranked."duration"`;

      const totalsResult = await tryCatch(
        ctx.db.$queryRaw<{ totalCount: number; totalDuration: number }[]>(
          Prisma.sql`
            SELECT
              COUNT(*)::float8 AS "totalCount",
              COALESCE(SUM(playback."duration"), 0)::float8 AS "totalDuration"
            FROM playback
            JOIN track ON playback."trackId" = track."id"
            JOIN artist_track ON track."id" = artist_track."trackId" AND artist_track."role" = 'primary'
            WHERE artist_track."artistId" = ${input.id}
              AND playback."userId" = ${userId}
              AND ${getSelectedPeriodSql(timezone, start, end)}
          `,
        ),
      );

      const albums = await tryCatch(
        ctx.db.$queryRaw<TopAlbumRow[]>(Prisma.sql`
          WITH ranked_albums AS (
            SELECT
              COUNT(*)::float8 AS "count",
              SUM(playback."duration")::float8 AS "duration",
              album."id",
              album."name",
              album."image"
            FROM playback
            JOIN track ON playback."trackId" = track."id"
            JOIN album ON track."albumId" = album."id"
            JOIN album_artist ON album."id" = album_artist."albumId" AND album_artist."role" = 'primary'
            WHERE album_artist."artistId" = ${input.id}
              AND playback."userId" = ${userId}
              AND ${getSelectedPeriodSql(timezone, start, end)}
            GROUP BY album."id", album."name", album."image"
            ORDER BY ${sortColumn} DESC
            LIMIT 10
          )
          SELECT
            ranked."count",
            ranked."duration",
            ranked."id",
            ranked."name",
            ranked."image",
            artists."names" AS "artistNames",
            artists."ids" AS "artistIds",
            artists."roles" AS "artistRoles"
          FROM ranked_albums ranked
          ${getAlbumArtistsLateralSql(Prisma.sql`ranked."id"`)}
          ORDER BY ${rankedOrderColumn} DESC
        `),
      );

      if (totalsResult.error || albums.error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get top albums",
        });
      }

      const totals = totalsResult.data?.[0] ?? {
        totalCount: 0,
        totalDuration: 0,
      };

      return {
        items: (albums.data ?? []).map((row) => ({
          id: row.id,
          name: row.name,
          image: row.image,
          duration: row.duration,
          count: row.count,
          artists: rowToArtists(row),
        })),
        totalCount: totals.totalCount,
        totalDuration: totals.totalDuration,
      };
    }),
  firstLastPlayed: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const firstRes = await ctx.db.$queryRaw<FirstLastPlayed[]>(Prisma.sql`
        SELECT playback."playedAt", track."id" AS "trackId", track."name" AS "trackName", track."image" AS "trackImage"
        FROM playback
        JOIN track ON playback."trackId" = track."id"
        JOIN artist_track ON track."id" = artist_track."trackId"
        WHERE artist_track."artistId" = ${input.id} AND playback."userId" = ${ctx.session.user.id}
        ORDER BY playback."playedAt" ASC
        LIMIT 1
      `);

      const lastRes = await ctx.db.$queryRaw<FirstLastPlayed[]>(Prisma.sql`
        SELECT playback."playedAt", track."id" AS "trackId", track."name" AS "trackName", track."image" AS "trackImage"
        FROM playback
        JOIN track ON playback."trackId" = track."id"
        JOIN artist_track ON track."id" = artist_track."trackId"
        WHERE artist_track."artistId" = ${input.id} AND playback."userId" = ${ctx.session.user.id}
        ORDER BY playback."playedAt" DESC
        LIMIT 1
      `);

      const firstPlayed = firstRes?.[0] ?? null;
      const lastPlayed = lastRes?.[0] ?? null;

      return {
        firstPlayed,
        lastPlayed,
      };
    }),
  recentPlaybacks: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const rows = await tryCatch(
        ctx.db.$queryRaw<PlaybackRow[]>(Prisma.sql`
          SELECT 
            playback."id",
            playback."playedAt", 
            track."id" AS "trackId",
            track."name" AS "trackName",
            track."image" AS "trackImage",
            playback."duration"::float8 AS "duration",
            COALESCE(
              ARRAY_AGG(
                artist."name" ORDER BY artist_track."artistId"
              ) FILTER (WHERE artist."name" IS NOT NULL),
              ARRAY[]::text[]
            ) AS "artistNames",
            COALESCE(
              ARRAY_AGG(
                artist_track."artistId" ORDER BY artist_track."artistId"
              ) FILTER (WHERE artist_track."artistId" IS NOT NULL),
              ARRAY[]::integer[]
            ) AS "artistIds",
            COALESCE(
              ARRAY_AGG(
                artist_track."role" ORDER BY artist_track."artistId"
              ) FILTER (WHERE artist_track."role" IS NOT NULL),
              ARRAY[]::text[]
            ) AS "artistRoles",
            album."id" AS "albumId",
            album."name" AS "albumName",
            playlist."id" AS "playlistId",
            playlist."name" AS "playlistName",
            playlist."image" AS "playlistImage"
          FROM playback
          JOIN track ON playback."trackId" = track."id"
          JOIN artist_track AS filter_at ON track."id" = filter_at."trackId"  AND filter_at."artistId" = ${input.id}
          LEFT JOIN artist_track ON track."id" = artist_track."trackId"
          LEFT JOIN artist ON artist_track."artistId" = artist."id"
          LEFT JOIN album ON track."albumId" = album."id"
          LEFT JOIN playlist ON playback."contextId" = playlist."spotifyId" AND playback."context" IN ('playlist', 'collection')
          WHERE playback."userId" = ${userId}
          GROUP BY playback."id", track."id", track."name", track."image", album."id", album."name", playback."duration", playlist."id", playlist."name", playlist."image"
          ORDER BY playback."playedAt" DESC
          LIMIT 10
        `),
      );

      return (rows.data ?? []).map((p) => ({
        id: p.id,
        trackId: p.trackId,
        image: p.trackImage,
        title: p.trackName,
        artists: rowToArtists(p),
        duration: p.duration,
        playedAt: p.playedAt,
        album: {
          id: p.albumId,
          name: p.albumName,
        },
        playlist: {
          id: p.playlistId,
          name: p.playlistName,
          image: p.playlistImage,
        },
      }));
    }),
});
