-- AlterTable
ALTER TABLE "deliveries" ALTER COLUMN "rejectedBy" SET DEFAULT ARRAY[]::TEXT[];
