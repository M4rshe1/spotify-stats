-- AlterTable
ALTER TABLE "album" ADD COLUMN     "releaseDate" TEXT,
ADD COLUMN     "releaseDatePrecision" TEXT;

-- AlterTable
ALTER TABLE "playback" ADD COLUMN     "context" TEXT DEFAULT 'Unknown',
ADD COLUMN     "contextUri" TEXT;

-- AlterTable
ALTER TABLE "track" ADD COLUMN     "releaseDate" TEXT,
ADD COLUMN     "releaseDatePrecision" TEXT;
