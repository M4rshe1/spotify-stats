import { Prisma } from "generated/prisma";

export function getTrackArtistsLateralSql(
  trackIdRef: Prisma.Sql = Prisma.sql`track."id"`,
) {
  return Prisma.sql`
    LEFT JOIN LATERAL (
        SELECT
            ARRAY_AGG(a."name" ORDER BY at."artistId") AS "names",
            ARRAY_AGG(at."artistId" ORDER BY at."artistId") AS "ids",
            ARRAY_AGG(at."role" ORDER BY at."artistId") AS "roles"
        FROM artist_track at
        LEFT JOIN artist a ON at."artistId" = a."id"
        WHERE at."trackId" = ${trackIdRef}
    ) AS artists ON TRUE
  `;
}

export function getAlbumArtistsLateralSql(
  albumIdRef: Prisma.Sql = Prisma.sql`album."id"`,
) {
  return Prisma.sql`
    LEFT JOIN LATERAL (
        SELECT
            ARRAY_AGG(a."name" ORDER BY at."artistId") AS "names",
            ARRAY_AGG(at."artistId" ORDER BY at."artistId") AS "ids",
            ARRAY_AGG(at."role" ORDER BY at."artistId") AS "roles"
        FROM album_artist at
        LEFT JOIN artist a ON at."artistId" = a."id"
        WHERE at."albumId" = ${albumIdRef}
    ) AS artists ON TRUE
  `;
}

export function getSelectedPeriodSql(
  timezone: string,
  start: Date | null,
  end: Date | null,
) {
  return Prisma.sql`(
            timezone(${timezone}, playback."playedAt") >= timezone(${timezone}, ${start})
        AND timezone(${timezone}, playback."playedAt") <= timezone(${timezone}, ${end})
    )
`;
}

/** One row per playback: true when a primary artist on `track` is in the genre. */
export function getTrackInGenreSql(genreId: number) {
  return Prisma.sql`EXISTS (
    SELECT 1
    FROM artist_track genre_at
    JOIN artist_genre genre_ag
      ON genre_ag."artistId" = genre_at."artistId"
      AND genre_ag."genreId" = ${genreId}
    WHERE genre_at."trackId" = track."id"
      AND genre_at."role" = 'primary'
  )`;
}

/** One row per playback: true when a primary artist on `album` is in the genre. */
export function getAlbumInGenreSql(genreId: number) {
  return Prisma.sql`EXISTS (
    SELECT 1
    FROM album_artist genre_aa
    JOIN artist_genre genre_ag
      ON genre_ag."artistId" = genre_aa."artistId"
      AND genre_ag."genreId" = ${genreId}
    WHERE genre_aa."albumId" = album."id"
      AND genre_aa."role" = 'primary'
  )`;
}

/** True when `artist` is tagged with the genre, without multiplying playback rows. */
export function getArtistInGenreSql(genreId: number) {
  return Prisma.sql`EXISTS (
    SELECT 1
    FROM artist_genre genre_ag
    WHERE genre_ag."artistId" = artist."id"
      AND genre_ag."genreId" = ${genreId}
  )`;
}
