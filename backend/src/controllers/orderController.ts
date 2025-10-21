import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { ApiResponseUtil } from '../utils/response';
import { CreateOrderSchema, UpdateOrderSchema, CreateOrderInput, CreateOrderItemInput, UpdateOrderInput } from '../types';
import { socketService } from '../index';

const prisma = new PrismaClient();

// Interfaces para tipado específico
interface OrderQueryParams {
  page?: string;
  limit?: string;
  status?: string;
  tableId?: string;
}

interface OrdersByTableQueryParams {
  status?: string;
}

interface OrderWhereInput {
  status?: string;
  tableId?: string;
}

export class OrderController {
  // GET /api/orders - Get all orders with pagination and filters
  static async getOrders(req: Request, res: Response) {
    try {
      const { page = '1', limit = '10', status, tableId } = req.query as OrderQueryParams;
      const skip = (Number(page) - 1) * Number(limit);

      // Build where clause
      const where: OrderWhereInput = {};
      
      if (status) {
        where.status = status;
      }
      
      if (tableId) {
        where.tableId = tableId;
      }

      const [orders, total] = await Promise.all([
        prisma.order.findMany({
          skip,
          take: Number(limit),
          where,
          include: {
            table: {
              select: {
                id: true,
                number: true,
              },
            },
            items: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    price: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.order.count({ where }),
      ]);

      return ApiResponseUtil.paginated(res, orders, Number(page), Number(limit), total, 'Orders retrieved successfully');
    } catch (error) {
      console.error('Error getting orders:', error);
      return ApiResponseUtil.serverError(res, 'Failed to retrieve orders');
    }
  }

  // GET /api/orders/:id - Get order by ID
  static async getOrderById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const order = await prisma.order.findUnique({
        where: { id },
        include: {
          table: true,
          items: {
            include: {
              product: {
                include: {
                  category: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
            },
          },
          payments: true,
        },
      });

      if (!order) {
        return ApiResponseUtil.notFound(res, 'Order not found');
      }

      return ApiResponseUtil.success(res, order, 'Order retrieved successfully');
    } catch (error) {
      console.error('Error getting order:', error);
      return ApiResponseUtil.serverError(res, 'Failed to retrieve order');
    }
  }

  // GET /api/orders/table/:tableId - Get orders by table
  static async getOrdersByTable(req: Request, res: Response) {
    try {
      const { tableId } = req.params;
      const { status } = req.query as OrdersByTableQueryParams;

      // Check if table exists
      const table = await prisma.table.findUnique({
        where: { id: tableId },
      });

      if (!table) {
        return ApiResponseUtil.notFound(res, 'Table not found');
      }

      const where: OrderWhereInput = { tableId };
      if (status) {
        where.status = status;
      }

      const orders = await prisma.order.findMany({
        where,
        include: {
          table: {
            select: {
              id: true,
              number: true,
            },
          },
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  price: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return ApiResponseUtil.success(res, orders, 'Orders retrieved successfully');
    } catch (error) {
      console.error('Error getting orders by table:', error);
      return ApiResponseUtil.serverError(res, 'Failed to retrieve orders');
    }
  }

  // POST /api/orders - Create new order
  static async createOrder(req: Request, res: Response) {
    try {
      const orderData: CreateOrderInput = req.body;

      // Check if table exists and is available
      const table = await prisma.table.findUnique({
        where: { id: orderData.tableId },
      });

      if (!table) {
        return ApiResponseUtil.notFound(res, 'Table not found');
      }

      // Validate all products exist and are available
      const productIds = orderData.items.map((item: CreateOrderItemInput) => item.productId);
      const products = await prisma.product.findMany({
        where: {
          id: { in: productIds },
          active: true,
        },
      });

      if (products.length !== productIds.length) {
        return ApiResponseUtil.error(res, 'Some products are not available or do not exist');
      }

      // Calculate total amount
      const totalAmount = orderData.items.reduce((total: number, item: CreateOrderItemInput) => {
        const product = products.find((p: any) => p.id === item.productId);
        return total + (product!.price * item.quantity);
      }, 0);

      // Create order with items in a transaction
      const order = await prisma.$transaction(async (tx: any) => {
        // Create the order
        const newOrder = await tx.order.create({
          data: {
            tableId: orderData.tableId,
            total: totalAmount,
            status: 'PENDING',
            notes: orderData.notes,
          },
        });

        // Create order items
        const orderItems = await Promise.all(
          orderData.items.map((item: CreateOrderItemInput) =>
            tx.orderItem.create({
              data: {
                orderId: newOrder.id,
                productId: item.productId,
                quantity: item.quantity,
                price: products.find((p: any) => p.id === item.productId)!.price,
                notes: item.notes,
              },
            })
          )
        );

        // Update table status to occupied if it's available
        if (table.status === 'AVAILABLE') {
          await tx.table.update({
            where: { id: orderData.tableId },
            data: { status: 'OCCUPIED' },
          });
        }

        return { ...newOrder, items: orderItems };
      });

      // Fetch the complete order with relations for notification
      const completeOrder = await prisma.order.findUnique({
        where: { id: order.id },
        include: {
          table: true,
          items: {
            include: {
              product: true,
            },
          },
          user: true,
        },
      });

      // Send real-time notification to kitchen
      if (completeOrder) {
        socketService.notifyNewOrder(completeOrder);
      }

      return ApiResponseUtil.created(res, order, 'Order created successfully');
    } catch (error) {
      console.error('Error creating order:', error);
      return ApiResponseUtil.serverError(res, 'Failed to create order');
    }
  }

  // PUT /api/orders/:id/status - Update order status
  static async updateOrderStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { status, notes }: UpdateOrderInput = req.body;

      if (!status) {
        return ApiResponseUtil.error(res, 'Status is required');
      }

      // Check if order exists
      const existingOrder = await prisma.order.findUnique({
        where: { id },
        include: { table: true },
      });

      if (!existingOrder) {
        return ApiResponseUtil.notFound(res, 'Order not found');
      }

      // Update order status
      const updatedOrder = await prisma.$transaction(async (tx: any) => {
        const order = await tx.order.update({
          where: { id },
          data: { 
            status,
            ...(notes && { notes }),
          },
          include: {
            table: true,
            items: {
              include: {
                product: true,
              },
            },
          },
        });

        // If order is completed or cancelled, check if table should be available
        if (status === 'DELIVERED' || status === 'CANCELLED') {
          const activeOrders = await tx.order.count({
            where: {
              tableId: existingOrder.tableId,
              status: {
                in: ['PENDING', 'CONFIRMED', 'PREPARING', 'READY'],
              },
              id: { not: id },
            },
          });

          // If no more active orders, make table available
          if (activeOrders === 0) {
            await tx.table.update({
              where: { id: existingOrder.tableId },
              data: { status: 'AVAILABLE' },
            });
          }
        }

        return order;
      });

      // Send real-time notification for status change
      socketService.notifyOrderStatusUpdate(id, status);

      return ApiResponseUtil.success(res, updatedOrder, 'Order status updated successfully');
    } catch (error) {
      console.error('Error updating order status:', error);
      return ApiResponseUtil.serverError(res, 'Failed to update order status');
    }
  }

  // DELETE /api/orders/:id - Cancel order (soft delete)
  static async cancelOrder(req: Request, res: Response) {
    try {
      const { id } = req.params;

      // Check if order exists
      const existingOrder = await prisma.order.findUnique({
        where: { id },
      });

      if (!existingOrder) {
        return ApiResponseUtil.notFound(res, 'Order not found');
      }

      // Only allow cancellation of pending or confirmed orders
      if (!['PENDING', 'CONFIRMED'].includes(existingOrder.status)) {
        return ApiResponseUtil.conflict(res, 'Cannot cancel order in current status');
      }

      // Update order status to cancelled
      const cancelledOrder = await prisma.order.update({
        where: { id },
        data: { status: 'CANCELLED' },
        include: {
          table: true,
          items: {
            include: {
              product: true,
            },
          },
        },
      });

      return ApiResponseUtil.success(res, cancelledOrder, 'Order cancelled successfully');
    } catch (error) {
      console.error('Error cancelling order:', error);
      return ApiResponseUtil.serverError(res, 'Failed to cancel order');
    }
  }

  // GET /api/orders/kitchen - Get orders for kitchen (preparing status)
  static async getKitchenOrders(req: Request, res: Response) {
    try {
      const orders = await prisma.order.findMany({
        where: {
          status: {
            in: ['CONFIRMED', 'PREPARING'],
          },
        },
        include: {
          table: {
            select: {
              id: true,
              number: true,
            },
          },
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  category: {
                    select: {
                      name: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      });

      return ApiResponseUtil.success(res, orders, 'Kitchen orders retrieved successfully');
    } catch (error) {
      console.error('Error getting kitchen orders:', error);
      return ApiResponseUtil.serverError(res, 'Failed to retrieve kitchen orders');
    }
  }
}