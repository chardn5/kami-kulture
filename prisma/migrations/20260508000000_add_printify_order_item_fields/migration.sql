-- AlterTable
ALTER TABLE "public"."OrderItem" ADD COLUMN "color" TEXT,
ADD COLUMN "printifyProductId" TEXT,
ADD COLUMN "printifyVariantId" INTEGER;

-- CreateIndex
CREATE INDEX "OrderItem_printifyProductId_idx" ON "public"."OrderItem"("printifyProductId");

-- CreateIndex
CREATE INDEX "OrderItem_printifyVariantId_idx" ON "public"."OrderItem"("printifyVariantId");
