/*
  Warnings:

  - You are about to drop the column `city` on the `neighborhoods` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[name,city_id]` on the table `neighborhoods` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `city_id` to the `businesses` table without a default value. This is not possible if the table is not empty.
  - Added the required column `city_id` to the `neighborhoods` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "cities" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cities_pkey" PRIMARY KEY ("id")
);

-- Insert Default City for Data Migration
INSERT INTO "cities" ("id", "name", "state", "is_active", "created_at", "updated_at")
VALUES ('default-city-id', 'Presidente Epitácio', 'SP', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- DropIndex
DROP INDEX "neighborhoods_name_city_key";

-- AlterTable businesses
ALTER TABLE "businesses" ADD COLUMN "city_id" TEXT NOT NULL DEFAULT 'default-city-id';

-- AlterTable neighborhoods
ALTER TABLE "neighborhoods" ADD COLUMN "city_id" TEXT NOT NULL DEFAULT 'default-city-id';
ALTER TABLE "neighborhoods" DROP COLUMN "city";

-- AlterTable users
ALTER TABLE "users" ADD COLUMN "city_id" TEXT;
UPDATE "users" SET "city_id" = 'default-city-id' WHERE "role" = 'COURIER';

-- Cleanup temporary defaults
ALTER TABLE "businesses" ALTER COLUMN "city_id" DROP DEFAULT;
ALTER TABLE "neighborhoods" ALTER COLUMN "city_id" DROP DEFAULT;

-- CreateIndex
CREATE UNIQUE INDEX "cities_name_state_key" ON "cities"("name", "state");

-- CreateIndex
CREATE INDEX "businesses_city_id_idx" ON "businesses"("city_id");

-- CreateIndex
CREATE UNIQUE INDEX "neighborhoods_name_city_id_key" ON "neighborhoods"("name", "city_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "neighborhoods" ADD CONSTRAINT "neighborhoods_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
