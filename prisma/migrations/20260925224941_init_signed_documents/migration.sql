-- CreateTable
CREATE TABLE "signed_documents" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "document" VARCHAR(100) NOT NULL,
    "version" VARCHAR(40) NOT NULL,
    "signed_by" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "signed_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "signed_documents_tenant_id_document_idx" ON "signed_documents"("tenant_id", "document");

-- CreateIndex
CREATE INDEX "signed_documents_document_version_idx" ON "signed_documents"("document", "version");

-- AddForeignKey
ALTER TABLE "signed_documents" ADD CONSTRAINT "signed_documents_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
