ALTER TABLE "public"."Order"
ADD COLUMN "printifyCostSubtotal" DECIMAL(12,2),
ADD COLUMN "printifyCostShipping" DECIMAL(12,2),
ADD COLUMN "printifyCostTax" DECIMAL(12,2),
ADD COLUMN "printifyCostTotal" DECIMAL(12,2),
ADD COLUMN "estimatedPaymentFee" DECIMAL(12,2),
ADD COLUMN "estimatedProfit" DECIMAL(12,2),
ADD COLUMN "trackingCarrier" TEXT,
ADD COLUMN "trackingNumber" TEXT,
ADD COLUMN "trackingUrl" TEXT,
ADD COLUMN "shippedAt" TIMESTAMP(3),
ADD COLUMN "deliveredAt" TIMESTAMP(3),
ADD COLUMN "statusEmailLastStatus" TEXT,
ADD COLUMN "statusEmailSentAt" TIMESTAMP(3);

CREATE INDEX "Order_trackingNumber_idx" ON "public"."Order"("trackingNumber");
