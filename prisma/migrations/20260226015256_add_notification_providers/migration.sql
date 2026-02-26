/*
  Warnings:

  - You are about to drop the column `channel` on the `otp_tokens` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "ProviderStatus" AS ENUM ('ACTIVE', 'DISABLED', 'BLOCKED');

-- AlterTable
ALTER TABLE "otp_tokens" DROP COLUMN "channel";

-- DropEnum
DROP TYPE "OtpChannel";

-- CreateTable
CREATE TABLE "notification_providers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "provider_key" TEXT NOT NULL,
    "status" "ProviderStatus" NOT NULL DEFAULT 'DISABLED',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "max_retries" INTEGER NOT NULL DEFAULT 3,
    "retry_delay_ms" INTEGER NOT NULL DEFAULT 1000,
    "timeout_ms" INTEGER NOT NULL DEFAULT 5000,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_providers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "notification_providers_provider_key_key" ON "notification_providers"("provider_key");
