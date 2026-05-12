import { createTRPCRouter, protectedProcedure } from "../trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { tryCatch } from "@/lib/try-catch";
import { Prisma } from "generated/prisma";
import { getPeriods } from "@/lib/periods";
import { periodSchema } from "@/server/api/lib";
import type { PlaybackRow } from "@/server/api/types/playback-row";

type TrackMetrics = {
  plays: number;
  duration: number;
};

export const trackRouter = createTRPCRouter({
  get: protectedProcedure
    .input(periodSchema.extend({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const { start, end } = getPeriods(input.period, input.from, input.to);
      const timezone = ctx.session.user.timezone;
      const [track, metrics] = await Promise.all([
        tryCatch(
          ctx.db.track.findUnique({
            where: { id: input.id },
            include: {
              album: {
                include: {
                  artists: {
                    where: { role: "primary" },
                    include: { artist: true },
                  },
                },
              },
              artists: {
                where: { role: "primary" },
                include: { artist: true },
              },
            },
          }),
        ),
        tryCatch(
          ctx.db.$queryRaw<TrackMetrics[]>(Prisma.sql`
            SELECT
              COUNT(*)::float8 AS "plays",
              COALESCE(SUM(playback."duration"), 0)::float8 AS "duration"
            FROM playback
            WHERE playback."trackId" = ${input.id}
              AND playback."userId" = ${ctx.session.user.id}
              AND timezone(${timezone}, playback."playedAt") >= timezone(${timezone}, ${start})
              AND timezone(${timezone}, playback."playedAt") <= timezone(${timezone}, ${end})
          `),
        ),
      ]);

      if (track.error || metrics.error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get track",
        });
      }
      if (!track.data) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Track not found" });
      }

      return {
        ...track.data,
        metrics: metrics.data?.[0] ?? {
          plays: 0,
          duration: 0,
        },
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
        WHERE track."id" = ${input.id} AND playback."userId" = ${ctx.session.user.id}
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
        WHERE track."id" = ${input.id} AND playback."userId" = ${ctx.session.user.id}
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
              ARRAY_AGG(DISTINCT artist."name") FILTER (WHERE artist."name" IS NOT NULL),
              ARRAY[]::text[]
            ) AS "artistNames",
            COALESCE(
              ARRAY_AGG(DISTINCT artist."id") FILTER (WHERE artist."id" IS NOT NULL),
              ARRAY[]::integer[]
            ) AS "artistIds",
            album."id" AS "albumId",
            album."name" AS "albumName",
            playlist."id" AS "playlistId",
            playlist."name" AS "playlistName",
            playlist."image" AS "playlistImage"
          FROM playback
          JOIN track ON playback."trackId" = track."id"
          LEFT JOIN artist_track ON track."id" = artist_track."trackId" AND artist_track."role" = 'primary'
          LEFT JOIN artist ON artist_track."artistId" = artist."id"
          LEFT JOIN album ON track."albumId" = album."id"
          LEFT JOIN playlist ON playback."contextId" = playlist."spotifyId" AND playback."context" IN ('playlist', 'collection')
          WHERE track."id" = ${input.id} AND playback."userId" = ${userId}
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
