-- Redirecciones por cliente. Sin ellas, renombrar el slug de una página rompe la URL que
-- Google ya indexó y la que la gente compartió.

-- CreateTable
CREATE TABLE "redirects" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "from_path" VARCHAR(512) NOT NULL,
    "to_path" VARCHAR(512) NOT NULL,
    "status_code" INTEGER NOT NULL DEFAULT 301,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "redirects_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "redirects_tenant_id_from_path_key" ON "redirects"("tenant_id", "from_path");

-- CreateIndex
CREATE INDEX "redirects_tenant_id_idx" ON "redirects"("tenant_id");

-- AddForeignKey
ALTER TABLE "redirects" ADD CONSTRAINT "redirects_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
