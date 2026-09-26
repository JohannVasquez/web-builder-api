-- CreateTable
CREATE TABLE "preview_links" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "token_hash" VARCHAR(64) NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "revoked_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "preview_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "preview_links_token_hash_key" ON "preview_links"("token_hash");

-- CreateIndex
CREATE INDEX "preview_links_tenant_id_expires_at_idx" ON "preview_links"("tenant_id", "expires_at");

-- AddForeignKey
ALTER TABLE "preview_links" ADD CONSTRAINT "preview_links_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
