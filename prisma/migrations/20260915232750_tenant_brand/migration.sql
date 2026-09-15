-- CreateTable
CREATE TABLE "tenant_brands" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "palette" JSONB NOT NULL DEFAULT '{}',
    "typography" JSONB NOT NULL DEFAULT '{}',
    "assets" JSONB NOT NULL DEFAULT '{}',
    "color_mode" VARCHAR(20) NOT NULL DEFAULT 'system',
    "visual_style" VARCHAR(50) NOT NULL DEFAULT 'classic',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenant_brands_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenant_brands_tenant_id_key" ON "tenant_brands"("tenant_id");

-- AddForeignKey
ALTER TABLE "tenant_brands" ADD CONSTRAINT "tenant_brands_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
