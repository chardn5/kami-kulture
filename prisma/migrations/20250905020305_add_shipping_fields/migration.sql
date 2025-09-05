/*
  Warnings:

  - You are about to drop the column `shipAddress1` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `shipAddress2` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `shipCity` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `shipCountry` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `shipEmail` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `shipFirstName` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `shipLastName` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `shipPhone` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `shipPostalCode` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `shipState` on the `Order` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."Order" DROP COLUMN "shipAddress1",
DROP COLUMN "shipAddress2",
DROP COLUMN "shipCity",
DROP COLUMN "shipCountry",
DROP COLUMN "shipEmail",
DROP COLUMN "shipFirstName",
DROP COLUMN "shipLastName",
DROP COLUMN "shipPhone",
DROP COLUMN "shipPostalCode",
DROP COLUMN "shipState";
