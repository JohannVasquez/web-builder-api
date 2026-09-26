-- Demos de prospecto (etapa 1). Solo agrega tablas: ninguna fila existente cambia, y
-- `tenants.status` ya era VARCHAR, así que el valor `demo` no necesita columna nueva.
--
-- Para revertir sin perder datos de clientes (las demos sí se pierden):
--   UPDATE "tenants" SET "status" = 'building' WHERE "status" = 'demo';
--   DROP TABLE "demo_visits";
--   DROP TABLE "demo_access_tokens";
--   DROP TABLE "demos";
--   DROP TABLE "prospects";
-- y borrar la fila de esta migración en "_prisma_migrations".

-- CreateTable
CREATE TABLE "prospects" (
    "id" UUID NOT NULL,
    "business_name" VARCHAR(255) NOT NULL,
    "contact_name" VARCHAR(160),
    "phone" VARCHAR(40),
    "email" VARCHAR(255),
    "industry" VARCHAR(120),
    "source" VARCHAR(120),
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prospects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "demos" (
    "id" UUID NOT NULL,
    "tenant_id" UUID,
    "prospect_id" UUID,
    "template_id" VARCHAR(100),
    "industry" VARCHAR(120),
    "actor_type" VARCHAR(20) NOT NULL,
    "actor_id" UUID,
    "actor_name" VARCHAR(255) NOT NULL,
    "expires_at" TIMESTAMPTZ,
    "outcome" VARCHAR(20),
    "outcome_at" TIMESTAMPTZ,
    "visit_count" INTEGER NOT NULL DEFAULT 0,
    "first_visit_at" TIMESTAMPTZ,
    "last_visit_at" TIMESTAMPTZ,
    "purged_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "demos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "demo_access_tokens" (
    "id" UUID NOT NULL,
    "demo_id" UUID NOT NULL,
    "kind" VARCHAR(20) NOT NULL,
    "token_hash" VARCHAR(64) NOT NULL,
    "revoked_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "demo_access_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "demo_visits" (
    "id" UUID NOT NULL,
    "demo_id" UUID NOT NULL,
    "page_slug" VARCHAR(255) NOT NULL,
    "ip_hash" VARCHAR(64),
    "user_agent" VARCHAR(255),
    "visited_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "demo_visits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "demos_tenant_id_key" ON "demos"("tenant_id");

-- CreateIndex
CREATE INDEX "demos_prospect_id_idx" ON "demos"("prospect_id");

-- CreateIndex
CREATE INDEX "demos_actor_id_idx" ON "demos"("actor_id");

-- CreateIndex
CREATE INDEX "demos_created_at_idx" ON "demos"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "demo_access_tokens_token_hash_key" ON "demo_access_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "demo_access_tokens_demo_id_kind_idx" ON "demo_access_tokens"("demo_id", "kind");

-- CreateIndex
CREATE INDEX "demo_visits_demo_id_visited_at_idx" ON "demo_visits"("demo_id", "visited_at");

-- AddForeignKey
ALTER TABLE "demos" ADD CONSTRAINT "demos_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "demos" ADD CONSTRAINT "demos_prospect_id_fkey" FOREIGN KEY ("prospect_id") REFERENCES "prospects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "demo_access_tokens" ADD CONSTRAINT "demo_access_tokens_demo_id_fkey" FOREIGN KEY ("demo_id") REFERENCES "demos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "demo_visits" ADD CONSTRAINT "demo_visits_demo_id_fkey" FOREIGN KEY ("demo_id") REFERENCES "demos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
