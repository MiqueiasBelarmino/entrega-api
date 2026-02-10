-- CreateEnum
CREATE TYPE "CanceledBy" AS ENUM ('COURIER', 'MERCHANT', 'ADMIN', 'SYSTEM');

-- AlterTable
ALTER TABLE "deliveries" ADD COLUMN     "accept_by" TIMESTAMP(3),
ADD COLUMN     "cancel_reason" TEXT,
ADD COLUMN     "canceled_by" "CanceledBy",
ADD COLUMN     "expires_at" TIMESTAMP(3),
ADD COLUMN     "preferred_until" TIMESTAMP(3);
