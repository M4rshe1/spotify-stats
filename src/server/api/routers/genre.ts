import { createTRPCRouter, protectedProcedure } from "../trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { tryCatch } from "@/lib/try-catch";
import { getPeriods } from "@/lib/periods";
import { periodSchema } from "@/server/api/lib";
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

type TopAlbum = {
  id: number;
  name: string;
  image: string | null;
  duration: number;
  count: number;
};

type TopTrack = {
  id: number;
  name: string;
  image: string | null;
  duration: number;
  count: number;
};

type TopArtist = {
  id: number;
  name: string;
  image: string | null;
  duration: number;
  count: number;
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
        ctx.db.$queryRaw<TopTrack[]>(Prisma.sql`
          SELECT
            COUNT(*)::float8 AS "count",
            SUM(playback."duration")::float8 AS "duration",
            track."id",
            track."name",
            track."image"
          FROM playback
          JOIN track ON playback."trackId" = track."id"
          JOIN artist_track ON track."id" = artist_track."trackId" AND artist_track."role" = 'primary'
          JOIN artist_genres ON artist_genres."artistId" = artist_track."artistId" AND artist_genres."genreId" = ${input.id}
          WHERE playback."userId" = ${userId}
            AND timezone(${timezone}, playback."playedAt") >= timezone(${timezone}, ${start})
            AND timezone(${timezone}, playback."playedAt") <= timezone(${timezone}, ${end})
          GROUP BY track."id", track."name", track."image"
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
        items: tracks.data ?? [],
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
        ctx.db.$queryRaw<TopAlbum[]>(Prisma.sql`
          SELECT
            COUNT(*)::float8 AS "count",
            SUM(playback."duration")::float8 AS "duration",
            album."id",
            album."name",
            album."image"
          FROM playback
          JOIN track ON playback."trackId" = track."id"
          JOIN album ON track."albumId" = album."id"
          JOIN artist_track ON track."id" = artist_track."trackId" AND artist_track."role" = 'primary'
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
        items: albums.data ?? [],
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
        ctx.db.$queryRaw<TopArtist[]>(Prisma.sql`
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
      const rows = await ctx.db.playback.findMany({
        where: {
          userId: ctx.session.user.id,
          track: {
            artists: {
              some: {
                role: "primary",
                artist: {
                  genres: {
                    some: { genreId: input.id },
                  },
                },
              },
            },
          },
        },
        orderBy: { playedAt: "desc" },
        take: 10,
        select: {
          id: true,
          playedAt: true,
          track: {
            select: {
              id: true,
              name: true,
              image: true,
              duration: true,
              album: { select: { id: true, name: true } },
              artists: {
                where: { role: "primary" },
                orderBy: { artist: { name: "asc" } },
                select: {
                  artist: { select: { id: true, name: true } },
                },
              },
            },
          },
        },
      });

      return rows.map((p) => ({
        id: p.id,
        trackId: p.track.id,
        image: p.track.image,
        title: p.track.name,
        artists: p.track.artists.map((a) => a.artist.name),
        artistIds: p.track.artists.map((a) => a.artist.id),
        duration: p.track.duration,
        playedAt: p.playedAt,
        albumId: p.track.album?.id ?? null,
        album: p.track.album?.name ?? "Unknown Album",
      }));
    }),
});
