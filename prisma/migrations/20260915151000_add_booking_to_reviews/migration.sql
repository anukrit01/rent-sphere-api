-- DropIndex
DROP INDEX IF EXISTS "reviews_author_id_asset_id_key";

-- AlterTable
ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "booking_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "reviews_booking_id_key" ON "reviews"("booking_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_review_author" ON "reviews"("author_id");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reviews_booking_id_fkey') THEN
    ALTER TABLE "reviews" ADD CONSTRAINT "reviews_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
