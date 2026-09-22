-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "terms_accepted_at" TIMESTAMPTZ,
ADD COLUMN     "terms_version" VARCHAR(40);

-- AlterTable
ALTER TABLE "store_settings" ADD COLUMN     "terms_page_slug" VARCHAR(255);
