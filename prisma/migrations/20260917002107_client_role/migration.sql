-- CreateTable
CREATE TABLE "admin_user_tenants" (
    "admin_user_id" INTEGER NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_user_tenants_pkey" PRIMARY KEY ("admin_user_id","tenant_id")
);

-- CreateIndex
CREATE INDEX "admin_user_tenants_tenant_id_idx" ON "admin_user_tenants"("tenant_id");

-- AddForeignKey
ALTER TABLE "admin_user_tenants" ADD CONSTRAINT "admin_user_tenants_admin_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "admin_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_user_tenants" ADD CONSTRAINT "admin_user_tenants_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
