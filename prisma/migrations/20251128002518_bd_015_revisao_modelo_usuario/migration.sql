/*
  Warnings:

  - A unique constraint covering the columns `[slug]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "LabBond" AS ENUM ('DOCENTE', 'DISCENTE', 'VISITANTE');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "Role" ADD VALUE 'LAB_DOCENTE';
ALTER TYPE "Role" ADD VALUE 'USUARIO';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "allowPublicAvatar" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "allowPublicEmail" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "allowPublicPersonalLinks" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "avatarFileId" TEXT,
ADD COLUMN     "bio" TEXT,
ADD COLUMN     "institution" TEXT,
ADD COLUMN     "labBond" "LabBond",
ADD COLUMN     "program" TEXT,
ADD COLUMN     "publicProfileEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "slug" TEXT,
ADD COLUMN     "unitOrDepartment" TEXT,
ALTER COLUMN "role" DROP DEFAULT;

-- CreateTable
CREATE TABLE "UserLabBondHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "labBond" "LabBond" NOT NULL,
    "role" "Role" NOT NULL,
    "status" "Status" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,

    CONSTRAINT "UserLabBondHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserAdvisor" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "advisorId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserAdvisor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_slug_key" ON "User"("slug");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_avatarFileId_fkey" FOREIGN KEY ("avatarFileId") REFERENCES "File"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserLabBondHistory" ADD CONSTRAINT "UserLabBondHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAdvisor" ADD CONSTRAINT "UserAdvisor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAdvisor" ADD CONSTRAINT "UserAdvisor_advisorId_fkey" FOREIGN KEY ("advisorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
