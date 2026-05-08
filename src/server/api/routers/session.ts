import { createTRPCRouter, protectedProcedure } from "../trpc";
import { periodSchema } from "../lib";
import { getPeriods } from "@/lib/periods";
import { tryCatch } from "@/lib/try-catch";
import { Prisma } from "generated/prisma";
import { TRPCError } from "@trpc/server";
import z from "zod";

export const sessionRouter = createTRPCRouter({
  getLongestSessions: protectedProcedure
    .input(periodSchema)
    .query(async ({ ctx, input }) => {
      const { start, end } = getPeriods(input.period, input.from, input.to);
      const timezone = ctx.session.user.timezone;
      const userId = ctx.session.user.id;

      const sessionsResult = await tryCatch(
        ctx.db.$queryRaw<
          {
            sessionId: number;
            sessionStart: Date;
            sessionEnd: Date;
            duration: number;
            plays: number;
            uniqueTracks: number;
          }[]
        >(Prisma.sql`
          WITH ordered AS (
            SELECT
              playback."id",
              playback."trackId",
              playback."playedAt",
              playback."duration",
              playback."playedAt" + (playback."duration" * INTERVAL '1 millisecond') AS "endedAt"
            FROM playback
            WHERE playback."userId" = ${userId}
              AND timezone(${timezone}, playback."playedAt") >= timezone(${timezone}, ${start})
              AND timezone(${timezone}, playback."playedAt") <= timezone(${timezone}, ${end})
          ),
          flagged AS (
            SELECT
              ordered.*,
              CASE
                WHEN LAG(ordered."endedAt") OVER (ORDER BY ordered."playedAt", ordered."id") IS NULL THEN 1
                WHEN ordered."playedAt" - LAG(ordered."endedAt") OVER (ORDER BY ordered."playedAt", ordered."id") > INTERVAL '30 minutes' THEN 1
                ELSE 0
              END AS "newSession"
            FROM ordered
          ),
          grouped AS (
            SELECT
              *,
              SUM("newSession") OVER (ORDER BY "playedAt", "id") AS "sessionId"
            FROM flagged
          )
          SELECT
            "sessionId"::int AS "sessionId",
            MIN("playedAt") AS "sessionStart",
            MAX("endedAt") AS "sessionEnd",
            (EXTRACT(EPOCH FROM (MAX("endedAt") - MIN("playedAt"))) * 1000)::float8 AS "duration",
            COUNT(*)::float8 AS "plays",
            COUNT(DISTINCT "trackId")::float8 AS "uniqueTracks"
          FROM grouped
          GROUP BY "sessionId"
          ORDER BY "duration" DESC, MIN("playedAt") DESC
          LIMIT 5
        `),
      );

      if (sessionsResult.error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get longest listening sessions",
        });
      }

      return sessionsResult.data.map((session) => ({
        sessionId: session.sessionId,
        startAt: session.sessionStart,
        endAt: session.sessionEnd,
        duration: session.duration,
        plays: session.plays,
        uniqueTracks: session.uniqueTracks,
      }));
    }),
  getSessionTracks: protectedProcedure
    .input(
      z.object({
        startAt: z.date(),
        endAt: z.date(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const tracksResult = await tryCatch(
        ctx.db.$queryRaw<
          {
            playbackId: string;
            playedAt: Date;
            duration: number;
            trackId: number;
            trackName: string;
            trackImage: string | null;
            artistNames: string[] | null;
            artistIds: number[] | null;
          }[]
        >(Prisma.sql`
          SELECT
            playback."id" AS "playbackId",
            playback."playedAt",
            playback."duration",
            track."id" AS "trackId",
            track."name" AS "trackName",
            track."image" AS "trackImage",
            COALESCE(
              ARRAY_AGG(artist."name" ORDER BY artist."name") FILTER (WHERE artist."name" IS NOT NULL),
              ARRAY[]::text[]
            ) AS "artistNames",
            COALESCE(
              ARRAY_AGG(artist."id" ORDER BY artist."name") FILTER (WHERE artist."id" IS NOT NULL),
              ARRAY[]::integer[]
            ) AS "artistIds"
          FROM playback
          JOIN track ON playback."trackId" = track."id"
          LEFT JOIN artist_track ON track."id" = artist_track."trackId" AND artist_track."role" = 'primary'
          LEFT JOIN artist ON artist_track."artistId" = artist."id"
          WHERE playback."userId" = ${userId}
            AND playback."playedAt" >= ${input.startAt}
            AND playback."playedAt" <= ${input.endAt}
          GROUP BY
            playback."id",
            playback."playedAt",
            playback."duration",
            track."id",
            track."name",
            track."image"
          ORDER BY playback."playedAt" ASC, playback."id" ASC
        `),
      );

      if (tracksResult.error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get session tracks",
        });
      }

      return tracksResult.data.map((track) => ({
        playbackId: track.playbackId,
        playedAt: track.playedAt,
        duration: track.duration,
        trackId: track.trackId,
        title: track.trackName,
        image: track.trackImage,
        artists: track.artistNames ?? [],
        artistIds: track.artistIds ?? [],
      }));
    }),
});
