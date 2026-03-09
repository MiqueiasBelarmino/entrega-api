-- AlterTable
ALTER TABLE "deliveries" ADD COLUMN     "neighborhood" TEXT;

-- CreateTable
CREATE TABLE "price_rules" (
    "id" TEXT NOT NULL,
    "neighborhood" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "price_rules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "price_rules_neighborhood_key" ON "price_rules"("neighborhood");

-- CreateIndex
CREATE INDEX "price_rules_is_active_idx" ON "price_rules"("is_active");
