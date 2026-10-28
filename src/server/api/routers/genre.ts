import { createTRPCRouter, protectedProcedure } from "../trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { tryCatch } from "@/lib/try-catch";
import { getPeriods } from "@/lib/periods";
import { periodSchema, rowToArtists } from "@/server/api/lib";
import type {
  PlaybackRow,
  TopAlbumRow,
  TopArtistRow,
  TopTrackRow,
} from "@/server/api/types/sql-rows";
import { Prisma } from "generated/prisma";
import {
  getAlbumArtistsLateralSql,
  getAlbumInGenreSql,
  getArtistInGenreSql,
  getSelectedPeriodSql,
  getTrackArtistsLateralSql,
  getTrackInGenreSql,
} from "../sql-snippets";

const genreTopSortSchema = z.enum(["count", "duration"]);

const genreTopInputSchema = periodSchema.extend({
  id: z.number(),
  sortBy: genreTopSortSchema.default("duration"),
});

type GenreMetrics = {
  albums: number;
  tracks: number;
  artists: number;
  duration: number;
  plays: number;
};

export const genreRouter = createTRPCRouter({
  get: protectedProcedure
    .input(z.object({ id: z.number(), period: periodSchema }))
    .query(async ({ ctx, input }) => {
      const { start, end, grouping } = getPeriods(
        input.period.period,
        input.period.from,
        input.period.to,
      );
      const timezone = ctx.session.user.timezone;
      const [genre, metrics] = await Promise.all([
        tryCatch(ctx.db.genre.findUnique({ where: { id: input.id } })),
        tryCatch(
          ctx.db.$queryRaw<GenreMetrics[]>(Prisma.sql`
            WITH genre_playbacks AS (
              SELECT
                playback."duration" AS "duration",
                track."id" AS "trackId",
                track."albumId" AS "albumId"
              FROM playback
              JOIN track ON playback."trackId" = track."id"
              WHERE playback."userId" = ${ctx.session.user.id}
                AND ${getSelectedPeriodSql(timezone, start, end)}
                AND ${getTrackInGenreSql(input.id)}
            )
            SELECT
              COUNT(DISTINCT "albumId") FILTER (WHERE "albumId" IS NOT NULL)::float8 AS "albums",
              COUNT(DISTINCT "trackId")::float8 AS "tracks",
              (
                SELECT COUNT(DISTINCT artist_track."artistId")::float8
                FROM genre_playbacks gp
                JOIN artist_track ON artist_track."trackId" = gp."trackId"
                  AND artist_track."role" = 'primary'
                JOIN artist_genre ON artist_genre."artistId" = artist_track."artistId"
                  AND artist_genre."genreId" = ${input.id}
              ) AS "artists",
              COALESCE(SUM("duration"), 0)::float8 AS "duration",
              COUNT(*)::float8 AS "plays"
            FROM genre_playbacks
          `),
        ),
      ]);

      if (genre.error || metrics.error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get genre",
        });
      }
      if (!genre.data) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Genre not found" });
      }

      return {
        ...genre.data,
        metrics: metrics.data?.[0] ?? {
          albums: 0,
          tracks: 0,
          artists: 0,
          duration: 0,
          plays: 0,
        },
      };
    }),

  getTopTracks: protectedProcedure
    .input(genreTopInputSchema)
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
            WHERE playback."userId" = ${userId}
              AND ${getSelectedPeriodSql(timezone, start, end)}
              AND ${getTrackInGenreSql(input.id)}
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
            WHERE playback."userId" = ${userId}
              AND ${getSelectedPeriodSql(timezone, start, end)}
              AND ${getTrackInGenreSql(input.id)}
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
          artists: [
            ...(row.artistNames ?? []).map((name, index) => ({
              id: row.artistIds?.[index] ?? null,
              name,
              role: row.artistRoles?.[index] ?? "feature",
            })),
          ],
        })),
        totalCount: totals.totalCount,
        totalDuration: totals.totalDuration,
      };
    }),

  getTopAlbums: protectedProcedure
    .input(genreTopInputSchema)
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
            JOIN album ON track."albumId" = album."id"
            WHERE playback."userId" = ${userId}
              AND ${getSelectedPeriodSql(timezone, start, end)}
              AND ${getAlbumInGenreSql(input.id)}
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
            WHERE playback."userId" = ${userId}
              AND ${getSelectedPeriodSql(timezone, start, end)}
              AND ${getAlbumInGenreSql(input.id)}
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

  getTopArtists: protectedProcedure
    .input(genreTopInputSchema)
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
            WHERE playback."userId" = ${userId}
              AND ${getSelectedPeriodSql(timezone, start, end)}
              AND ${getTrackInGenreSql(input.id)}
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
            artist."image"
          FROM playback
          JOIN track ON playback."trackId" = track."id"
          JOIN artist_track ON track."id" = artist_track."trackId" AND artist_track."role" = 'primary'
          JOIN artist ON artist_track."artistId" = artist."id"
          WHERE playback."userId" = ${userId}
            AND ${getSelectedPeriodSql(timezone, start, end)}
            AND ${getArtistInGenreSql(input.id)}
          GROUP BY artist."id", artist."name", artist."image"
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

  firstLastPlayed: protectedProcedure
    .input(periodSchema.extend({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const { start, end } = getPeriods(input.period, input.from, input.to);
      const timezone = ctx.session.user.timezone;

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
        WHERE playback."userId" = ${ctx.session.user.id}
          AND ${getSelectedPeriodSql(timezone, start, end)}
          AND ${getTrackInGenreSql(input.id)}
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
        WHERE playback."userId" = ${ctx.session.user.id}
          AND ${getSelectedPeriodSql(timezone, start, end)}
          AND ${getTrackInGenreSql(input.id)}
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
          LEFT JOIN artist_track ON track."id" = artist_track."trackId"
          LEFT JOIN artist ON artist_track."artistId" = artist."id"
          LEFT JOIN album ON track."albumId" = album."id"
          LEFT JOIN playlist ON playback."contextId" = playlist."spotifyId" AND playback."context" IN ('playlist', 'collection')
          WHERE playback."userId" = ${userId}
            AND ${getTrackInGenreSql(input.id)}
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
