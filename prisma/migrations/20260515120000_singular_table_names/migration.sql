-- Rename junction/settings tables to singular @@map names (data-preserving).
-- Prisma migrate diff would DROP/CREATE these tables; use RENAME instead.

-- settings -> setting
ALTER TABLE "settings" RENAME TO "setting";
ALTER TABLE "setting" RENAME CONSTRAINT "settings_pkey" TO "setting_pkey";
ALTER TABLE "setting" RENAME CONSTRAINT "settings_userId_fkey" TO "setting_userId_fkey";
ALTER INDEX "settings_userId_key_key" RENAME TO "setting_userId_key_key";

-- artist_genres -> artist_genre
ALTER TABLE "artist_genres" RENAME TO "artist_genre";
ALTER TABLE "artist_genre" RENAME CONSTRAINT "artist_genres_pkey" TO "artist_genre_pkey";
ALTER TABLE "artist_genre" RENAME CONSTRAINT "artist_genres_artistId_fkey" TO "artist_genre_artistId_fkey";
ALTER TABLE "artist_genre" RENAME CONSTRAINT "artist_genres_genreId_fkey" TO "artist_genre_genreId_fkey";

-- album_artists -> album_artist
ALTER TABLE "album_artists" RENAME TO "album_artist";
ALTER TABLE "album_artist" RENAME CONSTRAINT "album_artists_pkey" TO "album_artist_pkey";
ALTER TABLE "album_artist" RENAME CONSTRAINT "album_artists_albumId_fkey" TO "album_artist_albumId_fkey";
ALTER TABLE "album_artist" RENAME CONSTRAINT "album_artists_artistId_fkey" TO "album_artist_artistId_fkey";
