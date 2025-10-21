-- Patch 001: Alinear columnas con Prisma
-- Ejecutar en el SQL Editor de Supabase (schema public)

BEGIN;

-- Agregar columna faltante en products
ALTER TABLE "products"
  ADD COLUMN IF NOT EXISTS "description" TEXT;

-- Agregar columna faltante en payments
ALTER TABLE "payments"
  ADD COLUMN IF NOT EXISTS "amount" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- Agregar columna faltante en ingredients
ALTER TABLE "ingredients"
  ADD COLUMN IF NOT EXISTS "unitCost" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- Agregar columna faltante en stock_movements
ALTER TABLE "stock_movements"
  ADD COLUMN IF NOT EXISTS "reference" TEXT;

COMMIT;