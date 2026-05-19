ALTER TABLE "public"."Order"
ADD COLUMN "printifyOrderId" TEXT,
ADD COLUMN "printifyStatus" TEXT,
ADD COLUMN "printifySubmittedAt" TIMESTAMP(3),
ADD COLUMN "printifyLastError" TEXT,
ADD COLUMN "printifyPayload" JSONB;

CREATE UNIQUE INDEX "Order_printifyOrderId_key" ON "public"."Order"("printifyOrderId");
CREATE INDEX "Order_printifyStatus_idx" ON "public"."Order"("printifyStatus");
