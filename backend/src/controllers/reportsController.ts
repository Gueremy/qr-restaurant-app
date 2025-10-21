import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { ApiResponseUtil } from '../utils/response';
import * as ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

export class ReportsController {
  // GET /api/reports/sales - Reporte de ventas con filtros
  static async getSalesReport(req: Request, res: Response) {
    try {
      const {
        startDate,
        endDate,
        groupBy = 'day', // day, week, month
        status = 'DELIVERED',
        userId,
        tableId,
        categoryId
      } = req.query;

      // Validar fechas
      if (!startDate || !endDate) {
        ApiResponseUtil.error(res, 'Start date and end date are required', 400);
        return;
      }

      const start = new Date(startDate as string);
      const end = new Date(endDate as string);
      end.setHours(23, 59, 59, 999);

      // Construir filtros
      const where: any = {
        createdAt: {
          gte: start,
          lte: end
        }
      };

      if (status) {
        where.status = status;
      }

      if (userId) {
        where.userId = userId;
      }

      if (tableId) {
        where.tableId = tableId;
      }

      // Obtener pedidos con detalles
      const orders = await prisma.order.findMany({
        where,
        include: {
          items: {
            include: {
              product: {
                include: {
                  category: true
                }
              }
            }
          },
          payments: true,
          table: true,
          user: {
            select: { name: true, email: true }
          }
        },
        orderBy: {
          createdAt: 'asc'
        }
      });

      // Filtrar por categoría si se especifica
      let filteredOrders = orders;
      if (categoryId) {
        filteredOrders = orders.filter((order: any) =>
          order.items.some((item: any) => item.product.categoryId === categoryId)
        );
      }

      // Calcular estadísticas generales
      const totalSales = filteredOrders.reduce((sum: any, order: any) => sum + order.total, 0);
      const totalOrders = filteredOrders.length;
      const averageOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

      // Agrupar datos según el parámetro groupBy
      const groupedData = ReportsController.groupOrdersByPeriod(filteredOrders, groupBy as string);

      // Calcular productos más vendidos
      const productSales = new Map();
      filteredOrders.forEach((order: any) => {
        order.items.forEach((item: any) => {
          const key = item.product.name;
          const current = productSales.get(key) || { quantity: 0, revenue: 0 };
          productSales.set(key, {
            quantity: current.quantity + item.quantity,
            revenue: current.revenue + (item.price * item.quantity)
          });
        });
      });

      const topProducts = Array.from(productSales.entries())
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

      // Calcular ventas por categoría
      const categorySales = new Map();
      filteredOrders.forEach((order: any) => {
        order.items.forEach((item: any) => {
          const categoryName = item.product.category.name;
          const current = categorySales.get(categoryName) || 0;
          categorySales.set(categoryName, current + (item.price * item.quantity));
        });
      });

      const salesByCategory = Array.from(categorySales.entries())
        .map(([category, revenue]) => ({ category, revenue }))
        .sort((a, b) => b.revenue - a.revenue);

      // Calcular métodos de pago
      const paymentMethods = new Map();
      filteredOrders.forEach((order: any) => {
        order.payments.forEach((payment: any) => {
          if (payment.status === 'COMPLETED') {
            const method = payment.method;
            const current = paymentMethods.get(method) || 0;
            paymentMethods.set(method, current + payment.amount);
          }
        });
      });

      const paymentMethodStats = Array.from(paymentMethods.entries())
        .map(([method, amount]) => ({ method, amount }));

      return ApiResponseUtil.success(res, {
        summary: {
          totalSales,
          totalOrders,
          averageOrderValue,
          period: { startDate, endDate }
        },
        groupedData,
        topProducts,
        salesByCategory,
        paymentMethodStats
      }, 'Sales report generated successfully');

    } catch (error) {
      console.error('Error generating sales report:', error);
      return ApiResponseUtil.serverError(res, 'Failed to generate sales report');
    }
  }

  // GET /api/reports/analytics - Análisis y tendencias
  static async getAnalytics(req: Request, res: Response) {
    try {
      const {
        period = '30', // días
        compareWith = 'previous' // previous, lastYear
      } = req.query;

      const days = parseInt(period as string);
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Período actual
      const currentPeriodOrders = await prisma.order.findMany({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate
          },
          status: 'DELIVERED'
        },
        include: {
          items: {
            include: {
              product: true
            }
          }
        }
      });

      // Período de comparación
      let comparisonStartDate = new Date(startDate);
      let comparisonEndDate = new Date(endDate);

      if (compareWith === 'previous') {
        comparisonEndDate = new Date(startDate);
        comparisonStartDate = new Date(startDate);
        comparisonStartDate.setDate(comparisonStartDate.getDate() - days);
      } else if (compareWith === 'lastYear') {
        comparisonStartDate.setFullYear(comparisonStartDate.getFullYear() - 1);
        comparisonEndDate.setFullYear(comparisonEndDate.getFullYear() - 1);
      }

