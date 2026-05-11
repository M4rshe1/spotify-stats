import { createTRPCRouter, protectedProcedure } from "../trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { tryCatch } from "@/lib/try-catch";
import { getPeriods } from "@/lib/periods";
import { periodSchema } from "@/server/api/lib";
import { Prisma } from "generated/prisma";

const albumTopSortSchema = z.enum(["count", "duration"]);

const albumTopInputSchema = periodSchema.extend({
  id: z.number(),
  sortBy: albumTopSortSchema.default("duration"),
});

type AlbumMetrics = {
  plays: number;
  duration: number;
  tracks: number;
};

type TopTrackRow = {
  id: number;
  name: string;
  image: string | null;
  duration: number;
  count: number;
  artistNames: string[] | null;
  artistIds: number[] | null;
};

export const albumRouter = createTRPCRouter({
  get: protectedProcedure
    .input(periodSchema.extend({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const { start, end } = getPeriods(input.period, input.from, input.to);
      const timezone = ctx.session.user.timezone;
      const [album, metrics] = await Promise.all([
        tryCatch(
          ctx.db.album.findUnique({
            where: { id: input.id },
            include: {
              artists: {
                where: { role: "primary" },
                include: { artist: true },
              },
            },
          }),
        ),
        tryCatch(
          ctx.db.$queryRaw<AlbumMetrics[]>(Prisma.sql`
            SELECT
              COUNT(*)::float8 AS "plays",
              COALESCE(SUM(playback."duration"), 0)::float8 AS "duration",
              COUNT(DISTINCT track."id")::float8 AS "tracks",
              artist."id" AS "artistId",
              artist."name" AS "artistName",
              artist."image" AS "artistImage"
            FROM playback
            JOIN track ON playback."trackId" = track."id"
            JOIN artist_track ON track."id" = artist_track."trackId" AND artist_track."role" = 'primary'
            LEFT JOIN artist ON artist_track."artistId" = artist."id"
            WHERE track."albumId" = ${input.id}
              AND playback."userId" = ${ctx.session.user.id}
              AND timezone(${timezone}, playback."playedAt") >= timezone(${timezone}, ${start})
              AND timezone(${timezone}, playback."playedAt") <= timezone(${timezone}, ${end})
            GROUP BY artist."id", artist."name", artist."image"
          `),
        ),
      ]);

      if (album.error || metrics.error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get album",
        });
      }
      if (!album.data) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Album not found" });
      }

      return {
        ...album.data,
        metrics: metrics.data?.[0] ?? {
          plays: 0,
          duration: 0,
          tracks: 0,
        },
        artistId: album.data.artists[0]?.artist.id ?? null,
        artistName: album.data.artists[0]?.artist.name ?? null,
        artistImage: album.data.artists[0]?.artist.image ?? null,
      };
    }),

  getTopTracks: protectedProcedure
    .input(albumTopInputSchema)
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
            WHERE track."albumId" = ${input.id}
              AND playback."userId" = ${userId}
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
          LEFT JOIN artist_track ON track."id" = artist_track."trackId" AND artist_track."role" = 'primary'
          LEFT JOIN artist ON artist_track."artistId" = artist."id"
          WHERE track."albumId" = ${input.id}
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
        items: (tracks.data ?? []).map((row) => ({
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
        WHERE track."albumId" = ${input.id} AND playback."userId" = ${ctx.session.user.id}
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
        WHERE track."albumId" = ${input.id} AND playback."userId" = ${ctx.session.user.id}
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
          track: { albumId: input.id },
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
