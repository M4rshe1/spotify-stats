-- AlterTable
ALTER TABLE "playback" ADD COLUMN "skipped" BOOLEAN,
ADD COLUMN "shuffle" BOOLEAN,
ADD COLUMN "reasonStart" TEXT,
ADD COLUMN "reasonEnd" TEXT,
ADD COLUMN "country" TEXT;

-- CreateIndex
CREATE INDEX "playback_userId_country_idx" ON "playback"("userId", "country");
