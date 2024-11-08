-- CreateEnum
CREATE TYPE "Breed" AS ENUM ('ANGUS', 'HEREFORD', 'HOLSTEIN', 'JERSEY', 'CHAROLAIS', 'SIMMENTAL', 'BRAHMAN', 'LIMOUSIN', 'GELBVIEH', 'SHORTHORN', 'BRANGUS', 'BELTED_GALLOWAY', 'LONGHORN', 'GUERNSEY', 'AYRSHIRE');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('Male', 'Female');

-- CreateTable
CREATE TABLE "Cattle" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "tagNumber" TEXT,
    "breed" "Breed" NOT NULL,
    "gender" "Gender" NOT NULL,
    "isOx" BOOLEAN,
    "dateOfBirth" TIMESTAMP(3),
    "healthStatus" TEXT,
    "vaccinationRecords" TEXT,
    "sireId" TEXT,
    "damId" TEXT,
    "mainImageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Cattle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CattleImage" (
    "id" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "altText" TEXT,
    "blob" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "cattleId" TEXT,

    CONSTRAINT "CattleImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CattleKraalAssignment" (
    "id" TEXT NOT NULL,
    "cattleId" TEXT NOT NULL,
    "kraalId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),

    CONSTRAINT "CattleKraalAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Cattle_tagNumber_key" ON "Cattle"("tagNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Cattle_mainImageId_key" ON "Cattle"("mainImageId");

-- CreateIndex
CREATE INDEX "Cattle_sireId_idx" ON "Cattle"("sireId");

-- CreateIndex
CREATE INDEX "Cattle_damId_idx" ON "Cattle"("damId");

-- CreateIndex
CREATE INDEX "Cattle_mainImageId_idx" ON "Cattle"("mainImageId");

-- CreateIndex
CREATE INDEX "CattleImage_cattleId_idx" ON "CattleImage"("cattleId");

-- CreateIndex
CREATE INDEX "CattleKraalAssignment_cattleId_idx" ON "CattleKraalAssignment"("cattleId");

-- CreateIndex
CREATE INDEX "CattleKraalAssignment_kraalId_idx" ON "CattleKraalAssignment"("kraalId");

-- AddForeignKey
ALTER TABLE "Cattle" ADD CONSTRAINT "Cattle_sireId_fkey" FOREIGN KEY ("sireId") REFERENCES "Cattle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cattle" ADD CONSTRAINT "Cattle_damId_fkey" FOREIGN KEY ("damId") REFERENCES "Cattle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cattle" ADD CONSTRAINT "Cattle_mainImageId_fkey" FOREIGN KEY ("mainImageId") REFERENCES "CattleImage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cattle" ADD CONSTRAINT "Cattle_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CattleImage" ADD CONSTRAINT "CattleImage_cattleId_fkey" FOREIGN KEY ("cattleId") REFERENCES "Cattle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CattleKraalAssignment" ADD CONSTRAINT "CattleKraalAssignment_cattleId_fkey" FOREIGN KEY ("cattleId") REFERENCES "Cattle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CattleKraalAssignment" ADD CONSTRAINT "CattleKraalAssignment_kraalId_fkey" FOREIGN KEY ("kraalId") REFERENCES "Kraal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
