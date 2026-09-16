-- CreateTable
CREATE TABLE "newsletter_subscribers" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "confirmed_at" TIMESTAMPTZ,
    "unsubscribed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "newsletter_subscribers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "newsletter_subscribers_tenant_id_created_at_idx" ON "newsletter_subscribers"("tenant_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "newsletter_subscribers_tenant_id_email_key" ON "newsletter_subscribers"("tenant_id", "email");

-- AddForeignKey
ALTER TABLE "newsletter_subscribers" ADD CONSTRAINT "newsletter_subscribers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
