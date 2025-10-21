-- SQL de inicialización para QR Restaurant (schema public)
-- Generado desde prisma/schema.prisma para ejecución en Supabase
-- Ejecutar una sola vez en el SQL Editor de Supabase

BEGIN;

CREATE TABLE IF NOT EXISTS "users" (
  "id" TEXT PRIMARY KEY,
  "email" TEXT NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "password" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'WAITER',
  "active" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "tables" (
  "id" TEXT PRIMARY KEY,
  "number" INTEGER NOT NULL UNIQUE,
  "capacity" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
  "qrCode" TEXT UNIQUE,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "categories" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT TRUE,
  "order" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "products" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "price" DOUBLE PRECISION NOT NULL,
  "image" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT TRUE,
  "stock" INTEGER NOT NULL DEFAULT 0,
  "categoryId" TEXT NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT "products_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories" ("id")
);

CREATE TABLE IF NOT EXISTS "orders" (
  "id" TEXT PRIMARY KEY,
  "tableId" TEXT NOT NULL,
  "userId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "notes" TEXT,
  "estimatedTime" INTEGER,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT "orders_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "tables" ("id"),
  CONSTRAINT "orders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id")
);

CREATE TABLE IF NOT EXISTS "order_items" (
  "id" TEXT PRIMARY KEY,
  "orderId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "price" DOUBLE PRECISION NOT NULL,
  "notes" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT "order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders" ("id") ON DELETE CASCADE,
  CONSTRAINT "order_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products" ("id")
);

CREATE TABLE IF NOT EXISTS "payments" (
  "id" TEXT PRIMARY KEY,
  "orderId" TEXT NOT NULL,
  "method" TEXT NOT NULL DEFAULT 'CASH',
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "transactionId" TEXT UNIQUE,
  "webpayToken" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT "payments_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders" ("id")
);

CREATE TABLE IF NOT EXISTS "shifts" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "startTime" TIMESTAMP NOT NULL,
  "endTime" TIMESTAMP,
  "totalSales" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT "shifts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id")
);

CREATE TABLE IF NOT EXISTS "daily_closes" (
  "id" TEXT PRIMARY KEY,
  "date" TIMESTAMP NOT NULL UNIQUE,
  "totalSales" DOUBLE PRECISION NOT NULL,
  "totalOrders" INTEGER NOT NULL,
  "totalTips" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "cashAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "cardAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "expenses" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "notes" TEXT,
  "closedBy" TEXT NOT NULL,
  "backupPath" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "ingredients" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "unit" TEXT NOT NULL,
  "currentStock" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "minStock" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "maxStock" DOUBLE PRECISION,
  "supplier" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "recipes" (
  "id" TEXT PRIMARY KEY,
  "productId" TEXT NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "instructions" TEXT,
  "prepTime" INTEGER,
  "portions" INTEGER NOT NULL DEFAULT 1,
  "active" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT "recipes_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products" ("id")
);

CREATE TABLE IF NOT EXISTS "recipe_ingredients" (
  "id" TEXT PRIMARY KEY,
  "recipeId" TEXT NOT NULL,
  "ingredientId" TEXT NOT NULL,
  "quantity" DOUBLE PRECISION NOT NULL,
  "unit" TEXT NOT NULL,
  "notes" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT "recipe_ingredients_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "recipes" ("id") ON DELETE CASCADE,
  CONSTRAINT "recipe_ingredients_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "ingredients" ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "recipe_ingredients_recipeId_ingredientId_key"
  ON "recipe_ingredients" ("recipeId", "ingredientId");

CREATE TABLE IF NOT EXISTS "stock_movements" (
  "id" TEXT PRIMARY KEY,
  "ingredientId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "quantity" DOUBLE PRECISION NOT NULL,
  "reason" TEXT,
  "unitCost" DOUBLE PRECISION,
  "userId" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT "stock_movements_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "ingredients" ("id"),
  CONSTRAINT "stock_movements_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id")
);

CREATE TABLE IF NOT EXISTS "stock_alerts" (
  "id" TEXT PRIMARY KEY,
  "ingredientId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "isRead" BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "readAt" TIMESTAMP,
  CONSTRAINT "stock_alerts_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "ingredients" ("id")
);

COMMIT;

