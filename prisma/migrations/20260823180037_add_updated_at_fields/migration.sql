/*
  Warnings:

  - Added the required column `updatedAt` to the `ai_analyses` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `incident_logs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `monitoring_logs` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ai_analyses" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "incident_logs" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "monitoring_logs" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;
