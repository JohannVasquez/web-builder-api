-- Constancia del correo de confirmación de compra, que la Ley 19.496 exige enviar. Sin esto,
-- un correo perdido no se distingue de uno entregado y nadie puede reintentarlo.

-- AlterTable
ALTER TABLE "orders"
  ADD COLUMN "confirmation_emailed_at" TIMESTAMPTZ,
  ADD COLUMN "confirmation_email_error" TEXT;