      const comparisonOrders = await prisma.order.findMany({
        where: {
          createdAt: {
            gte: comparisonStartDate,
            lte: comparisonEndDate
          },
          status: 'DELIVERED'
        },
        include: {
          items: {
            include: {
              product: true
            }
          }
        }
      });

      // Calcular métricas actuales
      const currentMetrics = ReportsController.calculatePeriodMetrics(currentPeriodOrders);
      const comparisonMetrics = ReportsController.calculatePeriodMetrics(comparisonOrders);

      // Calcular cambios porcentuales
      const changes = {
        salesChange: ReportsController.calculatePercentageChange(
          comparisonMetrics.totalSales,
          currentMetrics.totalSales
        ),
        ordersChange: ReportsController.calculatePercentageChange(
          comparisonMetrics.totalOrders,
          currentMetrics.totalOrders
        ),
        avgOrderValueChange: ReportsController.calculatePercentageChange(
          comparisonMetrics.averageOrderValue,
          currentMetrics.averageOrderValue
        )
      };

      // Tendencias diarias
      const dailyTrends = ReportsController.calculateDailyTrends(currentPeriodOrders, days);

      // Análisis de horarios pico
      const hourlyAnalysis = ReportsController.analyzeHourlyPatterns(currentPeriodOrders);

      // Productos en tendencia
      const trendingProducts = ReportsController.analyzeTrendingProducts(
        currentPeriodOrders,
        comparisonOrders
      );

