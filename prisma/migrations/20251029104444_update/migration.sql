/*
  Warnings:

  - You are about to drop the column `personId` on the `File` table. All the data in the column will be lost.
  - You are about to drop the column `personId` on the `User` table. All the data in the column will be lost.
  - You are about to drop the `Person` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PersonHistory` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `fullName` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."Person" DROP CONSTRAINT "Person_advisorId_fkey";

-- DropForeignKey
ALTER TABLE "public"."PersonHistory" DROP CONSTRAINT "PersonHistory_personId_fkey";

-- DropForeignKey
ALTER TABLE "public"."User" DROP CONSTRAINT "User_personId_fkey";

-- DropIndex
DROP INDEX "public"."User_personId_key";

-- AlterTable
ALTER TABLE "File" DROP COLUMN "personId",
ADD COLUMN     "userId" TEXT;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "personId",
ADD COLUMN     "advisorId" TEXT,
ADD COLUMN     "consentDate" TIMESTAMP(3),
ADD COLUMN     "consentGiven" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "currentLink" TEXT,
ADD COLUMN     "fullName" TEXT NOT NULL,
ADD COLUMN     "level" TEXT,
ADD COLUMN     "linkLattes" TEXT,
ADD COLUMN     "orcid" TEXT,
ADD COLUMN     "researchArea" TEXT;

-- DropTable
DROP TABLE "public"."Person";

-- DropTable
DROP TABLE "public"."PersonHistory";

-- CreateTable
CREATE TABLE "UserHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changedBy" TEXT,

    CONSTRAINT "UserHistory_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_advisorId_fkey" FOREIGN KEY ("advisorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserHistory" ADD CONSTRAINT "UserHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
