-- CreateTable
CREATE TABLE "api_keys" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "prefix" VARCHAR(24) NOT NULL,
    "key_hash" VARCHAR(64) NOT NULL,
    "permission" VARCHAR(20) NOT NULL,
    "scope_all_tenants" BOOLEAN NOT NULL DEFAULT true,
    "rate_limit_per_minute" INTEGER NOT NULL DEFAULT 120,
    "created_by_id" INTEGER NOT NULL,
    "expires_at" TIMESTAMPTZ,
    "last_used_at" TIMESTAMPTZ,
    "revoked_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_key_tenants" (
    "api_key_id" INTEGER NOT NULL,
    "tenant_id" INTEGER NOT NULL,

    CONSTRAINT "api_key_tenants_pkey" PRIMARY KEY ("api_key_id","tenant_id")
);

-- CreateTable
CREATE TABLE "activity_logs" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER,
    "actor_type" VARCHAR(20) NOT NULL,
    "actor_id" INTEGER,
    "actor_name" VARCHAR(255) NOT NULL,
    "action" VARCHAR(100) NOT NULL,
    "entity_type" VARCHAR(50) NOT NULL,
    "entity_id" VARCHAR(100),
    "summary" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "api_keys_prefix_key" ON "api_keys"("prefix");

-- CreateIndex
CREATE INDEX "api_keys_key_hash_idx" ON "api_keys"("key_hash");

-- CreateIndex
CREATE INDEX "api_key_tenants_tenant_id_idx" ON "api_key_tenants"("tenant_id");

-- CreateIndex
CREATE INDEX "activity_logs_tenant_id_created_at_idx" ON "activity_logs"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX "activity_logs_actor_type_actor_id_idx" ON "activity_logs"("actor_type", "actor_id");

-- CreateIndex
CREATE INDEX "activity_logs_created_at_idx" ON "activity_logs"("created_at");

-- AddForeignKey
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "admin_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_key_tenants" ADD CONSTRAINT "api_key_tenants_api_key_id_fkey" FOREIGN KEY ("api_key_id") REFERENCES "api_keys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_key_tenants" ADD CONSTRAINT "api_key_tenants_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
