ALTER TABLE "Order"
  ADD COLUMN "paypalOrderId" TEXT,
  ADD COLUMN "paidAt" TIMESTAMP(3),
  ADD COLUMN "receiptSentAt" TIMESTAMP(3),
  ADD COLUMN "adminNotificationSentAt" TIMESTAMP(3),
  ADD COLUMN "paymentEffectsCompletedAt" TIMESTAMP(3),
  ADD COLUMN "paymentProcessingUntil" TIMESTAMP(3),
  ADD COLUMN "paymentProcessingToken" TEXT,
  ADD COLUMN "paymentLastError" TEXT;
CREATE UNIQUE INDEX "Order_paypalOrderId_key" ON "Order"("paypalOrderId");

CREATE TABLE "PaymentEvent" (
  "id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "environment" TEXT NOT NULL,
  "paypalOrderId" TEXT,
  "orderId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'RECEIVED',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processedAt" TIMESTAMP(3),
  CONSTRAINT "PaymentEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "PaymentEvent_createdAt_idx" ON "PaymentEvent"("createdAt");
CREATE INDEX "PaymentEvent_status_idx" ON "PaymentEvent"("status");
CREATE INDEX "PaymentEvent_orderId_idx" ON "PaymentEvent"("orderId");
