import { createTRPCRouter, protectedProcedure } from "../trpc";
import { periodSchema, rowToArtists } from "../lib";
import { getPeriods } from "@/lib/periods";
import { tryCatch } from "@/lib/try-catch";
import { Prisma } from "generated/prisma";
import { TRPCError } from "@trpc/server";
import type {
  FirstListenAlbumRow,
  FirstListenArtistRow,
  FirstListenGenreRow,
  FirstListenPlaylistRow,
  FirstListenTrackRow,
} from "@/server/api/types/sql-rows";
import {
  getAlbumArtistsLateralSql,
  getTrackArtistsLateralSql,
} from "../sql-snippets";

export const firstRouter = createTRPCRouter({
  getFirstListenTracks: protectedProcedure
    .input(periodSchema)
    .query(async ({ ctx, input }) => {
      const { start, end } = getPeriods(input.period, input.from, input.to);
      const timezone = ctx.session.user.timezone;
      const userId = ctx.session.user.id;

      const rows = await tryCatch(
        ctx.db.$queryRaw<FirstListenTrackRow[]>(Prisma.sql`
          SELECT
            track."id",
            track."name",
            track."image",
            track."duration",
            MIN(playback."playedAt") AS "playedAt",
            artists."names" AS "artistNames",
            artists."ids" AS "artistIds",
            artists."roles" AS "artistRoles"
          FROM playback
          JOIN track ON playback."trackId" = track."id"
          ${getTrackArtistsLateralSql(Prisma.sql`track."id"`)}
          WHERE playback."userId" = ${userId}
          GROUP BY track."id", track."name", track."image", track."duration", artists."names", artists."ids", artists."roles"
          HAVING timezone(${timezone}, MAX(playback."playedAt")) <= timezone(${timezone}, ${end}) 
            AND timezone(${timezone}, MIN(playback."playedAt")) >= timezone(${timezone}, ${start})
          ORDER BY MIN(playback."playedAt") ASC
        `),
      );

      if (rows.error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get first listen tracks",
        });
      }

      return {
        items: rows.data.map((row) => ({
          id: row.id,
          name: row.name,
          image: row.image,
          artists: rowToArtists(row),
          duration: row.duration,
          playedAt: row.playedAt,
        })),
      };
    }),

  getFirstListenArtists: protectedProcedure
    .input(periodSchema)
    .query(async ({ ctx, input }) => {
      const { start, end } = getPeriods(input.period, input.from, input.to);
      const timezone = ctx.session.user.timezone;
      const userId = ctx.session.user.id;

      const rows = await tryCatch(
        ctx.db.$queryRaw<FirstListenArtistRow[]>(Prisma.sql`
          SELECT
            artist."id",
            artist."name",
            artist."image",
            MIN(playback."playedAt") AS "playedAt"
          FROM playback
          JOIN track ON playback."trackId" = track."id"
          JOIN artist_track ON track."id" = artist_track."trackId" AND artist_track."role" = 'primary'
          JOIN artist ON artist_track."artistId" = artist."id"
          WHERE playback."userId" = ${userId}
          GROUP BY artist."id", artist."name", artist."image"
          HAVING timezone(${timezone}, MAX(playback."playedAt")) <= timezone(${timezone}, ${end})
            AND timezone(${timezone}, MIN(playback."playedAt")) >= timezone(${timezone}, ${start})
          ORDER BY MIN(playback."playedAt") ASC
        `),
      );

      if (rows.error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get first listen artists",
        });
      }

      return {
        items: rows.data.map((row) => ({
          id: row.id,
          name: row.name,
          image: row.image,
          playedAt: row.playedAt,
        })),
      };
    }),

  getFirstListenAlbums: protectedProcedure
    .input(periodSchema)
    .query(async ({ ctx, input }) => {
      const { start, end } = getPeriods(input.period, input.from, input.to);
      const timezone = ctx.session.user.timezone;
      const userId = ctx.session.user.id;

      const rows = await tryCatch(
        ctx.db.$queryRaw<FirstListenAlbumRow[]>(Prisma.sql`
          SELECT
            album."id",
            COALESCE(album."name", 'Unknown Album') AS "name",
            album."image",
            MIN(playback."playedAt") AS "playedAt",
            artists."names" AS "artistNames",
            artists."ids" AS "artistIds",
            artists."roles" AS "artistRoles"
          FROM playback
          JOIN track ON playback."trackId" = track."id"
          LEFT JOIN album ON track."albumId" = album."id"
          ${getAlbumArtistsLateralSql(Prisma.sql`album."id"`)}
          WHERE playback."userId" = ${userId}
          GROUP BY album."id", album."name", album."image", artists."names", artists."ids", artists."roles"
          HAVING timezone(${timezone}, MAX(playback."playedAt")) <= timezone(${timezone}, ${end})
            AND timezone(${timezone}, MIN(playback."playedAt")) >= timezone(${timezone}, ${start})
          ORDER BY MIN(playback."playedAt") ASC
        `),
      );

      if (rows.error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get first listen albums",
        });
      }

      return {
        items: rows.data.map((row) => ({
          id: row.id ?? 0,
          name: row.name,
          image: row.image,
          artists: rowToArtists(row),
          playedAt: row.playedAt,
        })),
      };
    }),

  getFirstListenGenres: protectedProcedure
    .input(periodSchema)
    .query(async ({ ctx, input }) => {
      const { start, end } = getPeriods(input.period, input.from, input.to);
      const timezone = ctx.session.user.timezone;
      const userId = ctx.session.user.id;

      const rows = await tryCatch(
        ctx.db.$queryRaw<FirstListenGenreRow[]>(Prisma.sql`
          SELECT
            genre."id",
            genre."name",
            MIN(playback."playedAt") AS "playedAt"
          FROM playback
          JOIN track ON playback."trackId" = track."id"
          JOIN artist_track ON track."id" = artist_track."trackId" AND artist_track."role" = 'primary'
          JOIN artist_genre ON artist_genre."artistId" = artist_track."artistId"
          JOIN genre ON genre."id" = artist_genre."genreId"
          WHERE playback."userId" = ${userId}
          GROUP BY genre."id", genre."name"
          HAVING timezone(${timezone}, MAX(playback."playedAt")) <= timezone(${timezone}, ${end})
            AND timezone(${timezone}, MIN(playback."playedAt")) >= timezone(${timezone}, ${start})
          ORDER BY MIN(playback."playedAt") ASC
        `),
      );

      if (rows.error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get first listen genres",
        });
      }

      return {
        items: rows.data.map((row) => ({
          id: row.id,
          name: row.name,
          image: null,
          playedAt: row.playedAt,
        })),
      };
    }),

  getFirstListenPlaylists: protectedProcedure
    .input(periodSchema)
    .query(async ({ ctx, input }) => {
      const { start, end } = getPeriods(input.period, input.from, input.to);
      const timezone = ctx.session.user.timezone;
      const userId = ctx.session.user.id;

      const rows = await tryCatch(
        ctx.db.$queryRaw<FirstListenPlaylistRow[]>(Prisma.sql`
          SELECT
            playlist."id",
            playlist."name",
            playlist."image",
            MIN(playback."playedAt") AS "playedAt"
          FROM playback
          JOIN playlist ON (playback."contextId" = playlist."spotifyId" AND playback."context" IN ('playlist', 'collection'))
          WHERE playback."userId" = ${userId}
          GROUP BY playlist."id", playlist."name", playlist."image"
          HAVING timezone(${timezone}, MAX(playback."playedAt")) <= timezone(${timezone}, ${end})
            AND timezone(${timezone}, MIN(playback."playedAt")) >= timezone(${timezone}, ${start})
          ORDER BY MIN(playback."playedAt") ASC
        `),
      );

      if (rows.error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get first listen playlists",
        });
      }

      return {
        items: rows.data.map((row) => ({
          id: row.id,
          name: row.name,
          image: row.image,
          playedAt: row.playedAt,
        })),
      };
    }),
});
