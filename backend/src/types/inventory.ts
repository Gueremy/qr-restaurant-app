import { z } from 'zod';

// Ingredient Types
export const IngredientUnitEnum = z.enum(['UNIT', 'KG', 'LITER', 'PIECE']);
export type IngredientUnit = z.infer<typeof IngredientUnitEnum>;

export const CreateIngredientSchema = z.object({
  name: z.string().min(2, 'Ingredient name must be at least 2 characters'),
  description: z.string().optional(),
  unit: IngredientUnitEnum,
  currentStock: z.number().min(0, 'Current stock cannot be negative').default(0),
  minStock: z.number().min(0, 'Minimum stock cannot be negative').default(0),
  maxStock: z.number().min(0, 'Maximum stock cannot be negative').optional(),
  unitCost: z.number().min(0, 'Unit cost cannot be negative').default(0),
  supplier: z.string().optional(),
});

export const UpdateIngredientSchema = CreateIngredientSchema.partial();

export type CreateIngredientInput = z.infer<typeof CreateIngredientSchema>;
export type UpdateIngredientInput = z.infer<typeof UpdateIngredientSchema>;

// Recipe Types
export const CreateRecipeSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
  name: z.string().min(2, 'Recipe name must be at least 2 characters'),
  description: z.string().optional(),
  instructions: z.string().optional(),
  prepTime: z.number().int().positive('Preparation time must be positive').optional(),
  portions: z.number().int().positive('Portions must be positive').default(1),
});

export const UpdateRecipeSchema = CreateRecipeSchema.partial().omit({ productId: true });

export type CreateRecipeInput = z.infer<typeof CreateRecipeSchema>;
export type UpdateRecipeInput = z.infer<typeof UpdateRecipeSchema>;

// Recipe Ingredient Types
export const CreateRecipeIngredientSchema = z.object({
  ingredientId: z.string().min(1, 'Invalid ingredient ID'),
  quantity: z.number().positive('Quantity must be positive'),
  unit: z.string().min(1, 'Unit is required'),
  notes: z.string().optional(),
});

export const UpdateRecipeIngredientSchema = CreateRecipeIngredientSchema.partial().omit({ ingredientId: true });

export type CreateRecipeIngredientInput = z.infer<typeof CreateRecipeIngredientSchema>;
export type UpdateRecipeIngredientInput = z.infer<typeof UpdateRecipeIngredientSchema>;

// Stock Movement Types
export const StockMovementTypeEnum = z.enum(['IN', 'OUT', 'ADJUSTMENT', 'WASTE']);
export type StockMovementType = z.infer<typeof StockMovementTypeEnum>;

export const CreateStockMovementSchema = z.object({
  ingredientId: z.string().cuid('Invalid ingredient ID'),
  type: StockMovementTypeEnum,
  quantity: z.number().positive('Quantity must be positive'),
  reason: z.string().optional(),
  reference: z.string().optional(),
  unitCost: z.number().min(0, 'Unit cost cannot be negative').optional(),
});

export type CreateStockMovementInput = z.infer<typeof CreateStockMovementSchema>;

// Stock Alert Types
export const StockAlertTypeEnum = z.enum(['LOW_STOCK', 'OUT_OF_STOCK', 'EXPIRED']);
export type StockAlertType = z.infer<typeof StockAlertTypeEnum>;

export const CreateStockAlertSchema = z.object({
  ingredientId: z.string().min(1, 'Invalid ingredient ID'),
  type: StockAlertTypeEnum,
  message: z.string().min(1, 'Message is required'),
});

export type CreateStockAlertInput = z.infer<typeof CreateStockAlertSchema>;

// Inventory Dashboard Types
export interface InventoryStats {
  totalIngredients: number;
  lowStockIngredients: number;
  outOfStockIngredients: number;
  totalValue: number;
  recentMovements: number;
  activeAlerts: number;
}

export interface IngredientWithStock {
  id: string;
  name: string;
  unit: string;
  currentStock: number;
  minStock: number;
  maxStock?: number;
  unitCost: number;
  supplier?: string;
  stockStatus: 'OK' | 'LOW' | 'OUT';
  stockValue: number;
}

export interface RecipeWithIngredients {
  id: string;
  productId: string;
  name: string;
  description?: string;
  instructions?: string;
  prepTime?: number;
  portions: number;
  product: {
    id: string;
    name: string;
    price: number;
  };
  ingredients: {
    id: string;
    ingredientId: string;
    quantity: number;
    unit: string;
    notes?: string | null;
    ingredient: {
      id: string;
      name: string;
      currentStock: number;
      unit: string;
    };
  }[];
  canPrepare: boolean;
  maxPortions: number;
}