      return ApiResponseUtil.success(res, {
        currentPeriod: currentMetrics,
        comparisonPeriod: comparisonMetrics,
        changes,
        dailyTrends,
        hourlyAnalysis,
        trendingProducts
      }, 'Analytics generated successfully');

    } catch (error) {
      console.error('Error generating analytics:', error);
      return ApiResponseUtil.serverError(res, 'Failed to generate analytics');
    }
  }

  // GET /api/reports/export/excel - Exportar a Excel
  static async exportToExcel(req: Request, res: Response): Promise<void> {
    try {
      const {
        startDate,
        endDate,
        reportType = 'sales' // sales, products, customers
      } = req.query;

      if (!startDate || !endDate) {
        ApiResponseUtil.error(res, 'Start date and end date are required', 400);
        return;
      }

      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Restaurant Management System';
      workbook.created = new Date();

      if (reportType === 'sales') {
        await ReportsController.addSalesSheetToWorkbook(workbook, startDate as string, endDate as string);
      } else if (reportType === 'products') {
        await ReportsController.addProductsSheetToWorkbook(workbook, startDate as string, endDate as string);
      }

      // Configurar respuesta
      const fileName = `reporte_${reportType}_${startDate}_${endDate}.xlsx`;
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

      await workbook.xlsx.write(res);
      res.end();

    } catch (error) {
        console.error('Error exporting to Excel:', error);
        ApiResponseUtil.serverError(res, 'Failed to export to Excel');
        return;
      }
  }

  // GET /api/reports/export/pdf - Exportar a PDF
  static async exportToPDF(req: Request, res: Response): Promise<void> {
    try {
      const {
        startDate,
        endDate,
        reportType = 'sales'
      } = req.query;

      if (!startDate || !endDate) {
        ApiResponseUtil.error(res, 'Start date and end date are required', 400);
        return;
      }

      const doc = new PDFDocument();
      const fileName = `reporte_${reportType}_${startDate}_${endDate}.pdf`;

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

      doc.pipe(res);

      // Agregar contenido al PDF
      if (reportType === 'sales') {
        await ReportsController.addSalesContentToPDF(doc, startDate as string, endDate as string);
      }

      doc.end();

    } catch (error) {
        console.error('Error exporting to PDF:', error);
        ApiResponseUtil.serverError(res, 'Failed to export to PDF');
        return;
      }
  }

  // GET /api/reports/dashboard - Datos para dashboard
  static async getDashboardData(req: Request, res: Response) {
    try {
      const today = new Date();
      const startOfDay = new Date(today);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(today);
      endOfDay.setHours(23, 59, 59, 999);

      // Estadísticas del día actual
      const [
        todayOrders,
        todaySales,
        activeOrders,
        totalTables,
        occupiedTables,
        topProductsToday
      ] = await Promise.all([
        prisma.order.count({
          where: {
            createdAt: { gte: startOfDay, lte: endOfDay }
          }
        }),
        prisma.order.aggregate({
          where: {
            createdAt: { gte: startOfDay, lte: endOfDay },
            status: 'DELIVERED'
          },
          _sum: { total: true }
        }),
        prisma.order.count({
          where: {
            status: { in: ['PENDING', 'CONFIRMED', 'PREPARING', 'READY'] }
          }
        }),
        prisma.table.count(),
        prisma.table.count({
          where: { status: 'OCCUPIED' }
        }),
        ReportsController.getTodayTopProducts()
      ]);

      // Estadísticas de la semana
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - 7);

      const weeklyStats = await prisma.order.aggregate({
        where: {
          createdAt: { gte: startOfWeek, lte: endOfDay },
          status: 'DELIVERED'
        },
        _sum: { total: true },
        _count: true
      });

      // Gráfico de ventas de los últimos 7 días
      const last7Days = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
        const nextDay = new Date(date);
        nextDay.setDate(nextDay.getDate() + 1);

        const dayStats = await prisma.order.aggregate({
          where: {
            createdAt: { gte: date, lt: nextDay },
            status: 'DELIVERED'
          },
          _sum: { total: true },
          _count: true
        });

        last7Days.push({
          date: date.toISOString().split('T')[0],
          sales: dayStats._sum.total || 0,
          orders: dayStats._count || 0
        });
      }

      return ApiResponseUtil.success(res, {
        today: {
          orders: todayOrders,
          sales: todaySales._sum.total || 0,
          activeOrders,
          tableOccupancy: {
            total: totalTables,
            occupied: occupiedTables,
            percentage: totalTables > 0 ? (occupiedTables / totalTables) * 100 : 0
          }
        },
        weekly: {
          sales: weeklyStats._sum.total || 0,
          orders: weeklyStats._count || 0
        },
        topProductsToday,
        last7Days
      }, 'Dashboard data retrieved successfully');

    } catch (error) {
      console.error('Error getting dashboard data:', error);
      return ApiResponseUtil.serverError(res, 'Failed to get dashboard data');
    }
  }

  // Métodos auxiliares privados
  private static groupOrdersByPeriod(orders: any[], groupBy: string) {
    const grouped = new Map();

    orders.forEach((order: any) => {
      let key: string;
      const date = new Date(order.createdAt);

      switch (groupBy) {
        case 'day':
          key = date.toISOString().split('T')[0];
          break;
        case 'week':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = weekStart.toISOString().split('T')[0];
          break;
        case 'month':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
        default:
          key = date.toISOString().split('T')[0];
      }

      const current = grouped.get(key) || { sales: 0, orders: 0 };
      grouped.set(key, {
        sales: current.sales + order.total,
        orders: current.orders + 1
      });
    });

    return Array.from(grouped.entries())
      .map(([period, data]) => ({ period, ...data }))
      .sort((a, b) => a.period.localeCompare(b.period));
  }

  private static calculatePeriodMetrics(orders: any[]) {
    const totalSales = orders.reduce((sum: number, order: any) => sum + order.total, 0);
    const totalOrders = orders.length;
    const averageOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

    return { totalSales, totalOrders, averageOrderValue };
  }

  private static calculatePercentageChange(oldValue: number, newValue: number): number {
    if (oldValue === 0) return newValue > 0 ? 100 : 0;
    return ((newValue - oldValue) / oldValue) * 100;
  }

  private static calculateDailyTrends(orders: any[], days: number) {
    const dailyData = new Map();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split('T')[0];
      dailyData.set(dateKey, { sales: 0, orders: 0 });
    }

    orders.forEach((order: any) => {
      const dateKey = new Date(order.createdAt).toISOString().split('T')[0];
      if (dailyData.has(dateKey)) {
        const current = dailyData.get(dateKey);
        dailyData.set(dateKey, {
          sales: current.sales + order.total,
          orders: current.orders + 1
        });
      }
    });

    return Array.from(dailyData.entries())
      .map(([date, data]) => ({ date, ...data }));
  }

  private static analyzeHourlyPatterns(orders: any[]) {
    const hourlyData = new Array(24).fill(0).map((_, hour) => ({
      hour,
      orders: 0,
      sales: 0
    }));

    orders.forEach((order: any) => {
      const hour = new Date(order.createdAt).getHours();
      hourlyData[hour].orders++;
      hourlyData[hour].sales += order.total;
    });

    return hourlyData;
  }

  private static analyzeTrendingProducts(currentOrders: any[], comparisonOrders: any[]) {
    const currentProducts = new Map();
    const comparisonProducts = new Map();

    // Contar productos del período actual
    currentOrders.forEach(order => {
      order.items.forEach((item: any) => {
        const key = item.product.name;
        const current = currentProducts.get(key) || 0;
        currentProducts.set(key, current + item.quantity);
      });
    });

    // Contar productos del período de comparación
    comparisonOrders.forEach(order => {
      order.items.forEach((item: any) => {
        const key = item.product.name;
        const current = comparisonProducts.get(key) || 0;
        comparisonProducts.set(key, current + item.quantity);
      });
    });

    // Calcular tendencias
    const trends = [];
    for (const [product, currentQuantity] of currentProducts.entries()) {
      const comparisonQuantity = comparisonProducts.get(product) || 0;
      const change = ReportsController.calculatePercentageChange(comparisonQuantity, currentQuantity);
      
      trends.push({
        product,
        currentQuantity,
        comparisonQuantity,
        change
      });
    }

    return trends
      .sort((a, b) => b.change - a.change)
      .slice(0, 10);
  }

  private static async getTodayTopProducts() {
    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    const orders = await prisma.order.findMany({
      where: {
        createdAt: { gte: startOfDay, lte: endOfDay },
        status: 'DELIVERED'
      },
      include: {
        items: {
          include: {
            product: true
          }
        }
      }
    });

    const productSales = new Map();
    orders.forEach((order: any) => {
      order.items.forEach((item: any) => {
        const key = item.product.name;
        const current = productSales.get(key) || 0;
        productSales.set(key, current + item.quantity);
      });
    });

    return Array.from(productSales.entries())
      .map(([name, quantity]) => ({ name, quantity }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);
  }

  private static async addSalesSheetToWorkbook(workbook: ExcelJS.Workbook, startDate: string, endDate: string) {
    const worksheet = workbook.addWorksheet('Reporte de Ventas');

    // Configurar columnas
    worksheet.columns = [
      { header: 'Fecha', key: 'date', width: 15 },
      { header: 'Pedido ID', key: 'orderId', width: 15 },
      { header: 'Mesa', key: 'table', width: 10 },
      { header: 'Mesero', key: 'waiter', width: 20 },
      { header: 'Total', key: 'total', width: 12 },
      { header: 'Estado', key: 'status', width: 12 },
      { header: 'Método de Pago', key: 'paymentMethod', width: 15 }
    ];

    // Obtener datos
    const orders = await prisma.order.findMany({
      where: {
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      },
      include: {
        table: true,
        user: true,
        payments: true
      },
      orderBy: { createdAt: 'desc' }
    });

    // Agregar datos
    orders.forEach((order: any) => {
      worksheet.addRow({
        date: order.createdAt.toLocaleDateString(),
        orderId: order.id,
        table: order.table?.number || 'N/A',
        waiter: order.user?.name || 'N/A',
        total: order.total,
        status: order.status,
        paymentMethod: order.payments[0]?.method || 'N/A'
      });
    });

    // Estilo del encabezado
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };
  }

  private static async addProductsSheetToWorkbook(workbook: ExcelJS.Workbook, startDate: string, endDate: string) {
    const worksheet = workbook.addWorksheet('Productos Vendidos');

    worksheet.columns = [
      { header: 'Producto', key: 'product', width: 25 },
      { header: 'Categoría', key: 'category', width: 20 },
      { header: 'Cantidad Vendida', key: 'quantity', width: 15 },
      { header: 'Ingresos', key: 'revenue', width: 15 }
    ];

    // Obtener datos de productos vendidos
    const orders = await prisma.order.findMany({
      where: {
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        },
        status: 'DELIVERED'
      },
      include: {
        items: {
          include: {
            product: {
              include: {
                category: true
              }
            }
          }
        }
      }
    });

    const productStats = new Map();
    orders.forEach((order: any) => {
      order.items.forEach((item: any) => {
        const key = item.product.name;
        const current = productStats.get(key) || {
          product: item.product.name,
          category: item.product.category.name,
          quantity: 0,
          revenue: 0
        };
        
        productStats.set(key, {
          ...current,
          quantity: current.quantity + item.quantity,
          revenue: current.revenue + (item.price * item.quantity)
        });
      });
    });

    Array.from(productStats.values())
      .sort((a, b) => b.revenue - a.revenue)
      .forEach(stat => {
        worksheet.addRow(stat);
      });

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };
  }

  private static async addSalesContentToPDF(doc: typeof PDFDocument, startDate: string, endDate: string) {
    // Título
    doc.fontSize(20).text('Reporte de Ventas', 50, 50);
    doc.fontSize(12).text(`Período: ${startDate} - ${endDate}`, 50, 80);

    // Obtener datos resumidos
    const orders = await prisma.order.findMany({
      where: {
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        },
        status: 'DELIVERED'
      }
    });

    const totalSales = orders.reduce((sum: any, order: any) => sum + order.total, 0);
    const totalOrders = orders.length;
    const averageOrder = totalOrders > 0 ? totalSales / totalOrders : 0;

    // Resumen
    doc.text(`Total de Ventas: $${totalSales.toFixed(2)}`, 50, 120);
    doc.text(`Total de Pedidos: ${totalOrders}`, 50, 140);
    doc.text(`Promedio por Pedido: $${averageOrder.toFixed(2)}`, 50, 160);

    // Aquí podrías agregar más contenido como gráficos, tablas, etc.
  }
}