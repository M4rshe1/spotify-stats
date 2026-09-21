import { Prisma, type PrismaClient } from "generated/prisma";
import { getSelectedPeriodSql } from "./sql-snippets";
import { tryCatch } from "@/lib/try-catch";

type RankQueryInput = {
  db: Pick<PrismaClient, "$queryRaw">;
  userId: string;
  timezone: string;
  previousStart: Date | null;
  currentStart: Date | null;
  sortBy: "count" | "duration";
  ids: number[];
};

export function canComparePeriods(
  previousStart: Date | null | undefined,
  currentStart: Date | null | undefined,
) {
  return Boolean(
    previousStart &&
    currentStart &&
    previousStart.getTime() < currentStart.getTime(),
  );
}

function sortMetricSql(sortBy: RankQueryInput["sortBy"]) {
  return sortBy === "count"
    ? Prisma.sql`COUNT(*)::float8`
    : Prisma.sql`SUM(playback."duration")::float8`;
}

async function fetchPreviousRanks(
  db: RankQueryInput["db"],
  ids: number[],
  rankedSelect: Prisma.Sql,
) {
  const uniqueIds = [
    ...new Set(ids.filter((id) => Number.isFinite(id) && id > 0)),
  ];
  if (uniqueIds.length === 0) return new Map<number, number>();

  const result = await tryCatch(
    db.$queryRaw<{ id: number; rank: number }[]>(
      Prisma.sql`
        WITH ranked AS (
          ${rankedSelect}
        )
        SELECT ranked.id, ranked.rank
        FROM ranked
        WHERE ranked.id IN (${Prisma.join(uniqueIds)})
      `,
    ),
  );
  if (result.error) {
    return null;
  }
  return new Map(result.data.map((row) => [row.id, row.rank]));
}

export async function getPreviousRanks(
  input: RankQueryInput,
  rankedSelect: (query: RankQueryInput, sortColumn: Prisma.Sql) => Prisma.Sql,
) {
  const compareAvailable = canComparePeriods(
    input.previousStart,
    input.currentStart,
  );
  if (!compareAvailable) {
    return { compareAvailable: false, ranks: new Map<number, number>() };
  }

  const ranks = await fetchPreviousRanks(
    input.db,
    input.ids,
    rankedSelect(input, sortMetricSql(input.sortBy)),
  );
  if (!ranks) {
    return { compareAvailable: false, ranks: new Map<number, number>() };
  }
  return { compareAvailable: true, ranks };
}

export function withPreviousRanks<T extends { id: number }>(
  items: T[],
  ranks: Map<number, number>,
  compareAvailable: boolean,
): (T & { previousRank: number | null })[] {
  return items.map((item) => ({
    ...item,
    previousRank:
      compareAvailable && item.id > 0 ? (ranks.get(item.id) ?? null) : null,
  }));
}

export function previousTrackRankSelect(
  input: RankQueryInput,
  sortColumn: Prisma.Sql,
) {
  return Prisma.sql`
    SELECT
      track."id" AS id,
      ROW_NUMBER() OVER (ORDER BY ${sortColumn} DESC, track."id" ASC)::int AS rank
    FROM playback
    JOIN track ON playback."trackId" = track."id"
    WHERE playback."userId" = ${input.userId}
      AND ${getSelectedPeriodSql(input.timezone, input.previousStart, input.currentStart)}
    GROUP BY track."id"
  `;
}

export function previousArtistRankSelect(
  input: RankQueryInput,
  sortColumn: Prisma.Sql,
) {
  return Prisma.sql`
    SELECT
      artist."id" AS id,
      ROW_NUMBER() OVER (ORDER BY ${sortColumn} DESC, artist."id" ASC)::int AS rank
    FROM playback
    JOIN track ON playback."trackId" = track."id"
    JOIN artist_track ON track."id" = artist_track."trackId"
      AND artist_track."role" = 'primary'
    JOIN artist ON artist_track."artistId" = artist."id"
    WHERE playback."userId" = ${input.userId}
      AND ${getSelectedPeriodSql(input.timezone, input.previousStart, input.currentStart)}
    GROUP BY artist."id"
  `;
}

export function previousAlbumRankSelect(
  input: RankQueryInput,
  sortColumn: Prisma.Sql,
) {
  return Prisma.sql`
    SELECT
      album."id" AS id,
      ROW_NUMBER() OVER (ORDER BY ${sortColumn} DESC, album."id" ASC)::int AS rank
    FROM playback
    JOIN track ON playback."trackId" = track."id"
    JOIN album ON track."albumId" = album."id"
    WHERE playback."userId" = ${input.userId}
      AND ${getSelectedPeriodSql(input.timezone, input.previousStart, input.currentStart)}
    GROUP BY album."id"
  `;
}

export function previousGenreRankSelect(
  input: RankQueryInput,
  sortColumn: Prisma.Sql,
) {
  return Prisma.sql`
    SELECT
      genre."id" AS id,
      ROW_NUMBER() OVER (ORDER BY ${sortColumn} DESC, genre."id" ASC)::int AS rank
    FROM playback
    JOIN track ON playback."trackId" = track."id"
    JOIN artist_track ON track."id" = artist_track."trackId"
      AND artist_track."role" = 'primary'
    JOIN artist_genre ON artist_genre."artistId" = artist_track."artistId"
    JOIN genre ON genre."id" = artist_genre."genreId"
    WHERE playback."userId" = ${input.userId}
      AND ${getSelectedPeriodSql(input.timezone, input.previousStart, input.currentStart)}
    GROUP BY genre."id"
  `;
}

export function previousPlaylistRankSelect(
  input: RankQueryInput,
  sortColumn: Prisma.Sql,
) {
  return Prisma.sql`
    SELECT
      playlist."id" AS id,
      ROW_NUMBER() OVER (ORDER BY ${sortColumn} DESC, playlist."id" ASC)::int AS rank
    FROM playback
    JOIN playlist ON (
      playback."contextId" = playlist."spotifyId"
      AND playback."context" IN ('playlist', 'collection')
    )
    WHERE playback."userId" = ${input.userId}
      AND ${getSelectedPeriodSql(input.timezone, input.previousStart, input.currentStart)}
    GROUP BY playlist."id"
  `;
}
