/*
  Warnings:

  - You are about to drop the column `mainImageId` on the `Cattle` table. All the data in the column will be lost.
  - You are about to drop the `CattleImage` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Cattle" DROP CONSTRAINT "Cattle_mainImageId_fkey";

-- DropForeignKey
ALTER TABLE "CattleImage" DROP CONSTRAINT "CattleImage_cattleId_fkey";

-- DropIndex
DROP INDEX "Cattle_mainImageId_idx";

-- DropIndex
DROP INDEX "Cattle_mainImageId_key";

-- AlterTable
ALTER TABLE "Cattle" DROP COLUMN "mainImageId",
ADD COLUMN     "mainImage" TEXT;

-- DropTable
DROP TABLE "CattleImage";
