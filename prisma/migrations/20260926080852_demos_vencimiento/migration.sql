-- AlterTable
ALTER TABLE "demos" ADD COLUMN     "extension_count" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "demos_expires_at_idx" ON "demos"("expires_at");
