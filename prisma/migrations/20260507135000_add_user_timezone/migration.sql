-- AlterTable
ALTER TABLE "user"
ADD COLUMN "timezone" TEXT NOT NULL DEFAULT 'Etc/UTC';
