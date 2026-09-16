-- AlterTable
ALTER TABLE "admin_users" ADD COLUMN     "disabled_at" TIMESTAMPTZ,
ADD COLUMN     "role" VARCHAR(20) NOT NULL DEFAULT 'owner';

-- CreateTable
CREATE TABLE "password_resets" (
    "id" SERIAL NOT NULL,
    "admin_user_id" INTEGER NOT NULL,
    "token_hash" VARCHAR(64) NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "used_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_resets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "password_resets_token_hash_key" ON "password_resets"("token_hash");

-- CreateIndex
CREATE INDEX "password_resets_admin_user_id_idx" ON "password_resets"("admin_user_id");

-- AddForeignKey
ALTER TABLE "password_resets" ADD CONSTRAINT "password_resets_admin_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "admin_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
