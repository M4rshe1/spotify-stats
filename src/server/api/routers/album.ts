import { createTRPCRouter, protectedProcedure } from "../trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { tryCatch } from "@/lib/try-catch";
import { getPeriods } from "@/lib/periods";
import { periodSchema } from "@/server/api/lib";
import type { PlaybackRow, TopTrackRow } from "@/server/api/types/sql-rows";
import { Prisma } from "generated/prisma";
import { getTrackArtistsLateralSql } from "../sql-snippets";

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
            WHERE track."albumId" = ${input.id}
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
            WHERE track."albumId" = ${input.id}
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
      const rows = await tryCatch(
        ctx.db.$queryRaw<PlaybackRow[]>(Prisma.sql`
          SELECT 
            playback."id",
            playback."playedAt", 
            track."id" AS "trackId",
            track."name" AS "trackName",
            track."image" AS "trackImage",
            SUM(playback."duration")::float8 AS "duration",
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
            playback."duration" AS "duration",
            playlist."id" AS "playlistId",
            playlist."name" AS "playlistName",
            playlist."image" AS "playlistImage"
          FROM playback
          JOIN track ON playback."trackId" = track."id"
          JOIN artist_track AS filter_at ON track."id" = filter_at."trackId" AND filter_at."role" = 'primary'
          LEFT JOIN artist_track ON track."id" = artist_track."trackId" 
          LEFT JOIN artist ON artist_track."artistId" = artist."id"
          LEFT JOIN album ON track."albumId" = album."id"
          LEFT JOIN playlist on playback."contextId" = playlist."spotifyId" AND playback."context" IN ('playlist', 'collection')
          WHERE track."albumId" = ${input.id} AND playback."userId" = ${ctx.session.user.id}
          GROUP BY playback."id", track."id", track."name", track."image", album."id", album."name", playback."duration", playlist."id", playlist."name", playlist."image"
          ORDER BY playback."playedAt" DESC
          LIMIT 10
        `),
      );

      // const rows = await ctx.db.playback.findMany({
      //   where: {
      //     userId: ctx.session.user.id,
      //     track: { albumId: input.id },
      //   },
      //   orderBy: { playedAt: "desc" },
      //   take: 10,
      //   select: {
      //     id: true,
      //     playedAt: true,
      //     track: {
      //       select: {
      //         id: true,
      //         name: true,
      //         image: true,
      //         duration: true,
      //         album: { select: { id: true, name: true } },
      //         artists: {
      //           where: { role: "primary" },
      //           orderBy: { artist: { name: "asc" } },
      //           select: {
      //             artist: { select: { id: true, name: true } },
      //           },
      //         },
      //       },
      //     },
      //   },
      // });

      return (rows.data ?? []).map((p) => ({
        id: p.id,
        trackId: p.trackId,
        image: p.trackImage,
        title: p.trackName,
        artists: [
          ...(p.artistNames ?? []).map((name, index) => ({
            id: p.artistIds?.[index] ?? null,
            name,
            role: p.artistRoles?.[index] ?? "feature",
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
