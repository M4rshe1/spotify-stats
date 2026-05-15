import { createTRPCRouter, protectedProcedure } from "../trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { tryCatch } from "@/lib/try-catch";
import { getPeriods } from "@/lib/periods";
import { periodSchema } from "@/server/api/lib";
import type {
  PlaybackRow,
  TopAlbumRow,
  TopArtistRow,
  TopTrackRow,
} from "@/server/api/types/sql-rows";
import { Prisma } from "generated/prisma";

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
            SELECT
              COUNT(DISTINCT album."id") FILTER (WHERE album."id" IS NOT NULL)::float8 AS "albums",
              COUNT(DISTINCT track."id")::float8 AS "tracks",
              COUNT(DISTINCT artist."id")::float8 AS "artists",
              SUM(playback."duration")::float8 AS "duration",
              COUNT(*)::float8 AS "plays"
            FROM playback
            JOIN track ON playback."trackId" = track."id"
            JOIN artist_track ON track."id" = artist_track."trackId" AND artist_track."role" = 'primary'
            JOIN artist ON artist_track."artistId" = artist."id"
            JOIN artist_genres ON artist_genres."artistId" = artist."id" AND artist_genres."genreId" = ${input.id}
            LEFT JOIN album ON track."albumId" = album."id"
            WHERE playback."userId" = ${ctx.session.user.id}
              AND timezone(${timezone}, playback."playedAt") >= timezone(${timezone}, ${start})
              AND timezone(${timezone}, playback."playedAt") <= timezone(${timezone}, ${end})
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

      const totalsResult = await tryCatch(
        ctx.db.$queryRaw<{ totalCount: number; totalDuration: number }[]>(
          Prisma.sql`
            SELECT
              COUNT(*)::float8 AS "totalCount",
              COALESCE(SUM(playback."duration"), 0)::float8 AS "totalDuration"
            FROM playback
            JOIN track ON playback."trackId" = track."id"
            JOIN artist_track ON track."id" = artist_track."trackId" AND artist_track."role" = 'primary'
            JOIN artist_genres ON artist_genres."artistId" = artist_track."artistId" AND artist_genres."genreId" = ${input.id}
            WHERE playback."userId" = ${userId}
              AND timezone(${timezone}, playback."playedAt") >= timezone(${timezone}, ${start})
              AND timezone(${timezone}, playback."playedAt") <= timezone(${timezone}, ${end})
          `,
        ),
      );

      const tracks = await tryCatch(
        ctx.db.$queryRaw<TopTrackRow[]>(Prisma.sql`
          SELECT
            COUNT(*)::float8 AS "count",
            SUM(playback."duration")::float8 AS "duration",
            track."id",
            track."name",
            track."image",
            artists."names" AS "artistNames",
            artists."ids" AS "artistIds",
            artists."roles" AS "artistRoles"
          FROM playback
          JOIN track ON playback."trackId" = track."id"
          LEFT JOIN LATERAL (
              SELECT 
                  ARRAY_AGG(a."name" ORDER BY at."artistId") AS "names",
                  ARRAY_AGG(at."artistId" ORDER BY at."artistId") AS "ids",
                  ARRAY_AGG(at."role" ORDER BY at."artistId") AS "roles"
              FROM artist_track at
              LEFT JOIN artist a ON at."artistId" = a."id"
              WHERE at."trackId" = track."id"
          ) AS artists ON TRUE
          JOIN artist_track ON track."id" = artist_track."trackId"
          JOIN artist_genres ON artist_genres."artistId" = artist_track."artistId" AND artist_genres."genreId" = ${input.id}
          WHERE playback."userId" = ${userId}
            AND timezone(${timezone}, playback."playedAt") >= timezone(${timezone}, ${start})
            AND timezone(${timezone}, playback."playedAt") <= timezone(${timezone}, ${end})
          GROUP BY track."id", track."name", track."image", artists."names", artists."ids", artists."roles"
          ORDER BY ${sortColumn} DESC
          LIMIT 10
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

      const totalsResult = await tryCatch(
        ctx.db.$queryRaw<{ totalCount: number; totalDuration: number }[]>(
          Prisma.sql`
            SELECT
              COUNT(*)::float8 AS "totalCount",
              COALESCE(SUM(playback."duration"), 0)::float8 AS "totalDuration"
            FROM playback
            JOIN track ON playback."trackId" = track."id"
            JOIN artist_track ON track."id" = artist_track."trackId" AND artist_track."role" = 'primary'
            JOIN artist_genres ON artist_genres."artistId" = artist_track."artistId" AND artist_genres."genreId" = ${input.id}
            WHERE playback."userId" = ${userId}
              AND timezone(${timezone}, playback."playedAt") >= timezone(${timezone}, ${start})
              AND timezone(${timezone}, playback."playedAt") <= timezone(${timezone}, ${end})
          `,
        ),
      );

      const albums = await tryCatch(
        ctx.db.$queryRaw<TopAlbumRow[]>(Prisma.sql`
          SELECT
            COUNT(*)::float8 AS "count",
            SUM(playback."duration")::float8 AS "duration",
            album."id",
            album."name",
            album."image",
            COALESCE(
              ARRAY_AGG(DISTINCT artist."name") FILTER (WHERE artist."name" IS NOT NULL),
              ARRAY[]::text[]
            ) AS "artistNames",
            COALESCE(
              ARRAY_AGG(DISTINCT artist."id") FILTER (WHERE artist."id" IS NOT NULL),
              ARRAY[]::integer[]
            ) AS "artistIds"
          FROM playback
          JOIN track ON playback."trackId" = track."id"
          JOIN album ON track."albumId" = album."id"
          JOIN artist_track ON track."id" = artist_track."trackId" AND artist_track."role" = 'primary'
          JOIN artist ON artist."id" = artist_track."artistId"
          JOIN artist_genres ON artist_genres."artistId" = artist_track."artistId" AND artist_genres."genreId" = ${input.id}
          WHERE playback."userId" = ${userId}
            AND timezone(${timezone}, playback."playedAt") >= timezone(${timezone}, ${start})
            AND timezone(${timezone}, playback."playedAt") <= timezone(${timezone}, ${end})
          GROUP BY album."id", album."name", album."image"
          ORDER BY ${sortColumn} DESC
          LIMIT 10
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
          artists: row.artistNames ?? [],
          artistIds: row.artistIds ?? [],
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
            JOIN artist_track ON track."id" = artist_track."trackId" AND artist_track."role" = 'primary'
            JOIN artist_genres ON artist_genres."artistId" = artist_track."artistId" AND artist_genres."genreId" = ${input.id}
            WHERE playback."userId" = ${userId}
            AND timezone(${timezone}, playback."playedAt") >= timezone(${timezone}, ${start})
            AND timezone(${timezone}, playback."playedAt") <= timezone(${timezone}, ${end})
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
          JOIN artist_genres ON artist_genres."artistId" = artist."id" AND artist_genres."genreId" = ${input.id}
          WHERE playback."userId" = ${userId}
            AND timezone(${timezone}, playback."playedAt") >= timezone(${timezone}, ${start})
            AND timezone(${timezone}, playback."playedAt") <= timezone(${timezone}, ${end})
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
        JOIN artist_track ON track."id" = artist_track."trackId" AND artist_track."role" = 'primary'
        JOIN artist_genres ON artist_genres."artistId" = artist_track."artistId" AND artist_genres."genreId" = ${input.id}
        WHERE playback."userId" = ${ctx.session.user.id}
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
        JOIN artist_track ON track."id" = artist_track."trackId" AND artist_track."role" = 'primary'
        JOIN artist_genres ON artist_genres."artistId" = artist_track."artistId" AND artist_genres."genreId" = ${input.id}
        WHERE playback."userId" = ${ctx.session.user.id}
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
          JOIN artist_track as filter_at ON track."id" = filter_at."trackId" AND filter_at."role" = 'primary'
          LEFT JOIN artist_track ON track."id" = artist_track."trackId"
          LEFT JOIN artist ON artist_track."artistId" = artist."id"
          LEFT JOIN album ON track."albumId" = album."id"
          LEFT JOIN playlist ON playback."contextId" = playlist."spotifyId" AND playback."context" IN ('playlist', 'collection')
          WHERE playback."userId" = ${userId}
            AND EXISTS (
              SELECT 1 FROM artist_track at2
              INNER JOIN artist_genres ag ON ag."artistId" = at2."artistId" AND ag."genreId" = ${input.id}
              WHERE at2."trackId" = track."id" AND at2."role" = 'primary'
            )
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
        artists: [
          ...(p.artistNames ?? []).map((name, index) => ({
            id: p.artistIds?.[index] ?? null,
            name,
          })),
        ],
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
