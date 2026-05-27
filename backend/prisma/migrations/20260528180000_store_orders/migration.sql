-- Phase 2b: store checkout orders (WebApp → accounting marketplace-sale)

CREATE TYPE "StoreOrderStatus" AS ENUM ('POSTED', 'FAILED');

CREATE TABLE "StoreOrder" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "participantId" TEXT,
    "vendorCode" TEXT NOT NULL,
    "grossAmount" DECIMAL(14,2) NOT NULL,
    "salesAmount" DECIMAL(14,2) NOT NULL,
    "vendorPayableAmount" DECIMAL(14,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'PHP',
    "status" "StoreOrderStatus" NOT NULL DEFAULT 'POSTED',
    "lineItems" JSONB NOT NULL,
    "memo" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoreOrder_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StoreOrder_externalId_key" ON "StoreOrder"("externalId");
CREATE INDEX "StoreOrder_participantId_idx" ON "StoreOrder"("participantId");
CREATE INDEX "StoreOrder_vendorCode_idx" ON "StoreOrder"("vendorCode");

ALTER TABLE "StoreOrder" ADD CONSTRAINT "StoreOrder_participantId_fkey"
    FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
