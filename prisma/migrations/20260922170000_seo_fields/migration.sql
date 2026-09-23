-- Campos de posicionamiento propios de cada contenido. Todos anulables o con valor por
-- omisión: ninguna fila existente cambia de comportamiento al aplicar esta migración.

-- AlterTable
ALTER TABLE "pages"
  ADD COLUMN "seo_title" VARCHAR(255),
  ADD COLUMN "seo_description" TEXT,
  ADD COLUMN "og_image_key" VARCHAR(500),
  ADD COLUMN "noindex" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "blog_posts"
  ADD COLUMN "noindex" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "products"
  ADD COLUMN "seo_title" VARCHAR(255),
  ADD COLUMN "seo_description" TEXT,
  ADD COLUMN "noindex" BOOLEAN NOT NULL DEFAULT false;
