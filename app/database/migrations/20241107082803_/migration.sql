/*
  Warnings:

  - You are about to drop the column `location` on the `Kraal` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Kraal" DROP COLUMN "location",
ADD COLUMN     "locationId" TEXT;

-- AddForeignKey
ALTER TABLE "Kraal" ADD CONSTRAINT "Kraal_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;
