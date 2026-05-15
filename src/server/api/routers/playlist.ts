import { createTRPCRouter, protectedProcedure } from "../trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { tryCatch } from "@/lib/try-catch";
import { getPeriods } from "@/lib/periods";
import { periodSchema, rowToArtists } from "@/server/api/lib";
import type {
  PlaybackRow,
  TopArtistRow,
  TopAlbumRow,
  TopGenreRow,
  TopTrackRow,
} from "@/server/api/types/sql-rows";
import { Prisma } from "generated/prisma";
import {
  getAlbumArtistsLateralSql,
  getSelectedPeriodSql,
  getTrackArtistsLateralSql,
} from "../sql-snippets";

const playlistTopSortSchema = z.enum(["count", "duration"]);

const playlistTopInputSchema = periodSchema.extend({
  id: z.number(),
  sortBy: playlistTopSortSchema.default("duration"),
});

type PlaylistMetrics = {
  plays: number;
  duration: number;
  tracks: number;
};

function playlistPlaybackJoin(playlistId: number) {
  return Prisma.sql`
    JOIN playlist ON playback."contextId" = playlist."spotifyId"
      AND playback."context" IN ('playlist', 'collection')
    WHERE playlist."id" = ${playlistId}
  `;
}

export const playlistRouter = createTRPCRouter({
  get: protectedProcedure
    .input(periodSchema.extend({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const { start, end } = getPeriods(input.period, input.from, input.to);
      const timezone = ctx.session.user.timezone;
      const [playlist, metrics] = await Promise.all([
        tryCatch(
          ctx.db.playlist.findUnique({
            where: { id: input.id },
          }),
        ),
        tryCatch(
          ctx.db.$queryRaw<PlaylistMetrics[]>(Prisma.sql`
            SELECT
              COUNT(*)::float8 AS "plays",
              COALESCE(SUM(playback."duration"), 0)::float8 AS "duration",
              COUNT(DISTINCT track."id")::float8 AS "tracks"
            FROM playback
            JOIN track ON playback."trackId" = track."id"
            ${playlistPlaybackJoin(input.id)}
              AND playback."userId" = ${ctx.session.user.id}
              AND timezone(${timezone}, playback."playedAt") >= timezone(${timezone}, ${start})
              AND timezone(${timezone}, playback."playedAt") <= timezone(${timezone}, ${end})
          `),
        ),
      ]);

      if (playlist.error || metrics.error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get playlist",
        });
      }
      if (!playlist.data) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Playlist not found",
        });
      }

      return {
        ...playlist.data,
        metrics: metrics.data?.[0] ?? {
          plays: 0,
          duration: 0,
          tracks: 0,
        },
      };
    }),

  getTopTracks: protectedProcedure
    .input(playlistTopInputSchema)
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
            ${playlistPlaybackJoin(input.id)}
              AND playback."userId" = ${userId}
              AND timezone(${timezone}, playback."playedAt") >= timezone(${timezone}, ${start})
              AND timezone(${timezone}, playback."playedAt") <= timezone(${timezone}, ${end})
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
            ${playlistPlaybackJoin(input.id)}
              AND playback."userId" = ${userId}
              AND timezone(${timezone}, playback."playedAt") >= timezone(${timezone}, ${start})
              AND timezone(${timezone}, playback."playedAt") <= timezone(${timezone}, ${end})
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

  firstLastPlayed: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const firstRes = await ctx.db.$queryRaw<
        {
          playedAt: Date | null;
          trackId: number | null;
          trackName: string | null;
          trackImage: string | null;
        }[]
      >(Prisma.sql`
        SELECT playback."playedAt", track."id" AS "trackId", track."name" AS "trackName", track."image" AS "trackImage"
        FROM playback
        JOIN track ON playback."trackId" = track."id"
        ${playlistPlaybackJoin(input.id)}
          AND playback."userId" = ${ctx.session.user.id}
        ORDER BY playback."playedAt" ASC
        LIMIT 1
      `);

      const lastRes = await ctx.db.$queryRaw<
        {
          playedAt: Date | null;
          trackId: number | null;
          trackName: string | null;
          trackImage: string | null;
        }[]
      >(Prisma.sql`
        SELECT playback."playedAt", track."id" AS "trackId", track."name" AS "trackName", track."image" AS "trackImage"
        FROM playback
        JOIN track ON playback."trackId" = track."id"
        ${playlistPlaybackJoin(input.id)}
          AND playback."userId" = ${ctx.session.user.id}
        ORDER BY playback."playedAt" DESC
        LIMIT 1
      `);

      return {
        firstPlayed: firstRes?.[0] ?? null,
        lastPlayed: lastRes?.[0] ?? null,
      };
    }),

  recentPlaybacks: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const playlist = await ctx.db.playlist.findUnique({
        where: { id: input.id },
        select: { id: true },
      });
      if (!playlist) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Playlist not found",
        });
      }

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
            album."id" AS "albumId",
            album."name" AS "albumName",
            playlist_ctx."id" AS "playlistId",
            playlist_ctx."name" AS "playlistName",
            playlist_ctx."image" AS "playlistImage"
          FROM playback
          JOIN track ON playback."trackId" = track."id"
          JOIN playlist playlist_ctx ON playback."contextId" = playlist_ctx."spotifyId"
            AND playback."context" IN ('playlist', 'collection')
          LEFT JOIN artist_track AS filter_at ON track."id" = filter_at."trackId" AND filter_at."role" = 'primary'
          LEFT JOIN artist_track ON track."id" = artist_track."trackId"
          LEFT JOIN artist ON artist_track."artistId" = artist."id"
          LEFT JOIN album ON track."albumId" = album."id"
          WHERE playlist_ctx."id" = ${input.id} AND playback."userId" = ${userId}
          GROUP BY playback."id", track."id", track."name", track."image", album."id", album."name", playback."duration", playlist_ctx."id", playlist_ctx."name", playlist_ctx."image"
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
  getTopAlbums: protectedProcedure
    .input(playlistTopInputSchema)
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
            ${playlistPlaybackJoin(input.id)}
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
            ${playlistPlaybackJoin(input.id)}
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

  getTopGenres: protectedProcedure
    .input(playlistTopInputSchema)
    .query(async ({ ctx, input }) => {
      const { start, end } = getPeriods(input.period, input.from, input.to);
      const timezone = ctx.session.user.timezone;
      const userId = ctx.session.user.id;
      const sortColumn =
        input.sortBy === "count"
          ? Prisma.sql`COUNT(*)::float8`
          : Prisma.sql`SUM(playback."duration")::float8`;

      const totalsResult = await tryCatch(
        ctx.db.$queryRaw<{ totalCount: number; totalDuration: number }[]>(
          Prisma.sql`
            SELECT
              COUNT(*)::float8 AS "totalCount",
              COALESCE(SUM(playback."duration"), 0)::float8 AS "totalDuration"
            FROM playback
            JOIN track ON playback."trackId" = track."id"
            ${playlistPlaybackJoin(input.id)}
              AND playback."userId" = ${userId}
              AND ${getSelectedPeriodSql(timezone, start, end)}
          `,
        ),
      );

      const genres = await tryCatch(
        ctx.db.$queryRaw<TopGenreRow[]>(Prisma.sql`
          SELECT
            COUNT(*)::float8 AS "count",
            SUM(playback."duration")::float8 AS "duration",
            genre."id",
            genre."name"
          FROM playback
          JOIN track ON playback."trackId" = track."id"
          JOIN artist_track ON track."id" = artist_track."trackId" AND artist_track."role" = 'primary'
          JOIN artist_genre ON artist_genre."artistId" = artist_track."artistId"
          JOIN genre ON genre."id" = artist_genre."genreId"
          ${playlistPlaybackJoin(input.id)}
            AND playback."userId" = ${userId}
            AND ${getSelectedPeriodSql(timezone, start, end)}
          GROUP BY genre."id", genre."name"
          ORDER BY ${sortColumn} DESC
          LIMIT 10
        `),
      );

      if (totalsResult.error || genres.error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get top genres",
        });
      }

      const totals = totalsResult.data?.[0] ?? {
        totalCount: 0,
        totalDuration: 0,
      };

      return {
        items: (genres.data ?? []).map((row) => ({
          id: row.id,
          name: row.name,
          image: null,
          duration: row.duration,
          count: row.count,
        })),
        totalCount: totals.totalCount,
        totalDuration: totals.totalDuration,
      };
    }),

  getTopArtists: protectedProcedure
    .input(playlistTopInputSchema)
    .query(async ({ ctx, input }) => {
      const { start, end } = getPeriods(input.period, input.from, input.to);
      const timezone = ctx.session.user.timezone;
      const userId = ctx.session.user.id;
      const sortColumn =
        input.sortBy === "count"
          ? Prisma.sql`COUNT(*)::float8`
          : Prisma.sql`SUM(playback."duration")::float8`;

      const totalsResult = await tryCatch(
        ctx.db.$queryRaw<{ totalCount: number; totalDuration: number }[]>(
          Prisma.sql`
            SELECT
              COUNT(*)::float8 AS "totalCount",
              COALESCE(SUM(playback."duration"), 0)::float8 AS "totalDuration"
            FROM playback
            JOIN track ON playback."trackId" = track."id"
            ${playlistPlaybackJoin(input.id)}
              AND playback."userId" = ${userId}
              AND ${getSelectedPeriodSql(timezone, start, end)}
          `,
        ),
      );

      const artists = await tryCatch(
        ctx.db.$queryRaw<TopArtistRow[]>(Prisma.sql`
          SELECT
            COUNT(*)::float8 AS "count",
            SUM(playback."duration")::float8 AS "duration",
            artist."id",
            artist."name",
            artist."image",
            artist."spotifyId"
          FROM playback
          JOIN track ON playback."trackId" = track."id"
          LEFT JOIN artist_track ON track."id" = artist_track."trackId" AND artist_track."role" = 'primary'
          LEFT JOIN artist ON artist_track."artistId" = artist."id"
          ${playlistPlaybackJoin(input.id)}
            AND playback."userId" = ${userId}
            AND ${getSelectedPeriodSql(timezone, start, end)}
          GROUP BY artist."id", artist."name", artist."image", artist."spotifyId"
          ORDER BY ${sortColumn} DESC
          LIMIT 10
        `),
      );

      if (totalsResult.error || artists.error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get top artists",
        });
      }

      const totals = totalsResult.data?.[0] ?? {
        totalCount: 0,
        totalDuration: 0,
      };

      return {
        items: artists.data ?? [],
        totalCount: totals.totalCount,
        totalDuration: totals.totalDuration,
      };
    }),
});
