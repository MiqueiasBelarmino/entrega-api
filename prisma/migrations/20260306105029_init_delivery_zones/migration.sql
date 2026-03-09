/*
  Warnings:

  - You are about to drop the column `neighborhood` on the `deliveries` table. All the data in the column will be lost.
  - You are about to drop the `price_rules` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterTable
ALTER TABLE "businesses" ADD COLUMN     "neighborhood_id" TEXT;

-- AlterTable
ALTER TABLE "deliveries" DROP COLUMN "neighborhood",
ADD COLUMN     "dest_neighborhood_id" TEXT;

-- DropTable
DROP TABLE "price_rules";

-- CreateTable
CREATE TABLE "delivery_zones" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "delivery_zones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "neighborhoods" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "delivery_zone_id" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "neighborhoods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zone_price_rules" (
    "id" TEXT NOT NULL,
    "origin_zone_id" TEXT NOT NULL,
    "dest_zone_id" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "zone_price_rules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "neighborhoods_name_city_key" ON "neighborhoods"("name", "city");

-- CreateIndex
CREATE UNIQUE INDEX "zone_price_rules_origin_zone_id_dest_zone_id_key" ON "zone_price_rules"("origin_zone_id", "dest_zone_id");

-- CreateIndex
CREATE INDEX "businesses_neighborhood_id_idx" ON "businesses"("neighborhood_id");

-- AddForeignKey
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_neighborhood_id_fkey" FOREIGN KEY ("neighborhood_id") REFERENCES "neighborhoods"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_dest_neighborhood_id_fkey" FOREIGN KEY ("dest_neighborhood_id") REFERENCES "neighborhoods"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "neighborhoods" ADD CONSTRAINT "neighborhoods_delivery_zone_id_fkey" FOREIGN KEY ("delivery_zone_id") REFERENCES "delivery_zones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zone_price_rules" ADD CONSTRAINT "zone_price_rules_origin_zone_id_fkey" FOREIGN KEY ("origin_zone_id") REFERENCES "delivery_zones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zone_price_rules" ADD CONSTRAINT "zone_price_rules_dest_zone_id_fkey" FOREIGN KEY ("dest_zone_id") REFERENCES "delivery_zones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
