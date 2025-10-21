import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { ApiResponseUtil } from '../utils/response';
import { CreateTableInput, UpdateTableInput } from '../types';
import * as QRCode from 'qrcode';

const prisma = new PrismaClient();

export class TableController {
  // GET /api/tables - Get all tables with pagination
  static async getTables(req: Request, res: Response) {
    try {
      const { page = 1, limit = 10 } = req.query as any;
      const skip = (page - 1) * limit;

      const [tables, total] = await Promise.all([
        prisma.table.findMany({
          skip,
          take: limit,
          orderBy: { number: 'asc' },
        }),
        prisma.table.count(),
      ]);

      return ApiResponseUtil.paginated(res, tables, page, limit, total, 'Tables retrieved successfully');
    } catch (error) {
      console.error('Error getting tables:', error);
      return ApiResponseUtil.serverError(res, 'Failed to retrieve tables');
    }
  }

  // GET /api/tables/:id - Get table by ID
  static async getTableById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const table = await prisma.table.findUnique({
        where: { id },
        include: {
          orders: {
            where: {
              status: {
                in: ['PENDING', 'CONFIRMED', 'PREPARING', 'READY'],
              },
            },
            include: {
              items: {
                include: {
                  product: true,
                },
              },
            },
          },
        },
      });

      if (!table) {
        return ApiResponseUtil.notFound(res, 'Table not found');
      }

