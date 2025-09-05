-- prisma/migrations/20250905_add_shipping_fields/migration.sql
-- Adds nullable shipping/customer snapshot columns for easy reads
ALTER TABLE "Order"
ADD COLUMN IF NOT EXISTS "shipFirstName"   TEXT,
ADD COLUMN IF NOT EXISTS "shipLastName"    TEXT,
ADD COLUMN IF NOT EXISTS "shipEmail"       TEXT,
ADD COLUMN IF NOT EXISTS "shipPhone"       TEXT,
ADD COLUMN IF NOT EXISTS "shipAddress1"    TEXT,
ADD COLUMN IF NOT EXISTS "shipAddress2"    TEXT,
ADD COLUMN IF NOT EXISTS "shipCity"        TEXT,
ADD COLUMN IF NOT EXISTS "shipState"       TEXT,
ADD COLUMN IF NOT EXISTS "shipPostalCode"  TEXT,
ADD COLUMN IF NOT EXISTS "shipCountry"     TEXT;
