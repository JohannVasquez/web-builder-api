-- AlterTable
ALTER TABLE "demos" ADD COLUMN     "expiry_warning_error" TEXT,
ADD COLUMN     "expiry_warning_for" TIMESTAMPTZ,
ADD COLUMN     "expiry_warning_sent_at" TIMESTAMPTZ;
