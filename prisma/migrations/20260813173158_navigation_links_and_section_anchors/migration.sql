-- AlterTable
ALTER TABLE "page_sections" ADD COLUMN     "anchor" VARCHAR(100);

-- CreateTable
CREATE TABLE "navigation_links" (
    "id" SERIAL NOT NULL,
    "label" VARCHAR(100) NOT NULL,
    "href" VARCHAR(255) NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "navigation_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "navigation_links_position_key" ON "navigation_links"("position");
