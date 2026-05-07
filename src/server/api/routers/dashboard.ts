import { createTRPCRouter, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { getPeriods } from "@/lib/periods";
import { tryCatch } from "@/lib/try-catch";
import { Prisma } from "generated/prisma";
import { periodSchema } from "@/server/api/lib";
import z from "zod";

const sortSchema = z.enum(["count", "duration"]);

const topItemsSchema = periodSchema.extend({
  limit: z.number().int().min(1).max(50).default(20),
  sortBy: sortSchema.default("duration"),
  cursorValue: z.number().nonnegative().optional(),
  cursorId: z.string().optional(),
});

export const dashboardRouter = createTRPCRouter({
  getTracksMetric: protectedProcedure
    .input(periodSchema)
    .query(async ({ ctx, input }) => {
      const { start, end, previousStart } = getPeriods(
        input.period,
        input.from,
        input.to,
      );
      const timezone = ctx.session.user.timezone;
      const userId = ctx.session.user.id;

      const [period, previousPeriod] = await Promise.all([
        tryCatch(
          ctx.db.$queryRaw<
            { duration: number | null; tracks: bigint }[]
          >(Prisma.sql`
              SELECT
                SUM(duration)::float8 AS duration,
                COUNT(*)::bigint AS tracks
              FROM playback
              WHERE "userId" = ${userId}
                AND timezone(${timezone}, "playedAt") >= timezone(${timezone}, ${start})
                AND timezone(${timezone}, "playedAt") <= timezone(${timezone}, ${end})
          `),
        ),
        tryCatch(
          ctx.db.$queryRaw<
            { duration: number | null; tracks: bigint }[]
          >(Prisma.sql`
              SELECT
                SUM(duration)::float8 AS duration,
                COUNT(*)::bigint AS tracks
              FROM playback
              WHERE "userId" = ${userId}
                AND timezone(${timezone}, "playedAt") >= timezone(${timezone}, ${previousStart})
                AND timezone(${timezone}, "playedAt") < timezone(${timezone}, ${start})
          `),
        ),
      ]);
      if (period.error || previousPeriod.error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get tracks listened",
        });
      }
      const currentMetrics = period.data?.[0];
      const previousMetrics = previousPeriod.data?.[0];
      return {
        tracks: Number(currentMetrics?.tracks ?? 0n),
        previousTracks: Number(previousMetrics?.tracks ?? 0n),
      };
    }),
  getDurationMetric: protectedProcedure
    .input(periodSchema)
    .query(async ({ ctx, input }) => {
      const { start, end, previousStart } = getPeriods(
        input.period,
        input.from,
        input.to,
      );
      const timezone = ctx.session.user.timezone;
      const userId = ctx.session.user.id;

      const [period, previousPeriod] = await Promise.all([
        tryCatch(
          ctx.db.$queryRaw<
            { duration: number | null; tracks: bigint }[]
          >(Prisma.sql`
              SELECT
                SUM(duration)::float8 AS duration,
                COUNT(*)::bigint AS tracks
              FROM playback
              WHERE "userId" = ${userId}
                AND timezone(${timezone}, "playedAt") >= timezone(${timezone}, ${start})
                AND timezone(${timezone}, "playedAt") <= timezone(${timezone}, ${end})
            `),
        ),
        tryCatch(
          ctx.db.$queryRaw<
            { duration: number | null; tracks: bigint }[]
          >(Prisma.sql`
              SELECT
                SUM(duration)::float8 AS duration,
                COUNT(*)::bigint AS tracks
              FROM playback
              WHERE "userId" = ${userId}
                AND timezone(${timezone}, "playedAt") >= timezone(${timezone}, ${previousStart})
                AND timezone(${timezone}, "playedAt") < timezone(${timezone}, ${start})
            `),
        ),
      ]);
      if (period.error || previousPeriod.error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get duration listened",
        });
      }
      const currentMetrics = period.data?.[0];
      const previousMetrics = previousPeriod.data?.[0];
      return {
        duration: currentMetrics?.duration ?? 0,
        previousDuration: previousMetrics?.duration ?? 0,
      };
    }),
  getArtistsMetric: protectedProcedure
    .input(periodSchema)
    .query(async ({ ctx, input }) => {
      const { start, end, previousStart } = getPeriods(
        input.period,
        input.from,
        input.to,
      );
      const timezone = ctx.session.user.timezone;
      const userId = ctx.session.user.id;

      const [artists, previousArtists] = await Promise.all([
        tryCatch(
          ctx.db.$queryRaw<{ artists: bigint }[]>(Prisma.sql`
              SELECT COUNT(DISTINCT artist_track."artistId")::bigint AS artists
              FROM playback
              JOIN track ON playback."trackId" = track."id"
              JOIN artist_track ON track."id" = artist_track."trackId" and artist_track."role" = 'primary'
              JOIN artist ON artist_track."artistId" = artist."id"
              WHERE playback."userId" = ${userId}
                AND timezone(${timezone}, "playedAt") >= timezone(${timezone}, ${start})
                AND timezone(${timezone}, "playedAt") <= timezone(${timezone}, ${end})
            `),
        ),
        tryCatch(
          ctx.db.$queryRaw<{ artists: bigint }[]>(Prisma.sql`
              SELECT COUNT(DISTINCT artist_track."artistId")::bigint AS artists
              FROM playback
              JOIN track ON playback."trackId" = track."id"
              JOIN artist_track ON track."id" = artist_track."trackId" and artist_track."role" = 'primary'
              JOIN artist ON artist_track."artistId" = artist."id"
              WHERE playback."userId" = ${userId}
                AND timezone(${timezone}, "playedAt") >= timezone(${timezone}, ${previousStart})
                AND timezone(${timezone}, "playedAt") < timezone(${timezone}, ${start})
            `),
        ),
      ]);
      if (artists.error || previousArtists.error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get artists listened",
        });
      }
      const currentArtists = artists.data?.[0];
      const previousArtistsMetrics = previousArtists.data?.[0];
      return {
        artists: Number(currentArtists?.artists ?? 0n),
        previousArtists: Number(previousArtistsMetrics?.artists ?? 0n),
      };
    }),
  getTopTrack: protectedProcedure
    .input(periodSchema)
    .query(async ({ ctx, input }) => {
      const { start, end } = getPeriods(input.period, input.from, input.to);
      const timezone = ctx.session.user.timezone;
      const userId = ctx.session.user.id;
      const topTrack = await tryCatch(
        ctx.db.$queryRaw<
          { trackId: string; duration: number; tracks: bigint }[]
        >(
          Prisma.sql`
            SELECT
              "trackId",
              SUM(duration)::float8 AS duration,
              COUNT(*)::bigint AS tracks
            FROM playback
            WHERE "userId" = ${userId}
              AND timezone(${timezone}, "playedAt") >= timezone(${timezone}, ${start})
              AND timezone(${timezone}, "playedAt") <= timezone(${timezone}, ${end})
            GROUP BY "trackId"
            ORDER BY SUM(duration) DESC
            LIMIT 1
          `,
        ),
      );
      if (topTrack.error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get top track",
        });
      }
      const track = await tryCatch(
        ctx.db.track.findUnique({
          where: {
            id: topTrack.data?.[0]?.trackId,
          },
        }),
      );
      if (track.error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get track",
        });
      }
      return {
        track: track.data,
        duration: topTrack.data?.[0]?.duration ?? 0,
        tracks: Number(topTrack.data?.[0]?.tracks ?? 0n),
      };
    }),
  getTopArtist: protectedProcedure
    .input(periodSchema)
    .query(async ({ ctx, input }) => {
      const { start, end } = getPeriods(input.period, input.from, input.to);
      const timezone = ctx.session.user.timezone;
      const userId = ctx.session.user.id;
      const groupResult = await tryCatch(
        ctx.db.$queryRaw<
          { artistId: string; tracks: bigint; duration: number }[]
        >(
          Prisma.sql`
            SELECT
              artist_track."artistId",
              COUNT(*)::bigint AS "tracks",
              SUM(playback."duration")::float8 AS duration
            FROM playback
            JOIN track ON playback."trackId" = track."id"
            JOIN artist_track ON track."id" = artist_track."trackId" and artist_track."role" = 'primary'
            WHERE playback."userId" = ${userId}
              AND timezone(${timezone}, "playedAt") >= timezone(${timezone}, ${start})
              AND timezone(${timezone}, "playedAt") <= timezone(${timezone}, ${end})
            GROUP BY artist_track."artistId"
            ORDER BY SUM(playback."duration") DESC
            LIMIT 1
          `,
        ),
      );
      if (groupResult.error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get top artist",
        });
      }
      const topTrackGroup = await tryCatch(
        ctx.db.$queryRaw<{ differentTracks: bigint }[]>(Prisma.sql`
          SELECT COUNT(DISTINCT playback."trackId")::bigint AS "differentTracks"
          FROM playback
          JOIN track ON playback."trackId" = track."id"
          JOIN artist_track ON track."id" = artist_track."trackId" and artist_track."role" = 'primary'
          WHERE playback."userId" = ${userId}
            AND artist_track."artistId" = ${groupResult.data?.[0]?.artistId ?? ""}
            AND timezone(${timezone}, "playedAt") >= timezone(${timezone}, ${start})
            AND timezone(${timezone}, "playedAt") <= timezone(${timezone}, ${end})
        `),
      );
      if (topTrackGroup.error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get top artist",
        });
      }
      const artist = await tryCatch(
        ctx.db.artist.findFirst({
          where: {
            id: groupResult.data?.[0]?.artistId,
          },
        }),
      );

      if (artist.error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get artist for top track",
        });
      }
      if (!artist.data) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Artist for top track not found",
        });
      }
      return {
        artist: {
          ...artist.data,
        },
        differentTracks: Number(topTrackGroup.data?.[0]?.differentTracks ?? 0n),
        tracks: Number(groupResult.data?.[0]?.tracks ?? 0n),
        duration: groupResult.data?.[0]?.duration ?? 0,
      };
    }),
  getTopSongs: protectedProcedure
    .input(topItemsSchema)
    .query(async ({ ctx, input }) => {
      const { start, end } = getPeriods(input.period, input.from, input.to);
      const timezone = ctx.session.user.timezone;
      const userId = ctx.session.user.id;
      const limit = input.limit;
      const sortColumn =
        input.sortBy === "count"
          ? Prisma.sql`COUNT(*)::float8`
          : Prisma.sql`SUM(playback."duration")::float8`;
      const cursorCondition =
        input.cursorValue !== undefined && input.cursorId
          ? Prisma.sql`
              HAVING (
                ${sortColumn} < ${input.cursorValue}
                OR (${sortColumn} = ${input.cursorValue} AND track."id" > ${input.cursorId})
              )
            `
          : Prisma.empty;
      const totalsResult = await tryCatch(
        ctx.db.$queryRaw<{ totalCount: number; totalDuration: number }[]>(
          Prisma.sql`
            SELECT
              COUNT(*)::float8 AS "totalCount",
              COALESCE(SUM(playback."duration"), 0)::float8 AS "totalDuration"
            FROM playback
            WHERE playback."userId" = ${userId}
              AND timezone(${timezone}, playback."playedAt") >= timezone(${timezone}, ${start})
              AND timezone(${timezone}, playback."playedAt") <= timezone(${timezone}, ${end})
          `,
        ),
      );
      if (totalsResult.error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get top songs totals",
        });
      }

      const rows = await tryCatch(
        ctx.db.$queryRaw<
          {
            id: string;
            name: string;
            image: string | null;
            albumId: string | null;
            albumName: string | null;
            duration: number;
            count: number;
            artistNames: string[] | null;
            artistIds: string[] | null;
          }[]
        >(Prisma.sql`
          SELECT
            track."id",
            track."name",
            track."image",
            album."id" AS "albumId",
            album."name" AS "albumName",
            SUM(playback."duration")::float8 AS "duration",
            COUNT(*)::float8 AS "count",
            COALESCE(
              ARRAY_AGG(DISTINCT artist."name") FILTER (WHERE artist."name" IS NOT NULL),
              ARRAY[]::text[]
            ) AS "artistNames",
            COALESCE(
              ARRAY_AGG(DISTINCT artist."id") FILTER (WHERE artist."id" IS NOT NULL),
              ARRAY[]::text[]
            ) AS "artistIds"
          FROM playback
          JOIN track ON playback."trackId" = track."id"
          LEFT JOIN album ON track."albumId" = album."id"
          LEFT JOIN artist_track ON track."id" = artist_track."trackId" AND artist_track."role" = 'primary'
          LEFT JOIN artist ON artist_track."artistId" = artist."id"
          WHERE playback."userId" = ${userId}
            AND timezone(${timezone}, playback."playedAt") >= timezone(${timezone}, ${start})
            AND timezone(${timezone}, playback."playedAt") <= timezone(${timezone}, ${end})
          GROUP BY track."id", track."name", track."image", album."id", album."name"
          ${cursorCondition}
          ORDER BY ${sortColumn} DESC, track."id" ASC
          LIMIT ${limit + 1}
        `),
      );

      if (rows.error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get top songs",
        });
      }

      const hasMore = rows.data.length > limit;
      const items = hasMore ? rows.data.slice(0, limit) : rows.data;
      const last = items[items.length - 1];
      const totals = totalsResult.data?.[0] ?? { totalCount: 0, totalDuration: 0 };

      return {
        items: items.map((row) => ({
          id: row.id,
          title: row.name,
          image: row.image,
          artists: row.artistNames ?? [],
          artistIds: row.artistIds ?? [],
          albumId: row.albumId,
          album: row.albumName ?? "Unknown Album",
          duration: row.duration,
          count: row.count,
        })),
        totalCount: totals.totalCount,
        totalDuration: totals.totalDuration,
        nextCursor:
          hasMore && last
            ? {
                cursorId: last.id,
                cursorValue:
                  input.sortBy === "count" ? Number(last.count) : last.duration,
              }
            : null,
      };
    }),
  getTopArtists: protectedProcedure
    .input(topItemsSchema)
    .query(async ({ ctx, input }) => {
      const { start, end } = getPeriods(input.period, input.from, input.to);
      const timezone = ctx.session.user.timezone;
      const userId = ctx.session.user.id;
      const limit = input.limit;
      const sortColumn =
        input.sortBy === "count"
          ? Prisma.sql`COUNT(*)::float8`
          : Prisma.sql`SUM(playback."duration")::float8`;
      const cursorCondition =
        input.cursorValue !== undefined && input.cursorId
          ? Prisma.sql`
              HAVING (
                ${sortColumn} < ${input.cursorValue}
                OR (${sortColumn} = ${input.cursorValue} AND artist."id" > ${input.cursorId})
              )
            `
          : Prisma.empty;
      const totalsResult = await tryCatch(
        ctx.db.$queryRaw<{ totalCount: number; totalDuration: number }[]>(
          Prisma.sql`
            SELECT
              COUNT(*)::float8 AS "totalCount",
              COALESCE(SUM(playback."duration"), 0)::float8 AS "totalDuration"
            FROM playback
            JOIN track ON playback."trackId" = track."id"
            JOIN artist_track ON track."id" = artist_track."trackId" AND artist_track."role" = 'primary'
            WHERE playback."userId" = ${userId}
              AND timezone(${timezone}, playback."playedAt") >= timezone(${timezone}, ${start})
              AND timezone(${timezone}, playback."playedAt") <= timezone(${timezone}, ${end})
          `,
        ),
      );
      if (totalsResult.error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get top artists totals",
        });
      }

      const rows = await tryCatch(
        ctx.db.$queryRaw<
          {
            id: string;
            name: string;
            image: string | null;
            duration: number;
            count: number;
          }[]
        >(Prisma.sql`
          SELECT
            artist."id",
            artist."name",
            artist."image",
            SUM(playback."duration")::float8 AS "duration",
            COUNT(*)::float8 AS "count"
          FROM playback
          JOIN track ON playback."trackId" = track."id"
          JOIN artist_track ON track."id" = artist_track."trackId" AND artist_track."role" = 'primary'
          JOIN artist ON artist_track."artistId" = artist."id"
          WHERE playback."userId" = ${userId}
            AND timezone(${timezone}, playback."playedAt") >= timezone(${timezone}, ${start})
            AND timezone(${timezone}, playback."playedAt") <= timezone(${timezone}, ${end})
          GROUP BY artist."id", artist."name", artist."image"
          ${cursorCondition}
          ORDER BY ${sortColumn} DESC, artist."id" ASC
          LIMIT ${limit + 1}
        `),
      );

      if (rows.error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get top artists",
        });
      }

      const hasMore = rows.data.length > limit;
      const items = hasMore ? rows.data.slice(0, limit) : rows.data;
      const last = items[items.length - 1];
      const totals = totalsResult.data?.[0] ?? { totalCount: 0, totalDuration: 0 };

      return {
        items: items.map((row) => ({
          id: row.id,
          title: row.name,
          image: row.image,
          duration: row.duration,
          count: row.count,
        })),
        totalCount: totals.totalCount,
        totalDuration: totals.totalDuration,
        nextCursor:
          hasMore && last
            ? {
                cursorId: last.id,
                cursorValue:
                  input.sortBy === "count" ? Number(last.count) : last.duration,
              }
            : null,
      };
    }),
  getTopAlbums: protectedProcedure
    .input(topItemsSchema)
    .query(async ({ ctx, input }) => {
      const { start, end } = getPeriods(input.period, input.from, input.to);
      const timezone = ctx.session.user.timezone;
      const userId = ctx.session.user.id;
      const limit = input.limit;
      const sortColumn =
        input.sortBy === "count"
          ? Prisma.sql`COUNT(*)::float8`
          : Prisma.sql`SUM(playback."duration")::float8`;
      const cursorCondition =
        input.cursorValue !== undefined && input.cursorId
          ? Prisma.sql`
              HAVING (
                ${sortColumn} < ${input.cursorValue}
                OR (${sortColumn} = ${input.cursorValue} AND COALESCE(album."id", 'unknown') > ${input.cursorId})
              )
            `
          : Prisma.empty;
      const totalsResult = await tryCatch(
        ctx.db.$queryRaw<{ totalCount: number; totalDuration: number }[]>(
          Prisma.sql`
            SELECT
              COUNT(*)::float8 AS "totalCount",
              COALESCE(SUM(playback."duration"), 0)::float8 AS "totalDuration"
            FROM playback
            JOIN track ON playback."trackId" = track."id"
            LEFT JOIN album ON track."albumId" = album."id"
            WHERE playback."userId" = ${userId}
              AND timezone(${timezone}, playback."playedAt") >= timezone(${timezone}, ${start})
              AND timezone(${timezone}, playback."playedAt") <= timezone(${timezone}, ${end})
          `,
        ),
      );
      if (totalsResult.error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get top albums totals",
        });
      }

      const rows = await tryCatch(
        ctx.db.$queryRaw<
          {
            id: string;
            name: string;
            image: string | null;
            duration: number;
            count: number;
            artistNames: string[] | null;
            artistIds: string[] | null;
          }[]
        >(Prisma.sql`
          SELECT
            COALESCE(album."id", 'unknown') AS "id",
            COALESCE(album."name", 'Unknown Album') AS "name",
            album."image",
            SUM(playback."duration")::float8 AS "duration",
            COUNT(*)::float8 AS "count",
            COALESCE(
              ARRAY_AGG(DISTINCT artist."name") FILTER (WHERE artist."name" IS NOT NULL),
              ARRAY[]::text[]
            ) AS "artistNames",
            COALESCE(
              ARRAY_AGG(DISTINCT artist."id") FILTER (WHERE artist."id" IS NOT NULL),
              ARRAY[]::text[]
            ) AS "artistIds"
          FROM playback
          JOIN track ON playback."trackId" = track."id"
          LEFT JOIN album ON track."albumId" = album."id"
          LEFT JOIN artist_track ON track."id" = artist_track."trackId" AND artist_track."role" = 'primary'
          LEFT JOIN artist ON artist_track."artistId" = artist."id"
          WHERE playback."userId" = ${userId}
            AND timezone(${timezone}, playback."playedAt") >= timezone(${timezone}, ${start})
            AND timezone(${timezone}, playback."playedAt") <= timezone(${timezone}, ${end})
          GROUP BY album."id", album."name", album."image"
          ${cursorCondition}
          ORDER BY ${sortColumn} DESC, COALESCE(album."id", 'unknown') ASC
          LIMIT ${limit + 1}
        `),
      );

      if (rows.error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get top albums",
        });
      }

      const hasMore = rows.data.length > limit;
      const items = hasMore ? rows.data.slice(0, limit) : rows.data;
      const last = items[items.length - 1];
      const totals = totalsResult.data?.[0] ?? { totalCount: 0, totalDuration: 0 };

      return {
        items: items.map((row) => ({
          id: row.id,
          title: row.name,
          image: row.image,
          artists: row.artistNames ?? [],
          artistIds: row.artistIds ?? [],
          duration: row.duration,
          count: row.count,
        })),
        totalCount: totals.totalCount,
        totalDuration: totals.totalDuration,
        nextCursor:
          hasMore && last
            ? {
                cursorId: last.id,
                cursorValue:
                  input.sortBy === "count" ? Number(last.count) : last.duration,
              }
            : null,
      };
    }),
  getRecentlyPlayed: protectedProcedure
    .input(
      periodSchema.extend({
        limit: z.number().int().min(1).max(50).default(20),
        cursorPlayedAt: z.date().optional(),
        cursorId: z.string().uuid().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { start, end } = getPeriods(input.period, input.from, input.to);
      const timezone = ctx.session.user.timezone;
      const userId = ctx.session.user.id;
      const limit = input.limit;

      const cursorCondition =
        input.cursorPlayedAt && input.cursorId
          ? Prisma.sql`
            AND (
              playback."playedAt" < ${input.cursorPlayedAt}
              OR (playback."playedAt" = ${input.cursorPlayedAt} AND playback."id" < ${input.cursorId})
            )
          `
          : Prisma.empty;

      const rows = await tryCatch(
        ctx.db.$queryRaw<
          {
            id: string;
            trackId: string;
            trackName: string;
            trackImage: string | null;
            trackDuration: number;
            playedAt: Date;
            albumId: string | null;
            albumName: string | null;
            artistNames: string[] | null;
            artistIds: string[] | null;
          }[]
        >(
          Prisma.sql`
            SELECT
              playback."id",
              track."id" AS "trackId",
              track."name" AS "trackName",
              track."image" AS "trackImage",
              track."duration" AS "trackDuration",
              playback."playedAt",
              album."id" AS "albumId",
              album."name" AS "albumName",
              COALESCE(
                ARRAY_AGG(artist."name" ORDER BY artist."name") FILTER (WHERE artist."name" IS NOT NULL),
                ARRAY[]::text[]
              ) AS "artistNames",
              COALESCE(
                ARRAY_AGG(artist."id" ORDER BY artist."name") FILTER (WHERE artist."id" IS NOT NULL),
                ARRAY[]::text[]
              ) AS "artistIds"
            FROM playback
            JOIN track ON playback."trackId" = track."id"
            LEFT JOIN album ON track."albumId" = album."id"
            LEFT JOIN artist_track ON track."id" = artist_track."trackId" AND artist_track."role" = 'primary'
            LEFT JOIN artist ON artist_track."artistId" = artist."id"
            WHERE playback."userId" = ${userId}
              AND timezone(${timezone}, playback."playedAt") >= timezone(${timezone}, ${start})
              AND timezone(${timezone}, playback."playedAt") <= timezone(${timezone}, ${end})
              ${cursorCondition}
            GROUP BY playback."id", track."id", track."name", track."image", track."duration", playback."playedAt", album."id", album."name"
            ORDER BY playback."playedAt" DESC, playback."id" DESC
            LIMIT ${limit + 1}
          `,
        ),
      );

      if (rows.error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get recently played tracks",
        });
      }

      const hasMore = rows.data.length > limit;
      const items = hasMore ? rows.data.slice(0, limit) : rows.data;
      const last = items[items.length - 1];

      return {
        items: items.map((row) => ({
          id: row.id,
          trackId: row.trackId,
          image: row.trackImage,
          title: row.trackName,
          artists: row.artistNames ?? [],
          artistIds: row.artistIds ?? [],
          duration: row.trackDuration,
          playedAt: row.playedAt,
          albumId: row.albumId,
          album: row.albumName ?? "Unknown Album",
        })),
        nextCursor:
          hasMore && last
            ? {
                cursorPlayedAt: last.playedAt,
                cursorId: last.id,
              }
            : null,
      };
    }),
});
