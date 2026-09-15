-- AlterTable
ALTER TABLE "Tor"
ADD COLUMN "revisionTermOfReference" TEXT,
ADD COLUMN "ppnRate" INTEGER DEFAULT 11,
ADD COLUMN "ppnIncluded" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "attachments" JSONB;