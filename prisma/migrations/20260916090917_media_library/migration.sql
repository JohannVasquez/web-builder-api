-- AlterTable
ALTER TABLE "storage_assets" ADD COLUMN     "alt" VARCHAR(500),
ADD COLUMN     "original_name" VARCHAR(255),
ADD COLUMN     "tenant_id" INTEGER;

-- CreateIndex
CREATE INDEX "storage_assets_tenant_id_created_at_idx" ON "storage_assets"("tenant_id", "created_at");

-- AddForeignKey
ALTER TABLE "storage_assets" ADD CONSTRAINT "storage_assets_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
