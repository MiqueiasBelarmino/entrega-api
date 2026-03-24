-- CreateTable
CREATE TABLE "ratings" (
    "id" TEXT NOT NULL,
    "delivery_id" TEXT NOT NULL,
    "reviewer_id" TEXT NOT NULL,
    "reviewed_id" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "score" INTEGER NOT NULL,
    "tags" TEXT[],
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ratings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ratings_reviewed_id_idx" ON "ratings"("reviewed_id");

-- CreateIndex
CREATE INDEX "ratings_delivery_id_idx" ON "ratings"("delivery_id");

-- CreateIndex
CREATE UNIQUE INDEX "ratings_delivery_id_reviewer_id_key" ON "ratings"("delivery_id", "reviewer_id");

-- AddForeignKey
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_delivery_id_fkey" FOREIGN KEY ("delivery_id") REFERENCES "deliveries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_reviewed_id_fkey" FOREIGN KEY ("reviewed_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
