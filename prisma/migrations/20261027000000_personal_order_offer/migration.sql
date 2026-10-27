ALTER TABLE "Order" ADD COLUMN "personalOfferClaim" TEXT;
CREATE UNIQUE INDEX "Order_personalOfferClaim_key" ON "Order"("personalOfferClaim");
