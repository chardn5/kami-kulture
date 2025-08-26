-- CreateTable
CREATE TABLE "public"."Order" (
    "seq" BIGSERIAL NOT NULL,
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,
    "amountTotal" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "payerEmail" TEXT,
    "payerName" TEXT,
    "captureId" TEXT,
    "productTitle" TEXT,
    "productSlug" TEXT,
    "selectedSize" TEXT,
    "sku" TEXT,
    "raw" JSONB,
    "buyerEmail" TEXT,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("seq")
);

-- CreateIndex
CREATE UNIQUE INDEX "Order_id_key" ON "public"."Order"("id");

-- CreateIndex
CREATE INDEX "Order_createdAt_idx" ON "public"."Order"("createdAt");

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "public"."Order"("status");

-- CreateIndex
CREATE INDEX "Order_payerEmail_idx" ON "public"."Order"("payerEmail");

-- CreateIndex
CREATE INDEX "Order_productSlug_idx" ON "public"."Order"("productSlug");
