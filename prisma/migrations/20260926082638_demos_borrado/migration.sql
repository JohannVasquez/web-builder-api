-- AlterTable
ALTER TABLE "demos" ADD COLUMN     "discard_reason" VARCHAR(1000);

-- CreateTable
CREATE TABLE "demo_pending_files" (
    "id" UUID NOT NULL,
    "demo_id" UUID NOT NULL,
    "key" VARCHAR(500) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "last_attempt_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "demo_pending_files_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "demo_pending_files_key_key" ON "demo_pending_files"("key");

-- CreateIndex
CREATE INDEX "demo_pending_files_demo_id_idx" ON "demo_pending_files"("demo_id");

-- AddForeignKey
ALTER TABLE "demo_pending_files" ADD CONSTRAINT "demo_pending_files_demo_id_fkey" FOREIGN KEY ("demo_id") REFERENCES "demos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
