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
