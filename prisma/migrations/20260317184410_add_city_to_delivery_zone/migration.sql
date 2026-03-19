/*
  Warnings:

  - Added the required column `city_id` to the `delivery_zones` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "delivery_zones" ADD COLUMN     "city_id" TEXT NOT NULL DEFAULT 'default-city-id';

-- Cleanup temporary defaults
ALTER TABLE "delivery_zones" ALTER COLUMN "city_id" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "delivery_zones_city_id_idx" ON "delivery_zones"("city_id");

-- AddForeignKey
ALTER TABLE "delivery_zones" ADD CONSTRAINT "delivery_zones_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
