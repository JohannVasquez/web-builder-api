-- CreateTable
CREATE TABLE "tenant_domains" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "domain" VARCHAR(255) NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "verified_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenant_domains_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenant_domains_domain_key" ON "tenant_domains"("domain");

-- CreateIndex
CREATE INDEX "tenant_domains_tenant_id_idx" ON "tenant_domains"("tenant_id");

-- AddForeignKey
ALTER TABLE "tenant_domains" ADD CONSTRAINT "tenant_domains_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migración de datos (escrita a mano): el dominio único que tenía cada tenant
-- pasa a ser su dominio canónico, ya verificado — eran dominios de la
-- plataforma, no hay propiedad de terceros que comprobar. Debe ejecutarse
-- antes de eliminar la columna.
INSERT INTO "tenant_domains" ("tenant_id", "domain", "is_primary", "verified_at")
SELECT "id", "domain", true, CURRENT_TIMESTAMP FROM "tenants";

-- DropIndex
DROP INDEX "tenants_domain_key";

-- AlterTable
ALTER TABLE "tenants" DROP COLUMN "domain";
