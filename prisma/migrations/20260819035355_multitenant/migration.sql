/*
  Warnings:

  - The primary key for the `global_settings` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - A unique constraint covering the columns `[tenant_id,key]` on the table `global_settings` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[tenant_id,position]` on the table `navigation_links` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[tenant_id,slug]` on the table `pages` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `tenant_id` to the `global_settings` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenant_id` to the `navigation_links` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenant_id` to the `pages` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "navigation_links_position_key";

-- DropIndex
DROP INDEX "pages_slug_key";

-- AlterTable
ALTER TABLE "global_settings" DROP CONSTRAINT "global_settings_pkey",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD COLUMN     "tenant_id" INTEGER NOT NULL,
ADD CONSTRAINT "global_settings_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "navigation_links" ADD COLUMN     "tenant_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "pages" ADD COLUMN     "tenant_id" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "tenants" (
    "id" SERIAL NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "domain" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_domain_key" ON "tenants"("domain");

-- CreateIndex
CREATE INDEX "global_settings_tenant_id_idx" ON "global_settings"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "global_settings_tenant_id_key_key" ON "global_settings"("tenant_id", "key");

-- CreateIndex
CREATE INDEX "navigation_links_tenant_id_idx" ON "navigation_links"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "navigation_links_tenant_id_position_key" ON "navigation_links"("tenant_id", "position");

-- CreateIndex
CREATE INDEX "pages_tenant_id_idx" ON "pages"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "pages_tenant_id_slug_key" ON "pages"("tenant_id", "slug");

-- AddForeignKey
ALTER TABLE "pages" ADD CONSTRAINT "pages_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "navigation_links" ADD CONSTRAINT "navigation_links_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "global_settings" ADD CONSTRAINT "global_settings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