      return ApiResponseUtil.success(res, table, 'Table retrieved successfully');
    } catch (error) {
      console.error('Error getting table:', error);
      return ApiResponseUtil.serverError(res, 'Failed to retrieve table');
    }
  }

  // GET /api/tables/number/:number - Get table by number
  static async getTableByNumber(req: Request, res: Response) {
    try {
      const { number } = req.params;
      const tableNumber = parseInt(number);

      if (isNaN(tableNumber)) {
        return ApiResponseUtil.error(res, 'Invalid table number');
      }

      const table = await prisma.table.findUnique({
        where: { number: tableNumber },
        include: {
          orders: {
            where: {
              status: {
                in: ['PENDING', 'CONFIRMED', 'PREPARING', 'READY'],
              },
            },
            include: {
              items: {
                include: {
                  product: true,
                },
              },
            },
          },
        },
      });

      if (!table) {
        return ApiResponseUtil.notFound(res, 'Table not found');
      }

      return ApiResponseUtil.success(res, table, 'Table retrieved successfully');
    } catch (error) {
      console.error('Error getting table by number:', error);
      return ApiResponseUtil.serverError(res, 'Failed to retrieve table');
    }
  }

  // POST /api/tables - Create new table
  static async createTable(req: Request, res: Response) {
    try {
      const tableData: CreateTableInput = req.body;

      // Check if table number already exists
      const existingTable = await prisma.table.findUnique({
        where: { number: tableData.number },
      });

      if (existingTable) {
        return ApiResponseUtil.conflict(res, 'Table with this number already exists');
      }

      // Generate QR code URL
      const qrUrl = `${process.env.FRONTEND_URL || 'http://localhost:5174'}/table/${tableData.number}`;

      // Generate QR code as base64 image
      const qrCodeImage: string = await QRCode.toDataURL(qrUrl, {
        errorCorrectionLevel: 'M',
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        width: 256
      });

      // Create table
      const table = await prisma.table.create({
        data: {
          ...tableData,
          qrCode: qrCodeImage,
        },
      });

      return ApiResponseUtil.created(res, table, 'Table created successfully');
    } catch (error) {
      console.error('Error creating table:', error);
      return ApiResponseUtil.serverError(res, 'Failed to create table');
    }
  }

  // PUT /api/tables/:id - Update table
  static async updateTable(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updateData: UpdateTableInput = req.body;

      // Check if table exists
      const existingTable = await prisma.table.findUnique({
        where: { id },
      });

      if (!existingTable) {
        return ApiResponseUtil.notFound(res, 'Table not found');
      }

      // Check if table number is being updated and already exists
      if (updateData.number && updateData.number !== existingTable.number) {
        const numberExists = await prisma.table.findUnique({
          where: { number: updateData.number },
        });

        if (numberExists) {
          return ApiResponseUtil.conflict(res, 'Table number already in use');
        }
      }

      // Update table
      const updatedTable = await prisma.table.update({
        where: { id },
        data: updateData,
      });

      return ApiResponseUtil.success(res, updatedTable, 'Table updated successfully');
    } catch (error) {
      console.error('Error updating table:', error);
      return ApiResponseUtil.serverError(res, 'Failed to update table');
    }
  }

  // DELETE /api/tables/:id - Delete table
  static async deleteTable(req: Request, res: Response) {
    try {
      const { id } = req.params;

      // Check if table exists
      const existingTable = await prisma.table.findUnique({
        where: { id },
        include: {
          orders: {
            where: {
              status: {
                in: ['PENDING', 'CONFIRMED', 'PREPARING', 'READY'],
              },
            },
          },
        },
      });

      if (!existingTable) {
        return ApiResponseUtil.notFound(res, 'Table not found');
      }

      // Check if table has active orders
      if (existingTable.orders.length > 0) {
        return ApiResponseUtil.conflict(res, 'Cannot delete table with active orders');
      }

      // Delete table
      await prisma.table.delete({
        where: { id },
      });

      return ApiResponseUtil.success(res, null, 'Table deleted successfully');
    } catch (error) {
      console.error('Error deleting table:', error);
      return ApiResponseUtil.serverError(res, 'Failed to delete table');
    }
  }

  // PATCH /api/tables/:id/status - Update table status
  static async updateTableStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!status || !['AVAILABLE', 'OCCUPIED', 'RESERVED', 'OUT_OF_SERVICE'].includes(status)) {
        return ApiResponseUtil.error(res, 'Invalid status');
      }

      // Check if table exists
      const existingTable = await prisma.table.findUnique({
        where: { id },
      });

      if (!existingTable) {
        return ApiResponseUtil.notFound(res, 'Table not found');
      }

      // Update table status
      const updatedTable = await prisma.table.update({
        where: { id },
        data: { status },
      });

      return ApiResponseUtil.success(res, updatedTable, 'Table status updated successfully');
    } catch (error) {
      console.error('Error updating table status:', error);
      return ApiResponseUtil.serverError(res, 'Failed to update table status');
    }
  }

  // GET /api/tables/available - Get available tables
  static async getAvailableTables(req: Request, res: Response) {
    try {
      const tables = await prisma.table.findMany({
        where: { status: 'AVAILABLE' },
        orderBy: { number: 'asc' },
      });

      return ApiResponseUtil.success(res, tables, 'Available tables retrieved successfully');
    } catch (error) {
      console.error('Error getting available tables:', error);
      return ApiResponseUtil.serverError(res, 'Failed to retrieve available tables');
    }
  }

  // POST /api/tables/:id/qr - Generate QR code for table
  static async generateQR(req: Request, res: Response) {
    try {
      const { id } = req.params;

      // Check if table exists
      const existingTable = await prisma.table.findUnique({
        where: { id },
      });

      if (!existingTable) {
        return ApiResponseUtil.notFound(res, 'Table not found');
      }

      // Generate QR code URL
      const qrUrl = `${process.env.FRONTEND_URL || 'http://localhost:5174'}/table/${existingTable.number}`;

      // Generate QR code as base64 image
      const qrCodeImage: string = await QRCode.toDataURL(qrUrl, {
        errorCorrectionLevel: 'M',
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        width: 256
      });

      // Update table with new QR code image
      const updatedTable = await prisma.table.update({
        where: { id },
        data: { qrCode: qrCodeImage },
      });

      return ApiResponseUtil.success(res, { qrCode: updatedTable.qrCode }, 'QR code generated successfully');
    } catch (error) {
      console.error('Error generating QR code:', error);
      return ApiResponseUtil.serverError(res, 'Failed to generate QR code');
    }
  }
}