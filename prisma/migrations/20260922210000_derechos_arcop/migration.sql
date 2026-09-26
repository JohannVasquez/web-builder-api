-- Solicitudes de derechos del titular (Ley 21.719). Se conservan resueltas para poder
-- acreditar que se respondió dentro del plazo de un mes que fija la ley.

-- CreateTable
CREATE TABLE "data_rights_requests" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "right" VARCHAR(20) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "details" TEXT NOT NULL DEFAULT '',
    "status" VARCHAR(20) NOT NULL DEFAULT 'pendiente',
    "verification_token_hash" VARCHAR(64) NOT NULL,
    "verification_expires_at" TIMESTAMPTZ NOT NULL,
    "verified_at" TIMESTAMPTZ,
    "resolved_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "data_rights_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "data_rights_requests_tenant_id_status_created_at_idx" ON "data_rights_requests"("tenant_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "data_rights_requests_verification_token_hash_idx" ON "data_rights_requests"("verification_token_hash");

-- AddForeignKey
ALTER TABLE "data_rights_requests" ADD CONSTRAINT "data_rights_requests_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
