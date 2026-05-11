import z from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { periodSchema } from "../lib";
import { getPeriods } from "@/lib/periods";
import { tryCatch } from "@/lib/try-catch";
import { Prisma } from "generated/prisma";
import { TRPCError } from "@trpc/server";
const sortSchema = z.enum(["count", "duration"]);

const topItemsSchema = periodSchema.extend({
  limit: z.number().int().min(1).max(50).default(20),
  sortBy: sortSchema.default("duration"),
  cursorValue: z.number().nonnegative().optional(),
  cursorId: z.number().optional(),
});

export const topRouter = createTRPCRouter({
  getTopTracks: protectedProcedure
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
            id: number;
            name: string;
            image: string | null;
            albumId: number | null;
            albumName: string | null;
            duration: number;
            count: number;
            artistNames: string[] | null;
            artistIds: number[] | null;
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
              ARRAY[]::integer[]
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
      const totals = totalsResult.data?.[0] ?? {
        totalCount: 0,
        totalDuration: 0,
      };

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
            id: number;
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
      const totals = totalsResult.data?.[0] ?? {
        totalCount: 0,
        totalDuration: 0,
      };

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
        input.cursorValue !== undefined && input.cursorId !== undefined
          ? Prisma.sql`
              HAVING (
                ${sortColumn} < ${input.cursorValue}
                OR (${sortColumn} = ${input.cursorValue} AND COALESCE(album."id", 9999999999) > ${input.cursorId})
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
            id: number | null;
            name: string;
            image: string | null;
            duration: number;
            count: number;
            artistNames: string[] | null;
            artistIds: number[] | null;
          }[]
        >(Prisma.sql`
          SELECT
            album."id" AS "id",
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
              ARRAY[]::integer[]
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
          ORDER BY ${sortColumn} DESC, COALESCE(album."id", 9999999999) ASC
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
      const totals = totalsResult.data?.[0] ?? {
        totalCount: 0,
        totalDuration: 0,
      };

      return {
        items: items.map((row) => ({
          id: row.id ?? 0,
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
                cursorId: last.id ?? 0,
                cursorValue:
                  input.sortBy === "count" ? Number(last.count) : last.duration,
              }
            : null,
      };
    }),
  getTopGenres: protectedProcedure
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
                OR (${sortColumn} = ${input.cursorValue} AND genre."id" > ${input.cursorId})
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
          message: "Failed to get top genres totals",
        });
      }

      const rows = await tryCatch(
        ctx.db.$queryRaw<
          {
            id: number;
            name: string;
            duration: number;
            count: number;
          }[]
        >(Prisma.sql`
          SELECT
            genre."id",
            genre."name",
            SUM(playback."duration")::float8 AS "duration",
            COUNT(*)::float8 AS "count"
          FROM playback
          JOIN track ON playback."trackId" = track."id"
          JOIN artist_track ON track."id" = artist_track."trackId" AND artist_track."role" = 'primary'
          JOIN artist_genres ON artist_genres."artistId" = artist_track."artistId"
          JOIN genre ON genre."id" = artist_genres."genreId"
          WHERE playback."userId" = ${userId}
            AND timezone(${timezone}, playback."playedAt") >= timezone(${timezone}, ${start})
            AND timezone(${timezone}, playback."playedAt") <= timezone(${timezone}, ${end})
          GROUP BY genre."id", genre."name"
          ${cursorCondition}
          ORDER BY ${sortColumn} DESC, genre."id" ASC
          LIMIT ${limit + 1}
        `),
      );

      if (rows.error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get top genres",
        });
      }

      const hasMore = rows.data.length > limit;
      const items = hasMore ? rows.data.slice(0, limit) : rows.data;
      const last = items[items.length - 1];
      const totals = totalsResult.data?.[0] ?? {
        totalCount: 0,
        totalDuration: 0,
      };

      return {
        items: items.map((row) => ({
          id: row.id,
          title: row.name,
          image: null,
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
  getTopPlaylists: protectedProcedure
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
                OR (${sortColumn} = ${input.cursorValue} AND playlist."id" > ${input.cursorId})
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
            JOIN playlist ON (playback."contextId" = playlist."spotifyId" AND playback."context" IN ('playlist', 'collection'))
            WHERE playback."userId" = ${userId}
              AND timezone(${timezone}, playback."playedAt") >= timezone(${timezone}, ${start})
              AND timezone(${timezone}, playback."playedAt") <= timezone(${timezone}, ${end})
          `,
        ),
      );
      if (totalsResult.error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get top playlists totals",
        });
      }

      const rows = await tryCatch(
        ctx.db.$queryRaw<
          {
            id: number;
            name: string;
            image: string | null;
            duration: number;
            count: number;
          }[]
        >(Prisma.sql`
          SELECT
            playlist."id",
            playlist."name",
            playlist."image",
            SUM(playback."duration")::float8 AS "duration",
            COUNT(*)::float8 AS "count"
          FROM playback
          JOIN playlist ON (playback."contextId" = playlist."spotifyId" AND playback."context" IN ('playlist', 'collection'))
          WHERE playback."userId" = ${userId}
            AND timezone(${timezone}, playback."playedAt") >= timezone(${timezone}, ${start})
            AND timezone(${timezone}, playback."playedAt") <= timezone(${timezone}, ${end})
          GROUP BY playlist."id", playlist."name", playlist."image"
          ${cursorCondition}
          ORDER BY ${sortColumn} DESC, playlist."id" ASC
          LIMIT ${limit + 1}
        `),
      );
      if (rows.error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get top playlists",
        });
      }
      const hasMore = rows.data.length > limit;
      const items = hasMore ? rows.data.slice(0, limit) : rows.data;
      const last = items[items.length - 1];
      const totals = totalsResult.data?.[0] ?? {
        totalCount: 0,
        totalDuration: 0,
      };
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
});
