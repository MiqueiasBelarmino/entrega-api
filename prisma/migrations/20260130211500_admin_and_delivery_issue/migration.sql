-- AlterEnum
ALTER TYPE "DeliveryStatus" ADD VALUE 'ISSUE';

-- AlterTable
ALTER TABLE "deliveries" ADD COLUMN     "issue_at" TIMESTAMP(3),
ADD COLUMN     "issue_reason" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "is_root" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "deliveries_merchant_id_idx" ON "deliveries"("merchant_id");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_is_active_idx" ON "users"("is_active");

-- CreateIndex
CREATE INDEX "users_created_at_idx" ON "users"("created_at");
