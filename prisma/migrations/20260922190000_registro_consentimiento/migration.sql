-- Prueba del consentimiento: quién aceptó, qué, cuándo y sobre qué texto. Sin índice único a
-- propósito: cada cambio de opinión es una fila nueva, no una edición de la anterior.

-- CreateTable
CREATE TABLE "consent_records" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "subject" VARCHAR(128) NOT NULL,
    "source" VARCHAR(20) NOT NULL,
    "purposes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "text_version" VARCHAR(40) NOT NULL,
    "ip_hash" VARCHAR(64),
    "user_agent" VARCHAR(255),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consent_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "consent_records_tenant_id_subject_created_at_idx" ON "consent_records"("tenant_id", "subject", "created_at");

-- CreateIndex
CREATE INDEX "consent_records_tenant_id_created_at_idx" ON "consent_records"("tenant_id", "created_at");

-- AddForeignKey
ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
