import { z } from 'zod';

// User Types
export const UserRoleEnum = z.enum(['ADMIN', 'MANAGER', 'WAITER', 'KITCHEN']);
export type UserRole = z.infer<typeof UserRoleEnum>;

export const CreateUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: UserRoleEnum.default('WAITER'),
});

export const UpdateUserSchema = CreateUserSchema.partial().omit({ password: true });

export const LoginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

export type CreateUserInput = z.infer<typeof CreateUserSchema>;
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;

// Table Types
export const TableStatusEnum = z.enum(['AVAILABLE', 'OCCUPIED', 'RESERVED', 'OUT_OF_SERVICE']);
export type TableStatus = z.infer<typeof TableStatusEnum>;

export const CreateTableSchema = z.object({
  number: z.number().int().positive('Table number must be positive'),
  capacity: z.number().int().positive('Capacity must be positive'),
  status: TableStatusEnum.default('AVAILABLE'),
  qrCode: z.string().optional(),
});

export const UpdateTableSchema = CreateTableSchema.partial();

export type CreateTableInput = z.infer<typeof CreateTableSchema>;
export type UpdateTableInput = z.infer<typeof UpdateTableSchema>;

// Category Types
export const CreateCategorySchema = z.object({
  name: z.string().min(2, 'Category name must be at least 2 characters'),
  description: z.string().optional(),
});

export const UpdateCategorySchema = CreateCategorySchema.partial();

export type CreateCategoryInput = z.infer<typeof CreateCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof UpdateCategorySchema>;

// Product Types
export const CreateProductSchema = z.object({
  name: z.string().min(2, 'Product name must be at least 2 characters'),
  price: z.number().positive('Price must be positive'),
  image: z.string().url().optional(),
  active: z.boolean().default(true),
  categoryId: z.string().min(1, 'Invalid category ID'),
});

export const UpdateProductSchema = CreateProductSchema.partial();

export type CreateProductInput = z.infer<typeof CreateProductSchema>;
export type UpdateProductInput = z.infer<typeof UpdateProductSchema>;

// Order Types
export const OrderStatusEnum = z.enum(['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'DELIVERED', 'CANCELLED']);
export type OrderStatus = z.infer<typeof OrderStatusEnum>;

export const CreateOrderItemSchema = z.object({
  productId: z.string().min(1, 'Invalid product ID'),
  quantity: z.number().int().positive('Quantity must be positive'),
  notes: z.string().optional(),
});

export const OrderItemSchema = z.object({
  id: z.string().optional(),
  orderId: z.string().cuid('Invalid order ID'),
  productId: z.string().min(1, 'Product ID is required'),
  quantity: z.number().int().positive('Quantity must be a positive integer'),
  unitPrice: z.number().positive('Unit price must be positive'),
  notes: z.string().optional(),
});

export const CreateOrderSchema = z.object({
  tableId: z.string().min(1, 'Invalid table ID'),
  items: z.array(CreateOrderItemSchema).min(1, 'Order must have at least one item'),
  notes: z.string().optional(),
});

export const UpdateOrderSchema = z.object({
  status: OrderStatusEnum.optional(),
  notes: z.string().optional(),
});

export type CreateOrderItemInput = z.infer<typeof CreateOrderItemSchema>;
export type CreateOrderInput = z.infer<typeof CreateOrderSchema>;
export type UpdateOrderInput = z.infer<typeof UpdateOrderSchema>;

// Payment Types
export const PaymentMethodEnum = z.enum(['CASH', 'CARD', 'WEBPAY']);
export const PaymentStatusEnum = z.enum(['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED']);

export type PaymentMethod = z.infer<typeof PaymentMethodEnum>;
export type PaymentStatus = z.infer<typeof PaymentStatusEnum>;

export const CreatePaymentSchema = z.object({
  orderId: z.string().uuid('Invalid order ID'),
  amount: z.number().positive('Amount must be positive'),
  method: PaymentMethodEnum,
});

export type CreatePaymentInput = z.infer<typeof CreatePaymentSchema>;

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Query Parameters
export const PaginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
});

export type PaginationInput = z.infer<typeof PaginationSchema>;