/*
  Warnings:

  - A unique constraint covering the columns `[userId,key]` on the table `settings` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "settings_userId_key_key" ON "settings"("userId", "key");
