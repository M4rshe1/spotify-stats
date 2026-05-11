import { createTRPCRouter, protectedProcedure } from "../trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { tryCatch } from "@/lib/try-catch";
import { getPeriods } from "@/lib/periods";
import { periodSchema } from "@/server/api/lib";
import { Prisma } from "generated/prisma";

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
              AND timezone(${timezone}, playback."playedAt") >= timezone(${timezone}, ${start})
              AND timezone(${timezone}, playback."playedAt") <= timezone(${timezone}, ${end})
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
              AND timezone(${timezone}, playback."playedAt") >= timezone(${timezone}, ${start})
              AND timezone(${timezone}, playback."playedAt") <= timezone(${timezone}, ${end})
          `,
        ),
      );

      const tracks = await tryCatch(
        ctx.db.$queryRaw<TopTrack[]>(Prisma.sql`
          SELECT COUNT(*)::float8 AS "count", SUM(playback."duration")::float8 AS "duration", track."id", track."name", track."image"
          FROM playback
          JOIN track ON playback."trackId" = track."id"
          JOIN artist_track ON track."id" = artist_track."trackId" AND artist_track."role" = 'primary'
          WHERE artist_track."artistId" = ${input.id}
            AND playback."userId" = ${userId}
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
    .input(artistTopInputSchema)
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
            WHERE artist_track."artistId" = ${input.id}
              AND playback."userId" = ${userId}
              AND timezone(${timezone}, playback."playedAt") >= timezone(${timezone}, ${start})
              AND timezone(${timezone}, playback."playedAt") <= timezone(${timezone}, ${end})
          `,
        ),
      );

      const albums = await tryCatch(
        ctx.db.$queryRaw<TopAlbum[]>(Prisma.sql`
          SELECT COUNT(*)::float8 AS "count", SUM(playback."duration")::float8 AS "duration", album."id", album."name", album."image"
          FROM playback
          JOIN track ON playback."trackId" = track."id"
          JOIN album ON track."albumId" = album."id"
          JOIN artist_track ON track."id" = artist_track."trackId" AND artist_track."role" = 'primary'
          WHERE artist_track."artistId" = ${input.id}
            AND playback."userId" = ${userId}
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
  firstLastPlayed: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      // Get the first listened playback for this artist (with track)
      const firstRes = await ctx.db.$queryRaw<{ 
        playedAt: Date | null, 
        trackId: number | null, 
        trackName: string | null, 
        trackImage: string | null 
      }[]>(Prisma.sql`
        SELECT playback."playedAt", track."id" AS "trackId", track."name" AS "trackName", track."image" AS "trackImage"
        FROM playback
        JOIN track ON playback."trackId" = track."id"
        JOIN artist_track ON track."id" = artist_track."trackId" AND artist_track."role" = 'primary'
        WHERE artist_track."artistId" = ${input.id} AND playback."userId" = ${ctx.session.user.id}
        ORDER BY playback."playedAt" ASC
        LIMIT 1
      `);

      const lastRes = await ctx.db.$queryRaw<{ 
        playedAt: Date | null, 
        trackId: number | null, 
        trackName: string | null, 
        trackImage: string | null 
      }[]>(Prisma.sql`
        SELECT playback."playedAt", track."id" AS "trackId", track."name" AS "trackName", track."image" AS "trackImage"
        FROM playback
        JOIN track ON playback."trackId" = track."id"
        JOIN artist_track ON track."id" = artist_track."trackId" AND artist_track."role" = 'primary'
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
      const rows = await ctx.db.playback.findMany({
        where: {
          userId: ctx.session.user.id,
          track: {
            artists: {
              some: {
                artistId: input.id,
                role: "primary",
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
