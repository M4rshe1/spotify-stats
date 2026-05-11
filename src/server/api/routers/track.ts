import { createTRPCRouter, protectedProcedure } from "../trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { tryCatch } from "@/lib/try-catch";
import { Prisma } from "generated/prisma";
import { getPeriods } from "@/lib/periods";
import { periodSchema } from "@/server/api/lib";

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
      const rows = await ctx.db.playback.findMany({
        where: {
          userId: ctx.session.user.id,
          trackId: input.id,
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
