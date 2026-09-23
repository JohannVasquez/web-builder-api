-- Identificación del proveedor que exige el Reglamento de Comercio Electrónico, y el RUT del
-- comprador para el documento tributario. Todo anulable: ninguna tienda existente se rompe al
-- aplicar esta migración; lo que cambia es que encender la tienda pasa a exigirlos.

-- AlterTable
ALTER TABLE "store_settings"
  ADD COLUMN "legal_name" VARCHAR(255),
  ADD COLUMN "tax_id" VARCHAR(20),
  ADD COLUMN "seller_address" VARCHAR(255),
  ADD COLUMN "seller_email" VARCHAR(255),
  ADD COLUMN "seller_phone" VARCHAR(40);

-- AlterTable
ALTER TABLE "orders"
  ADD COLUMN "customer_tax_id" VARCHAR(20),
  ADD COLUMN "seller" JSONB;
