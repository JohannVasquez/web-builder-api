-- Token de baja para cada suscriptor. El art. 28 B de la Ley 19.496 exige un medio de baja
-- gratuito y expedito en todo correo comercial, y hasta ahora no había ninguno.
--
-- Se agrega en tres pasos porque la columna es obligatoria y única: primero anulable, luego
-- se rellena lo existente con un valor aleatorio por fila, y recién ahí se exige.

-- AlterTable
ALTER TABLE "newsletter_subscribers" ADD COLUMN "unsubscribe_token" VARCHAR(64);

-- `gen_random_uuid()` viene con pgcrypto, presente por defecto desde PostgreSQL 13. Dos uuid
-- por fila para llegar al largo del token que genera la aplicación.
UPDATE "newsletter_subscribers"
SET "unsubscribe_token" = replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')
WHERE "unsubscribe_token" IS NULL;

-- AlterTable
ALTER TABLE "newsletter_subscribers" ALTER COLUMN "unsubscribe_token" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "newsletter_subscribers_unsubscribe_token_key" ON "newsletter_subscribers"("unsubscribe_token");
