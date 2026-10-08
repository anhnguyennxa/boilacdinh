-- AlterTable
ALTER TABLE "coupons" ADD COLUMN     "description" TEXT,
ADD COLUMN     "is_public" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "coupons_is_public_ends_at_idx" ON "coupons"("is_public", "ends_at");
