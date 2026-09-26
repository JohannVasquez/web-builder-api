-- Retractos y reclamos. La Ley 19.496 pide que revertir la compra sea tan simple como hacerla
-- y que exista un canal de reclamos con respuesta en plazo; hasta ahora había que escribir un
-- correo a mano y no quedaba constancia de nada.

-- CreateTable
CREATE TABLE "consumer_claims" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "kind" VARCHAR(20) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pendiente',
    "order_number" VARCHAR(20),
    "email" VARCHAR(255) NOT NULL,
    "message" TEXT NOT NULL DEFAULT '',
    "resolved_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consumer_claims_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "consumer_claims_tenant_id_status_created_at_idx" ON "consumer_claims"("tenant_id", "status", "created_at");

-- AddForeignKey
ALTER TABLE "consumer_claims" ADD CONSTRAINT "consumer_claims_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
