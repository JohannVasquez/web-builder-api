-- AlterTable
ALTER TABLE "pages" ADD COLUMN     "published_at" TIMESTAMPTZ,
ADD COLUMN     "published_content" JSONB;

-- CreateTable
CREATE TABLE "page_versions" (
    "id" SERIAL NOT NULL,
    "page_id" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "summary" VARCHAR(255) NOT NULL,
    "actor_type" VARCHAR(20) NOT NULL,
    "actor_id" INTEGER,
    "actor_name" VARCHAR(255) NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "page_versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "page_versions_page_id_created_at_idx" ON "page_versions"("page_id", "created_at");

-- AddForeignKey
ALTER TABLE "page_versions" ADD CONSTRAINT "page_versions_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Rellena `published_content` con lo que cada página tiene hoy. Sin esto, todos los sitios
-- ya publicados quedarían en blanco al desplegar: el público pasa a leer esta columna.
UPDATE "pages" p
SET "published_content" = jsonb_build_object(
      'title', p."title",
      'description', p."description",
      'sections', COALESCE((
        SELECT jsonb_agg(
                 jsonb_build_object(
                   'type', s."type",
                   'position', s."position",
                   'props', s."props",
                   'anchor', s."anchor"
                 )
                 ORDER BY s."position"
               )
        FROM "page_sections" s
        WHERE s."page_id" = p."id"
      ), '[]'::jsonb)
    ),
    "published_at" = NOW()
WHERE p."is_published" = true;
